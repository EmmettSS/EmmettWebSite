"""Project و CaseStudy — نمونه‌کار/پورتفولیو (شامل Pentestor/CRM به‌عنوان Project با ``is_product=True``)."""

from __future__ import annotations

import uuid
from typing import Any

from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import BaseModel, PublishableModel, SEOMetaModel
from apps.core.utils.markdown import render_markdown_i18n_fields

_CASE_STUDY_MARKDOWN_FIELDS = [
    "challenge",
    "approach",
    "architecture_notes",
    "implementation_notes",
    "result",
]


class Project(BaseModel, PublishableModel, SEOMetaModel):
    public_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False, db_index=True)
    title = models.CharField(_("title"), max_length=200)
    slug = models.SlugField(_("slug"), max_length=220, unique=True)
    summary = models.CharField(_("summary"), max_length=300)
    client_name = models.CharField(_("client name"), max_length=150, blank=True, default="")
    service = models.ForeignKey(
        "services.Service", null=True, blank=True, on_delete=models.SET_NULL, related_name="projects"
    )
    categories = models.ManyToManyField(
        "taxonomy.Category", blank=True, related_name="projects", help_text=_("برای فیلتر «صنعت».")
    )
    tags = models.ManyToManyField(
        "taxonomy.Tag", blank=True, related_name="projects", help_text=_("برای فیلتر «تکنولوژی».")
    )
    cover_image = models.ForeignKey(
        "core.Media", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    gallery = models.ManyToManyField("core.Media", blank=True, related_name="project_galleries")
    year = models.PositiveIntegerField(_("year"), null=True, blank=True, db_index=True)
    is_product = models.BooleanField(
        _("is product"),
        default=False,
        db_index=True,
        help_text=_("مثلاً Pentestor/CRM — محصولات داخلی که به شکل Project نمایش داده می‌شوند."),
    )
    is_featured = models.BooleanField(_("is featured"), default=False, db_index=True)
    order = models.PositiveIntegerField(_("order"), default=0, db_index=True)

    class Meta(BaseModel.Meta):
        verbose_name = _("Project")
        verbose_name_plural = _("Projects")
        ordering = ["order", "-year"]

    def __str__(self) -> str:
        return self.title


class CaseStudy(BaseModel):
    project = models.OneToOneField(Project, on_delete=models.CASCADE, related_name="case_study")
    challenge = models.TextField(_("challenge (Markdown)"), blank=True, default="")
    challenge_html = models.TextField(blank=True, default="", editable=False)
    approach = models.TextField(_("approach (Markdown)"), blank=True, default="")
    approach_html = models.TextField(blank=True, default="", editable=False)
    architecture_notes = models.TextField(_("architecture notes (Markdown)"), blank=True, default="")
    architecture_notes_html = models.TextField(blank=True, default="", editable=False)
    technology_stack = models.JSONField(_("technology stack"), default=list, blank=True)
    implementation_notes = models.TextField(_("implementation notes (Markdown)"), blank=True, default="")
    implementation_notes_html = models.TextField(blank=True, default="", editable=False)
    result = models.TextField(_("result (Markdown)"), blank=True, default="")
    result_html = models.TextField(blank=True, default="", editable=False)
    metrics = models.JSONField(_("metrics"), default=dict, blank=True)

    class Meta(BaseModel.Meta):
        verbose_name = _("Case Study")
        verbose_name_plural = _("Case Studies")

    def __str__(self) -> str:
        return f"Case Study: {self.project.title}"

    def save(self, *args: Any, **kwargs: Any) -> None:
        render_markdown_i18n_fields(self, _CASE_STUDY_MARKDOWN_FIELDS)
        super().save(*args, **kwargs)
