from __future__ import annotations

from modeltranslation.translator import TranslationOptions, register

from apps.academy.models import Course, Instructor, Lesson


@register(Instructor)
class InstructorTranslationOptions(TranslationOptions):
    fields = ("title", "bio")


@register(Course)
class CourseTranslationOptions(TranslationOptions):
    fields = (
        "title",
        "summary",
        "description",
        "description_html",
        "meta_title",
        "meta_description",
    )


@register(Lesson)
class LessonTranslationOptions(TranslationOptions):
    fields = ("title", "summary", "content", "content_html")
