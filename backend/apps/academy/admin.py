"""ادمین اپ ``academy`` — دوره‌ها، درس‌ها، مدرس‌ها، ثبت‌نام‌ها (فاز ۶)."""

from __future__ import annotations

from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from modeltranslation.admin import TranslationTabularInline

from apps.academy.models import Course, Enrollment, Instructor, Lesson
from apps.academy.resources import (
    CourseResource,
    EnrollmentResource,
    InstructorResource,
    LessonResource,
)
from apps.core.admin_filters import RelatedPresenceFilter
from apps.core.admin_mixins import (
    EmmettImportExportAdmin,
    ImportDisabledMixin,
    PublishWorkflowMixin,
    RecordStateFilter,
    SoftDeleteAdminMixin,
    render_status_pill,
)


class CourseHasEnrollmentsFilter(RelatedPresenceFilter):
    title = _("enrollment")
    parameter_name = "has_enrollments"
    relation = "enrollments"


class LessonInline(TranslationTabularInline[Lesson, Course]):
    model = Lesson
    extra = 0
    fields = ("title", "order", "duration_minutes", "is_preview", "video_url")
    ordering = ("order",)
    show_change_link = True


@admin.register(Instructor)
class InstructorAdmin(SoftDeleteAdminMixin, EmmettImportExportAdmin):
    resource_class = InstructorResource
    list_display = ("name", "title", "user", "updated_at")
    list_filter = (RecordStateFilter,)
    search_fields = ("name", "title_fa", "title_en", "bio_fa")
    autocomplete_fields = ("user", "photo")
    list_select_related = ("user",)


@admin.register(Course)
class CourseAdmin(PublishWorkflowMixin, SoftDeleteAdminMixin, EmmettImportExportAdmin):
    resource_class = CourseResource
    list_display = (
        "title",
        "status_badge",
        "level",
        "instructor",
        "duration_hours",
        "is_featured",
        "order",
    )
    list_display_links = ("title",)
    list_editable = ("is_featured", "order")
    list_filter = (
        "status",
        "level",
        "is_featured",
        "instructor",
        "categories",
        CourseHasEnrollmentsFilter,
        RecordStateFilter,
    )
    search_fields = ("title_fa", "title_en", "summary_fa", "summary_en", "slug")
    autocomplete_fields = ("instructor", "cover_image", "categories", "tags", "og_image")
    readonly_fields = ("description_html", "public_id", "created_at", "updated_at", "deleted_at")
    date_hierarchy = "created_at"
    list_select_related = ("instructor",)
    inlines = [LessonInline]
    fieldsets = (
        (None, {"fields": ("title", "slug", "summary", "description")}),
        (_("Course details"), {"fields": ("instructor", "level", "duration_hours")}),
        (_("Media"), {"fields": ("cover_image",)}),
        (_("Categories and ordering"), {"fields": ("categories", "tags", "is_featured", "order")}),
        (_("Publication"), {"fields": ("status", "published_at")}),
        (_("SEO"), {"fields": ("meta_title", "meta_description", "og_image", "canonical_path")}),
        (
            _("Technical details"),
            {
                "classes": ("collapse",),
                "fields": ("description_html", "public_id", "created_at", "updated_at", "deleted_at"),
            },
        ),
    )


@admin.register(Lesson)
class LessonAdmin(SoftDeleteAdminMixin, EmmettImportExportAdmin):
    resource_class = LessonResource
    list_display = ("title", "course", "order", "duration_minutes", "is_preview")
    list_filter = ("course", "is_preview", RecordStateFilter)
    search_fields = ("title_fa", "title_en", "summary_fa", "content_fa")
    autocomplete_fields = ("course",)
    list_select_related = ("course",)
    ordering = ("course", "order")


@admin.register(Enrollment)
class EnrollmentAdmin(ImportDisabledMixin, EmmettImportExportAdmin, SoftDeleteAdminMixin):
    """ثبت‌نام‌ها فقط صادر می‌شوند (دادهٔ رابطه‌ای کاربر ↔ دوره — ADR-0029)."""

    resource_class = EnrollmentResource
    list_display = ("user", "course", "status_badge", "progress_percent", "enrolled_at", "completed_at")
    list_filter = ("status", "enrolled_at", "course", RecordStateFilter)
    search_fields = ("user__email", "course__title_fa", "course__title_en")
    autocomplete_fields = ("user", "course")
    date_hierarchy = "enrolled_at"
    list_select_related = ("user", "course")

    @admin.display(description=_("Status"), ordering="status")
    def status_badge(self, obj: Enrollment) -> str:
        return render_status_pill(str(obj.status), Enrollment.Status.choices)
