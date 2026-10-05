#!/usr/bin/env python3
"""تولید دارایی‌های ثابت برند ادمین از دارایی مرجع موجود در ریپو.

طبق ADR-0027 (پشتهٔ ادمین و تم‌بندی)، هیچ فایل طراحی جداگانه‌ای (``.fig``) در
ریپو وجود ندارد؛ تنها دارایی هویتی، لوژوتایپ مرجع در
``legacy-frontend-reference/src/imports/____.jpg`` است. این اسکریپت:

1. نشان‌نوشت (wordmark) افقی «Emmett │ Group / SOFTWARE DEVELOPMENT» را از
   تصویر مرجع جدا می‌کند و آن را روی یک کارتِ گردگوشهٔ تیره با پس‌زمینهٔ خودِ
   برند قرار می‌دهد؛ نتیجه روی هر دو تم روشن/تاریک ادمین خوانا می‌ماند
   (نشان‌نوشت مرجع «Group» را با متن روشن روی زمینهٔ تیره و کادر آبی نمایش
   می‌دهد و بدون زمینهٔ تیره در تم روشن ناخوانا می‌شد).
2. نشان مربعی (mark) و favicon را از «اسلش» برند می‌سازد؛ هندسه دقیقاً همان
   است که در ``static/brand/emmett-mark.svg`` رسم شده تا نشان و favicon و
   نسخهٔ برداری یکسان بمانند.

اجرا (تکرارپذیر — خروجی‌ها در گیت commit شده‌اند):

    cd backend && .venv/bin/python scripts/generate_brand_assets.py

Pillow از قبل در ``requirements.txt`` وجود دارد (مدل ``core.Media``)، پس این
اسکریپت هیچ وابستگی جدیدی اضافه نمی‌کند (قانون ۶).
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

SCRIPT_PATH = Path(__file__).resolve()
BACKEND_DIR = SCRIPT_PATH.parent.parent
REPO_ROOT = BACKEND_DIR.parent
SOURCE_IMAGE = REPO_ROOT / "legacy-frontend-reference" / "src" / "imports" / "____.jpg"
OUTPUT_DIR = BACKEND_DIR / "static" / "brand"

# ناحیهٔ کامل نشان‌نوشت در تصویر مرجع ۱۲۵۴×۱۲۵۴:
# کارت سفید «Emmett» + اسلش + کادر آبی «Group» + زیرنویس «SOFTWARE DEVELOPMENT».
WORDMARK_BOX = (288, 530, 1044, 790)

# رنگ‌های رسمی برند (هم‌سان با توکن‌های فرانت‌اند: ADR-0017).
BRAND_OBSIDIAN = (11, 12, 14)
BRAND_INDIGO = (91, 98, 224)
BRAND_EMERALD = (31, 174, 110)

MARK_RADIUS_RATIO = 0.22
MARK_SLASH = ((0.60, 0.19), (0.735, 0.19), (0.40, 0.81), (0.265, 0.81))


def build_wordmark() -> Image.Image:
    """نشان‌نوشت افقی روی کارت گردگوشهٔ مشاهده‌شده در تصویر مرجع."""

    image = Image.open(SOURCE_IMAGE).convert("RGB").crop(WORDMARK_BOX)

    radius = 18
    mask = Image.new("L", image.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [(0, 0), (image.width - 1, image.height - 1)], radius=radius, fill=255
    )

    wordmark = Image.new("RGBA", image.size, (0, 0, 0, 0))
    wordmark.paste(image.convert("RGBA"), (0, 0), mask)
    return wordmark


def build_mark(size: int) -> Image.Image:
    """نشان مربعی ادمین: پس‌زمینهٔ obsidian + اسلش emerald (هم‌هندسه با SVG)."""

    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle(
        [(0, 0), (size - 1, size - 1)], radius=int(size * MARK_RADIUS_RATIO), fill=BRAND_OBSIDIAN
    )
    border = max(1, int(size * 0.03))
    draw.rounded_rectangle(
        [(0, 0), (size - 1, size - 1)],
        radius=int(size * MARK_RADIUS_RATIO),
        outline=BRAND_INDIGO,
        width=border,
    )
    draw.polygon(
        [(x * size, y * size) for x, y in MARK_SLASH],
        fill=BRAND_EMERALD,
    )
    return image


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    wordmark = build_wordmark()
    wordmark.save(OUTPUT_DIR / "emmett-wordmark.png", optimize=True)
    print(f"wordmark: {wordmark.size} → {OUTPUT_DIR / 'emmett-wordmark.png'}")

    build_mark(192).save(OUTPUT_DIR / "emmett-logo-192.png", optimize=True)
    build_mark(512).save(
        OUTPUT_DIR / "emmett-favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)], format="ICO"
    )
    print(f"mark + favicon → {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
