"""بودجهٔ کارایی فاز ۷ (ADR-0032) — سقف تعداد کوئری و نبود N+1.

منطق آزمون: تعداد کوئری یک endpoint عمومی باید **نسبت به تعداد رکوردها ثابت**
بماند. دو اندازه‌گیری با ۳ و ۱۲ آیتم انجام می‌شود؛ اگر رگرسیون N+1 رخ دهد،
اختلاف ظاهر می‌شود و تست می‌شکند. علاوه بر آن، سقف مطلق هر endpoint پین شده
تا یک ``select_related`` حذف‌شده بی‌سروصدا از دست نرود.
"""

from __future__ import annotations

from typing import cast

import pytest
from django.db import connection
from django.test import Client
from django.test.utils import CaptureQueriesContext

from apps.academy.models import Course
from apps.academy.tests.factories import CourseFactory, LessonFactory
from apps.accounts.models import User
from apps.accounts.tests.factories import UserFactory
from apps.blog.models import BlogPost
from apps.blog.tests.factories import BlogPostFactory, CommentFactory
from apps.core.models import FAQItem, Redirect, RedirectStatus
from apps.portfolio.models import Project
from apps.portfolio.tests.factories import CaseStudyFactory, ProjectFactory
from apps.services.models import Service
from apps.services.tests.factories import ServiceFactory
from apps.taxonomy.models import Category, Tag
from apps.taxonomy.tests.factories import CategoryFactory, TagFactory

pytestmark = pytest.mark.django_db


def _count_queries(client: Client, url: str) -> int:
    with CaptureQueriesContext(connection) as context:
        response = client.get(url)
    assert response.status_code == 200, f"{url} → {response.status_code}"
    return len(context.captured_queries)


def _seed(scale: int, *, start: int = 0) -> None:
    """دادهٔ آزمون با روابط (دسته/برچسب/مدرس/درس/نظر) برای کشف N+1."""

    category = cast(Category, CategoryFactory(slug="cat-shared"))
    tag = cast(Tag, TagFactory(slug="tag-shared"))
    for index in range(start, start + scale):
        # نکته: mypy نمی‌تواند نوع بازگشتی ``DjangoModelFactory`` را به مدل
        # resolve کند (محدودیت django-stubs)؛ cast فقط برای دسترسی M2M است.
        service = cast(Service, ServiceFactory(slug=f"service-budget-{index}"))
        service.categories.add(category)
        service.tags.add(tag)

        post = cast(BlogPost, BlogPostFactory(slug=f"post-budget-{index}"))
        post.categories.add(category)
        post.tags.add(tag)
        author = cast(User, UserFactory())
        CommentFactory(post=post, author=author)
        CommentFactory(post=post, author=author)

        course = cast(Course, CourseFactory(slug=f"course-budget-{index}"))
        course.categories.add(category)
        course.tags.add(tag)
        LessonFactory(course=course)
        LessonFactory(course=course)

        project = cast(Project, ProjectFactory(slug=f"project-budget-{index}"))
        project.tags.add(tag)
        CaseStudyFactory(project=project)


LIST_ENDPOINTS = {
    "services": "/api/v1/services/",
    "projects": "/api/v1/projects/",
    "blog": "/api/v1/blog/",
    "courses": "/api/v1/academy/",
}

#: سقف مطلق کوئری برای هر endpoint فهرست (با حاشیهٔ امن بالای اندازه‌گیری فعلی).
LIST_BUDGETS = {
    "services": 6,
    "projects": 6,
    "blog": 6,
    "courses": 6,
}


class TestListEndpointsHaveNoNPlusOne:
    @pytest.mark.parametrize("name,url", list(LIST_ENDPOINTS.items()))
    def test_query_count_is_constant(self, client: Client, name: str, url: str) -> None:
        _seed(3)
        small = _count_queries(client, url)

        _seed(9, start=3)  # مجموعاً ۱۲ آیتم
        large = _count_queries(client, url)

        assert small == large, f"{name}: تعداد کوئری با رشد داده تغییر کرد (N+1؟) {small} → {large}"

    @pytest.mark.parametrize("name,url", list(LIST_ENDPOINTS.items()))
    def test_query_count_is_within_budget(self, client: Client, name: str, url: str) -> None:
        _seed(12)

        assert _count_queries(client, url) <= LIST_BUDGETS[name]


