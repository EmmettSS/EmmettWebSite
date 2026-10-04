"""مدل‌ها و زیرساخت پایهٔ مشترک بین تمام اپ‌های دامنه‌ای.

این ماژول شامل:

- ``BaseQuerySet`` / ``BaseManager`` / ``AllObjectsManager``: الگوی مشترک
  Soft-Delete که تمام مدل‌های آیندهٔ پروژه باید از آن ارث‌بری کنند.
- ``BaseModel``: abstract base با ``created_at``, ``updated_at``, ``is_active``
  و حذف نرم (soft delete)، طبق خواستهٔ صریح فاز ۲.
- ``AuditLog``: اولین مدل واقعی ساخته‌شده روی این پایه؛ هم یک نیاز امنیتی
  مستقل (قانون ۱۶) است و هم نمونهٔ زندهٔ استفاده/تست ``BaseModel``.
"""

from __future__ import annotations

import os
import uuid
from typing import Any, cast

from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models
from django.utils import timezone
from django.utils.text import slugify
from django.utils.translation import gettext_lazy as _


class BaseQuerySet(models.QuerySet["BaseModel"]):
    """QuerySetی که عملیات حذف نرم (soft delete) را به‌صورت پیش‌فرض اعمال می‌کند."""

    def active(self) -> BaseQuerySet:
        """فقط رکوردهای فعال و حذف‌نشده."""

        return self.filter(is_active=True, deleted_at__isnull=True)

    def deleted(self) -> BaseQuerySet:
        """فقط رکوردهایی که به‌صورت نرم حذف شده‌اند (برای ادمین/بازیابی)."""

        return self.filter(deleted_at__isnull=False)

    def delete(self) -> tuple[int, dict[str, int]]:
        """Override سطح QuerySet: به‌جای DELETE واقعی، علامت‌گذاری نرم انجام می‌دهد."""

        count = self.update(is_active=False, deleted_at=timezone.now())
        return count, {self.model._meta.label: count}

    def hard_delete(self) -> tuple[int, dict[str, int]]:
        """حذف واقعی و برگشت‌ناپذیر از دیتابیس — فقط برای موارد استثنایی/انطباقی."""

        return super().delete()


class BaseManager(models.Manager.from_queryset(BaseQuerySet)):  # type: ignore[misc]
    """منیجر پیش‌فرض: رکوردهای حذف‌شده (نرم) را از دید عادی اپلیکیشن مخفی می‌کند."""

    def get_queryset(self) -> BaseQuerySet:
        qs = super().get_queryset().filter(deleted_at__isnull=True)
        return cast(BaseQuerySet, qs)


class AllObjectsManager(models.Manager.from_queryset(BaseQuerySet)):  # type: ignore[misc]
    """منیجر کامل: همهٔ رکوردها از جمله حذف‌شده‌های نرم (برای ادمین/حسابرسی)."""


