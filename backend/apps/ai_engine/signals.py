"""Keep approved generated summaries from surviving a source article edit."""

from __future__ import annotations

import hashlib

from django.contrib.contenttypes.models import ContentType
from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.ai_engine.models import AIContentArtifact
from apps.blog.models import BlogPost


@receiver(post_save, sender=BlogPost, dispatch_uid="ai_engine.stale_blog_summaries")
def stale_changed_blog_summaries(sender: type[BlogPost], instance: BlogPost, **kwargs: object) -> None:
    if instance.pk is None:
        return
    content_type = ContentType.objects.get_for_model(instance, for_concrete_model=False)
    for locale in ("fa", "en"):
        source = getattr(instance, f"content_{locale}", "") or instance.content
        source_hash = hashlib.sha256(source.encode("utf-8")).hexdigest()
        AIContentArtifact.objects.filter(
            content_type=content_type,
            object_id=instance.pk,
            locale=locale,
            is_stale=False,
        ).exclude(source_hash=source_hash).update(is_stale=True)