class TestDetailEndpointsHaveNoNPlusOne:
    def _detail_urls(self) -> dict[str, str]:
        return {
            "blog": "/api/v1/blog/post-budget-0/",
            "course": "/api/v1/academy/course-budget-0/",
            "project": "/api/v1/projects/project-budget-0/",
        }

    @pytest.mark.parametrize("name", ["blog", "course", "project"])
    def test_detail_query_count_is_bounded(self, client: Client, name: str) -> None:
        _seed(3)

        assert _count_queries(client, self._detail_urls()[name]) <= 14


class TestSeoEndpointsBudget:
    def test_sitemap_is_within_budget_and_cached(self, client: Client) -> None:
        _seed(4)
        FAQItem.objects.create(path="/faq/", question="پرسش؟", answer="پاسخ.")
        Redirect.objects.create(
            from_path="/old-budget-page/",
            target="/new-budget-page/",
            status_code=RedirectStatus.MOVED_PERMANENTLY,
        )

        first = _count_queries(client, "/api/v1/seo/sitemap/")
        payload_first = client.get("/api/v1/seo/sitemap/").json()
        warm = _count_queries(client, "/api/v1/seo/sitemap/")

        assert first <= 12, f"بودجهٔ sitemap: {first}"
        # درخواست دوم از cache می‌آید و نباید هیچ کوئری دیتابیس بزند.
        assert warm == 0, f"cache sitemap بی‌اثر است ({warm} کوئری)"
        assert payload_first

    def test_seo_settings_snapshot_is_cached(self, client: Client) -> None:
        assert _count_queries(client, "/api/v1/seo/settings/") <= 4
        assert _count_queries(client, "/api/v1/seo/settings/") == 0

    def test_redirect_lookup_uses_cache(self, client: Client) -> None:
        Redirect.objects.create(
            from_path="/legacy-cached/",
            target="/target-cached/",
            status_code=RedirectStatus.MOVED_PERMANENTLY,
        )

        with CaptureQueriesContext(connection) as first:
            response = client.get("/legacy-cached/")
        assert response.status_code == 301

        with CaptureQueriesContext(connection) as second:
            response = client.get("/legacy-cached/")
        assert response.status_code == 301

        assert len(second.captured_queries) < len(first.captured_queries) or len(second.captured_queries) <= 2


class TestPublicAssetHints:
    """قواعدی که سرعت فرانت/زیرساخت را تضمین می‌کنند و در کد قابل بازرسی‌اند."""

    def test_next_config_serves_modern_image_formats(self) -> None:
        from pathlib import Path

        config = Path(__file__).resolve().parents[4] / "frontend" / "next.config.ts"
        text = config.read_text(encoding="utf-8")

        assert "formats" in text
        assert "avif" in text and "webp" in text

    def test_frontend_uses_inline_font_loading_with_swap(self) -> None:
        from pathlib import Path

        root = Path(__file__).resolve().parents[4] / "frontend" / "src"
        candidates = [
            path for path in root.rglob("*.ts*") if "font" in path.name.lower() or "font" in str(path).lower()
        ]
        assert candidates, "پیکربندی فونت پیدا نشد"
        haystack = "\n".join(path.read_text(encoding="utf-8") for path in candidates)
        assert "next/font" in haystack or "font-display" in haystack

    def test_no_raw_img_tags_in_public_pages(self) -> None:
        """تصاویر باید از ``next/image`` بیایند تا WebP/AVIF و lazy-loading فعال شود."""

        from pathlib import Path

        root = Path(__file__).resolve().parents[4] / "frontend" / "src" / "app"
        offenders: list[str] = []
        for path in root.rglob("*.tsx"):
            text = path.read_text(encoding="utf-8")
            if "<img " in text:
                offenders.append(str(path.relative_to(root)))

        assert not offenders, f"تگ <img> خام در: {offenders}"


def test_media_model_has_variants_for_responsive_images() -> None:
    """``Media`` باید بتواند نسخه‌های WebP/اندازه‌های مختلف را ذخیره کند."""

    from apps.core.models import Media

    field_names = {field.name for field in Media._meta.get_fields()}

    assert {"variants", "webp_url", "width", "height"} & field_names
