"""Instructor، Course، Lesson — صفحهٔ Academy."""

from __future__ import annotations

import uuid
from typing import Any

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from apps.core.models import BaseModel, PublishableModel, SEOMetaModel
from apps.core.utils.markdown import render_markdown_i18n_fields


class Instructor(BaseModel):
    public_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False, db_index=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="instructor_profiles",
    )
    name = models.CharField(_("name"), max_length=150)
    title = models.CharField(_("title"), max_length=150, blank=True, default="")
    bio = models.TextField(_("bio"), blank=True, default="")
    photo = models.ForeignKey(
        "core.Media", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )

    class Meta(BaseModel.Meta):
        verbose_name = _("Instructor")
        verbose_name_plural = _("Instructors")
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class Course(BaseModel, PublishableModel, SEOMetaModel):
    class Level(models.TextChoices):
        BEGINNER = "beginner", _("Beginner")
        INTERMEDIATE = "intermediate", _("Intermediate")
        ADVANCED = "advanced", _("Advanced")

    public_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False, db_index=True)
    title = models.CharField(_("title"), max_length=200)
    slug = models.SlugField(_("slug"), max_length=220, unique=True)
    summary = models.CharField(_("summary"), max_length=300)
    description = models.TextField(_("description (Markdown)"), blank=True, default="")
    description_html = models.TextField(blank=True, default="", editable=False)
    instructor = models.ForeignKey(
        Instructor, null=True, blank=True, on_delete=models.SET_NULL, related_name="courses"
    )
    level = models.CharField(_("level"), max_length=20, choices=Level.choices, default=Level.BEGINNER)
    duration_hours = models.DecimalField(_("duration (hours)"), max_digits=5, decimal_places=1, default=0)
    categories = models.ManyToManyField("taxonomy.Category", blank=True, related_name="courses")
    tags = models.ManyToManyField("taxonomy.Tag", blank=True, related_name="courses")
    cover_image = models.ForeignKey(
        "core.Media", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    is_featured = models.BooleanField(_("is featured"), default=False, db_index=True)
    order = models.PositiveIntegerField(_("order"), default=0, db_index=True)

    class Meta(BaseModel.Meta):
        verbose_name = _("Course")
        verbose_name_plural = _("Courses")
        ordering = ["order", "title"]

    def __str__(self) -> str:
        return self.title

    def save(self, *args: Any, **kwargs: Any) -> None:
        render_markdown_i18n_fields(self, ["description"])
        super().save(*args, **kwargs)


class Lesson(BaseModel):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="lessons")
    title = models.CharField(_("title"), max_length=200)
    summary = models.CharField(_("summary"), max_length=300, blank=True, default="")
    content = models.TextField(_("content (Markdown)"), blank=True, default="")
    content_html = models.TextField(blank=True, default="", editable=False)
    video_url = models.URLField(_("video URL"), blank=True, default="")
    order = models.PositiveIntegerField(_("order"), default=0)
    duration_minutes = models.PositiveIntegerField(_("duration (minutes)"), default=0)
    is_preview = models.BooleanField(
        _("is preview"), default=False, help_text=_("قابل‌مشاهده بدون نیاز به ورود/خرید.")
    )

    class Meta(BaseModel.Meta):
        verbose_name = _("Lesson")
        verbose_name_plural = _("Lessons")
        ordering = ["course", "order"]
        unique_together = [["course", "order"]]

    def __str__(self) -> str:
        return f"{self.course.title} — {self.title}"

    def save(self, *args: Any, **kwargs: Any) -> None:
        render_markdown_i18n_fields(self, ["content"])
        super().save(*args, **kwargs)


class Enrollment(BaseModel):
    """ثبت‌نام کاربر در یک دوره — آیتم ۴ بریف (پیش‌نیاز صفحهٔ «دوره‌های من»).

    در فاز فعلی پرداخت/تسویه خارج از scope است (تصمیم کاربر دربارهٔ
    ``ai_engine``/پرداخت در فازهای بعد)؛ این مدل فقط رابطهٔ «کاربر در این
    دوره ثبت‌نام کرده» و پیشرفت سادهٔ او را نگه می‌دارد.
    """

    class Status(models.TextChoices):
        ACTIVE = "active", _("Active")
        COMPLETED = "completed", _("Completed")
        CANCELLED = "cancelled", _("Cancelled")

    public_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False, db_index=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name=_("user"),
        on_delete=models.CASCADE,
        related_name="enrollments",
    )
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="enrollments")
    status = models.CharField(
        _("status"), max_length=20, choices=Status.choices, default=Status.ACTIVE, db_index=True
    )
    enrolled_at = models.DateTimeField(_("enrolled at"), default=timezone.now)
    completed_at = models.DateTimeField(_("completed at"), null=True, blank=True)
    progress_percent = models.PositiveSmallIntegerField(_("progress percent"), default=0)

    class Meta(BaseModel.Meta):
        verbose_name = _("Enrollment")
        verbose_name_plural = _("Enrollments")
        ordering = ["-enrolled_at"]
        constraints = [
            models.UniqueConstraint(fields=["user", "course"], name="unique_user_course_enrollment")
        ]

    def __str__(self) -> str:
        return f"{self.user_id} → {self.course_id} ({self.status})"
