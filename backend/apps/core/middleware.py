"""Middlewareهای فاز ۷: هدرهای امنیتی، اجبار ۲FA ادمین و ریدایرکت‌های SEO.

ترتیب در ``MIDDLEWARE`` مهم است:
``SecurityHeadersMiddleware`` → ``AdminTwoFactorMiddleware`` → ``RedirectFallbackMiddleware``.
هر دو مورد آخر باید بعد از ``AuthenticationMiddleware`` باشند و ریدایرکت
آخرین باشد تا وقتی همهٔ viewها ۴۰۴ دادند، نگاشت ادمین اعمال شود.
"""

from __future__ import annotations

from collections.abc import Callable

from django.conf import settings
from django.db.models import F
from django.http import HttpRequest, HttpResponse, HttpResponseRedirect
from django.shortcuts import render
from django.urls import reverse
from django.utils.translation import gettext as _

from apps.core.logging import get_logger
from apps.core.models import Redirect, RedirectStatus, normalize_redirect_path
from apps.core.security import LoginLockout, build_csp_policy
from apps.core.utils.request import get_client_ip

logger = get_logger(__name__)

#: مسیرهایی که دو مرحله‌ای ادمین نباید روی آن‌ها اعمال شود.
_2FA_EXEMPT_PREFIXES = ("/admin/2fa/", "/admin/logout/", "/admin/jsi18n/", "/static/", "/media/")

#: مسیر نگاشت ادمین — همان مسیرهای ۴۰۴ جنگو (ادمین/مدیا/API قدیمی) از این
#: جدول استفاده می‌کنند. ویترین عمومی توسط Next.js مدیریت می‌شود (ADR-0031).
_REDIRECT_SKIP_PREFIXES = ("/static/", "/media/")


class SecurityHeadersMiddleware:
    """هدرهای امنیتی سطح جنگو (CSP/Referrer/Permissions) با سیاست قابل‌تنظیم.

    فرانت‌اند سیاست nonce-based خودش را دارد؛ این middleware پاسخ‌های جنگو
    (ادمین و API) را پوشش می‌دهد تا هر دو سطح یکسان سخت‌سازی شوند.
    """

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        response = self.get_response(request)

        if settings.CSP_ENABLED and not response.has_header("Content-Security-Policy"):
            header = (
                "Content-Security-Policy-Report-Only"
                if settings.CSP_REPORT_ONLY
                else "Content-Security-Policy"
            )
            response[header] = build_csp_policy(is_admin=request.path.startswith("/admin/"))

        response.setdefault("Referrer-Policy", settings.SECURITY_REFERRER_POLICY)
        response.setdefault("Permissions-Policy", settings.SECURITY_PERMISSIONS_POLICY)
        response.setdefault("Cross-Origin-Opener-Policy", "same-origin")
        response.setdefault("X-Content-Type-Options", "nosniff")
        return response


class AdminLoginLockoutMiddleware:
    """توقف brute-force روی فرم ورود ادمین: پاسخ ۴۲۹ + ``Retry-After``.

    شمارش تلاش‌های ناموفق در ``LoginLockout`` (سیگنال ``user_login_failed``)
    انجام می‌شود؛ این middleware فقط **اجرا**ی قفل را تضمین می‌کند. بدون آن،
    رکورد قفل ثبت می‌شد ولی فرم ادمین بی‌توقف تلاش‌های تازه می‌پذیرفت.

    مسیر ``/admin/login/`` در چند زبان می‌آید؛ پس مقایسه روی ``endswith`` است.
    """

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        if request.method == "POST" and self._is_admin_login(request):
            email = str(request.POST.get("username", "") or "")
            ip = get_client_ip(request) or ""
            state = LoginLockout().state(email=email, ip=ip)
            if state.locked:
                _log_login_blocked(request=request, email=email, retry_after=state.retry_after)
                minutes = max(1, round(state.retry_after / 60))
                response = HttpResponse(
                    _("Too many failed sign-in attempts. Try again in about %(minutes)s minute(s).")
                    % {"minutes": minutes},
                    status=429,
                    content_type="text/html; charset=utf-8",
                )
                response["Retry-After"] = str(state.retry_after)
                return response
        return self.get_response(request)

    @staticmethod
    def _is_admin_login(request: HttpRequest) -> bool:
        return request.path.rstrip("/").endswith("/admin/login")


def _log_login_blocked(*, request: HttpRequest, email: str, retry_after: int) -> None:
    """ثبت رخداد ``auth.login_blocked`` برای توقف ورود ادمین."""

    from apps.core.models import log_action

    log_action(
        action="auth.login_blocked",
        metadata={"email": email, "retry_after": retry_after, "surface": "admin"},
        ip_address=get_client_ip(request),
        user_agent=request.META.get("HTTP_USER_AGENT", "")[:500],
    )


