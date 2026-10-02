"""Jalali (Persian) calendar arithmetic.

Deliberate mirror of ``web/src/lib/jalali.ts`` — the same Borkowski algorithm and the same
range guard (1200–1500), so the server response and the in-browser fallback can never drift.
The parity test ``test_tools.py::test_jalali_matches_client_canonical_cases`` pins the anchors.
"""

BREAKS = (
    -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192,
    2262, 2324, 2394, 2456, 3178,
)
MIN_JALALI_YEAR = 1200
MAX_JALALI_YEAR = 1500


class OutOfRange(ValueError):
    pass


def _div(a: int, b: int) -> int:
    return int(a / b)  # truncation toward zero, matching JS Math.trunc


def _mod(a: int, b: int) -> int:
    return a - int(a / b) * b


def _jal_cal(jy: int):
    bl = len(BREAKS)
    gy = jy + 621
    leap_j = -14
    jp = BREAKS[0]
    jump = 0
    if jy < jp or jy >= BREAKS[bl - 1]:
        raise OutOfRange(f"Jalali year out of supported range: {jy}")
    for i in range(1, bl):
        jm = BREAKS[i]
        jump = jm - jp
        if jy < jm:
            break
        leap_j += _div(jump, 33) * 8 + _div(_mod(jump, 33), 4)
        jp = jm
    n = jy - jp
    leap_j += _div(n, 33) * 8 + _div(_mod(n, 33) + 3, 4)
    if _mod(jump, 33) == 4 and jump - n == 4:
        leap_j += 1
    leap_g = _div(gy, 4) - _div((_div(gy, 100) + 1) * 3, 4) - 150
    march = 20 + leap_j - leap_g
    if jump - n < 6:
        n = n - jump + _div(jump + 4, 33) * 33
    leap = _mod(_mod(n + 1, 33) - 1, 4)
    if leap == -1:
        leap = 4
    return leap, gy, march


def _g2d(gy: int, gm: int, gd: int) -> int:
    d = (
        _div((gy + _div(gm - 8, 6) + 100100) * 1461, 4)
        + _div(153 * _mod(gm + 9, 12) + 2, 5)
        + gd
        - 34840408
    )
    return d - _div(_div(gy + 100100 + _div(gm - 8, 6), 100) * 3, 4) + 752


def _d2g(jdn: int):
    j = 4 * jdn + 139361631
    j = j + _div(_div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908
    i = _div(_mod(j, 1461), 4) * 5 + 308
    gd = _div(_mod(i, 153), 5) + 1
    gm = _mod(_div(i, 153), 12) + 1
    gy = _div(j, 1461) - 100100 + _div(8 - gm, 6)
    return gy, gm, gd


def _j2d(jy: int, jm: int, jd: int) -> int:
    _, gy, march = _jal_cal(jy)
    return _g2d(gy, 3, march) + (jm - 1) * 31 - _div(jm, 7) * (jm - 7) + jd - 1


def _d2j(jdn: int):
    gy, _, _ = _d2g(jdn)
    jy = gy - 621
    leap, _, march = _jal_cal(jy)
    jdn1f = _g2d(gy, 3, march)
    k = jdn - jdn1f
    if k >= 0:
        if k <= 185:
            return jy, 1 + _div(k, 31), _mod(k, 31) + 1
        k -= 186
    else:
        jy -= 1
        k += 179
        if leap == 1:
            k += 1
    jm = 7 + _div(k, 30)
    jd = _mod(k, 30) + 1
    return jy, jm, jd


def is_leap_year(year: int) -> bool:
    leap, _, _ = _jal_cal(year)
    return leap == 0


def month_length(year: int, month: int) -> int:
    if month < 1 or month > 12:
        raise ValueError(f"Invalid Jalali month: {month}")
    if month <= 6:
        return 31
    if month <= 11:
        return 30
    return 30 if is_leap_year(year) else 29


def is_valid(year: int, month: int, day: int) -> bool:
    if year < MIN_JALALI_YEAR or year > MAX_JALALI_YEAR:
        return False
    if month < 1 or month > 12:
        return False
    return 1 <= day <= month_length(year, month)


def jalali_to_gregorian(year: int, month: int, day: int):
    if year < MIN_JALALI_YEAR or year > MAX_JALALI_YEAR:
        raise OutOfRange(f"Jalali year out of supported range: {year}")
    if not is_valid(year, month, day):
        raise ValueError(f"Invalid Jalali date: {year}-{month}-{day}")
    return _d2g(_j2d(year, month, day))


def gregorian_to_jalali(year: int, month: int, day: int):
    result = _d2j(_g2d(year, month, day))
    if result[0] < MIN_JALALI_YEAR or result[0] > MAX_JALALI_YEAR:
        raise OutOfRange(f"Gregorian date outside the supported Jalali range: {year}-{month}-{day}")
    return result


def jalali_to_day_number(year: int, month: int, day: int) -> int:
    return _j2d(year, month, day) - 2440588


def day_number_to_jalali(day_number: int):
    return _d2j(day_number + 2440588)


def jalali_weekday(year: int, month: int, day: int) -> int:
    """0 = Saturday (شنبه) … 6 = Friday (جمعه)."""
    return _mod(jalali_to_day_number(year, month, day) + 5, 7)


WEEKDAYS_FA = ("شنبه", "یک‌شنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه")
WEEKDAYS_EN = ("Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday")
MONTHS_FA = (
    "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
    "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
)
MONTHS_EN = (
    "Farvardin", "Ordibehesht", "Khordad", "Tir", "Mordad", "Shahrivar",
    "Mehr", "Aban", "Azar", "Dey", "Bahman", "Esfand",
)

PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹"
ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩"


def to_latin_digits(value: str) -> str:
    return value.translate(str.maketrans(PERSIAN_DIGITS + ARABIC_DIGITS, "01234567890123456789"))


def to_persian_digits(value) -> str:
    return str(value).translate(str.maketrans("0123456789", PERSIAN_DIGITS))


def format_numeric(year: int, month: int, day: int) -> str:
    return f"{year}/{month:02d}/{day:02d}"


def parse_jalali(value: str):
    """Accepts Persian/Arabic/Latin digits with ``/``, ``.`` or ``-`` separators."""
    normalized = to_latin_digits(str(value).strip()).replace(".", "/").replace("-", "/").replace("–", "/").replace("—", "/")
    normalized = "".join(normalized.split())
    parts = normalized.split("/")
    if len(parts) != 3 or not all(part.isdigit() for part in parts):
        return None
    year, month, day = (int(part) for part in parts)
    return (year, month, day) if is_valid(year, month, day) else None


def parse_gregorian(value: str):
    normalized = to_latin_digits(str(value).strip()).replace(".", "/").replace("-", "/").replace("–", "/").replace("—", "/")
    normalized = "".join(normalized.split())
    parts = normalized.split("/")
    if len(parts) != 3 or not all(part.isdigit() for part in parts):
        return None
    year, month, day = (int(part) for part in parts)
    import datetime

    try:
        datetime.date(year, month, day)
    except ValueError:
        return None
    return year, month, day
