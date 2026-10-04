"""Contact، Lead، Newsletter — فرم تماس/پایپ‌لاین فروش/خبرنامه.

نکته دربارهٔ مرز ``ai_engine`` (خارج از scope فاز ۴ طبق تصمیم کاربر): فیلد
``Lead.ai_suggestion`` که در ``ARCHITECTURE.md`` فاز ۱ پیش‌بینی شده بود، در
این فاز **عمداً حذف شده** چون اپ ``ai_engine`` و مدل ``AISuggestion`` هنوز
ساخته نشده‌اند. وقتی آن اپ در فاز بعد ساخته شد، این FK باید به‌صورت migration
مجزا اضافه شود.
"""

from __future__ import annotations

import secrets
import uuid

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import BaseModel


def generate_confirmation_token() -> str:
    return secrets.token_urlsafe(32)


class Contact(BaseModel):
    """ثبت خام فرم تماس — enumهای بسته باید با ai_engine هم‌راستا بمانند."""

    class ProjectType(models.TextChoices):
        WEBSITE = "website", _("Website")
        MOBILE_APP = "mobile_app", _("Mobile App")
        SECURITY = "security", _("Security / Pentest")
        CRM = "crm", _("CRM")
        CONSULTING = "consulting", _("Consulting")
        OTHER = "other", _("Other")

    class BudgetRange(models.TextChoices):
        UNDER_50M = "under_50m", _("Under 50M Toman")
        R_50_150M = "50_150m", _("50-150M Toman")
        R_150_500M = "150_500m", _("150-500M Toman")
        OVER_500M = "over_500m", _("Over 500M Toman")
        NOT_SURE = "not_sure", _("Not sure yet")

    class Timeline(models.TextChoices):
        IMMEDIATE = "immediate", _("Immediate")
        WITHIN_1_MONTH = "within_1_month", _("Within 1 month")
        WITHIN_3_MONTHS = "within_3_months", _("Within 3 months")
        FLEXIBLE = "flexible", _("Flexible")

    class Source(models.TextChoices):
        WEBSITE_FORM = "website_form", _("Website Form")
        AI_ASSISTANT = "ai_assistant", _("AI Assistant")
        REFERRAL = "referral", _("Referral")

    public_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False, db_index=True)
    name = models.CharField(_("name"), max_length=150)
    email = models.EmailField(_("email"))
    phone = models.CharField(_("phone"), max_length=20, blank=True, default="")
    project_type = models.CharField(_("project type"), max_length=20, choices=ProjectType.choices)
    budget_range = models.CharField(_("budget range"), max_length=20, choices=BudgetRange.choices)
    timeline = models.CharField(_("timeline"), max_length=20, choices=Timeline.choices)
    message = models.TextField(_("message"), max_length=5000)
    source = models.CharField(
        _("source"), max_length=20, choices=Source.choices, default=Source.WEBSITE_FORM
    )
    consent_given = models.BooleanField(_("consent given"), default=False)
    ip_address = models.GenericIPAddressField(_("IP address"), null=True, blank=True)
    user_agent = models.CharField(_("user agent"), max_length=500, blank=True, default="")

    class Meta(BaseModel.Meta):
        verbose_name = _("Contact")
        verbose_name_plural = _("Contacts")
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.name} <{self.email}>"


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
