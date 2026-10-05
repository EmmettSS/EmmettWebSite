"""Contact، Lead، Newsletter — فرم تماس، پیگیری فروش و خبرنامه."""

from __future__ import annotations

import secrets
import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import BaseModel


def generate_confirmation_token() -> str:
    return secrets.token_urlsafe(32)


class Contact(BaseModel):
    """ثبت درخواست تماس؛ customer-facing enums از Catalogهای فعال خوانده می‌شوند."""

    class Source(models.TextChoices):
        WEBSITE_FORM = "website_form", _("Website Form")
        AI_ASSISTANT = "ai_assistant", _("AI Assistant")
        REFERRAL = "referral", _("Referral")

    public_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False, db_index=True)
    name = models.CharField(_("name"), max_length=150)
    email = models.EmailField(_("email"))
    phone = models.CharField(_("phone"), max_length=20, blank=True, default="")
    project_type = models.ForeignKey(
        "ai_engine.CatalogOption",
        verbose_name=_("project type"),
        on_delete=models.PROTECT,
        related_name="project_contacts",
        limit_choices_to={"catalog__key": "project_type"},
    )
    budget_range = models.ForeignKey(
        "ai_engine.CatalogOption",
        verbose_name=_("budget range"),
        on_delete=models.PROTECT,
        related_name="budget_contacts",
        limit_choices_to={"catalog__key": "budget_range"},
    )
    timeline = models.ForeignKey(
        "ai_engine.CatalogOption",
        verbose_name=_("timeline"),
        on_delete=models.PROTECT,
        related_name="timeline_contacts",
        limit_choices_to={"catalog__key": "timeline"},
    )
    message = models.TextField(_("message"), max_length=5000)
    source = models.CharField(_("source"), max_length=20, choices=Source.choices, default=Source.WEBSITE_FORM)
    consent_given = models.BooleanField(_("consent given"), default=False)
    ip_address = models.GenericIPAddressField(_("IP address"), null=True, blank=True)
    user_agent = models.CharField(_("user agent"), max_length=500, blank=True, default="")

    class Meta(BaseModel.Meta):
        verbose_name = _("Contact")
        verbose_name_plural = _("Contacts")
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.name} <{self.email}>"

    def clean(self) -> None:
        super().clean()
        expected_catalogs = {
            "project_type": "project_type",
            "budget_range": "budget_range",
            "timeline": "timeline",
        }
        errors: dict[str, str] = {}
        for field_name, catalog_key in expected_catalogs.items():
            option = getattr(self, field_name, None)
            if option is not None and option.catalog.key != catalog_key:
                errors[field_name] = str(_("Select an option from the correct catalog."))
        if errors:
            raise ValidationError(errors)


class Lead(BaseModel):
    class Status(models.TextChoices):
        NEW = "new", _("New")
        CONTACTED = "contacted", _("Contacted")
        QUALIFIED = "qualified", _("Qualified")
        PROPOSAL = "proposal", _("Proposal")
        WON = "won", _("Won")
        LOST = "lost", _("Lost")

    public_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False, db_index=True)
    contact = models.ForeignKey(
        Contact, null=True, blank=True, on_delete=models.SET_NULL, related_name="leads"
    )
    ai_suggestion = models.ForeignKey(
        "ai_engine.AISuggestion",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="leads",
    )
    ai_concept = models.ForeignKey(
        "ai_engine.AIConcept",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="leads",
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="assigned_leads",
    )
    status = models.CharField(
        _("status"), max_length=20, choices=Status.choices, default=Status.NEW, db_index=True
    )
    priority_score = models.IntegerField(_("priority score"), default=0)
    notes = models.TextField(_("notes"), blank=True, default="")

    class Meta(BaseModel.Meta):
        verbose_name = _("Lead")
        verbose_name_plural = _("Leads")
        ordering = ["-priority_score", "-created_at"]

    def __str__(self) -> str:
        return f"Lead #{self.pk} ({self.status})"


class Newsletter(BaseModel):
    email = models.EmailField(_("email"), unique=True)
    phone = models.CharField(_("phone"), max_length=20, blank=True, default="")
    locale_preference = models.CharField(_("locale preference"), max_length=5, default="fa")
    is_confirmed = models.BooleanField(_("is confirmed"), default=False)
    confirmation_token = models.CharField(
        max_length=64, unique=True, editable=False, default=generate_confirmation_token
    )
    subscribed_at = models.DateTimeField(_("subscribed at"), null=True, blank=True)
    unsubscribed_at = models.DateTimeField(_("unsubscribed at"), null=True, blank=True)

    class Meta(BaseModel.Meta):
        verbose_name = _("Newsletter Subscription")
        verbose_name_plural = _("Newsletter Subscriptions")
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.email
