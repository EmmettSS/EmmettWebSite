"""زیرساخت امنیتی مشترک فاز ۷ (ADR-0033).

دو مسئولیت این ماژول:

1. **ساخت هدرهای امنیتی** — ``build_csp_policy`` سیاست CSP را از تنظیمات
   می‌سازد. هیچ سیاستی در middleware hard-code نشده تا بدون دیپلوی قابل
   تنظیم باشد (قانون ۵) و در تست‌ها قابل بازرسی باشد.
2. **محافظت از ورود (lockout)** — ``LoginLockout`` شمارش تلاش‌های ناموفق را
   در cache نگه می‌دارد (بدون مدل/ریدیس؛ سازگار با هاست اشتراکی) و پس از
   ``LOGIN_LOCKOUT_MAX_ATTEMPTS`` تلاش، شناسه را برای مدتی قفل می‌کند.

چرا ``django-axes`` استفاده نشد؟ چون نیاز این پروژه باریک و مشخص است: باید
هم روی فرم ادمین و هم روی API JSON (با کد ۴۲۹ و پیام فارسی و هدر
``Retry-After``) اثر بگذارد، ضمناً هر قفل/بازشدن در ``AuditLog`` ثبت شود.
پیاده‌سازی cache-محور ۶۰ خط است، مدل و مهاجرت اضافه نمی‌کند و رفتارش کاملاً
تست‌شده است؛ در مقابل، axes دو مدل + middleware + سطح تنظیمات بزرگ می‌آورد.
"""

from __future__ import annotations

import hashlib
import time
from dataclasses import dataclass
from typing import Any, Final

from django.conf import settings
from django.core.cache import cache
from django.http import HttpRequest

from apps.core.logging import get_logger

logger = get_logger(__name__)

#: پیشوند کلیدهای cache برای شمارش/قفل ورود.
LOCKOUT_KEY_PREFIX: Final[str] = "security:login_lockout"


def hash_identifier(value: str) -> str:
    """شناسه (ایمیل یا IP) را هش می‌کند تا در cache/لاگ PII ذخیره نشود."""

    return hashlib.sha256(value.strip().lower().encode("utf-8")).hexdigest()[:32]


# ---------------------------------------------------------------------------
# هدرهای امنیتی
# ---------------------------------------------------------------------------


def build_csp_policy(*, is_admin: bool = False) -> str:
    """سیاست CSP را از تنظیمات می‌سازد.

    سیاست برای API/عمومی سخت‌گیرانه است (``default-src 'none'``) و برای صفحهٔ
    ادمین کمی بازتر: قالب‌های Jazzmin استایل/اسکریپت درون‌خطی دارند، پس
    ``'unsafe-inline'`` فقط در همان مسیر و فقط برای style/script مجاز می‌شود
    (اسکریپت خارجی همچنان محدود به ``'self'`` است).
    """

    img_src = ["'self'", "data:", "blob:", *list(settings.CSP_EXTRA_IMG_SRC)]
    directives: list[str] = [
        "default-src 'self'" if is_admin else "default-src 'none'",
        "img-src " + " ".join(img_src),
        "font-src 'self' data:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors " + " ".join(settings.CSP_FRAME_ANCESTORS),
    ]

    if is_admin:
        directives += [
            "style-src 'self' 'unsafe-inline'",
            "script-src 'self' 'unsafe-inline'",
            "connect-src 'self'",
        ]
    else:
        directives += [
            "style-src 'self'",
            "script-src 'self'",
            "connect-src 'self'",
            "frame-src 'none'",
        ]

    report_uri = str(getattr(settings, "CSP_REPORT_URI", "") or "")
    if report_uri:
        directives.append(f"report-uri {report_uri}")

    return "; ".join(directives)


# ---------------------------------------------------------------------------
# Lockout
# ---------------------------------------------------------------------------


@dataclass(frozen=True, slots=True)
class LockState:
    """وضعیت قفل یک شناسه: ``locked`` و اگر قفل است ``retry_after`` ثانیه."""

    locked: bool
    retry_after: int = 0
    attempts: int = 0


