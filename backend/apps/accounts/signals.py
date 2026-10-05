"""سیگنال‌های مربوط به ``User``: ساخت خودکار ``Profile`` (ADR-0025) و ثبت
تغییر نقش کاربر در AuditLog («تغییر نقش کاربر» نمونهٔ صریح ADR-0013).
"""

from __future__ import annotations

from typing import Any

from django.contrib.auth.signals import user_logged_in, user_login_failed
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from apps.accounts.models import Profile, User
from apps.core.models import log_action
from apps.core.security import LoginLockout
from apps.core.utils.request import get_client_ip


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


# ---------------------------------------------------------------------------
# محافظت از ورود (فاز ۷ — ADR-0033)
# ---------------------------------------------------------------------------


def _identity_from_credentials(credentials: dict[str, Any]) -> str:
    """شناسهٔ حساب را از دیکشنری اعتبارنامهٔ سیگنال ``user_login_failed`` می‌سازد.

    پروژه با ایمیل وارد می‌شود (ADR-0006) ولی سیگنال هم ``username`` دارد؛
    هر دو بررسی می‌شوند تا قفل روی مسیرهای مختلف یکسان عمل کند.
    """

    for key in ("email", "username"):
        value = credentials.get(key)
        if value:
            return str(value)
    return ""


@receiver(user_login_failed)
def record_failed_login(sender: Any, credentials: dict[str, Any], request: Any = None, **kwargs: Any) -> None:
    """هر شکست ورود (ادمین یا API) را می‌شمارد و در آستانه، قفل می‌کند."""

    state = LoginLockout().record_failure(
        email=_identity_from_credentials(credentials),
        ip=(get_client_ip(request) if request is not None else "") or "",
        request=request,
    )
    if state.locked:
        log_action(
            action="auth.account_locked",
            metadata={"scope": "threshold_reached", "attempts": state.attempts},
            ip_address=get_client_ip(request) if request is not None else None,
        )


@receiver(user_logged_in)
def reset_lockout_on_success(sender: Any, request: Any, user: Any, **kwargs: Any) -> None:
    """ورود موفق، شمارنده و قفل همان حساب/IP را پاک می‌کند."""

    LoginLockout().reset(
        email=str(getattr(user, "email", "") or ""),
        ip=(get_client_ip(request) if request is not None else "") or "",
    )
