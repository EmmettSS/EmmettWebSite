"""همگام‌سازی ``Course`` با ایندکس جست‌وجوی سراسری (ADR-0021)."""

from __future__ import annotations

from django.db.models.signals import m2m_changed, post_delete, post_save
from django.dispatch import receiver

from apps.academy.models import Course, Instructor, Lesson
from apps.core.frontend_cache import invalidate_model_cache
from apps.core.search import remove_from_index, sync_search_index
from apps.core.utils.urls import localized_path

_CONTENT_TYPE = "course"


@receiver(post_save, sender=Course)
def sync_course_index(sender: type[Course], instance: Course, **kwargs: object) -> None:
    invalidate_model_cache(instance)
    for locale in ("fa", "en"):
        sync_search_index(
            content_type=_CONTENT_TYPE,
            object_id=instance.pk,
            public_id=instance.public_id,
            locale=locale,
            title=getattr(instance, f"title_{locale}", "") or "",
            body=getattr(instance, f"summary_{locale}", "") or "",
            url_path=localized_path(locale, f"/academy/{instance.slug}"),
            category_label=instance.get_level_display(),
            is_indexable=instance.is_published,
        )


@receiver(post_delete, sender=Course)
def remove_course_from_index(sender: type[Course], instance: Course, **kwargs: object) -> None:
    invalidate_model_cache(instance)
    remove_from_index(content_type=_CONTENT_TYPE, object_id=instance.pk)


@receiver((post_save, post_delete), sender=Lesson)
def invalidate_lesson_cache(sender: type[Lesson], instance: Lesson, **kwargs: object) -> None:
    invalidate_model_cache(Course)


@receiver((post_save, post_delete), sender=Instructor)
def invalidate_instructor_cache(sender: type[Instructor], instance: Instructor, **kwargs: object) -> None:
    invalidate_model_cache(Course)


@receiver(m2m_changed, sender=Course.categories.through)
@receiver(m2m_changed, sender=Course.tags.through)
def invalidate_course_taxonomy_cache(sender: type, instance: object, action: str, **kwargs: object) -> None:
    if action in {"post_add", "post_remove", "post_clear"}:
        invalidate_model_cache(instance)
