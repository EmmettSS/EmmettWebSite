"""تست‌های جست‌وجوی دوزبانه، فیلترها و autocomplete ادمین — فاز ۶ (ADR-0028).

جست‌وجو در Django Admin برای مدل‌های ``django-modeltranslation`` یک تلهٔ شناخته‌شده
دارد: اگر ``search_fields`` روی نام پایه (``title``) تنظیم شود، فقط زبان فعال
جست‌وجو می‌شود. در این پروژه همهٔ مدل‌های محتوایی روی **هر دو ستون** جست‌وجو
می‌کنند (``title_fa``/``title_en``) تا مترجم انگلیسی‌زبان هم بتواند محتوا را
پیدا کند. فیلترها هم باید روی دادهٔ واقعی کار کنند، نه فقط در تئوری.
"""

from __future__ import annotations

from typing import Any, cast

import pytest
from django.contrib.admin.sites import AdminSite
from django.contrib.auth.models import Permission
from django.test import Client
from django.urls import reverse

from apps.accounts.models import User
from apps.accounts.tests.factories import UserFactory
from apps.core.admin_filters import TranslationCompletenessFilter
from apps.core.models import Translation
from apps.core.tests.admin_helpers import superuser
from apps.services.admin import ServiceAdmin
from apps.services.models import Service
from apps.services.tests.factories import ServiceFactory

pytestmark = pytest.mark.django_db


def _staff(*codens: str, as_superuser: bool = False) -> User:
    if as_superuser:
        return superuser()
    user = cast(User, UserFactory(is_staff=True))
    user.user_permissions.add(*Permission.objects.filter(codename__in=codens))
    return User.objects.get(pk=user.pk)


class TestBilingualSearch:
    def test_search_matches_persian_title(self, client: Client) -> None:
        ServiceFactory(slug="fa-only", title_fa="طراحی وب‌سایت اختصاصی", title_en="Custom website")
        ServiceFactory(slug="other", title_fa="پشتیبانی", title_en="Support")
        client.force_login(_staff("view_service"))

        response = client.get(reverse("admin:services_service_changelist"), {"q": "طراحی وب"})

        content = response.content.decode()
        assert "طراحی وب‌سایت اختصاصی" in content  # همان چیزی که در ستون فهرست دیده می‌شود
        assert "پشتیبانی" not in content

    def test_search_matches_english_title_for_fa_locale_admin(self, client: Client) -> None:
        """کاربری که پنل را فارسی می‌بیند، باید بتواند با عنوان انگلیسی هم پیدا کند."""

        ServiceFactory(slug="en-hit", title_fa="خدمت ویژه", title_en="Enterprise audit")
        ServiceFactory(slug="en-miss", title_fa="خدمت دیگر", title_en="Support plan")
        client.force_login(_staff("view_service"))

        response = client.get(reverse("admin:services_service_changelist"), {"q": "Enterprise"})

        content = response.content.decode()
        assert "خدمت ویژه" in content
        assert "خدمت دیگر" not in content

    def test_admin_class_searches_both_language_columns(self) -> None:
        admin = ServiceAdmin(Service, AdminSite())
        assert {"title_fa", "title_en"} <= set(admin.search_fields)


class TestFilters:
    def test_status_filter_limits_rows(self, client: Client) -> None:
        ServiceFactory(slug="draft-one", status="draft", title_fa="پیش‌نویس ویژه")
        ServiceFactory(slug="published-one", status="published", title_fa="منتشرشدهٔ ویژه")
        client.force_login(_staff("view_service"))

        response = client.get(reverse("admin:services_service_changelist"), {"status": "draft"})

        content = response.content.decode()
        assert "پیش‌نویس ویژه" in content
        assert "منتشرشدهٔ ویژه" not in content

    def test_translation_completeness_filter(self) -> None:
        Translation.objects.create(namespace="site", key="tagline", locale="fa", value="متن")
        Translation.objects.create(namespace="site", key="both", locale="fa", value="الف")
        Translation.objects.create(namespace="site", key="both", locale="en", value="A")

        def apply(value: str) -> list[str]:
            filter_instance = TranslationCompletenessFilter(
                cast(Any, type("R", (), {"GET": {"completeness": value}}))(),
                {"completeness": [value]},
                Translation,
                cast(Any, None),
            )
            queryset = filter_instance.queryset(None, Translation.objects.all())  # type: ignore[arg-type]
            return sorted(queryset.values_list("key", flat=True))

        assert apply("missing_en") == ["tagline"]
        assert apply("missing_fa") == []
        # فیلتر «ثبت‌شده در هر دو زبان» هر دو ردیف همان کلید را برمی‌گرداند.
        assert set(apply("both")) == {"both"}

    def test_related_presence_filter_for_courses(self) -> None:
        from apps.academy.admin import CourseHasEnrollmentsFilter
        from apps.academy.models import Course, Enrollment
        from apps.academy.tests.factories import CourseFactory

        course_with = cast(Course, CourseFactory(slug="with-enroll"))
        CourseFactory(slug="without-enroll")
        Enrollment.objects.create(user=UserFactory(), course=course_with)

        def apply(val: str) -> list[str]:
            flt = CourseHasEnrollmentsFilter(
                cast(Any, type("R", (), {"GET": {"has_enrollments": val}}))(),
                {"has_enrollments": [val]},
                Course,
                cast(Any, None),
            )
            qs = flt.queryset(cast(Any, None), Course.objects.all())
            return sorted(qs.values_list("slug", flat=True))

        assert apply("yes") == ["with-enroll"]
        assert apply("no") == ["without-enroll"]

    def test_search_inside_translation_values(self, client: Client) -> None:
        Translation.objects.create(namespace="site", key="tagline", locale="fa", value="شعار برند")
        Translation.objects.create(namespace="legal", key="terms", locale="fa", value="شرایط")
        client.force_login(_staff("view_translation", as_superuser=True))

        response = client.get(reverse("admin:core_translation_changelist"), {"q": "شعار"})

        content = response.content.decode()
        assert "شعار برند" in content
        assert "شرایط" not in content


class TestAutocompleteEndpoints:
    def test_autocomplete_returns_json_for_related_widget(self, client: Client) -> None:
        from apps.company.models import TeamMember

        member = TeamMember.objects.create(full_name="مدرس نمونه", user=UserFactory(), role_title="مدیر فنی")
        assert member.pk is not None
        assert member.pk
        client.force_login(_staff("change_blogpost", as_superuser=True))

        response = client.get(
            reverse("admin:autocomplete"),
            {
                "app_label": "blog",
                "model_name": "blogpost",
                "field_name": "author",
                "term": "مدرس",
            },
        )

        assert response.status_code == 200
        payload = response.json()
        assert "results" in payload
        assert member.pk is not None

    def test_blog_post_author_autocomplete_uses_users(self, client: Client) -> None:
        author = cast(User, UserFactory(email="writer@example.com", first_name="نگارنده"))
        client.force_login(_staff("view_user", as_superuser=True))

        response = client.get(
            reverse("admin:autocomplete"),
            {
                "app_label": "blog",
                "model_name": "blogpost",
                "field_name": "author",
                "term": "نگارنده",
            },
        )

        assert response.status_code == 200
        results = response.json()["results"]
        assert any(str(author.pk) == str(item["id"]) for item in results)
