"""همگام‌سازی ``Project`` با ایندکس جست‌وجوی سراسری (ADR-0021)."""

from __future__ import annotations

from django.db.models.signals import m2m_changed, post_delete, post_save
from django.dispatch import receiver

from apps.core.frontend_cache import invalidate_model_cache
from apps.core.search import remove_from_index, sync_search_index
from apps.core.utils.urls import localized_path
from apps.portfolio.models import CaseStudy, Project

_CONTENT_TYPE = "project"


def _category_label(instance: Project) -> str:
    category = instance.categories.first()
    return str(category.name) if category else ""


@receiver(post_save, sender=Project)
def sync_project_index(sender: type[Project], instance: Project, **kwargs: object) -> None:
    invalidate_model_cache(instance)
    category_label = _category_label(instance)
    for locale in ("fa", "en"):
        sync_search_index(
            content_type=_CONTENT_TYPE,
            object_id=instance.pk,
            public_id=instance.public_id,
            locale=locale,
            title=getattr(instance, f"title_{locale}", "") or "",
            body=getattr(instance, f"summary_{locale}", "") or "",
            url_path=localized_path(locale, f"/projects/{instance.slug}"),
            category_label=category_label,
            is_indexable=instance.is_published,
        )


@receiver(post_delete, sender=Project)
def remove_project_from_index(sender: type[Project], instance: Project, **kwargs: object) -> None:
    invalidate_model_cache(instance)
    remove_from_index(content_type=_CONTENT_TYPE, object_id=instance.pk)


@receiver((post_save, post_delete), sender=CaseStudy)
def invalidate_case_study_cache(sender: type[CaseStudy], instance: CaseStudy, **kwargs: object) -> None:
    invalidate_model_cache(Project)


@receiver(m2m_changed, sender=Project.categories.through)
@receiver(m2m_changed, sender=Project.tags.through)
@receiver(m2m_changed, sender=Project.gallery.through)
def invalidate_project_related_cache(sender: type, instance: object, action: str, **kwargs: object) -> None:
    if action in {"post_add", "post_remove", "post_clear"}:
        invalidate_model_cache(instance)
