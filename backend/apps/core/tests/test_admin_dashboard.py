"""تست‌های داشبورد ادمین — فاز ۶ (ADR-0028).

تمرکز، روی سه چیز است (نه روی رنگ و چیدمان — چیدمان در sandbox قابل مشاهده
نیست و به‌جایش موجودبودن نشانه‌های قالب بررسی می‌شود):

1. **درستی عددها** — KPIها باید از همان دادهٔ واقعی محاسبه شوند.
2. **کارایی** — تعداد کوئری‌های داشبورد محدود و ثابت است (قانون ۱۵) و درخواست
   دوم از کش می‌آید.
3. **پایداری** — نبود داده، خاموش‌بودن کش یا خطای غیرمنتظره نباید صفحهٔ ادمین
   را از کار بیندازد.
"""

from __future__ import annotations

from typing import Any, cast

import pytest
from django.contrib.auth.models import Permission
from django.core.cache import cache
from django.test import Client, RequestFactory
from django.urls import reverse

from apps.academy.models import Enrollment
from apps.academy.tests.factories import CourseFactory
from apps.accounts.models import User
from apps.accounts.tests.factories import UserFactory
from apps.ai_engine.catalog.bootstrap import seed_ai_engine_data
from apps.ai_engine.models import AIRequest
from apps.core import dashboard
from apps.core.models import AuditLog
from apps.leads.tests.factories import ContactFactory
from apps.services.models import Service
from apps.services.tests.factories import ServiceFactory

pytestmark = pytest.mark.django_db

#: سقف کوئری‌های ساخت اعداد داشبورد (اندازه‌گیری‌شده و سپس قفل‌شده).
MAX_DASHBOARD_QUERIES = 17


@pytest.fixture(autouse=True)
def _seed_catalogs(db: None) -> None:
    """فرم/فکتوری‌های Contact به Catalogهای DB وابسته‌اند."""

    seed_ai_engine_data()


def _ai_request() -> AIRequest:
    return AIRequest.objects.create(feature=AIRequest.Feature.ADVISOR, locale="fa")


def _enrollment(*, status: str = Enrollment.Status.ACTIVE) -> Enrollment:
    return Enrollment.objects.create(course=CourseFactory(), user=UserFactory(), status=status)


def _staff(*, superuser: bool = False) -> User:
    user = cast(User, UserFactory(is_staff=True))
    if superuser:
        user.is_superuser = True
        user.save(update_fields=["is_superuser"])
        return user

    codes = [
        "view_user",
        "view_airequest",
        "view_aicontentartifact",
        "view_contact",
        "view_lead",
        "view_newsletter",
        "view_course",
        "view_enrollment",
        "view_service",
        "view_project",
        "view_blogpost",
        "view_auditlog",
    ]
    user.user_permissions.add(*Permission.objects.filter(codename__in=codes))
    return User.objects.get(pk=user.pk)


def _kpi(stats: dashboard.DashboardData, url_fragment: str) -> dashboard.Kpi:
    """KPI را با URL پایدارش پیدا می‌کند (برچسب ترجمه‌پذیر است، URL نیست)."""

    for card in stats.kpis:
        if card.url and url_fragment in card.url:
            return card
    raise AssertionError(f"KPI با url شامل {url_fragment!r} یافت نشد")


class TestDashboardNumbers:
    """عددهای KPI باید دقیقاً همان چیزی باشند که در دیتابیس است."""

    def test_counts_reflect_database_state(self) -> None:
        ContactFactory()
        CourseFactory()
        _enrollment()
        _ai_request()

        cache.clear()
        stats = dashboard.build_dashboard()

        assert _kpi(stats, "accounts_user_changelist").value == User.objects.count()
        assert _kpi(stats, "leads_lead_changelist").value == 1  # تعداد تماس‌ها
        assert _kpi(stats, "ai_engine_airequest_changelist").value == 1
        assert _kpi(stats, "academy_enrollment_changelist").value == 1

    def test_conversion_rate_is_percentage_of_won_leads(self) -> None:
        ContactFactory()
        from apps.leads.models import Lead

        Lead.objects.create(contact=ContactFactory(), status=Lead.Status.WON)
        Lead.objects.create(contact=ContactFactory(), status=Lead.Status.NEW)
        Lead.objects.create(contact=ContactFactory(), status=Lead.Status.LOST)

        cache.clear()
        stats = dashboard.build_dashboard()

        assert stats.conversion_rate == 33.3

    def test_charts_cover_eight_weeks(self) -> None:
        ContactFactory()
        cache.clear()
        stats = dashboard.build_dashboard()

        assert len(stats.charts) == 2
        for chart in stats.charts:
            assert len(chart.points) == dashboard.CHART_WEEKS
            assert all(0 < point.percent <= 100 for point in chart.points)

    def test_pipeline_and_content_rows_cover_all_statuses(self) -> None:
        cache.clear()
        stats = dashboard.build_dashboard()

        assert [item.label for item in stats.pipeline]  # برچسب‌های وضعیت سرنخ
        assert len(stats.pipeline) == 6
        assert {row.label for row in stats.content_status}  # خدمات/پروژه/وبلاگ/دوره

    def test_empty_database_does_not_crash(self) -> None:
        cache.clear()
        stats = dashboard.build_dashboard()

        assert stats.kpis
        assert all(card.value >= 0 for card in stats.kpis)
        assert stats.conversion_rate == 0.0

    def test_recent_audit_activity_is_limited_and_newest_first(self) -> None:
        actor = _staff()
        for index in range(8):
            AuditLog.objects.create(action=f"test.action_{index}", actor=actor, metadata={})

        cache.clear()
        stats = dashboard.build_dashboard()

        assert len(stats.audit_activity) == dashboard.ACTIVITY_LIMIT
        created = [row.created_at for row in stats.audit_activity]
        assert created == sorted(created, reverse=True)
        assert stats.audit_activity[0].actor == actor.email

    def test_admin_activity_only_lists_current_user(self) -> None:
        mine = _staff()
        other = _staff()
        request = RequestFactory().get("/admin/")
        request.user = mine

        cache.clear()
        stats = dashboard.build_dashboard(request)
        assert stats.admin_activity == ()

        from django.contrib.admin.models import LogEntry

        my_object = cast(Service, ServiceFactory(title_fa="کار من"))
        other_object = cast(Service, ServiceFactory(title_fa="کار دیگری"))

        # API جدید جنگو ۵.۲: ``log_actions`` روی یک queryset کار می‌کند و
        # ``log_action`` منسوخ شده است (هشدار RemovedInDjango60).
        LogEntry.objects.log_actions(
            user_id=other.pk,
            queryset=Service.objects.filter(pk=other_object.pk),
            action_flag=2,
            single_object=True,
        )
        LogEntry.objects.log_actions(
            user_id=mine.pk,
            queryset=Service.objects.filter(pk=my_object.pk),
            action_flag=1,
            single_object=True,
        )
        stats = dashboard.build_dashboard(request)
        assert [row.object_repr for row in stats.admin_activity] == [str(my_object)]


