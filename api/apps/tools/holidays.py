"""Versioned holiday seed data (F-01: “جدول تعطیلات = دادهٔ نسخه‌دار در DB”).

Only *fixed solar* official public holidays are seeded here: they are stable calendar facts and
verifiable without an external source. Lunar/religious holidays shift every year and are NOT
invented — they are tracked as an explicit open item (`docs/OPEN-ITEMS.md`) until verified data
is supplied. The API reports this honestly through ``coverage``/``note_fa``/``note_en``.
"""

CALENDAR_VERSION = "solar-fixed-1404.1"
CALENDAR_SOURCE = "Official Iranian public holidays — fixed solar dates only"
NOTE_FA = "تعطیلات ثابت شمسی؛ تعطیلات مذهبی (قمری) پس از تأیید داده اضافه می‌شود."
NOTE_EN = "Fixed solar holidays only; lunar religious holidays are added once verified."

# (month, day, label_fa, label_en)
SOLAR_HOLIDAYS = (
    (1, 1, "نوروز", "Nowruz"),
    (1, 2, "نوروز", "Nowruz"),
    (1, 3, "نوروز", "Nowruz"),
    (1, 4, "نوروز", "Nowruz"),
    (1, 12, "روز جمهوری اسلامی", "Islamic Republic Day"),
    (1, 13, "روز طبیعت", "Nature Day"),
    (3, 14, "رحلت امام خمینی", "Demise of Imam Khomeini"),
    (3, 15, "قیام ۱۵ خرداد", "Khordad 15 uprising"),
    (11, 22, "پیروزی انقلاب اسلامی", "Victory of the Islamic Revolution"),
    (12, 29, "روز ملی شدن صنعت نفت", "Nationalisation of the Oil Industry"),
)

SEEDED_YEARS = (1404, 1405, 1406)


def seed_calendars():
    """Idempotently creates the versioned calendars and their fixed solar holidays."""
    from .models import Holiday, HolidayCalendar

    created = 0
    for year in SEEDED_YEARS:
        calendar, is_new = HolidayCalendar.objects.get_or_create(
            year=year,
            defaults={
                "version": CALENDAR_VERSION,
                "source": CALENDAR_SOURCE,
                "coverage": "solar-fixed",
                "note_fa": NOTE_FA,
                "note_en": NOTE_EN,
            },
        )
        if not is_new and calendar.version != CALENDAR_VERSION:
            calendar.version = CALENDAR_VERSION
            calendar.save(update_fields=["version"])
        for month, day, label_fa, label_en in SOLAR_HOLIDAYS:
            _, item_created = Holiday.objects.get_or_create(
                calendar=calendar,
                month=month,
                day=day,
                defaults={"label_fa": label_fa, "label_en": label_en, "kind": "solar"},
            )
            created += int(item_created)
    return created


def serialize_calendar(calendar):
    return {
        "year": calendar.year,
        "version": calendar.version,
        "source": calendar.source,
        "coverage": calendar.coverage,
        "note_fa": calendar.note_fa,
        "note_en": calendar.note_en,
        "items": [
            {
                "date": f"{calendar.year}/{item.month:02d}/{item.day:02d}",
                "label": item.label_fa,
                "label_en": item.label_en,
                "kind": item.kind,
            }
            for item in calendar.items.all()
        ],
    }
