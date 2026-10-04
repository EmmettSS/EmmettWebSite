"""همگام‌سازی ``Project`` با ایندکس جست‌وجوی سراسری (ADR-0021)."""

from __future__ import annotations

from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from apps.core.search import remove_from_index, sync_search_index
from apps.core.utils.urls import localized_path
from apps.portfolio.models import Project

_CONTENT_TYPE = "project"


def _category_label(instance: Project) -> str:
    category = instance.categories.first()
    return str(category.name) if category else ""


@receiver(post_save, sender=Project)
def sync_project_index(sender: type[Project], instance: Project, **kwargs: object) -> None:
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
    remove_from_index(content_type=_CONTENT_TYPE, object_id=instance.pk)
