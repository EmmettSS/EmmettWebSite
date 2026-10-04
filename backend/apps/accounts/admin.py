from __future__ import annotations

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from apps.accounts.models import User


@admin.register(User)
class UserAdmin(DjangoUserAdmin[User]):
    ordering = ("-date_joined",)
    list_display = ("email", "role", "is_staff", "is_active", "is_phone_verified", "date_joined")
    list_filter = ("role", "is_staff", "is_active", "is_phone_verified")
    search_fields = ("email", "phone", "first_name", "last_name")
    readonly_fields = ("public_id", "created_at", "updated_at", "last_login", "date_joined")

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("اطلاعات شخصی", {"fields": ("first_name", "last_name", "phone", "is_phone_verified")}),
        (
            "نقش و دسترسی",
            {"fields": ("role", "is_active", "is_staff", "is_superuser", "groups", "user_permissions")},
        ),
        ("تاریخ‌ها", {"fields": ("last_login", "date_joined", "created_at", "updated_at")}),
        ("شناسهٔ عمومی", {"fields": ("public_id",)}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "password1", "password2", "role"),
            },
        ),
    )
