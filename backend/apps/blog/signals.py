"""همگام‌سازی ``BlogPost`` با ایندکس جست‌وجوی سراسری (ADR-0021)."""

from __future__ import annotations

from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from apps.blog.models import BlogPost
from apps.core.search import remove_from_index, sync_search_index
from apps.core.utils.urls import localized_path

_CONTENT_TYPE = "blog_post"


def _category_label(instance: BlogPost) -> str:
    category = instance.categories.first()
    return str(category.name) if category else ""


@receiver(post_save, sender=BlogPost)
def sync_blog_post_index(sender: type[BlogPost], instance: BlogPost, **kwargs: object) -> None:
    category_label = _category_label(instance)
    for locale in ("fa", "en"):
        sync_search_index(
            content_type=_CONTENT_TYPE,
            object_id=instance.pk,
            public_id=instance.public_id,
            locale=locale,
            title=getattr(instance, f"title_{locale}", "") or "",
            body=getattr(instance, f"excerpt_{locale}", "") or "",
            url_path=localized_path(locale, f"/blog/{instance.slug}"),
            category_label=category_label,
            is_indexable=instance.is_published,
        )


@receiver(post_delete, sender=BlogPost)
def remove_blog_post_from_index(sender: type[BlogPost], instance: BlogPost, **kwargs: object) -> None:
    remove_from_index(content_type=_CONTENT_TYPE, object_id=instance.pk)
