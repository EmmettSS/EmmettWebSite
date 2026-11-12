"""تگ‌ها و فیلترهای قالب اختصاصی ادمین امیت — فاز ۶ (ADR-0028).

سه چیز اینجا متمرکز می‌شود تا قالب‌ها «منطق» نداشته باشند:

1. ``{% emmett_dashboard %}``: دادهٔ داشبورد را از ``apps.core.dashboard``
   می‌گیرد (کش‌شده/بهینه) و در قالب ``admin/index.html`` تزریق می‌کند.
2. ``emmett_number``: نمایش عدد با ارقام لاتین/فارسی بر اساس زبان فعال
   (قانون ۱۰) — همان تابع مشترک ``apps.core.utils.numerals``.
3. ``emmett_date`` / ``emmett_datetime``: تاریخ شمسی در فارسی و میلادی در
   انگلیسی (قانون ۱۰) — همان تابع مشترک ``apps.core.utils.dates``.
"""

from __future__ import annotations

from datetime import date, datetime
from math import isfinite
from typing import Any, cast

from django import template
from django.template.context import Context
from django.utils.translation import get_language

from apps.core.dashboard import DashboardData, build_dashboard
from apps.core.utils.dates import format_date
from apps.core.utils.numerals import format_number

register = template.Library()

_NAVIGATION_GROUPS: tuple[tuple[str, str, frozenset[str]], ...] = (
    ("content", "layers", frozenset({"services", "portfolio", "blog", "academy", "company", "taxonomy"})),
    ("operations", "activity", frozenset({"leads", "ai_engine"})),
    ("administration", "shield", frozenset({"accounts", "auth", "core"})),
)

_ICON_IDENTIFIERS = {
    "users": "users",
    "robot": "robot",
    "handshake": "handshake",
    "graduation": "graduation",
    "trend": "trend",
    "document": "document",
    "chart": "chart",
}


@register.simple_tag(takes_context=True)
def emmett_dashboard(context: Context) -> DashboardData:
    """دادهٔ داشبورد برای صفحهٔ index ادمین (خالیِ امن در نبود request)."""

    request = context.get("request")
    try:
        return build_dashboard(request)
    except Exception:  # pragma: no cover - داشبورد هرگز نباید مانع ورود ادمین شود
        from apps.core.logging import get_logger

        get_logger(__name__).exception("admin_dashboard_render_failed")
        return DashboardData()


@register.simple_tag(takes_context=True)
def emmett_navigation_groups(context: Context) -> list[dict[str, Any]]:
    available_apps = cast(list[dict[str, Any]], context.get("available_apps") or [])
    remaining = list(available_apps)
    groups: list[dict[str, Any]] = []

    for key, icon, app_labels in _NAVIGATION_GROUPS:
        group_apps = [app for app in remaining if str(app.get("app_label", "")) in app_labels]
        if group_apps:
            groups.append({"key": key, "icon": icon, "apps": group_apps})
            remaining = [app for app in remaining if app not in group_apps]

    if remaining:
        groups.append({"key": "other", "icon": "dots", "apps": remaining})

    return groups


@register.filter
def emmett_icon(value: Any) -> str:
    return _ICON_IDENTIFIERS.get(str(value), "chart")


@register.filter
def emmett_chart_height(value: Any) -> str:
    try:
        percentage = float(value)
    except (TypeError, ValueError):
        percentage = 0.0
    if not isfinite(percentage):
        percentage = 0.0
    bucket = max(0, min(10, round(percentage / 10)))
    return f"emmett-chart__bar--height-{bucket}"


@register.filter
def emmett_number(value: Any) -> str:
    """عدد را با جداکنندهٔ هزارگان و ارقام مناسب زبان فعال برمی‌گرداند."""

    if value is None or value == "":
        return ""
    if isinstance(value, (int, float)):
        return format_number(value, get_language() or "fa")
    return str(value)


@register.filter
def emmett_date(value: datetime | date | None) -> str:
    """تاریخ را بر اساس زبان فعال (شمسی/میلادی) فرمت می‌کند."""

    return format_date(value, get_language() or "fa")


@register.filter
def emmett_datetime(value: datetime | date | None) -> str:
    """تاریخ و ساعت را بر اساس زبان فعال (شمسی/میلادی) فرمت می‌کند."""

    return format_date(value, get_language() or "fa", with_time=True)
