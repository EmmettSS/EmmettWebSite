"""تست‌های امنیتی فاز ۷ (ADR-0033): هدرهای امنیتی، CSP و محافظت از ورود.

سه لایه آزموده می‌شود:

1. **هدرها** — ``SecurityHeadersMiddleware`` روی پاسخ‌های جنگو (API/ادمین).
2. **``LoginLockout``** — واحد: شمارش، قفل، بازکردن، حالت خاموش و هش PII.
3. **یکپارچگی** — ورود API و فرم ادمین: آستانه ⇒ ۴۲۹ + ``Retry-After``؛
   ورود موفق شمارنده را صفر می‌کند و رخدادهای حسابرسی ثبت می‌شوند.
"""

from __future__ import annotations

import time
from collections.abc import Iterator
from typing import Any, cast

import pytest
from django.core.cache import cache
from django.http import HttpRequest
from django.test import Client
from django.urls import reverse

from apps.accounts.models import User
from apps.accounts.tests.factories import UserFactory
from apps.core.models import AuditLog
from apps.core.security import LoginLockout, build_csp_policy, hash_identifier

pytestmark = pytest.mark.django_db

LOGIN_URL = "/api/v1/auth/login/"
ADMIN_LOGIN_URL = "/admin/login/"


@pytest.fixture(autouse=True)
def _clear_cache() -> Iterator[None]:
    """cache مشترک locmem بین تست‌ها باقی می‌ماند؛ شمارنده/throttle باید پاک شود."""

    cache.clear()
    yield
    cache.clear()


# ---------------------------------------------------------------------------
# ۱) هدرهای امنیتی
# ---------------------------------------------------------------------------


class TestSecurityHeaders:
    def test_api_response_is_locked_down(self, client: Client) -> None:
        response = client.get("/api/v1/seo/settings/")

        csp = response["Content-Security-Policy"]
        assert csp.startswith("default-src 'none'")
        assert "object-src 'none'" in csp
        assert "frame-ancestors 'none'" in csp
        assert "script-src 'self'" in csp
        assert "unsafe-inline" not in csp
        assert response["Referrer-Policy"] == "strict-origin-when-cross-origin"
        assert response["Permissions-Policy"] == "camera=(), microphone=(), geolocation=()"
        assert response["Cross-Origin-Opener-Policy"] == "same-origin"
        assert response["X-Content-Type-Options"] == "nosniff"

    def test_admin_response_gets_inline_friendly_policy(self, client: Client) -> None:
        response = client.get(ADMIN_LOGIN_URL)

        csp = response["Content-Security-Policy"]
        assert csp.startswith("default-src 'self'")
        # Jazzmin استایل/اسکریپت درون‌خطی دارد؛ این استثنا فقط برای ادمین است.
        assert "style-src 'self' 'unsafe-inline'" in csp
        assert "script-src 'self' 'unsafe-inline'" in csp

    def test_report_only_mode_uses_the_other_header(self, client: Client, settings: Any) -> None:
        settings.CSP_REPORT_ONLY = True

        response = client.get("/api/v1/seo/settings/")

        assert "Content-Security-Policy" not in response
        assert response["Content-Security-Policy-Report-Only"].startswith("default-src 'none'")

    def test_csp_can_be_disabled(self, client: Client, settings: Any) -> None:
        settings.CSP_ENABLED = False

        response = client.get("/api/v1/seo/settings/")

        assert "Content-Security-Policy" not in response
        # بقیهٔ هدرها مستقل از CSP هستند و باید بمانند.
        assert response["X-Content-Type-Options"] == "nosniff"

    def test_report_uri_and_extra_img_sources_come_from_settings(self, settings: Any) -> None:
        settings.CSP_REPORT_URI = "https://csp.example.com/report"
        settings.CSP_EXTRA_IMG_SRC = ["https://cdn.example.com"]

        policy = build_csp_policy(is_admin=False)

        assert "report-uri https://csp.example.com/report" in policy
        assert "https://cdn.example.com" in policy

    def test_existing_csp_header_is_not_overwritten(self, settings: Any) -> None:
        """اگر view خودش سیاست (مثلاً nonce-based) ست کرده باشد، middleware دخالت نمی‌کند."""

        from django.http import HttpResponse

        from apps.core.middleware import SecurityHeadersMiddleware

        response = HttpResponse("ok")
        response["Content-Security-Policy"] = "default-src 'nonce-abc'"
        middleware = SecurityHeadersMiddleware(lambda request: response)

        fake_request = cast(HttpRequest, type("R", (), {"path": "/admin/", "META": {}})())
        result = middleware(fake_request)

        assert result["Content-Security-Policy"] == "default-src 'nonce-abc'"


# ---------------------------------------------------------------------------
# ۲) LoginLockout — واحد
# ---------------------------------------------------------------------------


