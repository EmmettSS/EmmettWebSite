"""Public tool catalog (G1: every live tool links to the artifact that proves it).

Keep in sync with ``web/src/features/registry.ts``: the terminal command ``tools`` renders this
list verbatim, so a tool that is not actually live must never appear here as ``live``.
"""

TOOL_CATALOG = (
    {
        "id": "jalali",
        "status": "live",
        "version": "1.0.0",
        "capability": "backend",
        "title_fa": "محاسبات تاریخ شمسی",
        "title_en": "Jalali date calculator",
        "path_fa": "/fa/tools/tarikh-shamsi/",
        "path_en": "/en/tools/jalali-date/",
    },
    {
        "id": "kod-meli",
        "status": "live",
        "version": "1.0.0",
        "capability": "security",
        "title_fa": "اعتبارسنج کد ملی و شناسهٔ ملی",
        "title_en": "National ID validator",
        "path_fa": "/fa/tools/kod-meli/",
        "path_en": "/en/tools/national-id/",
    },
    {
        "id": "toman",
        "status": "live",
        "version": "1.0.0",
        "capability": "frontend",
        "title_fa": "فرمت‌کنندهٔ تومان و حروف‌نویسی چک",
        "title_en": "Toman formatter and cheque wording",
        "path_fa": "/fa/tools/toman/",
        "path_en": "/en/tools/toman/",
    },
    {
        "id": "matn-farsi",
        "status": "live",
        "version": "1.0.0",
        "capability": "frontend",
        "title_fa": "نرمال‌ساز متن فارسی",
        "title_en": "Persian text normaliser",
        "path_fa": "/fa/tools/matn-farsi/",
        "path_en": "/en/tools/persian-text/",
    },
    {
        "id": "jwt",
        "status": "live",
        "version": "1.0.0",
        "capability": "security",
        "title_fa": "دیباگر JWT",
        "title_en": "JWT debugger",
        "path_fa": "/fa/tools/jwt/",
        "path_en": "/en/tools/jwt/",
    },
)

TOOL_IDS = tuple(tool["id"] for tool in TOOL_CATALOG)


def localized_items(lang: str):
    items = []
    for tool in TOOL_CATALOG:
        items.append(
            {
                "id": tool["id"],
                "title": tool["title_en"] if lang == "en" else tool["title_fa"],
                "title_fa": tool["title_fa"],
                "title_en": tool["title_en"],
                "status": tool["status"],
                "version": tool["version"],
                "capability": tool["capability"],
                "path": tool["path_en"] if lang == "en" else tool["path_fa"],
                "evidence_url": tool["path_en"] if lang == "en" else tool["path_fa"],
            }
        )
    return items
