"""Invalidate cached public responses when shared CMS records change."""

from __future__ import annotations

from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from apps.core.frontend_cache import invalidate_model_cache
from apps.core.models import FAQItem, Media, Redirect, SiteSettings


@receiver((post_save, post_delete), sender=FAQItem)
def invalidate_faq_cache(sender: type[FAQItem], instance: FAQItem, **kwargs: object) -> None:
    invalidate_model_cache(instance)


@receiver((post_save, post_delete), sender=Media)
def invalidate_media_cache(sender: type[Media], instance: Media, **kwargs: object) -> None:
    invalidate_model_cache(instance)


@receiver((post_save, post_delete), sender=Redirect)
def invalidate_redirect_cache(sender: type[Redirect], instance: Redirect, **kwargs: object) -> None:
    invalidate_model_cache(instance)


@receiver((post_save, post_delete), sender=SiteSettings)
def invalidate_site_settings_cache(
    sender: type[SiteSettings], instance: SiteSettings, **kwargs: object
) -> None:
    invalidate_model_cache(instance)