class LoginLockout:
    """شمارش تلاش‌های ناموفق ورود و قفل موقت (cache-محور).

    دو شناسه جدا شمارش می‌شوند: **حساب** (هش ایمیل) و **مبدأ** (هش IP). اگر
    فقط حساب شمارش شود، مهاجم می‌تواند حساب قربانی را قفل کند؛ اگر فقط IP
    شمارش شود، حملهٔ توزیع‌شده دیده نمی‌شود. قفل‌شدن هر کدام برای رد درخواست
    کافی است.
    """

    def __init__(self, *, enabled: bool | None = None) -> None:
        self._enabled = settings.LOGIN_LOCKOUT_ENABLED if enabled is None else enabled

    # -- کلیدها ---------------------------------------------------------
    @staticmethod
    def _attempt_key(scope: str, identifier_hash: str) -> str:
        return f"{LOCKOUT_KEY_PREFIX}:attempts:{scope}:{identifier_hash}"

    @staticmethod
    def _lock_key(scope: str, identifier_hash: str) -> str:
        return f"{LOCKOUT_KEY_PREFIX}:locked:{scope}:{identifier_hash}"

    # -- API عمومی ------------------------------------------------------
    def state(self, *, email: str = "", ip: str = "") -> LockState:
        """آیا ورود برای این ایمیل/IP الان قفل است؟"""

        if not self._enabled:
            return LockState(locked=False)

        worst = LockState(locked=False)
        attempts = 0
        for scope, identifier in self._identifiers(email=email, ip=ip):
            identifier_hash = hash_identifier(identifier)
            attempts = max(attempts, int(cache.get(self._attempt_key(scope, identifier_hash), 0) or 0))
            retry_after = self._lock_retry_after(self._lock_key(scope, identifier_hash))
            if retry_after > worst.retry_after:
                worst = LockState(locked=True, retry_after=retry_after, attempts=attempts)
        return LockState(locked=worst.locked, retry_after=worst.retry_after, attempts=attempts)

    def record_failure(
        self, *, email: str = "", ip: str = "", request: HttpRequest | None = None
    ) -> LockState:
        """یک تلاش ناموفق را ثبت می‌کند و در صورت رسیدن به آستانه، قفل می‌کند."""

        if not self._enabled:
            return LockState(locked=False)

        max_attempts = int(settings.LOGIN_LOCKOUT_MAX_ATTEMPTS)
        window = int(settings.LOGIN_LOCKOUT_WINDOW_SECONDS)
        duration = int(settings.LOGIN_LOCKOUT_DURATION_SECONDS)
        state = LockState(locked=False)

        for scope, identifier in self._identifiers(email=email, ip=ip):
            identifier_hash = hash_identifier(identifier)
            attempt_key = self._attempt_key(scope, identifier_hash)
            try:
                attempts = int(cache.get(attempt_key, 0) or 0) + 1
                cache.set(attempt_key, attempts, timeout=window)
            except Exception:  # noqa: BLE001 - خرابی cache نباید ورود را بشکند
                logger.exception("login_lockout_cache_failed", scope=scope)
                continue

            if attempts >= max_attempts:
                self._arm_lock(self._lock_key(scope, identifier_hash), duration=duration)
                cache.delete(attempt_key)
                state = LockState(locked=True, retry_after=duration, attempts=attempts)
                self._log_event("auth.lockout_triggered", scope=scope, attempts=attempts, request=request)

        return state

    def reset(self, *, email: str = "", ip: str = "") -> None:
        """پس از ورود موفق، شمارنده و قفل هر دو شناسه پاک می‌شود."""

        for scope, identifier in self._identifiers(email=email, ip=ip):
            identifier_hash = hash_identifier(identifier)
            try:
                cache.delete(self._attempt_key(scope, identifier_hash))
                cache.delete(self._lock_key(scope, identifier_hash))
            except Exception:  # noqa: BLE001
                logger.exception("login_lockout_cache_failed", scope=scope)

    def unlock(self, *, email: str = "", ip: str = "") -> None:
        """بازکردن دستی قفل (اکشن ادمین) — همراه با ثبت رخداد حسابرسی."""

        self.reset(email=email, ip=ip)
        self._log_event("auth.lockout_cleared", scope="manual", attempts=0, request=None)

    # -- کمکی -----------------------------------------------------------
    @staticmethod
    def _identifiers(*, email: str, ip: str) -> list[tuple[str, str]]:
        pairs: list[tuple[str, str]] = []
        if email:
            pairs.append(("account", email))
        if ip:
            pairs.append(("origin", ip))
        return pairs

    @staticmethod
    def _arm_lock(key: str, *, duration: int) -> None:
        """قفل را با مهلت مطلق ذخیره می‌کند تا ``retry_after`` به TTL واقعی وابسته نباشد.

        ``ttl()`` جزو API استاندارد cache جنگو نیست (LocMemCache ندارد و
        FileBasedCache هم ندارد)؛ اتکا به آن باعث می‌شد قفل هرگز در ``state()``
        دیده نشود — باگ کشف‌شده در تست فاز ۷.
        """

        cache.set(key, int(time.time()) + int(duration), timeout=duration)

    @staticmethod
    def _lock_retry_after(key: str) -> int:
        expires_at = cache.get(key)
        if not expires_at:
            return 0
        return max(0, int(expires_at) - int(time.time()))

    @staticmethod
    def _log_event(action: str, *, scope: str, attempts: int, request: HttpRequest | None) -> None:
        from apps.core.models import log_action

        ip_address: str | None = None
        user_agent = ""
        actor: Any | None = None
        if request is not None:
            from apps.core.utils.request import get_client_ip

            ip_address = get_client_ip(request)
            user_agent = request.META.get("HTTP_USER_AGENT", "")[:500]
            candidate = getattr(request, "user", None)
            if candidate is not None and getattr(candidate, "is_authenticated", False):
                actor = candidate

        log_action(
            action=action,
            actor=actor,
            metadata={"scope": scope, "attempts": attempts},
            ip_address=ip_address,
            user_agent=user_agent,
        )
        logger.warning(action, scope=scope, attempts=attempts)


__all__ = ["LOCKOUT_KEY_PREFIX", "LockState", "LoginLockout", "build_csp_policy", "hash_identifier"]
