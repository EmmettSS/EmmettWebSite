import socket
import signal
import threading
import time
from collections.abc import Callable
from datetime import timedelta
from django.db import transaction
from django.utils import timezone
from .models import Job

Handler = Callable[[dict, Callable[[dict], None]], dict | None]
JOBS: dict[str, Handler] = {}


def register(kind: str):
    def decorate(fn: Handler):
        JOBS[kind] = fn
        return fn

    return decorate


class _JobTimeout(Exception):
    pass


def _alarm_handler(signum, frame):
    raise _JobTimeout("Job exceeded its configured execution timeout")


def run_bounded(
    handler: Handler, payload: dict, progress: Callable[[dict], None], timeout: int
):
    """Interrupt Python handlers on the cron worker's main thread at the deadline."""
    if threading.current_thread() is not threading.main_thread() or not hasattr(
        signal, "setitimer"
    ):
        started = time.monotonic()
        result = handler(payload, progress)
        if time.monotonic() - started > timeout:
            raise TimeoutError(f"Job exceeded {timeout} seconds")
        return result
    old_handler = signal.getsignal(signal.SIGALRM)
    old_timer = signal.getitimer(signal.ITIMER_REAL)
    signal.signal(signal.SIGALRM, _alarm_handler)
    signal.setitimer(signal.ITIMER_REAL, max(1, timeout))
    try:
        return handler(payload, progress)
    finally:
        signal.setitimer(signal.ITIMER_REAL, *old_timer)
        signal.signal(signal.SIGALRM, old_handler)


def recover_stale(timeout: int) -> int:
    cutoff = timezone.now() - timedelta(seconds=timeout)
    changed = Job.objects.filter(state=Job.State.RUNNING, locked_at__lt=cutoff).update(
        state=Job.State.PENDING, locked_by=None, locked_at=None
    )
    return changed


def claim(kind: str | None = None, worker: str | None = None) -> Job | None:
    worker = worker or socket.gethostname()
    with transaction.atomic():
        qs = Job.objects.filter(state=Job.State.PENDING).order_by("created_at", "pk")
        if kind:
            qs = qs.filter(kind=kind)
        job = qs.select_for_update(skip_locked=True).first()
        if job is None:
            return None
        job.state = Job.State.RUNNING
        job.locked_by = worker
        job.locked_at = timezone.now()
        job.started_at = job.locked_at
        job.attempts += 1
        job.save(
            update_fields=["state", "locked_by", "locked_at", "started_at", "attempts"]
        )
        return job


def process_one(
    kind: str | None = None, timeout: int = 90, worker: str | None = None
) -> Job | None:
    recover_stale(timeout)
    job = claim(kind, worker)
    if job is None:
        return None
    handler = JOBS.get(job.kind)
    try:
        if handler is None:
            raise ValueError(f"No registered handler for job kind: {job.kind}")

        def progress(step: dict):
            models_json_append(job.pk, step)

        result = run_bounded(handler, job.payload, progress, timeout)
        job.refresh_from_db()
        job.state, job.result, job.error = Job.State.DONE, result or {}, None
    except Exception as exc:
        job.refresh_from_db()
        job.error = f"{type(exc).__name__}: {exc}"[:2000]
        job.state = (
            Job.State.PENDING if job.attempts < job.max_attempts else Job.State.FAILED
        )
    job.finished_at = (
        timezone.now() if job.state in (Job.State.DONE, Job.State.FAILED) else None
    )
    job.locked_at, job.locked_by = None, None
    job.save(
        update_fields=[
            "state",
            "result",
            "error",
            "finished_at",
            "locked_at",
            "locked_by",
        ]
    )
    return job


def models_json_append(pk: int, step: dict) -> list:
    # Read/modify/write is protected by the DB transaction to preserve ordered polling steps.
    with transaction.atomic():
        item = Job.objects.select_for_update().get(pk=pk)
        steps = list(item.progress or [])
        steps.append(step)
        item.progress = steps
        item.save(update_fields=["progress"])
        return steps
