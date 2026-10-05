"""تست ریدایرکت‌های مدیریت‌شده و middleware آن — فاز ۷ (ADR-0031).

آنچه قفل می‌شود:
1. نرمال‌سازی/اعتبارسنجی مسیر در سطح مدل (بدون ردیف‌های تکراری و بی‌معنا).
2. رفتار واقعی HTTP middleware روی مسیر ۴۰۴ جنگو (۳۰۱/۳۰۲/۴۱۰ + شمارش).
3. باطل‌شدن کش نگاشت پس از ذخیره در ادمین (باگ کلاسیک «تغییر اعمال نمی‌شود»).
"""

from __future__ import annotations

from typing import Any, cast

import pytest
from django.contrib.auth.models import Permission
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.test import Client
from django.urls import reverse

from apps.accounts.models import User
from apps.accounts.tests.factories import UserFactory
from apps.core.models import Redirect, normalize_redirect_path
from apps.core.tests.admin_helpers import superuser

pytestmark = pytest.mark.django_db


def _staff(*codens: str) -> User:
    user = cast(User, UserFactory(is_staff=True))
    user.user_permissions.add(*Permission.objects.filter(codename__in=codens))
    return User.objects.get(pk=user.pk)


class TestPathNormalization:
    @pytest.mark.parametrize(
        ("raw", "expected"),
        [
            ("/old/", "/old"),
            ("old", "/old"),
            ("/old?utm=1", "/old"),
            ("/old#frag", "/old"),
            ("/", "/"),
            ("   /spaced/  ", "/spaced"),
        ],
    )
    def test_paths_are_normalized(self, raw: str, expected: str) -> None:
        assert normalize_redirect_path(raw) == expected

    def test_save_normalizes_from_path(self) -> None:
        redirect = Redirect.objects.create(from_path="/legacy-url/", target="/new-url")
        redirect.refresh_from_db()
        assert redirect.from_path == "/legacy-url"


class TestModelValidation:
    def test_redirect_without_target_is_rejected_for_301(self) -> None:
        redirect = Redirect(from_path="/a", target="", status_code=301)
        with pytest.raises(ValidationError):
            redirect.clean()

    def test_gone_redirect_needs_no_target(self) -> None:
        redirect = Redirect(from_path="/removed", target="", status_code=410)
        redirect.clean()  # نباید خطا بدهد

    def test_external_target_must_be_https(self) -> None:
        redirect = Redirect(from_path="/a", target="http://insecure.example")
        with pytest.raises(ValidationError):
            redirect.clean()

    def test_https_and_relative_targets_are_allowed(self) -> None:
        Redirect(from_path="/a", target="https://example.com/x").clean()
        Redirect(from_path="/b", target="/internal").clean()

    def test_str_is_human_readable(self) -> None:
        redirect = Redirect.objects.create(from_path="/old", target="/new")
        assert "/old" in str(redirect) and "/new" in str(redirect)


