"""اعتبارسنجی فایل آپلودی مدل ``core.Media`` طبق ADR-0005.

سه لایهٔ دفاعی مستقل:

1. Whitelist پسوند (``FileExtensionValidator``) — رد سریع قبل از باز کردن فایل.
2. محدودیت حجم بر اساس نوع رسانه (تصویر/سند) — مقادیر از ``.env`` خوانده
   می‌شوند تا بدون دیپلوی مجدد قابل تنظیم باشند.
3. بررسی سرنام (magic bytes) محتوای واقعی فایل — پسوند/``Content-Type`` ارسالی
   کاربر به‌تنهایی قابل‌اعتماد نیست (می‌تواند جعل شود). عمداً به جای افزودن
   وابستگی جدید (مثل ``python-magic`` که به ``libmagic`` سیستمی نیاز دارد)
   یک جدول کوچک سرنامِ بایت اول فایل‌های مجاز به‌صورت دستی بررسی می‌شود
   (قانون ۶ — بدون وابستگی غیرضروری).

اسکن ویروس با ``clamd`` (طبق ADR-0005) به‌صورت best-effort و فقط در صورت
در دسترس‌بودن سرویس روی هاست production انجام می‌شود؛ پیاده‌سازی آن خارج از
scope این فاز است و باید در فاز Deployment/Infra مشخص شود.
"""

from __future__ import annotations

from typing import Any

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.files.base import File
from django.core.validators import FileExtensionValidator
from django.utils.translation import gettext_lazy as _

#: پسوندهای مجاز طبق ADR-0005 (svg همیشه باید پس از آپلود sanitize شود — فاز بعد).
ALLOWED_MEDIA_EXTENSIONS: list[str] = ["jpg", "jpeg", "png", "webp", "svg", "pdf", "docx"]

media_extension_validator = FileExtensionValidator(allowed_extensions=ALLOWED_MEDIA_EXTENSIONS)

#: سرنام (magic bytes) شناخته‌شده به ازای هر پسوند — جایگزین سبک ``python-magic``.
_MAGIC_SIGNATURES: dict[str, tuple[bytes, ...]] = {
    "jpg": (b"\xff\xd8\xff",),
    "jpeg": (b"\xff\xd8\xff",),
    "png": (b"\x89PNG\r\n\x1a\n",),
    "webp": (b"RIFF",),  # بررسی کامل‌تر "WEBP" در آفست ۸ در validate_media_file انجام می‌شود.
    "pdf": (b"%PDF-",),
    "docx": (b"PK\x03\x04",),  # فایل docx یک بستهٔ ZIP است.
    # svg متن XML است؛ سرنام باینری ثابتی ندارد، پس اینجا بررسی نمی‌شود.
}


def _max_size_bytes(media_type: str) -> int:
    if media_type == "image":
        mb = getattr(settings, "MEDIA_MAX_IMAGE_SIZE_MB", 5)
    else:
        mb = getattr(settings, "MEDIA_MAX_DOCUMENT_SIZE_MB", 10)
    return int(mb) * 1024 * 1024


def validate_media_file_size(file_obj: File[Any], *, media_type: str) -> None:
    """بررسی حجم فایل بر اساس نوع رسانه (تصویر ≤۵MB، سند ≤۱۰MB به‌صورت پیش‌فرض)."""

    max_bytes = _max_size_bytes(media_type)
    if file_obj.size and file_obj.size > max_bytes:
        raise ValidationError(
            _("حجم فایل بیش از حد مجاز (%(max)s مگابایت) است.") % {"max": max_bytes // (1024 * 1024)}
        )


def validate_media_file_signature(file_obj: File[Any]) -> None:
    """بررسی سرنام بایت‌های ابتدایی فایل مطابق پسوند ادعاشده (ضد جعل پسوند)."""

    name = (file_obj.name or "").lower()
    ext = name.rsplit(".", 1)[-1] if "." in name else ""
    signatures = _MAGIC_SIGNATURES.get(ext)
    if signatures is None:
        return  # svg یا پسوند خارج از جدول — فقط به FileExtensionValidator تکیه می‌شود.

    file_obj.seek(0)
    header = file_obj.read(16)
    file_obj.seek(0)

    if not any(header.startswith(sig) for sig in signatures):
        raise ValidationError(_("محتوای فایل با پسوند اعلام‌شده مطابقت ندارد."))

    if ext == "webp" and header[8:12] != b"WEBP":
        raise ValidationError(_("محتوای فایل با پسوند اعلام‌شده مطابقت ندارد."))


__all__ = [
    "ALLOWED_MEDIA_EXTENSIONS",
    "media_extension_validator",
    "validate_media_file_signature",
    "validate_media_file_size",
]
