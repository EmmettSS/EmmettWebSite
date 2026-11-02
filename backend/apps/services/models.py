"""Service — صفحهٔ Services (فهرست + صفحهٔ اختصاصی هر خدمت)."""

from __future__ import annotations

import uuid
from typing import Any

from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import BaseModel, PublishableModel, SEOMetaModel
from apps.core.utils.markdown import render_markdown_i18n_fields


class Service(BaseModel, PublishableModel, SEOMetaModel):
    public_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False, db_index=True)
    title = models.CharField(_("title"), max_length=200)
    slug = models.SlugField(_("slug"), max_length=220, unique=True)
    summary = models.CharField(_("summary"), max_length=300)
    description = models.TextField(_("description (Markdown)"), blank=True, default="")
    description_html = models.TextField(
        _("description (HTML, cached)"), blank=True, default="", editable=False
    )
    icon = models.CharField(
        _("icon"), max_length=50, blank=True, default="", help_text=_("نام آیکون lucide-react.")
    )
    categories = models.ManyToManyField("taxonomy.Category", blank=True, related_name="services")
    tags = models.ManyToManyField("taxonomy.Tag", blank=True, related_name="services")
    order = models.PositiveIntegerField(_("order"), default=0, db_index=True)
    is_featured = models.BooleanField(_("is featured"), default=False, db_index=True)

    class Meta(BaseModel.Meta):
        verbose_name = _("Service")
        verbose_name_plural = _("Services")
        ordering = ["order", "title"]

    def __str__(self) -> str:
        return self.title

    def save(self, *args: Any, **kwargs: Any) -> None:
        render_markdown_i18n_fields(self, ["description"])
        super().save(*args, **kwargs)
