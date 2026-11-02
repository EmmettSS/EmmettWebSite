"""منابع صادرات اپ ``leads`` (ADR-0029).

⚠️ سیاست امنیتی صریح: هیچ‌یک از مدل‌های این اپ واردات (import) نمی‌پذیرد.
``Contact`` متن آزاد کاربر و ``Lead`` پایپ‌لاین فروش است؛ اجازهٔ تزریق فایل
به این جدول‌ها یعنی امکان آلوده‌کردن CRM و دورزدن rate limit فرم عمومی.
صادرات (CSV/TSV/JSON) برای گزارش‌گیری و پیگیری تیم مجاز است و به مجوز
``view`` مدل گره خورده است.
"""

from __future__ import annotations

from apps.core.resources import EmmettResource
from apps.leads.models import Contact, Lead, Newsletter


class ContactResource(EmmettResource):
    class Meta:
        model = Contact
        fields = (
            "schema_version",
            "created_at",
            "name",
            "email",
            "phone",
            "project_type",
            "budget_range",
            "timeline",
            "source",
            "consent_given",
            "message",
        )
        export_order = fields


class LeadResource(EmmettResource):
    class Meta:
        model = Lead
        fields = (
            "schema_version",
            "created_at",
            "contact",
            "status",
            "priority_score",
            "assigned_to",
            "ai_suggestion",
            "ai_concept",
            "notes",
        )
        export_order = fields


class NewsletterResource(EmmettResource):
    class Meta:
        model = Newsletter
        fields = (
            "schema_version",
            "subscribed_at",
            "email",
            "phone",
            "locale_preference",
            "is_confirmed",
            "unsubscribed_at",
        )
        export_order = fields


__all__ = ["ContactResource", "LeadResource", "NewsletterResource"]
