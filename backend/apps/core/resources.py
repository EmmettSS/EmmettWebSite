"""منابع صادرات/واردات مشترک — فاز ۶ (ADR-0029).

هر اپ ``resources.py`` خودش را دارد و منابع را از این پایه می‌سازد. قاعده‌های
مشترک اینجا متمرکز شده‌اند تا هیچ منبعی تصادفی «همهٔ فیلدها» را صادر نکند:

1. **فهرست فیلدهای صریح** (``fields``/``export_order`` در هر منبع): هیچ فیلد
   داخلی مثل ``id``، ``deleted_at``، ``checksum`` یا توکن اشتراک AI صادر نمی‌شود.
2. **فرمت‌های محدود**: فقط CSV/TSV/JSON (``emmett_export_formats``) — روشن،
   قابل باز شدن در Excel و قابل پردازش با ابزارهای خط فرمان، بدون وابستگی اضافه.
3. **صادرات دوزبانه**: برای مدل‌های ``django-modeltranslation``، هر دو زبان به
   شکل ستون‌های جدا (``title_fa`` / ``title_en`` و...) صادر می‌شوند؛ در واردات
   هم همین ستون‌ها مقداردهی می‌شوند (``i18n_fields``).
4. **نسخهٔ اسکیما**: نخستین ستون هر فایل صادرات ``schema_version`` است تا اگر
   ساختار منابع در آینده تغییر کند، فایل‌های قدیمی قابل تشخیص باشند.

امنیت (ADR-0029): ``IMPORT_EXPORT_ESCAPE_FORMULAE_ON_EXPORT`` در تنظیمات فعال
است تا مقادیر ورودی کاربر (مثلاً پیام فرم تماس) هنگام باز شدن در Excel به
فرمول اجراشدنی تبدیل نشوند (CSV/formula injection).
"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any

from import_export import fields, resources, widgets
from import_export.formats import base_formats

#: نسخهٔ فایل صادرات — با تغییر ساختار منابع این عدد بالا می‌رود (ADR-0029).
EXPORT_SCHEMA_VERSION = "1"

#: نام ستون نسخه در فایل صادرات.
SCHEMA_VERSION_FIELD = "schema_version"

#: زبان‌های محتوایی پروژه (هم‌راستا با ``settings.LANGUAGES``).
CONTENT_LANGUAGES: Sequence[str] = ("fa", "en")


def emmett_export_formats() -> Sequence[type[base_formats.Format]]:
    """فرمت‌های مجاز پروژه: CSV (پیش‌فرض Excel)، TSV و JSON."""

    return (base_formats.CSV, base_formats.TSV, base_formats.JSON)


def i18n_fields(base: Sequence[str], translated: Sequence[str]) -> list[str]:
    """ترکیب ستون‌های پایه با ستون‌های دوزبانهٔ modeltranslation.

    مثال::

        i18n_fields(("slug", "status"), ("title", "summary"))
        # → ["schema_version", "slug", "status", "title_fa", "title_en", "summary_fa", "summary_en"]
    """

    columns: list[str] = [SCHEMA_VERSION_FIELD, *base]
    for name in translated:
        columns.extend(f"{name}_{language}" for language in CONTENT_LANGUAGES)
    return columns


class EmmettResource(resources.ModelResource):  # type: ignore[misc]
    """پایهٔ منابع پروژه — ستون ``schema_version`` را همیشه در فایل می‌گذارد."""

    schema_version = fields.Field(column_name=SCHEMA_VERSION_FIELD, readonly=True)

    def dehydrate_schema_version(self, instance: Any) -> str:
        """مقدار ثابت نسخهٔ اسکیما در هر ردیف صادرات (ردیابی مهاجرت داده)."""

        return EXPORT_SCHEMA_VERSION

    def get_import_fields(self) -> list[Any]:
        """ستون ``schema_version`` فقط برای صادرات است، نه واردات.

        این فیلد «مجازی» است و به هیچ صفت مدل وصل نیست؛ اگر در فهرست واردات
        بماند، مقایسهٔ ``skip_unchanged`` همیشه «تغییر» می‌بیند و فایل
        دست‌نخورده‌ای که همین حالا صادر شده هم هر بار رکورد را update می‌کند.
        این باگ با تست idempotency فاز ۶ کشف و اینجا رفع شد.
        """

        import_fields = [
            field
            for field in super().get_import_fields()
            if field.column_name != SCHEMA_VERSION_FIELD
        ]

        return import_fields

    def skip_row(
        self,
        instance: Any,
        original: Any,
        row: Any,
        import_validation_errors: Any = None,
    ) -> bool:
        """``skip_unchanged`` را با نرمال‌سازی «"" == None» دقیق می‌کند.

        چرا لازم است: ستون‌های ترجمهٔ ``django-modeltranslation`` در دیتابیس
        ``null=True`` هستند و مقدار خالی می‌تواند ``NULL`` (ستون‌های ``_en``) یا
        ``""`` (ستون‌های پرشده با fallback) باشد. مقایسهٔ سادهٔ ``field.get_value``
        این دو را «متفاوت» می‌بیند و فایل صادرشدهٔ دست‌نخورده هم به‌جای
        ``skip`` شدن، ردیف را update می‌کند؛ یعنی رفت‌وبرگشت idempotent نبود
        (کشف‌شده با تست idempotency فاز ۶).
        """

        if super().skip_row(instance, original, row, import_validation_errors=import_validation_errors):
            return True

        meta = self._meta
        if not meta.skip_unchanged or meta.skip_diff or import_validation_errors:
            return False
        if original.pk is None:
            return False

        import_fields = self.get_import_fields()
        if any(isinstance(field.widget, widgets.ManyToManyWidget) for field in import_fields):
            return False

        def normalize(value: Any) -> Any:
            return None if isinstance(value, str) and value == "" else value

        for field in import_fields:
            if normalize(field.get_value(instance)) != normalize(field.get_value(original)):
                return False
        return True


__all__ = [
    "CONTENT_LANGUAGES",
    "EXPORT_SCHEMA_VERSION",
    "SCHEMA_VERSION_FIELD",
    "EmmettResource",
    "emmett_export_formats",
    "i18n_fields",
]


# ---------------------------------------------------------------------------
# منابع مدل‌های هستهٔ پروژه
# ---------------------------------------------------------------------------
# چرا این‌ها داخل core/resources.py هستند (و نه یک منابع اختصاصی برای هر مدل):
# همه به اپ ``core`` تعلق دارند و ساختار فیلدهایشان ساده/تخت است؛ جدا کردنشان
# فقط تعداد فایل را بالا می‌برد بدون هیچ سود معماری.
from django.contrib.admin.models import LogEntry  # noqa: E402

from apps.core.models import (  # noqa: E402
    AuditLog,
    Media,
    SearchIndexEntry,
    Translation,
)


class AuditLogResource(EmmettResource):
    """صادرات لاگ حسابرسی (بدون امکان واردات — ADR-0029)."""

    class Meta:
        model = AuditLog
        fields = (
            "schema_version",
            "created_at",
            "action",
            "actor",
            "target_content_type",
            "target_object_id",
            "ip_address",
            "user_agent",
        )
        export_order = fields


class MediaResource(EmmettResource):
    """صادرات فراداده (metadata) رسانه‌ها — بدون فایل باینری و بدون واردات."""

    class Meta:
        model = Media
        fields = (
            "schema_version",
            "media_type",
            "file",
            "alt_text_fa",
            "alt_text_en",
            "caption_fa",
            "caption_en",
            "width",
            "height",
            "file_size",
            "mime_type",
            "created_at",
        )
        export_order = fields


class TranslationResource(EmmettResource):
    """صادرات/واردات رشته‌های پویای ترجمه (مدیریت i18n در ادمین)."""

    class Meta:
        model = Translation
        fields = (
            "schema_version",
            "namespace",
            "key",
            "locale",
            "value",
            "is_html",
            "updated_at",
        )
        export_order = fields
        import_id_fields = ("namespace", "key", "locale")


class SearchIndexEntryResource(EmmettResource):
    """صادرات جدول ایندکس جست‌وجو (خودکار از سیگنال‌ها پر می‌شود) — فقط صادرات.

    پیش از فاز ۶ این ادمین ``resource_class`` نداشت و پکیج به‌صورت خودکار یک
    منبع می‌ساخت؛ یعنی فهرست ستون‌ها به تغییرات مدل وابسته بود. تعریف صریح،
    خروجی پایدار و قابل‌تست می‌دهد (همان قراردادی که ADR-0029 می‌خواهد).
    """

    class Meta:
        model = SearchIndexEntry
        fields = (
            "schema_version",
            "content_type",
            "object_id",
            "title",
            "body",
            "locale",
            "url_path",
            "updated_at",
        )
        export_order = fields


class LogEntryResource(EmmettResource):
    """صادرات رخدادهای ادمین (``django.contrib.admin``) — فقط صادرات."""

    class Meta:
        model = LogEntry
        fields = (
            "schema_version",
            "action_time",
            "user",
            "content_type",
            "object_id",
            "object_repr",
            "action_flag",
            "change_message",
        )
        export_order = fields
