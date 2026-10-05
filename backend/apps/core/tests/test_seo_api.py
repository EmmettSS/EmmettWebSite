"""تست payloadهای SEO و endpointهای آن — فاز ۷ (ADR-0031).

این endpointها «منبع حقیقت» sitemap/JSON-LD/FAQ در فرانت‌اند هستند؛ پس باید
هم درستی داده، هم شکل قرارداد (کلیدها) و هم رفتار کش/نبود‌داده را تضمین کنند.
"""

from __future__ import annotations

from typing import Any

import pytest
from django.core.cache import cache
from django.test import Client
from django.urls import reverse
from django.utils import translation

from apps.academy.tests.factories import CourseFactory
from apps.blog.tests.factories import BlogPostFactory
from apps.core.models import (
    FAQItem,
    PublishableModel,
    Redirect,
    SiteSettings,
    normalize_redirect_path,
)
from apps.core.seo import SITEMAP_CACHE_KEY, build_faq_payload, build_sitemap_entries
from apps.services.tests.factories import ServiceFactory

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def _clear_cache() -> None:
    cache.clear()


def _published_models() -> None:
    """یک آیتم منتشرشده از هر مدل محتوایی می‌سازد (برای پرکردن sitemap)."""

    from apps.portfolio.tests.factories import ProjectFactory

    ServiceFactory(slug="sitemap-service")
    ProjectFactory(slug="sitemap-project")
    BlogPostFactory(slug="sitemap-post")
    CourseFactory(slug="sitemap-course")


def _published(**kwargs: Any) -> dict[str, Any]:
    return {"status": PublishableModel.Status.PUBLISHED, **kwargs}


class TestSitemapPayload:
    def test_static_pages_are_always_included(self) -> None:
        entries = build_sitemap_entries(use_cache=False)
        paths = {entry["path"] for entry in entries}
        assert {"/", "/services", "/blog", "/about", "/contact"} <= paths

    def test_only_published_content_is_listed(self) -> None:
        ServiceFactory(slug="published-service", **_published())
        ServiceFactory(slug="draft-service", status=PublishableModel.Status.DRAFT)
        BlogPostFactory(slug="published-post", **_published())
        CourseFactory(slug="published-course", **_published())

        paths = {entry["path"] for entry in build_sitemap_entries(use_cache=False)}

        assert "/services/published-service" in paths
        assert "/services/draft-service" not in paths
        assert "/blog/published-post" in paths
        assert "/academy/published-course" in paths

    def test_entries_carry_seo_fields(self) -> None:
        ServiceFactory(slug="sized", **_published())
        entry = next(
            row for row in build_sitemap_entries(use_cache=False) if row["path"] == "/services/sized"
        )
        assert entry["section"] == "services"
        assert entry["changefreq"] == "weekly"
        assert entry["priority"] == "0.7"
        assert entry["lastmod"]

    def test_cache_is_used_and_can_be_invalidated(self) -> None:
        build_sitemap_entries()
        assert cache.get(SITEMAP_CACHE_KEY) is not None

        ServiceFactory(slug="after-cache", **_published())
        # کش فعال است ⇒ رکورد جدید دیده نمی‌شود...
        assert "/services/after-cache" not in {row["path"] for row in build_sitemap_entries()}

        from apps.core.seo import invalidate_sitemap_cache

        invalidate_sitemap_cache()
        assert "/services/after-cache" in {row["path"] for row in build_sitemap_entries()}

    def test_endpoint_returns_sections(self, client: Client) -> None:
        response = client.get("/api/v1/seo/sitemap/")

        assert response.status_code == 200
        payload = response.json()
        assert payload["sections"] == ["pages", "services", "projects", "blog", "academy"]
        assert all("path" in row for row in payload["results"])


class TestSEOSettingsPayload:
    def test_endpoint_exposes_admin_editable_defaults(self, client: Client) -> None:
        settings_obj = SiteSettings.load()
        settings_obj.meta_title = "عنوان پیش‌فرض"
        settings_obj.meta_description = "توضیح پیش‌فرض"
        settings_obj.search_console_verification = "verify-token-123"
        settings_obj.twitter_handle = "@emmett"
        settings_obj.organization_legal_name = "امیت"
        settings_obj.organization_same_as = ["https://github.com/EmmettSS"]
        settings_obj.save()

        response = client.get("/api/v1/seo/settings/")

        assert response.status_code == 200
        payload = response.json()
        assert payload["default_meta_title"] == "عنوان پیش‌فرض"
        assert payload["search_console_verification"] == "verify-token-123"
        assert payload["twitter_handle"] == "@emmett"
        assert payload["organization"]["same_as"] == ["https://github.com/EmmettSS"]
        assert payload["organization"]["logo_url"].startswith("http")
        assert payload["locales"] == [
            {"code": "fa", "label": "فارسی"},
            {"code": "en", "label": "English"},
        ]

    def test_noindex_paths_are_published_for_robots(self, client: Client) -> None:
        payload = client.get("/api/v1/seo/settings/").json()

        for path in ("/admin", "/api", "/profile", "/search"):
            assert path in payload["noindex_paths"]

    def test_saving_site_settings_invalidates_cache(self, client: Client) -> None:
        client.get("/api/v1/seo/settings/")
        assert cache.get("seo:settings:v1") is not None

        settings_obj = SiteSettings.load()
        settings_obj.meta_description = "changed"
        settings_obj.save()

        assert cache.get("seo:settings:v1") is None


