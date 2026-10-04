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

from typing import Any, cast

from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models
from django.utils import timezone
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


__all__ = [
    "BaseQuerySet",
    "BaseManager",
    "AllObjectsManager",
    "BaseModel",
    "TimeStampedModel",
    "AuditLog",
    "log_action",
]
