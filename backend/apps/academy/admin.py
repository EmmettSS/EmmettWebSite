from __future__ import annotations

from django.contrib import admin
from modeltranslation.admin import TranslationAdmin, TranslationTabularInline

from apps.academy.models import Course, Enrollment, Instructor, Lesson


class LessonInline(TranslationTabularInline[Lesson, Course]):
    model = Lesson
    extra = 0
    fields = ("title", "order", "duration_minutes", "is_preview", "video_url")
    ordering = ("order",)


@admin.register(Instructor)
class InstructorAdmin(TranslationAdmin[Instructor]):
    list_display = ("name", "title")
    search_fields = ("name", "title")
    autocomplete_fields = ("user",)


@admin.register(Course)
class CourseAdmin(TranslationAdmin[Course]):
    list_display = ("title", "level", "status", "instructor", "is_featured", "order")
    list_filter = ("status", "level", "is_featured", "categories")
    search_fields = ("title", "summary", "slug")
    filter_horizontal = ("categories", "tags")
    autocomplete_fields = ("instructor",)
    inlines = [LessonInline]


@admin.register(Lesson)
class LessonAdmin(TranslationAdmin[Lesson]):
    list_display = ("title", "course", "order", "duration_minutes", "is_preview")
    list_filter = ("course", "is_preview")
    search_fields = ("title", "summary")
    autocomplete_fields = ("course",)


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin[Enrollment]):
    list_display = ("user", "course", "status", "progress_percent", "enrolled_at")
    list_filter = ("status",)
    search_fields = ("user__email", "course__title")
    autocomplete_fields = ("user", "course")
