import pytest
from django.core.exceptions import ValidationError
from django.core.management import call_command
from rest_framework.test import APIClient
from .models import Post, SiteConfig

pytestmark = pytest.mark.django_db


def test_content_published_requires_persian_title_and_body():
    post = Post(slug="sample", status="published")
    with pytest.raises(ValidationError):
        post.full_clean()


def test_english_api_falls_back_to_persian_when_untranslated():
    Post.objects.create(
        slug="sample", title_fa="عنوان", body_fa="متن", status="published"
    )
    response = APIClient().get("/api/v1/public/posts/?lang=en")
    assert response.status_code == 200
    assert response.data[0]["title"] == "عنوان" and response.data[0]["body"] == "متن"


def test_static_bridge_renders_full_bilingual_html(tmp_path, monkeypatch):
    Post.objects.create(
        slug="sample",
        title_fa="مقاله",
        body_fa="متن فارسی",
        title_en="Post",
        body_en="English text",
        status="published",
    )
    monkeypatch.setenv("STATIC_BRIDGE_DIR", str(tmp_path))
    monkeypatch.setenv("PUBLIC_SITE_URL", "https://emmett.test")
    call_command("render_public_html", force=True, verbosity=0)
    fa = (tmp_path / "fa/posts/sample/index.html").read_text()
    en = (tmp_path / "en/posts/sample/index.html").read_text()
    assert "مقاله" in fa and "متن فارسی" in fa and 'hreflang="en"' in fa
    assert "Post" in en and "English text" in en
    # Phase 5 §4: a published post must carry BlogPosting + BreadcrumbList with real dates,
    # and its author must be the organization — never an invented person.
    for html in (fa, en):
        assert '"@type": "BlogPosting"' in html
        assert '"@type": "BreadcrumbList"' in html
        assert '"datePublished"' in html and '"dateModified"' in html
        assert '"@type": "Organization"' in html and '"@type": "Person"' not in html


class TestSiteConfigLabThroughput:
    """Plain pytest class (this suite uses pytest, not Django's TestCase runner)."""

    def _get(self):
        return APIClient().get("/api/v1/site-config/")

    def test_empty_configuration_reports_nulls_not_defaults(self):
        response = self._get()
        assert response.status_code == 200
        body = response.json()
        for field in ("lab_samples_per_day", "lab_turnaround_hours", "lab_tests_per_sample"):
            assert body[field] is None, f"{field} must be null (not a fabricated number) when unset"
        assert body["telegram_handle"] == ""

    def test_configured_values_round_trip(self):
        SiteConfig.objects.create(
            telegram_handle="emmett_lab",
            lab_samples_per_day=240,
            lab_turnaround_hours=36,
            lab_tests_per_sample=8,
        )
        body = self._get().json()
        assert body["telegram_handle"] == "emmett_lab"
        assert body["lab_samples_per_day"] == 240
        assert body["lab_turnaround_hours"] == 36
        assert body["lab_tests_per_sample"] == 8

    def test_single_row_is_enforced(self):
        SiteConfig.objects.create(brand_en="First")
        SiteConfig.objects.create(brand_en="Second")
        assert SiteConfig.objects.count() == 1
        assert SiteConfig.objects.first().brand_en == "Second"
