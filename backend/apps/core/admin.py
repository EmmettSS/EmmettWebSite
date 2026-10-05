"""ادمین اپ ``core`` — زیرساخت مشترک، ترجمه‌ها، رسانه و لاگ‌ها (فاز ۶).

این فایل در فاز ۶ بازنویسی شد تا:

- ``admin.LogEntry`` (لاگ تغییرات ادمین) **قابل مشاهده و جست‌وجو** شود؛ تا
  امروز هیچ راهی برای دیدن «چه کسی چه چیزی را عوض کرد» در پنل وجود نداشت.
- ``core.Translation`` (رشته‌های پویا — ADR-0003) مدیریت حرفه‌ای‌تری بگیرد:
  فیلتر «کامل‌بودن ترجمه»، اکشن «ساخت ردیف زبان غایب» و صادرات/واردات JSON.
- مدل‌های فقط‌خواندنی (AuditLog/SearchIndexEntry/LogEntry) صادرات کنترل‌شده
  داشته باشند بدون هیچ راه واردات (ADR-0029).
"""

from __future__ import annotations

from typing import Any

from django.conf import settings
from django.contrib import admin, messages
from django.contrib.admin.models import LogEntry
from django.http import HttpRequest
from django.utils.translation import gettext_lazy as _
from modeltranslation.admin import TranslationAdmin

from apps.accounts.models import User
from apps.core.admin_filters import TranslationCompletenessFilter
from apps.core.admin_mixins import (
    EmmettAdminDefaults,
    EmmettImportExportAdmin,
    ImportDisabledMixin,
    RecordStateFilter,
    SoftDeleteAdminMixin,
)
from apps.core.models import AuditLog, Media, SearchIndexEntry, SiteSettings, Translation, log_action
from apps.core.resources import (
    AuditLogResource,
    LogEntryResource,
    MediaResource,
    SearchIndexEntryResource,
    TranslationResource,
)

# ---------------------------------------------------------------------------
# لاگ‌ها
# ---------------------------------------------------------------------------


@admin.register(AuditLog)
class AuditLogAdmin(ImportDisabledMixin, EmmettImportExportAdmin):
    """حسابرسی فقط‌خواندنی (ADR-0013) — حذف فقط برای ابرکاربر (نگه‌داری قانونی)."""

    resource_class = AuditLogResource
    list_display = ("action", "actor", "target_content_type", "ip_address", "created_at")
    list_filter = ("action", "target_content_type", "created_at")
    search_fields = ("action", "ip_address", "user_agent", "actor__email")
    readonly_fields = [f.name for f in AuditLog._meta.fields]
    date_hierarchy = "created_at"
    list_select_related = ("actor", "target_content_type")

    def get_queryset(self, request: HttpRequest) -> Any:
        # شامل رکوردهای حذف‌شدهٔ نرم هم می‌شود چون این یک مدل حسابرسی است.
        return AuditLog.all_objects.select_related("actor", "target_content_type")

    def has_add_permission(self, request: HttpRequest) -> bool:
        return False

    def has_change_permission(self, request: HttpRequest, obj: AuditLog | None = None) -> bool:
        return False

    def has_delete_permission(self, request: HttpRequest, obj: AuditLog | None = None) -> bool:
        return request.user.is_superuser


@admin.register(LogEntry)
class LogEntryAdmin(ImportDisabledMixin, EmmettImportExportAdmin):
    """لاگ تغییرات ادمین (ساخت خود Django) — فقط‌خواندنی + قابل صادرات.

    مکمل ``AuditLog`` است: اینجا همهٔ add/change/delete فرم‌های ادمین با diff
    ثبت می‌شوند؛ اقدامات گروهی/حساس در ``AuditLog`` (ADR-0028).
    """

    resource_class = LogEntryResource
    list_display = ("action_time", "user", "content_type", "object_repr", "action_flag", "short_message")
    list_filter = ("action_flag", "content_type", "user", "action_time")
    search_fields = ("object_repr", "change_message", "user__email")
    date_hierarchy = "action_time"
    list_select_related = ("user", "content_type")
    ordering = ("-action_time",)
    fields = (
        "action_time",
        "user",
        "content_type",
        "object_id",
        "object_repr",
        "action_flag",
        "change_message",
    )
    readonly_fields = fields

    @admin.display(description=_("Change summary"))
    def short_message(self, obj: LogEntry) -> str:
        """خلاصهٔ یک‌خطی diff (متن JSON خام در ستون نمایش داده نمی‌شود)."""

        message = (obj.change_message or "").strip()
        if not message:
            return "—"
        return message if len(message) <= 90 else f"{message[:89]}…"

    def has_add_permission(self, request: HttpRequest) -> bool:
        return False

    def has_change_permission(self, request: HttpRequest, obj: LogEntry | None = None) -> bool:
        return False

    def has_delete_permission(self, request: HttpRequest, obj: LogEntry | None = None) -> bool:
        return request.user.is_superuser


# ---------------------------------------------------------------------------
# رسانه
# ---------------------------------------------------------------------------


