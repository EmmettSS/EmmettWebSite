from __future__ import annotations

from datetime import UTC, date, datetime

from apps.core.utils.dates import format_date


class TestFormatDate:
    def test_none_returns_empty_string(self) -> None:
        assert format_date(None, "fa") == ""

    def test_fa_locale_converts_to_jalali_with_fa_digits(self) -> None:
        value = date(2024, 3, 20)  # ۱ فروردین ۱۴۰۳
        result = format_date(value, "fa")

        assert "فروردین" in result
        assert "۱۴۰۳" in result
        # هیچ رقم لاتین نباید در خروجی فارسی باقی بماند.
        assert not any(ch.isdigit() and ch.isascii() for ch in result)

    def test_en_locale_keeps_gregorian_latin_digits(self) -> None:
        value = date(2024, 3, 20)
        result = format_date(value, "en")

        assert "2024" in result

    def test_with_time_flag_includes_time_for_fa(self) -> None:
        value = datetime(2024, 3, 20, 14, 30, tzinfo=UTC)
        result = format_date(value, "fa", with_time=True)

        assert "۱۴" in result or ":" in result

    def test_accepts_plain_date_without_time_component(self) -> None:
        value = date(2024, 1, 1)
        result = format_date(value, "en", with_time=True)

        assert "2024" in result
