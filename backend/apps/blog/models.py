"""BlogPost و Comment — صفحهٔ Library/بلاگ."""

from __future__ import annotations

import uuid
from typing import Any

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import BaseModel, PublishableModel, SEOMetaModel
from apps.core.utils.markdown import estimate_reading_time, render_markdown_i18n_fields


class BlogPost(BaseModel, PublishableModel, SEOMetaModel):
    public_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False, db_index=True)
    title = models.CharField(_("title"), max_length=200)
    slug = models.SlugField(_("slug"), max_length=220, unique=True)
    excerpt = models.CharField(_("excerpt"), max_length=300)
    content = models.TextField(_("content (Markdown)"), blank=True, default="")
    content_html = models.TextField(blank=True, default="", editable=False)
    cover_image = models.ForeignKey(
        "core.Media", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="blog_posts"
    )
    categories = models.ManyToManyField("taxonomy.Category", blank=True, related_name="blog_posts")
    tags = models.ManyToManyField("taxonomy.Tag", blank=True, related_name="blog_posts")
    reading_time_minutes = models.PositiveIntegerField(_("reading time (minutes)"), default=0, editable=False)
    view_count = models.PositiveIntegerField(_("view count"), default=0, editable=False)

    class Meta(BaseModel.Meta):
        verbose_name = _("Blog Post")
        verbose_name_plural = _("Blog Posts")
        ordering = ["-published_at", "-created_at"]
        indexes = [models.Index(fields=["slug"])]

    def __str__(self) -> str:
        return self.title

    def save(self, *args: Any, **kwargs: Any) -> None:
        render_markdown_i18n_fields(self, ["content"])
        minutes_fa = estimate_reading_time(getattr(self, "content_fa", "") or "")
        minutes_en = estimate_reading_time(getattr(self, "content_en", "") or "")
        self.reading_time_minutes = max(minutes_fa, minutes_en) or 1
        super().save(*args, **kwargs)


class Comment(BaseModel):
    class Status(models.TextChoices):
        PENDING = "pending", _("Pending")
        APPROVED = "approved", _("Approved")
        REJECTED = "rejected", _("Rejected")

    post = models.ForeignKey(BlogPost, on_delete=models.CASCADE, related_name="comments")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="comments")
    parent = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.CASCADE, related_name="replies"
    )
    body = models.TextField(_("body"), max_length=3000)
    status = models.CharField(
        _("status"), max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True
    )

    class Meta(BaseModel.Meta):
        verbose_name = _("Comment")
        verbose_name_plural = _("Comments")
        ordering = ["created_at"]
        indexes = [models.Index(fields=["post", "status"])]

    def __str__(self) -> str:
        return f"Comment by {self.author_id} on {self.post_id}"
