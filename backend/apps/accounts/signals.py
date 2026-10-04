"""ساخت خودکار ``Profile`` بلافاصله بعد از ساخت ``User`` (ADR-0025)."""

from __future__ import annotations

from typing import Any

from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.accounts.models import Profile, User


@receiver(post_save, sender=User)
def create_profile_for_new_user(sender: type[User], instance: User, created: bool, **kwargs: Any) -> None:
    if created:
        Profile.objects.get_or_create(user=instance)
