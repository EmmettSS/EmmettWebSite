import pytest
from django.test import override_settings
from rest_framework.test import APIClient
from apps.content.models import Post

pytestmark = pytest.mark.django_db


def test_health_reports_database_and_uptime():
    response = APIClient().get("/api/v1/health/")
    assert response.status_code == 200
    assert response.data["status"] == "ok" and response.data["db"] == "ok"
    assert isinstance(response.data["uptime"], int)


def test_public_tools_contract_is_honest_until_tools_ship():
    response = APIClient().get("/api/v1/public/tools/")
    assert response.status_code == 200 and response.data == {"items": [], "count": 0}


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
