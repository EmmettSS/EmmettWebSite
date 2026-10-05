"""ادمین اپ ``accounts`` — کاربران، پروفایل‌ها، علاقه‌مندی‌ها (فاز ۶).

نکات طراحی:

* ``User`` از ``UserAdmin`` جنگو ارث می‌برد؛ فاز ۶ به آن پیش‌فرض‌های امیت
  (``EmmettAdminDefaults``)، فیلتر نقش، ستون‌های خوانا و صادرات CSV افزود.
* حذف کاربر هرگز گروهی انجام نمی‌شود؛ فقط از صفحهٔ خود کاربر و با تأییدیهٔ
  ``DELETE`` (رفتار پیش‌فرض جنگو) ممکن است — چون به محتوای وابسته (مقالات،
  ثبت‌نام‌ها) گره خورده است.
* علاقه‌مندی‌ها (``Favorite`` — محتوای رابطه‌ای) فقط صادر می‌شوند (ADR-0029).
"""

from __future__ import annotations

from typing import Any, cast

from django.contrib import admin, messages
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from django.http import HttpRequest
from django.utils.translation import gettext_lazy as _

from apps.accounts.models import Favorite, Profile, User
from apps.accounts.resources import FavoriteResource, ProfileResource, UserResource
from apps.core.admin_mixins import (
    EmmettImportExportAdmin,
    ImportDisabledMixin,
    RecordStateFilter,
    SoftDeleteAdminMixin,
)
from apps.core.models import log_action


@admin.register(User)
class UserAdmin(DjangoUserAdmin[User], ImportDisabledMixin, EmmettImportExportAdmin):
    """کاربران سامانه — ایمیل به‌جای username (ADR-0006).

    ترتیب ارث‌بری عمدی است: ``DjangoUserAdmin`` اول می‌آید تا ``fieldsets``/
    ``add_fieldsets``/``get_form`` خودش برنده باشد؛ mixinهای امیت بعد از آن
    قرار می‌گیرند و فقط چیزهایی را اضافه می‌کنند که ``UserAdmin`` جنگو ندارد
    (اکشن‌ها، برندینگ، صادرات). صادرات «فقط خروجی» است و واردات کاربر به‌کل
    بسته است (ADR-0029) — رمز/نقش هرگز از فایل قابل تنظیم نیست.
    """

    resource_class = UserResource
    ordering = ("-date_joined",)
    list_display = (
        "email",
        "full_name",
        "role",
        "is_staff",
        "is_active",
        "two_factor_status",
        "date_joined",
        "last_login",
    )
    list_display_links = ("email",)
    list_filter = ("role", "is_staff", "is_active", "is_phone_verified", "date_joined")
    search_fields = ("email", "phone", "first_name", "last_name")
    readonly_fields = ("public_id", "created_at", "updated_at", "last_login", "date_joined")
    date_hierarchy = "date_joined"
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        (_("Personal information"), {"fields": ("first_name", "last_name", "phone", "is_phone_verified")}),
        (
            _("Role and permissions"),
            {"fields": ("role", "is_active", "is_staff", "is_superuser", "groups", "user_permissions")},
        ),
        (_("Timeline"), {"fields": ("last_login", "date_joined", "created_at", "updated_at")}),
        (_("Public identifier"), {"classes": ("collapse",), "fields": ("public_id",)}),
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

    actions = ("disable_two_factor", "unlock_login")

    @admin.display(description=_("Full name"), ordering="last_name")
    def full_name(self, obj: User) -> str:
        return obj.get_full_name() or "—"

    @admin.display(boolean=True, description=_("2FA"))
    def two_factor_status(self, obj: User) -> bool:
        """آیا کاربر دستگاه ۲FA تأییدشده دارد؟ (در ``get_queryset`` prefetch شده)"""

        # django-otp این رابطهٔ معکوس را به User تزریق می‌کند ولی stub ندارد؛
        # ``cast(Any, …)`` فقط ابهام mypy را برمی‌دارد و پیش‌واکشی
        # ``get_queryset`` را دست‌نخورده نگه می‌دارد (بدون کوئری اضافه).
        devices = list(cast(Any, obj).totpdevice_set.all())
        return any(device.confirmed for device in devices)

    def get_queryset(self, request: HttpRequest) -> Any:
        """``totpdevice_set`` پیش‌واکشی می‌شود تا ستون ۲FA باعث N+1 نشود."""

        return super().get_queryset(request).prefetch_related("totpdevice_set")

    @admin.action(description=_("Disable two-factor authentication (support reset)"), permissions=["change"])
    def disable_two_factor(self, request: HttpRequest, queryset: Any) -> None:
        """بازنشانی پشتیبانی: اگر کارمندی گوشی‌اش را گم کند، ابرکاربر می‌تواند ۲FA را بردارد."""

        from django_otp.plugins.otp_static.models import StaticDevice
        from django_otp.plugins.otp_totp.models import TOTPDevice

        user_ids = [int(pk) for pk in queryset.values_list("pk", flat=True)]
        removed = TOTPDevice.objects.filter(user_id__in=user_ids).delete()[0]
        removed += StaticDevice.objects.filter(user_id__in=user_ids).delete()[0]
        log_action(
            action="auth.2fa_disabled_by_admin",
            actor=request.user if request.user.is_authenticated else None,
            metadata={"user_ids": user_ids, "devices_removed": removed},
        )
        self.message_user(
            request,
            _("Disabled two-factor authentication for %(count)s user(s).") % {"count": len(user_ids)},
            messages.WARNING,
        )

    @admin.action(description=_("Clear login lockout"), permissions=["change"])
    def unlock_login(self, request: HttpRequest, queryset: Any) -> None:
        """بازکردن قفل ورود کاربرانی که با محافظت brute-force قفل شده‌اند."""

        from apps.core.security import LoginLockout

        lockout = LoginLockout()
        for email in queryset.values_list("email", flat=True):
            lockout.unlock(email=str(email))
        self.message_user(
            request,
            _("Cleared login lockout for %(count)s user(s).") % {"count": queryset.count()},
            messages.SUCCESS,
        )

    def get_actions(self, request: HttpRequest) -> dict[str, Any]:
        """«حذف گروهی» عمداً برداشته شده است — کاربر با محتوای وابسته گره دارد."""

        actions = super().get_actions(request)
        actions.pop("delete_selected", None)
        return actions


@admin.register(Profile)
class ProfileAdmin(SoftDeleteAdminMixin, EmmettImportExportAdmin):
    resource_class = ProfileResource
    list_display = ("user", "job_title", "company_name", "locale_preference", "has_bio")
    list_filter = ("locale_preference", RecordStateFilter)
    search_fields = ("user__email", "job_title", "company_name", "bio")
    autocomplete_fields = ("user", "avatar")
    list_select_related = ("user",)

    @admin.display(boolean=True, description=_("Biography"))
    def has_bio(self, obj: Profile) -> bool:
        return bool((obj.bio or "").strip())


@admin.register(Favorite)
class FavoriteAdmin(ImportDisabledMixin, EmmettImportExportAdmin, SoftDeleteAdminMixin):
    resource_class = FavoriteResource
    list_display = ("user", "content_type", "object_id", "created_at")
    list_filter = ("content_type", "created_at", RecordStateFilter)
    search_fields = ("user__email",)
    autocomplete_fields = ("user",)
    date_hierarchy = "created_at"
    list_select_related = ("user", "content_type")