class BaseModel(models.Model):
    """پایهٔ مشترک تمام مدل‌های دامنه‌ای پروژه.

    هر مدل جدید در هر اپ باید از این کلاس ارث‌بری کند مگر دلیل مستندی
    (در PR) برای عدم استفاده از آن وجود داشته باشد.
    """

    created_at = models.DateTimeField(_("created at"), auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(_("updated at"), auto_now=True)
    is_active = models.BooleanField(_("is active"), default=True, db_index=True)
    deleted_at = models.DateTimeField(_("deleted at"), null=True, blank=True, db_index=True)

    objects = BaseManager()
    all_objects = AllObjectsManager()

    class Meta:
        abstract = True
        ordering = ["-created_at"]

    def delete(
        self, using: str | None = None, keep_parents: bool = False, *, hard: bool = False
    ) -> tuple[int, dict[str, int]]:
        """پیش‌فرض: حذف نرم. برای حذف واقعی، ``hard=True`` صریح لازم است."""

        if hard:
            return super().delete(using=using, keep_parents=keep_parents)

        self.is_active = False
        self.deleted_at = timezone.now()
        self.save(update_fields=["is_active", "deleted_at", "updated_at"])
        return 1, {self._meta.label: 1}

    def restore(self) -> None:
        """بازگردانی یک رکورد حذف‌شدهٔ نرم."""

        self.is_active = True
        self.deleted_at = None
        self.save(update_fields=["is_active", "deleted_at", "updated_at"])


class TimeStampedModel(models.Model):
    """Mixin سبک‌تر برای مدل‌هایی که فقط به created_at/updated_at نیاز دارند."""

    created_at = models.DateTimeField(_("created at"), auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(_("updated at"), auto_now=True)

    class Meta:
        abstract = True


class AuditLog(BaseModel):
    """ثبت رویدادهای حساس امنیتی/کسب‌وکاری (قانون ۱۶).

    به‌جای وابستگی مستقیم به یک مدل خاص، از ``GenericForeignKey`` استفاده
    می‌شود تا هر اپ دامنه‌ای بدون نیاز به تغییر این مدل بتواند رویدادهای خود
    را ثبت کند (مثلاً تغییر وضعیت یک Lead، ورود ناموفق، تغییر نقش کاربر).
    """

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name=_("actor"),
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="audit_logs",
        help_text=_("کاربری که عملیات را انجام داده؛ خالی یعنی سیستم/کاربر مهمان."),
    )
    action = models.CharField(_("action"), max_length=100, db_index=True)
    target_content_type = models.ForeignKey(
        ContentType, null=True, blank=True, on_delete=models.SET_NULL
    )
    target_object_id = models.CharField(max_length=64, null=True, blank=True)
    target = GenericForeignKey("target_content_type", "target_object_id")
    metadata = models.JSONField(_("metadata"), default=dict, blank=True)
    ip_address = models.GenericIPAddressField(_("IP address"), null=True, blank=True)
    user_agent = models.CharField(_("user agent"), max_length=512, blank=True, default="")

    class Meta(BaseModel.Meta):
        verbose_name = _("Audit Log")
        verbose_name_plural = _("Audit Logs")
        indexes = [
            models.Index(fields=["action", "created_at"]),
            models.Index(fields=["target_content_type", "target_object_id"]),
        ]

    def __str__(self) -> str:  # pragma: no cover - صرفاً نمایشی
        return f"{self.action} @ {self.created_at:%Y-%m-%d %H:%M}"


def log_action(
    *,
    action: str,
    actor: Any | None = None,
    target: models.Model | None = None,
    metadata: dict[str, Any] | None = None,
    ip_address: str | None = None,
    user_agent: str = "",
) -> AuditLog:
    """تابع کمکی مرکزی برای ثبت یک رویداد در AuditLog.

    تمام اپ‌های دیگر (به‌جای ساخت مستقیم شیء ``AuditLog``) باید از همین تابع
    استفاده کنند تا منطق نگاشت target/ContentType در یک‌جا نگه‌داری شود.
    """

    entry = AuditLog(
        action=action,
        actor=actor,
        metadata=metadata or {},
        ip_address=ip_address,
        user_agent=user_agent[:512],
    )
    if target is not None:
        entry.target_content_type = ContentType.objects.get_for_model(target)
        entry.target_object_id = str(target.pk)
    entry.save()
    return entry


class PublishableModel(models.Model):
    """Mixin انتزاعی کنترل انتشار محتوا (ر.ک. `ARCHITECTURE.md` بخش ۳.۱).

    هر مدل محتوایی عمومی (Service/Project/Course/BlogPost/...) باید از این
    کلاس ارث‌بری کند تا نسخه‌های پیش‌نویس هرگز در API عمومی ظاهر نشوند.
    """

    class Status(models.TextChoices):
        DRAFT = "draft", _("Draft")
        PUBLISHED = "published", _("Published")
        ARCHIVED = "archived", _("Archived")

    status = models.CharField(
        _("status"), max_length=20, choices=Status.choices, default=Status.DRAFT, db_index=True
    )
    published_at = models.DateTimeField(_("published at"), null=True, blank=True, db_index=True)

    class Meta:
        abstract = True

    @property
    def is_published(self) -> bool:
        return self.status == self.Status.PUBLISHED


class SEOMetaModel(models.Model):
    """Mixin انتزاعی فیلدهای SEO مشترک (قانون ۱۷).

    ``og_image`` به ``Media`` ارجاع می‌دهد (پایین همین فایل)؛ هر مدلی که این
    Mixin را استفاده می‌کند باید `translation.py` خودش ``meta_title``/
    ``meta_description`` را به‌عنوان فیلد i18n ثبت کند.
    """

    meta_title = models.CharField(_("meta title"), max_length=70, blank=True, default="")
    meta_description = models.CharField(_("meta description"), max_length=160, blank=True, default="")
    og_image = models.ForeignKey(
        "core.Media",
        verbose_name=_("OG image"),
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    canonical_path = models.CharField(
        _("canonical path"),
        max_length=255,
        blank=True,
        default="",
        help_text=_("در صورت خالی بودن، مسیر پیش‌فرض صفحه به‌عنوان canonical استفاده می‌شود."),
    )

    class Meta:
        abstract = True


def media_upload_path(instance: Media, filename: str) -> str:
    """مسیر تاریخ‌محور آپلود طبق ADR-0005: جلوگیری از برخورد نام/افشای نام اصلی."""

    ext = os.path.splitext(filename)[1].lower()
    base_name = slugify(os.path.splitext(filename)[0])[:60] or "file"
    today = timezone.now()
    return (
        f"{instance.media_type}/{today:%Y}/{today:%m}/{uuid.uuid4().hex}_{base_name}{ext}"
    )


class Media(BaseModel):
    """منبع مرکزی فایل برای همهٔ اپ‌های محتوایی (ADR-0005)."""

    class MediaType(models.TextChoices):
        IMAGE = "image", _("Image")
        DOCUMENT = "document", _("Document")
        VIDEO = "video", _("Video")

    file = models.FileField(_("file"), upload_to=media_upload_path)
    media_type = models.CharField(_("media type"), max_length=20, choices=MediaType.choices)
    alt_text = models.CharField(_("alt text"), max_length=255, blank=True, default="")
    caption = models.CharField(_("caption"), max_length=255, blank=True, default="")
    width = models.PositiveIntegerField(_("width"), null=True, blank=True)
    height = models.PositiveIntegerField(_("height"), null=True, blank=True)
    file_size = models.PositiveIntegerField(_("file size (bytes)"), default=0)
    mime_type = models.CharField(_("MIME type"), max_length=100, blank=True, default="")
    checksum = models.CharField(_("checksum (sha256)"), max_length=64, blank=True, default="")
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name=_("uploaded by"),
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="uploaded_media",
    )

    class Meta(BaseModel.Meta):
        verbose_name = _("Media")
        verbose_name_plural = _("Media")

    def __str__(self) -> str:
        return self.file.name or f"Media #{self.pk}"


class Translation(models.Model):
    """رشته‌های پویای قابل‌ویرایش در ادمین، مکمل gettext (ADR-0003).

    برخلاف بقیهٔ مدل‌های این فایل، عمداً از ``BaseModel`` ارث‌بری نمی‌کند:
    این جدول یک key-value سبک است که نیازی به soft-delete ندارد (حذف یک
    رشتهٔ ترجمه باید واقعی و فوری باشد، نه بایگانی).
    """

    namespace = models.CharField(_("namespace"), max_length=100, db_index=True)
    key = models.CharField(_("key"), max_length=150)
    locale = models.CharField(_("locale"), max_length=5, choices=settings.LANGUAGES)
    value = models.TextField(_("value"), blank=True, default="")
    is_html = models.BooleanField(_("is HTML"), default=False)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name=_("updated by"),
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    updated_at = models.DateTimeField(_("updated at"), auto_now=True)

    class Meta:
        verbose_name = _("Translation")
        verbose_name_plural = _("Translations")
        constraints = [
            models.UniqueConstraint(
                fields=["namespace", "key", "locale"], name="unique_translation_entry"
            )
        ]

    def __str__(self) -> str:
        return f"{self.namespace}.{self.key} [{self.locale}]"


class SiteSettings(models.Model):
    """تنظیمات سراسری قابل‌ویرایش در ادمین — الگوی Singleton (یک ردیف ثابت ``pk=1``)."""

    site_name = models.CharField(_("site name"), max_length=100, default="Emmett")
    default_locale = models.CharField(_("default locale"), max_length=5, default="fa")
    contact_email = models.EmailField(_("contact email"), blank=True, default="")
    contact_phone = models.CharField(_("contact phone"), max_length=20, blank=True, default="")
    social_links = models.JSONField(_("social links"), default=dict, blank=True)
    maintenance_mode = models.BooleanField(_("maintenance mode"), default=False)

    class Meta:
        verbose_name = _("Site Settings")
        verbose_name_plural = _("Site Settings")

    def __str__(self) -> str:  # pragma: no cover
        return str(self.site_name)

    def save(self, *args: Any, **kwargs: Any) -> None:
        self.pk = 1
        super().save(*args, **kwargs)

    def delete(self, *args: Any, **kwargs: Any) -> tuple[int, dict[str, int]]:  # pragma: no cover
        return 0, {}

    @classmethod
    def load(cls) -> SiteSettings:
        obj, _created = cls.objects.get_or_create(pk=1)
        return obj


class SearchIndexEntry(models.Model):
    """جدول ایندکس جست‌وجوی سراسری (ADR-0021).

    هر اپ محتوایی قابل‌جست‌وجو (services/portfolio/academy/blog) از طریق
    ``apps.core.search.sync_search_index`` این جدول را به‌روز نگه می‌دارد؛
    خودِ FULLTEXT index (MySQL) / جدول مجازی FTS5 (SQLite) در یک migration
    اختصاصی و بر اساس ``connection.vendor`` ساخته می‌شود — نه اینجا.
    """

    content_type = models.CharField(_("content type"), max_length=30, db_index=True)
    object_id = models.PositiveBigIntegerField(_("object id"))
    public_id = models.UUIDField(_("public id"))
    locale = models.CharField(_("locale"), max_length=5, choices=settings.LANGUAGES)
    title = models.CharField(_("title"), max_length=255)
    body = models.TextField(_("body"), blank=True, default="")
    url_path = models.CharField(_("URL path"), max_length=255)
    category_label = models.CharField(_("category label"), max_length=100, blank=True, default="")
    updated_at = models.DateTimeField(_("updated at"), auto_now=True)

    class Meta:
        verbose_name = _("Search Index Entry")
        verbose_name_plural = _("Search Index Entries")
        constraints = [
            models.UniqueConstraint(
                fields=["content_type", "object_id", "locale"], name="unique_search_index_entry"
            )
        ]
        indexes = [models.Index(fields=["content_type", "locale"])]

    def __str__(self) -> str:  # pragma: no cover
        return f"[{self.locale}] {self.content_type}#{self.object_id}: {self.title}"


__all__ = [
    "BaseQuerySet",
    "BaseManager",
    "AllObjectsManager",
    "BaseModel",
    "TimeStampedModel",
    "AuditLog",
    "log_action",
    "PublishableModel",
    "SEOMetaModel",
    "Media",
    "media_upload_path",
    "Translation",
    "SiteSettings",
    "SearchIndexEntry",
]
