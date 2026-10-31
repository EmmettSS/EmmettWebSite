"""Invalidate category/tag-dependent public content caches."""

from __future__ import annotations

from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from apps.core.frontend_cache import invalidate_model_cache
from apps.taxonomy.models import Category, Tag


@receiver((post_save, post_delete), sender=Category)
def invalidate_category_cache(sender: type[Category], instance: Category, **kwargs: object) -> None:
    invalidate_model_cache(instance)


@receiver((post_save, post_delete), sender=Tag)
def invalidate_tag_cache(sender: type[Tag], instance: Tag, **kwargs: object) -> None:
    invalidate_model_cache(instance)
