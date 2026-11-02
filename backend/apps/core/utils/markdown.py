"""رندر Markdown → HTML امن + استخراج TOC + تخمین زمان مطالعه (ADR-0022)."""

from __future__ import annotations

import math
import re
from collections.abc import Iterable
from typing import Any

import markdown as markdown_lib
import nh3

#: فقط تگ/ویژگی‌هایی که برای محتوای نویسندگان داخلی (نه کاربر عمومی) لازم است؛
#: هر چیز دیگر (script, iframe, style, onerror, ...) حذف می‌شود (قانون ۱۶).
_ALLOWED_TAGS = {
    "p",
    "br",
    "hr",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "strong",
    "em",
    "b",
    "i",
    "u",
    "s",
    "del",
    "ul",
    "ol",
    "li",
    "blockquote",
    "a",
    "img",
    "code",
    "pre",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
}
_ALLOWED_ATTRIBUTES = {
    # نکته: "rel" عمداً اینجا نیست — نسخهٔ پیش‌فرض nh3.clean() با
    # link_rel="noopener noreferrer" آن را خودکار به هر <a> اضافه می‌کند؛
    # لیست‌کردن صریح "rel" در attributes با آن تداخل کرده و ValueError می‌دهد.
    "a": {"href", "title", "target", "id"},
    "img": {"src", "alt", "title", "width", "height"},
    "h1": {"id"},
    "h2": {"id"},
    "h3": {"id"},
    "h4": {"id"},
    "h5": {"id"},
    "h6": {"id"},
    "code": {"class"},
}

_WORDS_PER_MINUTE_DEFAULT = 200
_WORD_SPLIT_RE = re.compile(r"\s+")


def render_markdown(raw_markdown: str) -> str:
    """Markdown را به HTML تبدیل و سپس با `nh3` پاک‌سازی (sanitize) می‌کند.

    افزونه‌های فعال: ``extra`` (جدول/کد Fenced و...)، ``tables``،
    ``fenced_code``، و ``toc`` (که به‌صورت خودکار ``id`` به هدینگ‌ها اضافه
    می‌کند — پیش‌نیاز ``extract_toc``).
    """

    if not raw_markdown.strip():
        return ""

    html = markdown_lib.markdown(
        raw_markdown,
        extensions=["extra", "tables", "fenced_code", "toc"],
        output_format="html",
    )
    return nh3.clean(html, tags=_ALLOWED_TAGS, attributes=_ALLOWED_ATTRIBUTES)


def extract_toc(html: str) -> list[dict[str, str]]:
    """فهرست هدینگ‌های h2/h3 (همراه با id تولیدشده توسط افزونهٔ toc) را استخراج می‌کند."""

    pattern = re.compile(r'<h([23])\s+id="([^"]+)">(.*?)</h\1>', re.DOTALL)
    toc: list[dict[str, str]] = []
    for match in pattern.finditer(html):
        level, heading_id, text = match.groups()
        clean_text = re.sub(r"<[^>]+>", "", text).strip()
        toc.append({"level": level, "id": heading_id, "text": clean_text})
    return toc


def estimate_reading_time(raw_markdown: str, words_per_minute: int = _WORDS_PER_MINUTE_DEFAULT) -> int:
    """تخمین زمان مطالعه به دقیقه؛ حداقل ۱ دقیقه برای هر محتوای غیرخالی."""

    plain_text = re.sub(r"[#*`>\-_\[\]()!]", " ", raw_markdown)
    word_count = len([w for w in _WORD_SPLIT_RE.split(plain_text.strip()) if w])
    if word_count == 0:
        return 0
    return max(1, math.ceil(word_count / words_per_minute))


def render_markdown_i18n_fields(instance: Any, field_names: Iterable[str]) -> None:
    """هر فیلد Markdown ثبت‌شده نزد modeltranslation را برای **هر دو** زبان رندر می‌کند.

    نکتهٔ حیاتی: داخل ``save()`` یک مدل، ``instance.<field>`` فقط مقدار زبان
    *فعال فعلی* درخواست را برمی‌گرداند (رفتار پیش‌فرض django-modeltranslation)،
    نه هر دو زبان. برای این‌که ``<field>_html`` همیشه برای fa **و** en به‌روز
    بماند (صرف‌نظر از این‌که ذخیره‌سازی زیر کدام locale درخواست اتفاق افتاده)،
    باید صریحاً از attributeهای ثابت ``<field>_fa``/``<field>_en`` (که
    modeltranslation همیشه فراهم می‌کند) بخوانیم و در ``<field>_html_fa``/
    ``<field>_html_en`` بنویسیم.
    """

    for field in field_names:
        for lang in ("fa", "en"):
            raw_value = getattr(instance, f"{field}_{lang}", "") or ""
            setattr(instance, f"{field}_html_{lang}", render_markdown(raw_value))


__all__ = [
    "render_markdown",
    "render_markdown_i18n_fields",
    "extract_toc",
    "estimate_reading_time",
]
