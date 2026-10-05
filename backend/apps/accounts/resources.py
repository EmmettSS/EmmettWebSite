"""منابع صادرات/واردات اپ ``accounts`` (ADR-0029).

⚠️ سیاست: ``User`` **هرگز** وارد نمی‌شود. رمز عبور، نقش و دسترسی‌ها نباید از
فایل CSV قابل تنظیم باشند؛ صادرات (بدون ستون رمز) برای پشتیبان‌گیری از
فراداده و پیگیری تیم مجاز است. ``Favorite`` هم دادهٔ رابطه‌ای است و فقط صادر
می‌شود. تنها ``Profile`` قابل واردات است (کلید پایدار: ``user`` = ایمیل).
"""

from __future__ import annotations

from apps.accounts.models import Favorite, Profile, User
from apps.core.resources import EmmettResource, i18n_fields


class UserResource(EmmettResource):
    """صادرات فرادادهٔ کاربر — بدون ``password``، بدون مجوزها."""

    class Meta:
        model = User
        fields = (
            "schema_version",
            "date_joined",
            "last_login",
            "email",
            "first_name",
            "last_name",
            "phone",
            "role",
            "is_phone_verified",
            "is_active",
            "is_staff",
            "public_id",
        )
        export_order = fields


class ProfileResource(EmmettResource):
    class Meta:
        model = Profile
        # ``Profile`` در modeltranslation ثبت نشده است؛ پس فقط ستون‌های پایه.
        fields = i18n_fields(
            ("user", "avatar", "locale_preference", "job_title", "company_name", "bio"), ()
        )
        export_order = fields
        import_id_fields = ("user",)
        skip_unchanged = True


class FavoriteResource(EmmettResource):
    class Meta:
        model = Favorite
        fields = ("schema_version", "created_at", "user", "content_type", "object_id")
        export_order = fields


__all__ = ["FavoriteResource", "ProfileResource", "UserResource"]