class TestFAQPayload:
    def test_items_are_ordered_and_localized(self) -> None:
        FAQItem.objects.create(path="/services/web", question_fa="سؤال دوم", answer_fa="پاسخ دوم", order=2)
        FAQItem.objects.create(path="/services/web", question_fa="سؤال اول", answer_fa="پاسخ اول", order=1)
        FAQItem.objects.create(path="/other", question_fa="بی‌ربط", answer_fa="x", order=0)

        items = build_faq_payload("/services/web")

        assert [item["question"] for item in items] == ["سؤال اول", "سؤال دوم"]

    def test_path_is_normalized_before_lookup(self) -> None:
        FAQItem.objects.create(path="/services/web", question_fa="چطور؟", answer_fa="اینگونه", order=0)
        assert build_faq_payload("/services/web/")[0]["question"] == "چطور؟"

    def test_english_falls_back_to_reference_language(self) -> None:
        FAQItem.objects.create(path="/faq", question_fa="متن مرجع", answer_fa="پاسخ مرجع", order=0)

        with translation.override("en"):
            items = build_faq_payload("/faq")

        assert items[0]["question"] == "متن مرجع"

    def test_endpoint_requires_path_and_returns_items(self, client: Client) -> None:
        FAQItem.objects.create(path="/faq-page", question_fa="پرسش", answer_fa="پاسخ", order=0)

        assert client.get("/api/v1/seo/faq/").status_code == 400
        response = client.get("/api/v1/seo/faq/", {"path": "/faq-page"})

        assert response.status_code == 200
        assert response.json()["results"][0]["answer"] == "پاسخ"

    def test_admin_lists_only_active_items_in_payload(self) -> None:
        FAQItem.objects.create(path="/x", question_fa="فعال", answer_fa="a", is_active=True)
        return_payload = build_faq_payload("/x")
        assert len(return_payload) == 1


class TestRedirectsEndpoint:
    def test_only_active_redirects_are_published(self, client: Client) -> None:
        Redirect.objects.create(from_path="/old", target="/new", status_code=301)
        Redirect.objects.create(from_path="/off", target="/new", is_active=False)

        payload = client.get("/api/v1/seo/redirects/").json()

        assert [row["from_path"] for row in payload["results"]] == ["/old"]

    def test_endpoint_shape_is_stable(self, client: Client) -> None:
        Redirect.objects.create(from_path="/old", target="/new", status_code=302)
        row = client.get("/api/v1/seo/redirects/").json()["results"][0]
        assert set(row) == {"from_path", "target", "status_code", "updated_at"}


class TestOpenAPISchema:
    def test_seo_endpoints_are_documented(self, client: Client) -> None:
        """قانون ۸: هر API خودکار مستند می‌شود؛ مسیرهای SEO هم در schema هستند."""

        response = client.get(reverse("schema"), HTTP_ACCEPT="application/json")
        assert response.status_code == 200
        paths = response.json()["paths"]
        for path in (
            "/api/v1/seo/settings/",
            "/api/v1/seo/sitemap/",
            "/api/v1/seo/redirects/",
            "/api/v1/seo/faq/",
        ):
            assert path in paths


class TestSitemapExcludesNoindex:
    """معیار پذیرش فاز ۷: هیچ مسیر noindex در sitemap نباشد (و برعکس)."""

    def test_noindex_paths_are_absent_from_the_sitemap(self, client: Client) -> None:
        from django.conf import settings

        _published_models()
        paths = {
            normalize_redirect_path(entry["path"]).rstrip("/") or "/"
            for entry in client.get("/api/v1/seo/sitemap/").json()["results"]
        }

        for noindex in settings.SEO_NOINDEX_PATHS:
            normalized = normalize_redirect_path(noindex).rstrip("/")
            assert normalized not in paths, f"مسیر noindex در sitemap است: {noindex}"

    def test_core_pages_are_present(self, client: Client) -> None:
        _published_models()
        paths = {entry["path"] for entry in client.get("/api/v1/seo/sitemap/").json()["results"]}

        for expected in ("/", "/services", "/projects", "/blog", "/academy", "/about", "/contact"):
            assert expected in paths, expected
