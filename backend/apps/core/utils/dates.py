"""بومی‌سازی نمایش تاریخ — شمسی برای فارسی، میلادی برای انگلیسی (قانون ۱۰).

این ماژول دقیقاً همان gap مستندشده در `CHANGELOG.md`/`ARCHITECTURE.md` بخش ۶
را پر می‌کند: تا پیش از فاز ۴ هیچ پیاده‌سازی واقعی این قرارداد وجود نداشت،
فقط وابستگی `jdatetime` در `requirements.txt` پین شده بود.

قرارداد: دیتابیس همیشه UTC/میلادی استاندارد Django ذخیره می‌کند (هرگز شمسی
در DB)؛ تبدیل فقط در این لایهٔ نمایش (serializer field `*_display`، ایمیل/
پیامک اعلان، رابط ادمین) اتفاق می‌افتد.
"""

from __future__ import annotations

from datetime import date, datetime

import jdatetime
from django.utils import timezone

from apps.core.utils.numerals import to_fa_digits

_FA_MONTH_NAMES = [
    "فروردین",
    "اردیبهشت",
    "خرداد",
    "تیر",
    "مرداد",
    "شهریور",
    "مهر",
    "آبان",
    "آذر",
    "دی",
    "بهمن",
    "اسفند",
]


def format_date(
    value: datetime | date | None,
    locale: str,
    *,
    with_time: bool = False,
) -> str:
    """تاریخ را بر اساس locale فرمت می‌کند: ``fa`` → جلالی با ارقام فارسی، در غیر این صورت میلادی.

    ورودی ``None`` یا نامعتبر یک رشتهٔ خالی برمی‌گرداند (هرگز ``raise`` نمی‌کند
    — سازگار با همان قرارداد لایهٔ نمایش فرانت‌اند در ``frontend/src/lib/format/date.ts``،
    ر.ک. ADR-0019).
    """

    if value is None:
        return ""

    local_value: datetime | date
    if isinstance(value, datetime):
        local_value = timezone.localtime(value) if timezone.is_aware(value) else value
    else:
        local_value = value

    if locale == "fa":
        jalali = jdatetime.date.fromgregorian(date=local_value) if not isinstance(
            local_value, datetime
        ) else jdatetime.datetime.fromgregorian(datetime=local_value)
        month_name = _FA_MONTH_NAMES[jalali.month - 1]
        base = f"{jalali.day} {month_name} {jalali.year}"
        if with_time and isinstance(jalali, jdatetime.datetime):
            base += f"، {jalali.hour:02d}:{jalali.minute:02d}"
        return to_fa_digits(base)

    fmt = "%B %-d, %Y %H:%M" if with_time else "%B %-d, %Y"
    return local_value.strftime(fmt)


def format_today(locale: str) -> str:
    """امروز، فرمت‌شده مطابق قرارداد تقویم هر locale."""

    return format_date(timezone.localdate(), locale)


__all__ = ["format_date", "format_today"]