class AdminTwoFactorMiddleware:
    """اجبار دو مرحله‌ای برای ورود به ادمین وقتی ``ADMIN_2FA_REQUIRED`` روشن است.

    کاربر staff بدون دستگاه تأییدشده به «راه‌اندازی» و کاربر با دستگاه
    تأییدشدهٔ ولی‌تأییدنشده در این نشست به «تأیید کد» هدایت می‌شود. مسیرهای
    خود فرایند ۲FA و خروج از فهرست مستثنا هستند تا حلقهٔ ریدایرکت نسازند.
    """

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        if not self._should_enforce(request):
            return self.get_response(request)

        has_device = self._has_confirmed_device(request)
        next_url = request.get_full_path()
        if has_device:
            return HttpResponseRedirect(f"{reverse('admin-2fa-verify')}?next={next_url}")
        return HttpResponseRedirect(f"{reverse('admin-2fa-setup')}?next={next_url}")

    @staticmethod
    def _should_enforce(request: HttpRequest) -> bool:
        if not settings.ADMIN_2FA_REQUIRED or not request.path.startswith("/admin"):
            return False
        if request.path.startswith(_2FA_EXEMPT_PREFIXES):
            return False
        user = getattr(request, "user", None)
        if user is None or not getattr(user, "is_authenticated", False) or not user.is_staff:
            return False
        # ``is_verified`` را ``OTPMiddleware`` به کاربر اضافه می‌کند و در stubs
        # نیست؛ getattr با پیش‌فرض امن (ناتأییدشده) تایپ را هم تمیز می‌کند.
        return not bool(getattr(user, "is_verified", lambda: False)())

    @staticmethod
    def _has_confirmed_device(request: HttpRequest) -> bool:
        """بررسی دستگاه تأییدشده از طریق دامنهٔ ۲FA (بدون import چرخشی)."""

        from apps.accounts.twofa import has_confirmed_device

        try:
            return has_confirmed_device(request.user)
        except Exception:  # noqa: BLE001 - نبود دستگاه یعنی «راه‌اندازی لازم است»
            return False


class RedirectFallbackMiddleware:
    """نگاشت ۳۰۱/۳۰۲/۴۱۰ مدیریت‌شده از ادمین برای مسیرهای ۴۰۴ جنگو.

    جدول کوچک است ولی چون روی هر ۴۰۴ خوانده می‌شود، یک بار در هر درخواست از
    cache خوانده می‌شود (``SEO_REDIRECTS_CACHE_SECONDS``) — نه کوئری دیتابیس
    در هر ۴۰۴. شمارش بازدید با ``F()`` (اتمیک در دیتابیس) انجام می‌شود و
    خرابی آن هرگز پاسخ کاربر را نمی‌شکند.
    """

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        response = self.get_response(request)
        if response.status_code != 404 or request.path.startswith(_REDIRECT_SKIP_PREFIXES):
            return response

        entry = self._lookup(normalize_redirect_path(request.path))
        if entry is None:
            return response

        target, status_code, redirect_id = entry
        self._count_hit(redirect_id)
        logger.info("seo_redirect_hit", path=request.path, status_code=status_code)

        if status_code == int(RedirectStatus.GONE):
            # ۴۱۰ یعنی «برای همیشه حذف شده» — موتور جست‌وجو باید سریع‌تر از ۴۰۴
            # رکورد را از ایندکس بردارد (ADR-0031).
            return render(request, "410.html", status=410)
        return HttpResponseRedirect(target, status=status_code)

    @classmethod
    def _lookup(cls, path: str) -> tuple[str, int, int] | None:
        """(target, status_code, id) — از cache؛ در نبود cache از دیتابیس."""

        from django.core.cache import cache

        cache_key = "seo:redirects:map:v1"
        mapping: dict[str, tuple[str, int, int]] | None = cache.get(cache_key)
        if mapping is None:
            mapping = {
                row.from_path: (row.target, row.status_code, row.pk)
                for row in Redirect.objects.filter(is_active=True)
                .only("id", "from_path", "target", "status_code")
                .iterator()
            }
            cache.set(cache_key, mapping, timeout=settings.SEO_REDIRECTS_CACHE_SECONDS)
        return mapping.get(path)

    @staticmethod
    def _count_hit(redirect_id: int) -> None:
        if not settings.SEO_COUNT_REDIRECT_HITS:
            return
        try:
            Redirect.objects.filter(pk=redirect_id).update(hit_count=F("hit_count") + 1)
        except Exception:  # noqa: BLE001 - شمارش آماری هرگز نباید درخواست را بشکند
            logger.exception("seo_redirect_hit_count_failed", redirect_id=redirect_id)


__all__ = ["AdminTwoFactorMiddleware", "RedirectFallbackMiddleware", "SecurityHeadersMiddleware"]
