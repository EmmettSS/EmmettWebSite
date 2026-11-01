from __future__ import annotations

from apps.core.utils.numerals import format_number, to_fa_digits, to_latin_digits


class TestToFaDigits:
    def test_converts_latin_digits_in_string(self) -> None:
        assert to_fa_digits("2024") == "۲۰۲۴"

    def test_converts_int(self) -> None:
        assert to_fa_digits(1403) == "۱۴۰۳"

    def test_leaves_non_digit_characters_untouched(self) -> None:
        assert to_fa_digits("abc-123") == "abc-۱۲۳"


class TestToLatinDigits:
    def test_converts_fa_digits_back_to_latin(self) -> None:
        assert to_latin_digits("۱۴۰۳") == "1403"

    def test_roundtrip_with_to_fa_digits(self) -> None:
        original = "12345"
        assert to_latin_digits(to_fa_digits(original)) == original


class TestFormatNumber:
    def test_fa_locale_uses_fa_digits_and_thousands_separator(self) -> None:
        assert format_number(1234567, "fa") == "۱,۲۳۴,۵۶۷"

    def test_en_locale_uses_latin_digits_and_thousands_separator(self) -> None:
        assert format_number(1234567, "en") == "1,234,567"