class TestDashboardCaching:
    """کش باید بار دیتابیس را کم کند، ولی نتیجه را تغییر ندهد."""

    def test_second_call_hits_cache(self) -> None:
        cache.clear()
        ContactFactory()
        dashboard.build_dashboard()

        cached = cache.get(dashboard.CACHE_KEY)
        assert isinstance(cached, dict)
        assert cached["contacts"]["total"] == 1

    def test_cache_can_be_disabled_without_breaking(self, settings: Any) -> None:
        settings.ADMIN_DASHBOARD_CACHE_SECONDS = 0
        cache.clear()
        first = dashboard.build_dashboard()
        ContactFactory()
        second = dashboard.build_dashboard()

        assert first.kpis and second.kpis
        assert _kpi(second, "leads_lead_changelist").value == 1  # بدون کش، تازه است

    def test_numbers_are_collected_with_a_bounded_number_of_queries(self) -> None:
        """سقف کوئری‌ها: هر KPI/نمودار با تجمیع دیتابیسی، نه پیمایش رکورد."""

        cache.clear()
        from django.db import connection
        from django.test.utils import CaptureQueriesContext

        with CaptureQueriesContext(connection) as captured:
            dashboard._collect_numbers()

        assert len(captured) <= MAX_DASHBOARD_QUERIES, [
            query["sql"][:90] for query in captured.captured_queries
        ]


class TestDashboardPage:
    """صفحهٔ واقعی ``/admin/`` باید قالب سفارشی، اعداد و RTL را رندر کند."""

    def test_index_page_renders_custom_dashboard(self, client: Client) -> None:
        ContactFactory()
        client.force_login(_staff())

        response = client.get(reverse("admin:index"))

        assert response.status_code == 200
        content = response.content.decode()
        assert "emmett-kpi" in content  # کارت KPI قالب سفارشی
        assert "emmett-chart" in content  # نمودار CSS (بدون CDN)
        assert "emmett-panel" in content
        assert "admin/css/rtl.css" in content  # لایهٔ RTL رسمی جنگو در فارسی
        assert "کش می‌شود" in content  # ترجمهٔ فارسی از .mo

    def test_english_locale_renders_ltr_labels(self, client: Client, settings: Any) -> None:
        """زبان انگلیسی از طریق کوکی زبان (زبان‌گزین Jazzmin) فعال می‌شود.

        پروژه عمداً پیشوند زبان روی مسیر ادمین ندارد (``/admin/`` ثابت است)؛
        تغییر زبان در پنل با کوکی ``django_language`` انجام می‌شود — همان
        کاری که دکمهٔ زبان در نوار بالای Jazzmin می‌کند.
        """

        client.force_login(_staff())
        client.cookies[settings.LANGUAGE_COOKIE_NAME] = "en"

        response = client.get(reverse("admin:index"))

        assert response.status_code == 200
        content = response.content.decode()
        assert "Statistics are cached briefly" in content
        assert "admin/css/rtl.css" not in content
        assert response.headers["Content-Language"].startswith("en")

    def test_dashboard_requires_staff(self, client: Client) -> None:
        client.force_login(cast(User, UserFactory()))
        response = client.get(reverse("admin:index"))
        assert response.status_code in {302, 403}


class TestDashboardTemplateTag:
    """تگ ``{% emmett_dashboard %}`` هرگز نباید صفحه را بشکند."""

    def test_dashboard_page_renders_without_database_rows(self, client: Client) -> None:
        client.force_login(_staff())
        response = client.get(reverse("admin:index"))
        assert response.status_code == 200
        assert "emmett-kpi" in response.content.decode()

    def test_tag_returns_safe_empty_payload_on_failure(self, monkeypatch: Any) -> None:
        from django.template import Context
        from django.test import RequestFactory as RF

        from apps.core.templatetags import emmett_admin

        def boom(*args: Any, **kwargs: Any) -> Any:
            raise RuntimeError("database exploded")

        monkeypatch.setattr(emmett_admin, "build_dashboard", boom)
        payload = emmett_admin.emmett_dashboard(Context({"request": RF().get("/admin/")}))

        assert payload.kpis == ()
        assert payload.charts == ()
