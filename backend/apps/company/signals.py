"""Invalidate cached public company-section responses on CMS changes."""

from __future__ import annotations

from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from apps.company.models import TeamMember, Testimonial
from apps.core.frontend_cache import invalidate_model_cache


@receiver((post_save, post_delete), sender=TeamMember)
def invalidate_team_member_cache(sender: type[TeamMember], instance: TeamMember, **kwargs: object) -> None:
    invalidate_model_cache(instance)


@receiver((post_save, post_delete), sender=Testimonial)
def invalidate_testimonial_cache(sender: type[Testimonial], instance: Testimonial, **kwargs: object) -> None:
    invalidate_model_cache(instance)