@admin.register(Media)
class MediaAdmin(
    ImportDisabledMixin, SoftDeleteAdminMixin, TranslationAdmin[Media], EmmettImportExportAdmin
):
    """رسانه + نرم‌حذف قابل‌بازگردانی (ADR-0012): پیش از این، حذف یک ردیف رسانه
    آن را برای همیشه از دید پنل پنهان می‌کرد چون فیلتر «وضعیت رکورد» و اکشن
    «بازگردانی» وجود نداشت (کشف‌شده با تست سطح ادمین فاز ۶)."""

    resource_class = MediaResource
    list_display = ("file", "media_type", "file_size", "mime_type", "uploaded_by", "is_deleted", "created_at")
    list_filter = ("media_type", "created_at", RecordStateFilter)
    search_fields = ("file", "alt_text_fa", "alt_text_en", "caption_fa", "caption_en")
    readonly_fields = ("file_size", "mime_type", "checksum", "width", "height")
    date_hierarchy = "created_at"
    list_select_related = ("uploaded_by",)
    autocomplete_fields = ("uploaded_by",)


# ---------------------------------------------------------------------------
# ترجمه‌های پویا (ADR-0003)
# ---------------------------------------------------------------------------


@admin.register(Translation)
class TranslationEntryAdmin(EmmettImportExportAdmin):
    """مدیریت رشته‌های پویای ترجمه + فیلتر «کامل‌بودن زبان‌ها» + اکشن ساخت ردیف غایب.

    توجه: ``core.Translation`` برخلاف بقیهٔ مدل‌ها از ``BaseModel`` ارث نمی‌برد
    (جدول key-value سبک، بدون نرم‌حذف — ADR-0003)، پس ``SoftDeleteAdminMixin``
    و فیلتر «وضعیت رکورد» عمداً روی آن اعمال **نمی‌شود**؛ اعمال‌کردنشان باعث
    ``FieldError: Cannot resolve keyword 'deleted_at'`` در فهرست ادمین می‌شد
    (کشف‌شده با تست جست‌وجوی فاز ۶).
    """

    resource_class = TranslationResource
    list_display = ("namespace", "key", "locale", "short_value", "is_html", "updated_at", "updated_by")
    list_filter = ("namespace", "locale", "is_html", TranslationCompletenessFilter)
    search_fields = ("namespace", "key", "value")
    autocomplete_fields = ("updated_by",)
    list_select_related = ("updated_by",)
    list_editable = ("is_html",)
    actions = ("create_missing_locale",)

    @admin.display(description=_("Value"))
    def short_value(self, obj: Translation) -> str:
        value = (obj.value or "").strip()
        return value if len(value) <= 70 else f"{value[:69]}…"

    def save_model(self, request: HttpRequest, obj: Translation, form: Any, change: bool) -> None:
        obj.updated_by = request.user if isinstance(request.user, User) else None
        super().save_model(request, obj, form, change)
        log_action(
            action=f"core.translation_{'updated' if change else 'created'}",
            actor=request.user,
            target=obj,
            metadata={"namespace": obj.namespace, "key": obj.key, "locale": obj.locale},
        )

    @admin.action(description=_("Create the missing language row for selected entries"))
    def create_missing_locale(self, request: HttpRequest, queryset: Any) -> None:
        """برای هر کلید انتخاب‌شده، ردیف زبان غایب را خالی می‌سازد تا مترجم پرش کند."""

        created = 0
        keys = {(entry.namespace, entry.key) for entry in queryset}
        for namespace, key in sorted(keys):
            existing = set(
                Translation.objects.filter(namespace=namespace, key=key).values_list(
                    "locale", flat=True
                )
            )
            for locale, _label in settings.LANGUAGES:
                if locale in existing:
                    continue
                Translation.objects.create(
                    namespace=namespace,
                    key=key,
                    locale=locale,
                    value="",
                    updated_by=request.user if isinstance(request.user, User) else None,
                )
                created += 1

        if created:
            log_action(
                action="core.translation_locale_rows_created",
                actor=request.user,
                metadata={"created": created},
            )
            self.message_user(
                request,
                _("Created %(count)s translation row(s).") % {"count": created},
                messages.SUCCESS,
            )
        else:
            self.message_user(request, _("All selected entries already exist in both languages."))


# ---------------------------------------------------------------------------
# تنظیمات سایت و ایندکس جست‌وجو
# ---------------------------------------------------------------------------


@admin.register(SiteSettings)
class SiteSettingsAdmin(TranslationAdmin[SiteSettings], EmmettAdminDefaults):
    """Singleton — فقط یک ردیف (pk=1) مجاز است (ADR-0001/ADR-0003)."""

    list_display = ("site_name", "default_locale", "contact_email", "contact_phone", "maintenance_mode")

    def has_add_permission(self, request: HttpRequest) -> bool:
        return not SiteSettings.objects.exists()

    def has_delete_permission(self, request: HttpRequest, obj: SiteSettings | None = None) -> bool:
        return False


@admin.register(SearchIndexEntry)
class SearchIndexEntryAdmin(ImportDisabledMixin, EmmettImportExportAdmin):
    """فقط‌خواندنی — این جدول خودکار از طریق سیگنال‌های هر اپ همگام می‌شود."""

    resource_class = SearchIndexEntryResource
    list_display = ("content_type", "title", "locale", "url_path", "updated_at")
    list_filter = ("content_type", "locale")
    search_fields = ("title", "body", "url_path")
    readonly_fields = [f.name for f in SearchIndexEntry._meta.fields]
    date_hierarchy = "updated_at"

    def has_add_permission(self, request: HttpRequest) -> bool:
        return False

    def has_change_permission(self, request: HttpRequest, obj: SearchIndexEntry | None = None) -> bool:
        return False

    def has_import_permission(self, request: HttpRequest, obj: Any | None = None) -> bool:
        return False
