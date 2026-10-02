"""Guard 4 — seed the versioned blocklist so it exists right after deploy.

The rows are inlined on purpose: the version string is part of the data contract and must
never change meaning retroactively when ``apps/scanner/blocklist.py`` is edited.
"""

from django.db import migrations

VERSION = "blocklist-1404.07.1"

GOV = ("gov.ir", "gov", "mil.ir", "ac.ir", "police.ir", "mfa.ir")
PRIVATE = ("localhost", "local", "internal", "intranet", "lan", "home.arpa", "in-addr.arpa", "ip6.arpa")
BULK = (r"[,\s]", r"\*", r"/\d{1,3}$", r"^(\d{1,3}\.){3}\d{1,3}-\d{1,3}$")

NOTES = {
    "gov": ("دامنه‌های دولتی/حساس در فهرست مسدود هستند.", "Sensitive government domains are blocklisted."),
    "private": ("آدرس‌های داخلی و localhost اسکن نمی‌شوند.", "Private addresses and localhost are never checked."),
    "bulk": (
        "ورودی شبیه اسکن انبوه است؛ فقط یک دامنهٔ ساده پذیرفته می‌شود.",
        "Input looks like a mass scan; only a single plain domain is accepted.",
    ),
}


def seed(apps, schema_editor):
    BlocklistEntry = apps.get_model("scanner", "BlocklistEntry")
    rows = [("gov", item) for item in GOV]
    rows += [("private", item) for item in PRIVATE]
    rows += [("bulk", item) for item in BULK]
    for kind, pattern in rows:
        note_fa, note_en = NOTES[kind]
        BlocklistEntry.objects.get_or_create(
            version=VERSION,
            pattern=pattern,
            defaults={"kind": kind, "note_fa": note_fa, "note_en": note_en},
        )


def unseed(apps, schema_editor):
    BlocklistEntry = apps.get_model("scanner", "BlocklistEntry")
    BlocklistEntry.objects.filter(version=VERSION).delete()


class Migration(migrations.Migration):
    dependencies = [("scanner", "0002_alter_scanresult_options_and_more")]
    operations = [migrations.RunPython(seed, unseed)]
