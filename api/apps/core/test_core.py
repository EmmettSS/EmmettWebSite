from datetime import timedelta

import pytest
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APIClient
from apps.content.models import Post

pytestmark = pytest.mark.django_db


def test_health_reports_database_and_uptime():
    response = APIClient().get("/api/v1/health/")
    assert response.status_code == 200
    assert response.data["status"] == "ok" and response.data["db"] == "ok"
    assert isinstance(response.data["uptime"], int)


def test_public_tools_catalog_lists_live_artifacts_only():
    response = APIClient().get("/api/v1/public/tools/")
    assert response.status_code == 200
    items = response.data["items"]
    assert response.data["count"] == len(items) == 5
    assert all(item["status"] == "live" for item in items)
    for item in items:
        assert item["evidence_url"].startswith("/fa/tools/")
        assert item["version"]
    assert {item["id"] for item in items} == {"jalali", "kod-meli", "toman", "matn-farsi", "jwt"}


def test_baseline_security_headers_are_present():
    response = APIClient().get("/api/v1/health/")
    assert response["X-Content-Type-Options"] == "nosniff"
    assert "frame-ancestors 'none'" in response["Content-Security-Policy"]


def test_sitemap_and_rss_include_published_content_only():
    Post.objects.create(
        slug="published", title_fa="مقاله", body_fa="متن", status="published"
    )
    Post.objects.create(slug="draft", title_fa="پیش‌نویس", body_fa="متن", status="draft")
    with override_settings(PUBLIC_SITE_URL="https://emmett.test"):
        client = APIClient()
        sitemap = client.get("/api/v1/sitemap.xml")
        rss = client.get("/api/v1/feed.xml")
    assert (
        sitemap.status_code == 200
        and b"https://emmett.test/fa/posts/published/" in sitemap.content
    )
    assert b"draft" not in sitemap.content
    assert (
        rss.status_code == 200
        and b"published" in rss.content
        and b"draft" not in rss.content
    )


class TestOpsErrors:
    """Phase 5 §6: the admin-only error counter the runbook reads every day."""

    def test_anonymous_callers_cannot_read_ops_counters(self):
        assert APIClient().get("/api/v1/ops/errors/").status_code in (401, 403)

    def test_admin_sees_queue_health_and_stuck_jobs(self):
        from django.contrib.auth import get_user_model
        from apps.jobs.models import Job

        stuck = Job.objects.create(kind=Job.Kind.SCAN)
        Job.objects.filter(pk=stuck.pk).update(
            created_at=timezone.now() - timedelta(minutes=40)
        )
        Job.objects.create(kind=Job.Kind.EMBED, state=Job.State.FAILED, finished_at=timezone.now())

        admin = get_user_model().objects.create_superuser(
            username="ops", email="ops@example.test", password="x"
        )
        client = APIClient()
        client.force_authenticate(user=admin)
        body = client.get("/api/v1/ops/errors/").json()

        assert body["jobs_pending"] == 1
        assert body["jobs_stuck"] == 1
        assert body["oldest_pending_minutes"] >= 39
        assert body["jobs_failed_window"] == 1
        assert body["failures_by_kind"] == {"embed": 1}
        assert body["assistant_cost_today_usd"] == 0.0
