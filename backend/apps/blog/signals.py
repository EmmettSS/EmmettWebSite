"""همگام‌سازی ``BlogPost`` با ایندکس جست‌وجوی سراسری (ADR-0021)."""

from __future__ import annotations

from django.db.models.signals import m2m_changed, post_delete, post_save
from django.dispatch import receiver

from apps.blog.models import BlogPost, Comment
from apps.core.frontend_cache import invalidate_model_cache
from apps.core.search import remove_from_index, sync_search_index
from apps.core.utils.urls import localized_path

_CONTENT_TYPE = "blog_post"


def _category_label(instance: BlogPost) -> str:
    category = instance.categories.first()
    return str(category.name) if category else ""


@receiver(post_save, sender=BlogPost)
def sync_blog_post_index(sender: type[BlogPost], instance: BlogPost, **kwargs: object) -> None:
    invalidate_model_cache(instance)
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
    invalidate_model_cache(instance)
    remove_from_index(content_type=_CONTENT_TYPE, object_id=instance.pk)


@receiver((post_save, post_delete), sender=Comment)
def invalidate_comment_cache(sender: type[Comment], instance: Comment, **kwargs: object) -> None:
    invalidate_model_cache(BlogPost)


@receiver(m2m_changed, sender=BlogPost.categories.through)
@receiver(m2m_changed, sender=BlogPost.tags.through)
def invalidate_blog_taxonomy_cache(sender: type, instance: object, action: str, **kwargs: object) -> None:
    if action in {"post_add", "post_remove", "post_clear"}:
        invalidate_model_cache(instance)
