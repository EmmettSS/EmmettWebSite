"""همگام‌سازی ``Service`` با ایندکس جست‌وجوی سراسری (ADR-0021)."""

from __future__ import annotations

from django.db.models.signals import m2m_changed, post_delete, post_save
from django.dispatch import receiver

from apps.core.frontend_cache import invalidate_model_cache
from apps.core.search import remove_from_index, sync_search_index
from apps.core.utils.urls import localized_path
from apps.services.models import Service

_CONTENT_TYPE = "service"


def _category_label(instance: Service) -> str:
    category = instance.categories.first()
    return str(category.name) if category else ""


@receiver(post_save, sender=Service)
def sync_service_index(sender: type[Service], instance: Service, **kwargs: object) -> None:
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
            url_path=localized_path(locale, f"/services/{instance.slug}"),
            category_label=category_label,
            is_indexable=instance.is_published,
        )


@receiver(post_delete, sender=Service)
def remove_service_from_index(sender: type[Service], instance: Service, **kwargs: object) -> None:
    invalidate_model_cache(instance)
    remove_from_index(content_type=_CONTENT_TYPE, object_id=instance.pk)


@receiver(m2m_changed, sender=Service.categories.through)
@receiver(m2m_changed, sender=Service.tags.through)
def invalidate_service_taxonomy_cache(sender: type, instance: object, action: str, **kwargs: object) -> None:
    if action in {"post_add", "post_remove", "post_clear"}:
        invalidate_model_cache(instance)
