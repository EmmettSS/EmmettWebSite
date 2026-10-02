from django.db import migrations

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
VERSION = "solar-fixed-1404.1"


def seed(apps, schema_editor):
    HolidayCalendar = apps.get_model("tools", "HolidayCalendar")
    Holiday = apps.get_model("tools", "Holiday")
    for year in SEEDED_YEARS:
        calendar, _ = HolidayCalendar.objects.get_or_create(
            year=year,
            defaults={
                "version": VERSION,
                "source": "Official Iranian public holidays — fixed solar dates only",
                "coverage": "solar-fixed",
                "note_fa": "تعطیلات ثابت شمسی؛ تعطیلات مذهبی (قمری) پس از تأیید داده اضافه می‌شود.",
                "note_en": "Fixed solar holidays only; lunar religious holidays are added once verified.",
            },
        )
        for month, day, label_fa, label_en in SOLAR_HOLIDAYS:
            Holiday.objects.get_or_create(
                calendar=calendar,
                month=month,
                day=day,
                defaults={"label_fa": label_fa, "label_en": label_en, "kind": "solar"},
            )


def unseed(apps, schema_editor):
    HolidayCalendar = apps.get_model("tools", "HolidayCalendar")
    HolidayCalendar.objects.filter(year__in=SEEDED_YEARS).delete()


class Migration(migrations.Migration):
    dependencies = [("tools", "0002_holidaycalendar_holiday")]
    operations = [migrations.RunPython(seed, unseed)]
