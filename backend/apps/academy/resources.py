"""منابع صادرات/واردات اپ ``academy`` (ADR-0029)."""

from __future__ import annotations

from apps.academy.models import Course, Enrollment, Instructor, Lesson
from apps.core.resources import EmmettResource, i18n_fields


class InstructorResource(EmmettResource):
    class Meta:
        model = Instructor
        fields = i18n_fields(("user", "name"), ("title", "bio"))
        export_order = fields
        import_id_fields = ("name",)
        skip_unchanged = True


class CourseResource(EmmettResource):
    class Meta:
        model = Course
        fields = i18n_fields(
            (
                "slug",
                "status",
                "level",
                "instructor",
                "duration_hours",
                "is_featured",
                "order",
                "published_at",
            ),
            ("title", "summary", "description", "meta_title", "meta_description"),
        )
        export_order = fields
        import_id_fields = ("slug",)
        skip_unchanged = True
        report_skipped = True


class LessonResource(EmmettResource):
    class Meta:
        model = Lesson
        fields = i18n_fields(
            ("course", "order", "duration_minutes", "is_preview", "video_url"),
            ("title", "summary", "content"),
        )
        export_order = fields
        # هر درس فقط در بستر دوره‌اش یکتاست: (course, order) — کلید ترکیبی ADR-0029.
        import_id_fields = ("course", "order")
        skip_unchanged = True


class EnrollmentResource(EmmettResource):
    class Meta:
        model = Enrollment
        fields = (
            "schema_version",
            "enrolled_at",
            "completed_at",
            "user",
            "course",
            "status",
            "progress_percent",
        )
        export_order = fields


__all__ = ["CourseResource", "EnrollmentResource", "InstructorResource", "LessonResource"]
