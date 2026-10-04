from __future__ import annotations

from typing import Any

from django.contrib import admin
from django.http import HttpRequest

from apps.core.models import AuditLog


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
