from __future__ import annotations

from typing import Any

from django.contrib import admin
from django.http import HttpRequest
from modeltranslation.admin import TranslationAdmin

from apps.accounts.models import User
from apps.core.models import AuditLog, Media, SearchIndexEntry, SiteSettings, Translation


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin[AuditLog]):
    """ادمین فقط-خواندنی برای AuditLog — هیچ‌کس نباید رکورد حسابرسی را دستی ویرایش کند."""

    list_display = ("action", "actor", "target_content_type", "ip_address", "created_at")
    list_filter = ("action", "target_content_type", "created_at")
    search_fields = ("action", "ip_address", "user_agent")
    readonly_fields = [f.name for f in AuditLog._meta.fields]
    date_hierarchy = "created_at"

    def get_queryset(self, request: HttpRequest) -> Any:
        # شامل رکوردهای حذف‌شدهٔ نرم هم می‌شود چون این یک مدل حسابرسی است.
        return AuditLog.all_objects.all()

    def has_add_permission(self, request: HttpRequest) -> bool:
        return False

    def has_change_permission(self, request: HttpRequest, obj: AuditLog | None = None) -> bool:
        return False

    def has_delete_permission(self, request: HttpRequest, obj: AuditLog | None = None) -> bool:
        return request.user.is_superuser


@admin.register(Media)
class MediaAdmin(TranslationAdmin[Media]):
    list_display = ("file", "media_type", "file_size", "mime_type", "uploaded_by", "created_at")
    list_filter = ("media_type",)
    search_fields = ("file", "alt_text", "caption")
    readonly_fields = ("file_size", "mime_type", "checksum", "width", "height")


@admin.register(Translation)
class TranslationAdminModel(admin.ModelAdmin[Translation]):
    list_display = ("namespace", "key", "locale", "is_html", "updated_at", "updated_by")
    list_filter = ("namespace", "locale", "is_html")
    search_fields = ("namespace", "key", "value")

    def save_model(
        self, request: HttpRequest, obj: Translation, form: Any, change: bool
    ) -> None:
        obj.updated_by = request.user if isinstance(request.user, User) else None
        super().save_model(request, obj, form, change)


@admin.register(SiteSettings)
class SiteSettingsAdmin(TranslationAdmin[SiteSettings]):
    def has_add_permission(self, request: HttpRequest) -> bool:
        # Singleton — فقط یک ردیف (pk=1) مجاز است.
        return not SiteSettings.objects.exists()

    def has_delete_permission(self, request: HttpRequest, obj: SiteSettings | None = None) -> bool:
        return False


@admin.register(SearchIndexEntry)
class SearchIndexEntryAdmin(admin.ModelAdmin[SearchIndexEntry]):
    """فقط-خواندنی — این جدول خودکار از طریق سیگنال‌های هر اپ همگام می‌شود."""

    list_display = ("content_type", "title", "locale", "url_path", "updated_at")
    list_filter = ("content_type", "locale")
    search_fields = ("title", "body", "url_path")
    readonly_fields = [f.name for f in SearchIndexEntry._meta.fields]

    def has_add_permission(self, request: HttpRequest) -> bool:
        return False

    def has_change_permission(self, request: HttpRequest, obj: SearchIndexEntry | None = None) -> bool:
        return False
