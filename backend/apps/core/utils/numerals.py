"""تبدیل ارقام لاتین/فارسی — مکمل بک‌اند قانون ۱۰ (ر.ک. ADR-0019 برای نمونهٔ فرانت‌اند).

منطق این ماژول عمداً با `frontend/src/lib/format/number.ts` (تابع
`toLocaleDigits`) همسان نگه داشته شده تا رفتار دو سمت یکسان باشد.
"""

from __future__ import annotations

_FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹"
_EN_DIGITS = "0123456789"
_LATIN_TO_FA = str.maketrans(_EN_DIGITS, _FA_DIGITS)
_FA_TO_LATIN = str.maketrans(_FA_DIGITS, _EN_DIGITS)


def to_fa_digits(value: str | int | float) -> str:
    """ارقام لاتین داخل یک رشته (یا عدد) را به معادل فارسی تبدیل می‌کند."""

    return str(value).translate(_LATIN_TO_FA)


def to_latin_digits(value: str) -> str:
    """ارقام فارسی داخل یک رشته را به معادل لاتین تبدیل می‌کند (مثلاً ورودی فرم)."""

    return value.translate(_FA_TO_LATIN)


def format_number(value: int | float, locale: str) -> str:
    """عدد را با جداکنندهٔ هزارگان و سیستم ارقام مناسب locale فرمت می‌کند."""

    formatted = f"{value:,}"
    return to_fa_digits(formatted) if locale == "fa" else formatted


__all__ = ["to_fa_digits", "to_latin_digits", "format_number"]
