import threading
import pytest
from django.conf import settings
from django.db import close_old_connections
from .models import Job
from . import runner

pytestmark = pytest.mark.django_db(transaction=True)


def test_poll_offset_returns_only_new_steps():
    job = Job.objects.create(kind="scan", progress=[{"step": 1}, {"step": 2}])
    from .polling import PollableJobView
    from django.contrib.auth import get_user_model
    from rest_framework.test import APIRequestFactory, force_authenticate

    factory = APIRequestFactory()

    # Secure by default (OWASP A01): an anonymous poll must not read job state.
    anonymous = PollableJobView.as_view()(factory.get("/?offset=1"), job.pk)
    assert anonymous.status_code in (401, 403)

    request = factory.get("/?offset=1")
    force_authenticate(request, user=get_user_model().objects.create_superuser(
        username="poller", email="poller@example.test", password="x"
    ))
    response = PollableJobView.as_view()(request, job.pk)
    assert response.data["progress"] == [{"step": 2}]
    assert response.data["offset_next"] == 2


def test_retry_then_failed(monkeypatch):
    job = Job.objects.create(kind="broken", max_attempts=2)
    runner.JOBS["broken"] = lambda payload, progress: (_ for _ in ()).throw(
        RuntimeError("failure")
    )
    runner.process_one("broken", worker="a")
    job.refresh_from_db()
    assert job.state == Job.State.PENDING
    runner.process_one("broken", worker="b")
    job.refresh_from_db()
    assert job.state == Job.State.FAILED
    assert "failure" in job.error


@pytest.mark.skipif(
    settings.DATABASES["default"]["ENGINE"].endswith("sqlite3"),
    reason="FOR UPDATE SKIP LOCKED is validated against MariaDB in CI",
)
def test_two_workers_claim_different_jobs():
    Job.objects.create(kind="race")
    Job.objects.create(kind="race")
    claimed = []
    barrier = threading.Barrier(2)

    def work(name):
        close_old_connections()
        barrier.wait()
        j = runner.claim("race", name)
        claimed.append(j.pk if j else None)
        close_old_connections()

    threads = [threading.Thread(target=work, args=(str(i),)) for i in range(2)]
    [t.start() for t in threads]
    [t.join() for t in threads]
    assert None not in claimed and len(set(claimed)) == 2


def test_handler_timeout_fails_and_releases_job():
    import time

    job = Job.objects.create(kind="slow", max_attempts=1)
    runner.JOBS["slow"] = lambda payload, progress: time.sleep(3)
    finished = runner.process_one("slow", timeout=1, worker="timeout-test")
    job.refresh_from_db()
    assert finished is not None and job.state == Job.State.FAILED
    assert "timeout" in job.error.lower()
    assert job.locked_at is None and job.locked_by is None


def test_dead_lock_is_recovered():
    from django.utils import timezone
    from datetime import timedelta

    j = Job.objects.create(
        kind="stale",
        state=Job.State.RUNNING,
        locked_at=timezone.now() - timedelta(hours=1),
    )
    assert runner.recover_stale(10) == 1
    j.refresh_from_db()
    assert j.state == Job.State.PENDING and j.locked_at is None
