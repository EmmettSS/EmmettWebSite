"""سیگنال‌های مربوط به ``User``: ساخت خودکار ``Profile`` (ADR-0025) و ثبت
تغییر نقش کاربر در AuditLog («تغییر نقش کاربر» نمونهٔ صریح ADR-0013).
"""

from __future__ import annotations

from typing import Any

from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from apps.accounts.models import Profile, User
from apps.core.models import log_action


@receiver(post_save, sender=User)
def create_profile_for_new_user(sender: type[User], instance: User, created: bool, **kwargs: Any) -> None:
    if created:
        Profile.objects.get_or_create(user=instance)


@receiver(pre_save, sender=User)
def log_role_change(sender: type[User], instance: User, **kwargs: Any) -> None:
    """اگر نقش کاربر در حال تغییر باشد (مثلاً از طریق Django Admin)، در AuditLog ثبت می‌شود."""

    if instance.pk is None:
        return  # کاربر تازه در حال ساخت است؛ نقش اولیه "تغییر" محسوب نمی‌شود.

    previous_role = User.objects.filter(pk=instance.pk).values_list("role", flat=True).first()
    if previous_role is not None and previous_role != instance.role:
        log_action(
            action="accounts.role_changed",
            target=instance,
            metadata={"from": previous_role, "to": instance.role},
        )
