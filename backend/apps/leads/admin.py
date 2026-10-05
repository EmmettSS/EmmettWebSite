"""ادمین اپ ``leads`` — فرم‌های تماس، پایپ‌لاین فروش، خبرنامه (فاز ۶).

این اپ «قلب تجاری» پنل است؛ فاز ۶ برای آن اضافه کرد:

- ستون‌های خلاصه (پیام کوتاه‌شده) و فیلترهای کامل روی وضعیت/منبع/تاریخ،
- فیلتر «لید دارد / ندارد» برای پیدا کردن سرنخ‌های تبدیل‌نشده،
- صادرات CSV/TSV/JSON برای گزارش فروش — با سیاست «بدون واردات» (ADR-0029).
"""

from __future__ import annotations

from django.contrib import admin
from django.utils.translation import gettext_lazy as _

from apps.core.admin_filters import RelatedPresenceFilter
from apps.core.admin_mixins import (
    EmmettImportExportAdmin,
    ImportDisabledMixin,
    RecordStateFilter,
    SoftDeleteAdminMixin,
    render_status_pill,
)
from apps.leads.models import Contact, Lead, Newsletter
from apps.leads.resources import ContactResource, LeadResource, NewsletterResource


class ContactHasLeadFilter(RelatedPresenceFilter):
    title = _("lead")
    parameter_name = "has_lead"
    relation = "leads"


class LeadHasConceptFilter(RelatedPresenceFilter):
    title = _("AI concept")
    parameter_name = "has_ai_concept"
    relation = "ai_concept"


@admin.register(Contact)
class ContactAdmin(ImportDisabledMixin, EmmettImportExportAdmin, SoftDeleteAdminMixin):
    resource_class = ContactResource
    list_display = ("short_name", "email", "project_type", "budget_range", "source", "created_at")
    list_display_links = ("short_name",)
    list_filter = (
        "source",
        "consent_given",
        "created_at",
        "project_type__catalog__key",
        "budget_range__catalog__key",
        "timeline__catalog__key",
        ContactHasLeadFilter,
        RecordStateFilter,
    )
    search_fields = ("name", "email", "phone", "message")
    readonly_fields = ("ip_address", "user_agent", "public_id", "created_at", "updated_at", "deleted_at")
    date_hierarchy = "created_at"
    list_select_related = ("project_type", "budget_range", "timeline")

    @admin.display(description=_("Name"), ordering="name")
    def short_name(self, obj: Contact) -> str:
        name = (obj.name or "").strip()
        return name if len(name) <= 40 else f"{name[:39]}…"


@admin.register(Lead)
class LeadAdmin(ImportDisabledMixin, EmmettImportExportAdmin, SoftDeleteAdminMixin):
    resource_class = LeadResource
    list_display = (
        "id",
        "contact",
        "status_badge",
        "priority_score",
        "assigned_to",
        "ai_concept",
        "created_at",
    )
    list_filter = ("status", "assigned_to", "created_at", LeadHasConceptFilter, RecordStateFilter)
    search_fields = ("contact__name", "contact__email", "notes")
    autocomplete_fields = ("contact", "assigned_to", "ai_suggestion", "ai_concept")
    date_hierarchy = "created_at"
    list_select_related = ("contact", "assigned_to", "ai_concept")
    list_editable = ("priority_score", "assigned_to")

    @admin.display(description=_("Status"), ordering="status")
    def status_badge(self, obj: Lead) -> str:
        return render_status_pill(str(obj.status), Lead.Status.choices)


@admin.register(Newsletter)
class NewsletterAdmin(ImportDisabledMixin, EmmettImportExportAdmin, SoftDeleteAdminMixin):
    resource_class = NewsletterResource
    list_display = ("email", "locale_preference", "is_confirmed", "subscribed_at", "unsubscribed_at")
    list_filter = ("is_confirmed", "locale_preference", "subscribed_at", RecordStateFilter)
    search_fields = ("email", "phone")
    readonly_fields = ("confirmation_token", "created_at", "updated_at", "deleted_at")
    date_hierarchy = "subscribed_at"


__all__ = ["ContactAdmin", "LeadAdmin", "NewsletterAdmin"]

