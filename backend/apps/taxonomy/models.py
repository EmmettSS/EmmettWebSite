"""Category و Tag — دسته‌بندی/برچسب مشترک بین services/portfolio/academy/blog."""

from __future__ import annotations

import uuid

from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import BaseModel


class Category(BaseModel):
    """دسته‌بندی سلسله‌مراتبی با محدودهٔ کاربرد مشخص (``scope``)."""

    class Scope(models.TextChoices):
        BLOG = "blog", _("Blog")
        ACADEMY = "academy", _("Academy")
        PORTFOLIO = "portfolio", _("Portfolio")
        SERVICE = "service", _("Service")

    public_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False, db_index=True)
    name = models.CharField(_("name"), max_length=100)
    slug = models.SlugField(_("slug"), max_length=120, unique=True)
    parent = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.SET_NULL, related_name="children"
    )
    scope = models.CharField(_("scope"), max_length=20, choices=Scope.choices, db_index=True)

    class Meta(BaseModel.Meta):
        verbose_name = _("Category")
        verbose_name_plural = _("Categories")
        ordering = ["scope", "name"]
        indexes = [models.Index(fields=["scope", "slug"])]

    def __str__(self) -> str:
        return f"{self.name} ({self.scope})"


class Tag(BaseModel):
    """برچسب تخت (بدون سلسله‌مراتب)، قابل‌استفاده از چند اپ هم‌زمان."""

    name = models.CharField(_("name"), max_length=50)
    slug = models.SlugField(_("slug"), max_length=60, unique=True)

    class Meta(BaseModel.Meta):
        verbose_name = _("Tag")
        verbose_name_plural = _("Tags")
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name