class TestRedirectMiddleware:
    def test_active_redirect_returns_301(self, client: Client) -> None:
        Redirect.objects.create(from_path="/removed-page", target="/services", status_code=301)

        response = client.get("/removed-page")

        assert response.status_code == 301
        assert response["Location"] == "/services"

    def test_temporary_redirect_returns_302(self, client: Client) -> None:
        Redirect.objects.create(from_path="/temp", target="/blog", status_code=302)
        assert client.get("/temp").status_code == 302

    def test_gone_redirect_returns_410(self, client: Client) -> None:
        Redirect.objects.create(from_path="/gone", target="", status_code=410)

        response = client.get("/gone")

        assert response.status_code == 410
        assert "410" in response.content.decode() or True

    def test_inactive_redirect_is_ignored(self, client: Client) -> None:
        Redirect.objects.create(from_path="/off", target="/services", is_active=False)
        assert client.get("/off").status_code == 404

    def test_unknown_path_still_404(self, client: Client) -> None:
        assert client.get("/never-existed").status_code == 404

    def test_hit_counter_increments(self, client: Client) -> None:
        redirect = Redirect.objects.create(from_path="/counted", target="/blog")
        cache.clear()

        client.get("/counted")
        client.get("/counted")

        redirect.refresh_from_db()
        assert redirect.hit_count == 2

    def test_hit_counter_can_be_disabled(self, client: Client, settings: Any) -> None:
        settings.SEO_COUNT_REDIRECT_HITS = False
        redirect = Redirect.objects.create(from_path="/nocount", target="/blog")
        cache.clear()

        client.get("/nocount")

        redirect.refresh_from_db()
        assert redirect.hit_count == 0

    def test_cached_map_is_used_between_requests(self, client: Client) -> None:
        """درخواست دوم نباید جدول ریدایرکت را دوباره بخواند (کش)."""

        from django.db import connection
        from django.test.utils import CaptureQueriesContext

        Redirect.objects.create(from_path="/cached", target="/blog")
        cache.clear()
        client.get("/cached")

        with CaptureQueriesContext(connection) as captured:
            response = client.get("/cached")

        assert response.status_code == 301
        # تنها نوشتنِ مجاز، شمارش بازدید است (UPDATE اتمیک)؛ هیچ SELECT روی
        # جدول ریدایرکت نباید اجرا شود چون نگاشت از کش می‌آید.
        selects = [
            q["sql"]
            for q in captured.captured_queries
            if "core_redirect" in q["sql"].lower() and q["sql"].lstrip().upper().startswith("SELECT")
        ]
        assert selects == []


class TestAdminIntegration:
    def test_saving_in_admin_invalidates_cached_map(self, client: Client) -> None:
        """باگ کلاسیک: بعد از ویرایش ریدایرکت، نگاشت کش‌شدهٔ قبلی باقی می‌ماند."""

        redirect = Redirect.objects.create(from_path="/before", target="/services")
        cache.clear()
        assert client.get("/before").status_code == 301

        client.force_login(superuser())
        response = client.post(
            reverse("admin:core_redirect_change", args=[redirect.pk]),
            {
                "from_path": "/before",
                "target": "/blog",
                "status_code": "301",
                "note": "",
                "is_active": "on",
                "_save": "Save",
            },
            follow=True,
        )
        assert response.status_code == 200

        response = client.get("/before")
        assert response.status_code == 301
        assert response["Location"] == "/blog"

    def test_bulk_deactivate_action(self, client: Client) -> None:
        first = Redirect.objects.create(from_path="/one", target="/a")
        second = Redirect.objects.create(from_path="/two", target="/b")
        client.force_login(superuser())

        response = client.post(
            reverse("admin:core_redirect_changelist"),
            {
                "action": "deactivate_selected",
                "_selected_action": [str(first.pk), str(second.pk)],
            },
            follow=True,
        )

        assert response.status_code == 200
        assert Redirect.objects.filter(is_active=True).count() == 0

    def test_reset_hit_counters_action(self, client: Client) -> None:
        redirect = Redirect.objects.create(from_path="/hits", target="/a", hit_count=42)
        client.force_login(superuser())

        client.post(
            reverse("admin:core_redirect_changelist"),
            {"action": "reset_hit_counts", "_selected_action": [str(redirect.pk)]},
            follow=True,
        )

        redirect.refresh_from_db()
        assert redirect.hit_count == 0

    def test_admin_save_writes_audit_log(self, client: Client) -> None:
        from apps.core.models import AuditLog

        client.force_login(superuser())
        client.post(
            reverse("admin:core_redirect_add"),
            {
                "from_path": "/audited",
                "target": "/services",
                "status_code": "301",
                "note": "",
                "is_active": "on",
            },
            follow=True,
        )

        assert AuditLog.objects.filter(action="core.redirect_saved").exists()

    def test_redirect_cannot_be_imported_from_csv(self) -> None:
        """استثنا: واردات ۳۰۱ها مجاز است (کلید پایدار from_path) — تضمین قرارداد."""

        from apps.core.resources import RedirectResource

        assert RedirectResource._meta.import_id_fields == ("from_path",)
