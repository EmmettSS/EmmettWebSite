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
from typing import Any

from django import template
from django.template.context import Context
from django.utils.translation import get_language

from apps.core.dashboard import DashboardData, build_dashboard
from apps.core.utils.dates import format_date
from apps.core.utils.numerals import format_number

register = template.Library()


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