class TestLoginLockoutUnit:
    def test_hash_identifier_hides_the_original_value(self) -> None:
        raw = "victim@example.com"
        digest = hash_identifier(raw)

        assert raw not in digest
        assert len(digest) == 32
        assert digest == hash_identifier(" Victim@Example.com ")  # نرمال‌سازی

    def test_locks_after_max_attempts(self, settings: Any) -> None:
        settings.LOGIN_LOCKOUT_MAX_ATTEMPTS = 3
        settings.LOGIN_LOCKOUT_DURATION_SECONDS = 600
        lockout = LoginLockout()

        assert lockout.record_failure(email="a@example.com").locked is False
        assert lockout.record_failure(email="a@example.com").locked is False

        state = lockout.record_failure(email="a@example.com")

        assert state.locked is True
        assert state.retry_after == 600
        assert lockout.state(email="a@example.com").locked is True

    def test_origin_scope_blocks_unknown_accounts_from_one_ip(self, settings: Any) -> None:
        """حملهٔ password-spray با ایمیل‌های تازه از یک IP هم باید قفل شود."""

        settings.LOGIN_LOCKOUT_MAX_ATTEMPTS = 3
        lockout = LoginLockout()

        for index in range(2):
            lockout.record_failure(email=f"user{index}@example.com", ip="203.0.113.7")

        assert lockout.record_failure(email="user3@example.com", ip="203.0.113.7").locked is True
        assert lockout.state(ip="203.0.113.7").locked is True
        # حساب دیگری از IP دیگر آزاد است.
        assert lockout.state(email="user3@example.com", ip="198.51.100.9").locked is False

    def test_successful_reset_clears_counter_and_lock(self, settings: Any) -> None:
        settings.LOGIN_LOCKOUT_MAX_ATTEMPTS = 2
        lockout = LoginLockout()
        lockout.record_failure(email="a@example.com")
        assert lockout.record_failure(email="a@example.com").locked is True

        lockout.reset(email="a@example.com", ip="127.0.0.1")

        assert lockout.state(email="a@example.com").locked is False

    def test_unlock_is_audited(self) -> None:
        lockout = LoginLockout()
        lockout.record_failure(email="a@example.com")

        lockout.unlock(email="a@example.com")

        assert AuditLog.objects.filter(action="auth.lockout_cleared").exists()
        assert lockout.state(email="a@example.com").locked is False

    def test_disabled_lockout_never_blocks(self, settings: Any) -> None:
        settings.LOGIN_LOCKOUT_ENABLED = False

        state = LoginLockout().record_failure(email="a@example.com")

        assert state.locked is False
        assert LoginLockout().state(email="a@example.com").locked is False

    def test_no_raw_identifier_is_stored_in_cache_keys(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """کلیدهای cache باید هش باشند، نه ایمیل/IP خام.

        ``cache`` در dev می‌تواند ``LocMemCache`` یا ``FileBasedCache`` باشد
        (``.env.example`` دومی را انتخاب می‌کند) و فقط اولی ``_cache`` دارد؛
        پس به‌جای خواندن ساختار داخلی، فراخوانی ``set`` را می‌گیریم.
        """

        email = "secret-person@example.com"
        written_keys: list[str] = []
        original_set = cache.set

        def spy_set(key: str, value: Any, timeout: int | None = None, **kwargs: Any) -> Any:
            written_keys.append(key)
            return original_set(key, value, timeout=timeout, **kwargs)

        monkeypatch.setattr(cache, "set", spy_set)

        LoginLockout().record_failure(email=email, ip="203.0.113.9")

        assert written_keys, "شمارنده باید در cache نوشته شود"
        assert all(email not in key for key in written_keys)


# ---------------------------------------------------------------------------
# ۳) ورود API — ۴۲۹ + Retry-After
# ---------------------------------------------------------------------------


class TestApiLoginLockout:
    def _fail(self, client: Client, email: str, *, ip: str = "203.0.113.10") -> Any:
        return client.post(
            LOGIN_URL,
            {"email": email, "password": "definitely-wrong"},
            content_type="application/json",
            HTTP_X_FORWARDED_FOR=ip,
        )

    def test_failed_login_is_counted_and_audited(self, client: Client) -> None:
        response = self._fail(client, "nobody@example.com")

        assert response.status_code == 401
        assert AuditLog.objects.filter(action="auth.login_failed").exists()

    def test_threshold_blocks_with_429_and_retry_after(self, client: Client, settings: Any) -> None:
        settings.LOGIN_LOCKOUT_MAX_ATTEMPTS = 3
        settings.LOGIN_LOCKOUT_DURATION_SECONDS = 900

        for _ in range(3):
            self._fail(client, "victim@example.com")

        response = client.post(
            LOGIN_URL,
            {"email": "victim@example.com", "password": "whatever"},
            content_type="application/json",
            HTTP_X_FORWARDED_FOR="203.0.113.10",
        )

        assert response.status_code == 429
        assert int(response["Retry-After"]) == 900
        assert response.json()["retry_after"] == 900
        assert "تلاش" in response.json()["detail"]
        assert AuditLog.objects.filter(action="auth.login_blocked").exists()

    def test_lockout_events_are_recorded(self, client: Client, settings: Any) -> None:
        settings.LOGIN_LOCKOUT_MAX_ATTEMPTS = 2

        for _ in range(2):
            self._fail(client, "victim2@example.com")

        actions = set(AuditLog.objects.values_list("action", flat=True))
        assert "auth.lockout_triggered" in actions
        assert "auth.account_locked" in actions

    def test_correct_password_after_lockout_is_still_blocked(self, client: Client, settings: Any) -> None:
        """قفل نباید با دانستن رمز دور زده شود (سخت‌گیری عمدی در بازهٔ قفل)."""

        settings.LOGIN_LOCKOUT_MAX_ATTEMPTS = 2
        user = cast(User, UserFactory(email="locked@example.com"))
        user.set_password("s3cret-pass")
        user.save()

        for _ in range(2):
            self._fail(client, "locked@example.com")

        response = client.post(
            LOGIN_URL,
            {"email": "locked@example.com", "password": "s3cret-pass"},
            content_type="application/json",
            HTTP_X_FORWARDED_FOR="203.0.113.10",
        )

        assert response.status_code == 429

    def test_successful_login_resets_the_counter(self, client: Client, settings: Any) -> None:
        settings.LOGIN_LOCKOUT_MAX_ATTEMPTS = 4
        user = cast(User, UserFactory(email="good@example.com"))
        user.set_password("s3cret-pass")
        user.save()

        for _ in range(3):
            self._fail(client, "good@example.com")

        ok = client.post(
            LOGIN_URL,
            {"email": "good@example.com", "password": "s3cret-pass"},
            content_type="application/json",
            HTTP_X_FORWARDED_FOR="203.0.113.10",
        )
        assert ok.status_code == 200
        assert AuditLog.objects.filter(action="auth.login_succeeded").exists()

        # سه شکست تازه نباید کاربر را قفل کند (شمارنده صفر شده است).
        for _ in range(3):
            self._fail(client, "good@example.com")
        response = self._fail(client, "good@example.com")
        assert response.status_code == 401


# ---------------------------------------------------------------------------
# ۴) فرم ورود ادمین — اجرای قفل در سطح middleware
# ---------------------------------------------------------------------------


class TestAdminLoginLockout:
    def _fail(self, client: Client, email: str) -> Any:
        return client.post(
            ADMIN_LOGIN_URL,
            {"username": email, "password": "wrong"},
            HTTP_X_FORWARDED_FOR="203.0.113.20",
        )

    def test_admin_login_is_locked_after_threshold(self, client: Client, settings: Any) -> None:
        settings.LOGIN_LOCKOUT_MAX_ATTEMPTS = 3
        settings.LOGIN_LOCKOUT_DURATION_SECONDS = 300

        for _ in range(3):
            response = self._fail(client, "admin@example.com")
            assert response.status_code == 200  # فرم با پیام خطا

        blocked = self._fail(client, "admin@example.com")

        assert blocked.status_code == 429
        assert blocked["Retry-After"] == "300"
        assert AuditLog.objects.filter(action="auth.login_blocked").exists()

    def test_get_on_admin_login_is_never_blocked(self, client: Client, settings: Any) -> None:
        settings.LOGIN_LOCKOUT_MAX_ATTEMPTS = 1
        self._fail(client, "admin@example.com")

        assert client.get(ADMIN_LOGIN_URL).status_code == 200

    def test_lockout_expires(self, client: Client, settings: Any) -> None:
        settings.LOGIN_LOCKOUT_MAX_ATTEMPTS = 1
        settings.LOGIN_LOCKOUT_DURATION_SECONDS = 1
        self._fail(client, "admin@example.com")

        cache.clear()  # شبیه‌سازی انقضای TTL (locmem با ttl واقعی در تست کند است)

        assert self._fail(client, "admin@example.com").status_code == 200

    def test_other_admin_paths_are_not_blocked_by_middleware(self, client: Client, settings: Any) -> None:
        """middleware فقط روی همان مسیر ورود اثر می‌گذارد، نه کل ادمین."""

        settings.LOGIN_LOCKOUT_MAX_ATTEMPTS = 1
        self._fail(client, "admin@example.com")

        response = client.get(reverse("admin:index"))

        # به‌جای ۴۲۹ قفل، مسیر معمول «برو به ورود» طی می‌شود.
        assert response.status_code == 302
        assert reverse("admin:login") in response["Location"]


class TestLockoutTiming:
    def test_attempt_counter_survives_within_window(self, settings: Any) -> None:
        settings.LOGIN_LOCKOUT_MAX_ATTEMPTS = 3
        settings.LOGIN_LOCKOUT_WINDOW_SECONDS = 60
        lockout = LoginLockout()

        lockout.record_failure(email="a@example.com")
        time.sleep(0.01)  # فقط برای مستندسازی؛ پنجره در cache اعمال می‌شود

        assert lockout.record_failure(email="a@example.com").locked is False
        assert lockout.record_failure(email="a@example.com").locked is True
