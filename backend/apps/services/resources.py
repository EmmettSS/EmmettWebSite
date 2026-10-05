"""منابع صادرات/واردات اپ ``services`` (ADR-0029)."""

from __future__ import annotations

from apps.core.resources import EmmettResource, i18n_fields
from apps.services.models import Service


class ServiceResource(EmmettResource):
    """خدمات: صادرات/واردات دوزبانه بر اساس ``slug`` (کلید پایدار).

    ستون ``schema_version`` به‌صورت ``readonly`` تعریف شده است؛ بنابراین در
    صادرات حاضر است و در واردات (اگر کاربر فایل صادرشده را دست‌نخورده برگرداند)
    نادیده گرفته می‌شود — یعنی رفت‌وبرگشت فایل بی‌خطر است (قرارداد ADR-0029).
    """

    class Meta:
        model = Service
        fields = i18n_fields(
            ("slug", "status", "is_featured", "order", "published_at", "icon"),
            ("title", "summary", "description", "meta_title", "meta_description"),
        )
        export_order = fields
        import_id_fields = ("slug",)
        skip_unchanged = True
        report_skipped = True


__all__ = ["ServiceResource"]
