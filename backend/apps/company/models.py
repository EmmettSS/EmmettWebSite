"""TeamMember و Testimonial — محتوای صفحهٔ About/Home."""

from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import BaseModel


class TeamMember(BaseModel):
    public_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False, db_index=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name=_("user"),
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="team_memberships",
    )
    full_name = models.CharField(_("full name"), max_length=150)
    role_title = models.CharField(_("role title"), max_length=150)
    bio = models.TextField(_("bio"), blank=True, default="")
    photo = models.ForeignKey(
        "core.Media", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    social_links = models.JSONField(_("social links"), default=dict, blank=True)
    order = models.PositiveIntegerField(_("order"), default=0, db_index=True)

    class Meta(BaseModel.Meta):
        verbose_name = _("Team Member")
        verbose_name_plural = _("Team Members")
        ordering = ["order", "full_name"]

    def __str__(self) -> str:
        return self.full_name


class Testimonial(BaseModel):
    author_name = models.CharField(_("author name"), max_length=150)
    author_role = models.CharField(_("author role"), max_length=150, blank=True, default="")
    author_company = models.CharField(_("author company"), max_length=150, blank=True, default="")
    author_photo = models.ForeignKey(
        "core.Media", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    quote = models.TextField(_("quote"))
    related_project = models.ForeignKey(
        "portfolio.Project",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="testimonials",
    )
    is_featured = models.BooleanField(_("is featured"), default=False, db_index=True)
    order = models.PositiveIntegerField(_("order"), default=0, db_index=True)

    class Meta(BaseModel.Meta):
        verbose_name = _("Testimonial")
        verbose_name_plural = _("Testimonials")
        ordering = ["order", "-created_at"]

    def __str__(self) -> str:
        return f"{self.author_name} — {self.author_company}"
