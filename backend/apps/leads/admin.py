from __future__ import annotations

from django.contrib import admin

from apps.leads.models import Contact, Lead, Newsletter


@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin[Contact]):
    list_display = ("name", "email", "project_type", "budget_range", "source", "created_at")
    list_filter = (
        "project_type__catalog__key",
        "budget_range__catalog__key",
        "timeline__catalog__key",
        "source",
    )
    search_fields = ("name", "email", "phone", "message")
    readonly_fields = ("ip_address", "user_agent", "created_at")


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin[Lead]):
    list_display = ("id", "contact", "status", "priority_score", "ai_concept", "assigned_to", "created_at")
    list_filter = ("status",)
    search_fields = ("contact__name", "contact__email", "notes")
    autocomplete_fields = ("contact", "assigned_to")


@admin.register(Newsletter)
class NewsletterAdmin(admin.ModelAdmin[Newsletter]):
    list_display = ("email", "locale_preference", "is_confirmed", "subscribed_at", "unsubscribed_at")
    list_filter = ("is_confirmed", "locale_preference")
    search_fields = ("email", "phone")
    readonly_fields = ("confirmation_token",)
