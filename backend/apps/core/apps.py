"""پیکربندی اپ ``core`` — شامل فعال‌سازی برندینگ پنل ادمین (فاز ۶)."""

from __future__ import annotations

from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class CoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.core"
    label = "core"
    verbose_name = _("Core")

    def ready(self) -> None:
        """برندینگ ادمین را در راه‌اندازی اپ اعمال می‌کند (ADR-0027).

        ``admin.site`` در زمان ``ready`` ساخته شده است و ست‌کردن متن‌های برند
        اینجا (نه در ``settings``) تضمین می‌کند که مدل‌ها/ترجمه‌ها آماده‌اند و
        ``gettext_lazy`` در زمان نمایش ارزیابی می‌شود.
        """

        from apps.core.admin_theme import apply_admin_branding

        apply_admin_branding()

        # Django ماژول ``<app>.checks`` را خودکار import نمی‌کند (برخلاف
        # ``<app>.admin``)؛ بدون این import، همهٔ بررسی‌های ``emmett_admin.E00x``
        # بی‌صدا بی‌اثر می‌ماندند. این import فقط ثبتِ checkها را انجام می‌دهد.
        import apps.core.checks  # noqa: F401
