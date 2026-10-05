"""داده‌های داشبورد ادمین — فاز ۶ (ADR-0028).

مسئولیت این ماژول ساخت «آمار قابل‌نمایش» برای صفحهٔ ورود پنل است:

- همهٔ اعداد با **تجمیع دیتابیسی** (``aggregate``/``annotate``) و در حداقل
  تعداد کوئری محاسبه می‌شوند، نه با پیمایش رکوردها (قانون ۱۵).
- نتیجهٔ عددی برای مدت کوتاه کش می‌شود (``ADMIN_DASHBOARD_CACHE_SECONDS``)؛
  برچسب‌های ترجمه‌شده در کش ذخیره نمی‌شوند تا زبان فعال هر درخواست محترم بماند.
- ماژول هیچ وابستگی سنگین/نمودارساز خارجی ندارد؛ نمودارها با میله‌های CSS
  رسم می‌شوند و فقط «عدد و برچسب» از اینجا می‌آید (بدون CDN — قانون ۱۹/۶).

«فروش» در این فاز عمداً بدون مدل مالی محاسبه می‌شود (تصمیم صریح مالک محصول):
شاخص‌های درآمدی به «ثبت‌نام دوره» و «لید برنده‌شده» محدود است، چون پروژه در
این مرحله هیچ مدل Order/Payment ندارد و ساختن عدد مالی از داده‌ای که وجود
ندارد، آمار گمراه‌کننده تولید می‌کند.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, cast

from django.conf import settings
from django.contrib.admin.models import LogEntry
from django.core.cache import cache
from django.db.models import Avg, Count, Q, QuerySet
from django.db.models.functions import TruncWeek
from django.utils import timezone
from django.utils.translation import get_language
from django.utils.translation import gettext_lazy as _

from apps.academy.models import Course, Enrollment
from apps.accounts.models import User
from apps.ai_engine.models import AIContentArtifact, AIRequest
from apps.blog.models import BlogPost
from apps.core.logging import get_logger
from apps.core.models import AuditLog
from apps.core.utils.numerals import format_number
from apps.leads.models import Contact, Lead, Newsletter
from apps.portfolio.models import Project
from apps.services.models import Service

logger = get_logger(__name__)

CACHE_KEY = "admin_dashboard:stats:v1"
CHART_WEEKS = 8
ACTIVITY_LIMIT = 6

_TONE_BY_STATUS: dict[str, str] = {
    "new": "new",
    "contacted": "contacted",
    "qualified": "qualified",
    "proposal": "proposal",
    "won": "won",
    "lost": "lost",
    "draft": "draft",
    "published": "published",
    "archived": "archived",
    "pending": "pending",
    "approved": "approved",
    "rejected": "rejected",
    "active": "active",
    "completed": "completed",
    "cancelled": "cancelled",
}


@dataclass(frozen=True)
class Kpi:
    """یک کارت شاخص کلیدی در داشبورد."""

    label: str
    value: int | float
    icon: str = "fas fa-chart-simple"
    hints: tuple[str, ...] = ()
    url: str | None = None
    link_label: str = ""


@dataclass(frozen=True)
class ChartPoint:
    label: str
    value: int
    percent: float


@dataclass(frozen=True)
class Chart:
    title: str
    points: tuple[ChartPoint, ...]
    accent: bool = False


@dataclass(frozen=True)
class PipelineItem:
    label: str
    value: int
    tone: str


@dataclass(frozen=True)
class ContentStatusRow:
    label: str
    draft: int
    published: int
    archived: int


@dataclass(frozen=True)
class AuditActivity:
    action: str
    actor: str
    created_at: datetime


@dataclass(frozen=True)
class AdminActivity:
    object_repr: str
    action_label: str
    tone: str
    action_time: datetime


@dataclass(frozen=True)
class DashboardData:
    kpis: tuple[Kpi, ...] = ()
    charts: tuple[Chart, ...] = ()
    pipeline: tuple[PipelineItem, ...] = ()
    content_status: tuple[ContentStatusRow, ...] = ()
    audit_activity: tuple[AuditActivity, ...] = ()
    admin_activity: tuple[AdminActivity, ...] = ()
    conversion_rate: float = 0.0
    generated_at: datetime | None = None


def _count(queryset: QuerySet[Any], **filters: Any) -> int:
    if filters:
        queryset = queryset.filter(**filters)
    return int(queryset.count())


def _collect_numbers() -> dict[str, Any]:
    """همهٔ اعداد داشبورد را با تجمیع دیتابیسی و کش کوتاه‌مدت برمی‌گرداند."""

    now = timezone.now()
    thirty_days_ago = now - timedelta(days=30)

    # توجه: ``accounts.User`` از ``AbstractUser`` ارث می‌برد و برخلاف بقیهٔ
    # مدل‌ها فیلد نرم‌حذف (``deleted_at``) ندارد؛ پس شمارش روی همان فیلدهای
    # موجود انجام می‌شود (این باگ با تست داشبورد فاز ۶ کشف شد).
    users = User.objects.aggregate(
        total=Count("id"),
        staff=Count("id", filter=Q(is_staff=True)),
        new_30d=Count("id", filter=Q(date_joined__gte=thirty_days_ago)),
    )

    ai_requests = AIRequest.objects.aggregate(
        total=Count("id"),
        last_30d=Count("id", filter=Q(created_at__gte=thirty_days_ago)),
        blocked=Count("id", filter=Q(status=AIRequest.Status.BLOCKED)),
        failed=Count("id", filter=Q(status=AIRequest.Status.FAILED)),
        cache_hits=Count("id", filter=Q(cache_hit=True)),
    )

    artifacts = AIContentArtifact.objects.aggregate(
        pending=Count(
            "id", filter=Q(status=AIContentArtifact.Status.DRAFT, is_stale=False)
        ),
        approved=Count("id", filter=Q(status=AIContentArtifact.Status.APPROVED, is_stale=False)),
    )

    contacts = Contact.objects.aggregate(
        total=Count("id"),
        last_30d=Count("id", filter=Q(created_at__gte=thirty_days_ago)),
    )

    leads = Lead.objects.aggregate(
        total=Count("id"),
        new=Count("id", filter=Q(status=Lead.Status.NEW)),
        contacted=Count("id", filter=Q(status=Lead.Status.CONTACTED)),
        qualified=Count("id", filter=Q(status=Lead.Status.QUALIFIED)),
        proposal=Count("id", filter=Q(status=Lead.Status.PROPOSAL)),
        won=Count("id", filter=Q(status=Lead.Status.WON)),
        lost=Count("id", filter=Q(status=Lead.Status.LOST)),
    )

    newsletter = Newsletter.objects.aggregate(
        confirmed=Count("id", filter=Q(is_confirmed=True)),
        total=Count("id"),
    )

    courses = Course.objects.aggregate(
        total=Count("id"),
        published=Count("id", filter=Q(status=Course.Status.PUBLISHED)),
    )

    enrollments = Enrollment.objects.aggregate(
        total=Count("id"),
        active=Count("id", filter=Q(status=Enrollment.Status.ACTIVE)),
        completed=Count("id", filter=Q(status=Enrollment.Status.COMPLETED)),
        last_30d=Count("id", filter=Q(enrolled_at__gte=thirty_days_ago)),
        average_progress=Avg("progress_percent"),
    )

    content_counts: dict[str, dict[str, int]] = {}
    for label, model in (
        ("services", Service),
        ("projects", Project),
        ("blog_posts", BlogPost),
        ("courses", Course),
    ):
        statuses = cast(
            "dict[str, int]",
            model.objects.aggregate(
                draft=Count("id", filter=Q(status="draft")),
                published=Count("id", filter=Q(status="published")),
                archived=Count("id", filter=Q(status="archived")),
            ),
        )
        content_counts[label] = statuses

    return {
        "users": users,
        "ai_requests": ai_requests,
        "artifacts": artifacts,
        "contacts": contacts,
        "leads": leads,
        "newsletter": newsletter,
        "courses": courses,
        "enrollments": enrollments,
        "content_counts": content_counts,
        "generated_at": now,
    }


def _cached_numbers() -> dict[str, Any]:
    """اعداد داشبورد را از کش می‌خواند و در صورت نبود/خطا دوباره محاسبه می‌کند."""

    timeout = int(getattr(settings, "ADMIN_DASHBOARD_CACHE_SECONDS", 120))
    try:
        if timeout > 0:
            cached = cache.get(CACHE_KEY)
            if isinstance(cached, dict):
                return cached
    except Exception:  # pragma: no cover - کش نباید هرگز صفحهٔ ادمین را از کار بیندازد
        logger.warning("admin_dashboard_cache_read_failed")

    numbers = _collect_numbers()

    try:
        if timeout > 0:
            cache.set(CACHE_KEY, numbers, timeout)
    except Exception:  # pragma: no cover
        logger.warning("admin_dashboard_cache_write_failed")

    return numbers


def _weekly_counts(queryset: QuerySet[Any], *, field: str = "created_at") -> tuple[int, ...]:
    """شمارش هفتگی (۸ هفتهٔ منتهی به امروز) برای نمودار میله‌ای."""

    now = timezone.now()
    window_start = now - timedelta(weeks=CHART_WEEKS)
    rows = (
        queryset.filter(**{f"{field}__gte": window_start})
        .annotate(bucket=TruncWeek(field))
        .values("bucket")
        .annotate(total=Count("id"))
    )
    totals: dict[str, int] = {}
    for row in rows:
        bucket = row["bucket"]
        if bucket is None:
            continue
        totals[bucket.date().isoformat()] = int(row["total"])

    series: list[int] = []
    for index in range(CHART_WEEKS, 0, -1):
        week_start = (now - timedelta(weeks=index)).date()
        series.append(totals.get(week_start.isoformat(), 0))
    return tuple(series)


def _percent(value: int, peak: int) -> float:
    if peak <= 0:
        return 2.0
    return max(4.0, round(value / peak * 100, 1))


def _build_chart(title: str, series: tuple[int, ...], *, accent: bool, locale: str) -> Chart:
    peak = max(series) if series else 0
    points = []
    for index, value in enumerate(series):
        weeks_ago = len(series) - index
        label = format_number(weeks_ago, locale)
        points.append(ChartPoint(label=label, value=value, percent=_percent(value, peak)))
    return Chart(title=title, points=tuple(points), accent=accent)


def _format_number(value: int | float, locale: str) -> str:
    if isinstance(value, float):
        return format_number(round(value, 1), locale)
    return format_number(value, locale)


def _admin_activity(request: Any) -> tuple[AdminActivity, ...]:
    if request is None:
        return ()
    entries = (
        LogEntry.objects.filter(user=request.user)
        .select_related("content_type")
        .order_by("-action_time")[:ACTIVITY_LIMIT]
    )
    # ``action_flag`` در LogEntry جنگو با ثابت‌های ۱/۲/۳ پر می‌شود؛
    # به‌جای دسترسی به صفت‌های کلاس (که در django-stubs تعریف نشده‌اند)
    # از همان اعداد مستندشده استفاده می‌کنیم (ADDITION/CHANGE/DELETION).
    labels: dict[int, tuple[Any, str]] = {
        1: (_("Added"), "published"),
        2: (_("Changed"), "qualified"),
        3: (_("Deleted"), "rejected"),
    }
    activity: list[AdminActivity] = []
    for entry in entries:
        label, tone = labels.get(entry.action_flag, (_("Changed"), "qualified"))
        activity.append(
            AdminActivity(
                object_repr=entry.object_repr[:80],
                action_label=str(label),
                tone=tone,
                action_time=entry.action_time,
            )
        )
    return tuple(activity)


def build_dashboard(request: Any = None) -> DashboardData:
    """دادهٔ کامل داشبورد را برای زبان فعال می‌سازد (کش‌شده در سطح اعداد)."""

    locale = get_language() or "fa"
    numbers = _cached_numbers()

    users = numbers["users"]
    ai_requests = numbers["ai_requests"]
    artifacts = numbers["artifacts"]
    contacts = numbers["contacts"]
    leads = numbers["leads"]
    newsletter = numbers["newsletter"]
    courses = numbers["courses"]
    enrollments = numbers["enrollments"]
    content_counts = numbers["content_counts"]

    total_ai = int(ai_requests["total"])
    cache_hit_rate = round(int(ai_requests["cache_hits"]) / total_ai * 100, 1) if total_ai else 0.0
    average_progress = enrollments["average_progress"] or 0
    total_leads = int(leads["total"]) or 0
    conversion_rate = round(int(leads["won"]) / total_leads * 100, 1) if total_leads else 0.0

    kpis: tuple[Kpi, ...] = (
        Kpi(
            label=str(_("Users")),
            value=int(users["total"]),
            icon="fas fa-users",
            hints=(
                f'{_("Staff")}: {_format_number(int(users["staff"]), locale)}',
                f'{_("New (30 days)")}: {_format_number(int(users["new_30d"]), locale)}',
            ),
            url="admin:accounts_user_changelist",
            link_label=str(_("View users")),
        ),
        Kpi(
            label=str(_("AI requests")),
            value=total_ai,
            icon="fas fa-robot",
            hints=(
                f'{_("Last 30 days")}: {_format_number(int(ai_requests["last_30d"]), locale)}',
                f'{_("Blocked by guardrail")}: {_format_number(int(ai_requests["blocked"]), locale)}',
                f'{_("Cache hit rate")}: {_format_number(cache_hit_rate, locale)}%',
            ),
            url="admin:ai_engine_airequest_changelist",
            link_label=str(_("View AI audit")),
        ),
        Kpi(
            label=str(_("Leads")),
            value=int(contacts["total"]),
            icon="fas fa-handshake",
            hints=(
                f'{_("Leads in pipeline")}: {_format_number(total_leads, locale)}',
                f'{_("Won")}: {_format_number(int(leads["won"]), locale)}',
                f'{_("Conversion")}: {_format_number(conversion_rate, locale)}%',
            ),
            url="admin:leads_lead_changelist",
            link_label=str(_("View pipeline")),
        ),
        Kpi(
            label=str(_("Academy enrollments")),
            value=int(enrollments["total"]),
            icon="fas fa-graduation-cap",
            hints=(
                f'{_("Published courses")}: {_format_number(int(courses["published"]), locale)}',
                f'{_("Active")}: {_format_number(int(enrollments["active"]), locale)}',
                f'{_("Average progress")}: {_format_number(average_progress, locale)}%',
            ),
            url="admin:academy_enrollment_changelist",
            link_label=str(_("View enrollments")),
        ),
        Kpi(
            label=str(_("Sales signals (30 days)")),
            value=int(enrollments["last_30d"]) + int(contacts["last_30d"]),
            icon="fas fa-chart-line",
            hints=(
                f'{_("New enrollments")}: {_format_number(int(enrollments["last_30d"]), locale)}',
                f'{_("New contacts")}: {_format_number(int(contacts["last_30d"]), locale)}',
                str(_("No financial model exists in this phase.")),
            ),
            url="admin:leads_contact_changelist",
            link_label=str(_("View contacts")),
        ),
        Kpi(
            label=str(_("Pending AI summaries")),
            value=int(artifacts["pending"]),
            icon="fas fa-file-signature",
            hints=(
                f'{_("Approved")}: {_format_number(int(artifacts["approved"]), locale)}',
                f'{_("Newsletter subscribers")}: {_format_number(int(newsletter["confirmed"]), locale)}',
            ),
            url="admin:ai_engine_aicontentartifact_changelist",
            link_label=str(_("Review summaries")),
        ),
    )

    charts: tuple[Chart, ...] = (
        _build_chart(
            str(_("AI requests per week")),
            _weekly_counts(AIRequest.objects.all()),
            accent=False,
            locale=locale,
        ),
        _build_chart(
            str(_("New contacts per week")),
            _weekly_counts(Contact.objects.all()),
            accent=True,
            locale=locale,
        ),
    )

    pipeline = tuple(
        PipelineItem(label=str(label), value=int(leads[key]), tone=_TONE_BY_STATUS.get(key, "active"))
        for key, label in (
            ("new", _("New")),
            ("contacted", _("Contacted")),
            ("qualified", _("Qualified")),
            ("proposal", _("Proposal")),
            ("won", _("Won")),
            ("lost", _("Lost")),
        )
    )

    content_status = tuple(
        ContentStatusRow(
            label=str(label),
            draft=int(content_counts[key]["draft"]),
            published=int(content_counts[key]["published"]),
            archived=int(content_counts[key]["archived"]),
        )
        for key, label in (
            ("services", _("Services")),
            ("projects", _("Projects")),
            ("blog_posts", _("Blog Posts")),
            ("courses", _("Courses")),
        )
    )

    audit_rows = (
        AuditLog.objects.select_related("actor").order_by("-created_at")[:ACTIVITY_LIMIT]
    )
    audit_activity = tuple(
        AuditActivity(
            action=row.action,
            actor=str(row.actor.email) if row.actor is not None else str(_("System")),
            created_at=row.created_at,
        )
        for row in audit_rows
    )

    return DashboardData(
        kpis=kpis,
        charts=charts,
        pipeline=pipeline,
        content_status=content_status,
        audit_activity=audit_activity,
        admin_activity=_admin_activity(request),
        conversion_rate=conversion_rate,
        generated_at=numbers.get("generated_at"),
    )


__all__ = [
    "AdminActivity",
    "AuditActivity",
    "Chart",
    "ChartPoint",
    "ContentStatusRow",
    "DashboardData",
    "Kpi",
    "PipelineItem",
    "build_dashboard",
]
