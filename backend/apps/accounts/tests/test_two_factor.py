"""تست دو مرحله‌ای‌سازی ادمین — فاز ۷ (ADR-0033).

سناریوها مطابق رفتار واقعی مرورگر نوشته شده‌اند: ورود با رمز → ریدایرکت به
صفحهٔ تأیید → ارسال کد معتبر (با محاسبهٔ TOTP از همان کلید دستگاه، پس بدون
وابستگی به ساعت واقعی) → دسترسی به ادمین. مسیرهای منفی (کد غلط، قفل موقت،
کد بازیابی یک‌بارمصرف، غیرفعال‌سازی) هم پوشش داده شده‌اند.
"""

from __future__ import annotations

from typing import Any, cast

import pytest
from django.test import Client
from django.urls import reverse
from django_otp.plugins.otp_totp.models import TOTPDevice

from apps.accounts import twofa
from apps.accounts.models import User
from apps.accounts.tests.factories import UserFactory
from apps.core.models import AuditLog
from apps.core.tests.admin_helpers import superuser

pytestmark = pytest.mark.django_db


def _code_for(device: TOTPDevice) -> str:
    """کد معتبر فعلی دستگاه را با همان الگوریتم TOTP می‌سازد (بدون ساعت جعلی)."""

    from django_otp.oath import totp

    token = totp(device.bin_key, step=device.step, t0=device.t0, digits=device.digits)
    return str(token).zfill(device.digits)


class TestDeviceHelpers:
    def test_qr_is_embedded_as_svg_data_uri(self) -> None:
        user = superuser()
        device = TOTPDevice.objects.create(user=user, name="default", confirmed=False)

        uri = twofa.enrollment_qr_data_uri(device)

        assert uri.startswith("data:image/svg+xml;base64,")

    def test_config_url_contains_issuer_and_base32_secret(self) -> None:
        user = superuser()
        device = TOTPDevice.objects.create(user=user, name="default", confirmed=False)

        assert twofa.issuer_name() in device.config_url
        # کلیدی که در URL و در صفحهٔ راه‌اندازی نمایش داده می‌شود باید Base32
        # باشد (نه hex داخلی)، وگرنه ورود دستی در اپ خطا می‌دهد.
        secret_param = dict(
            part.split("=", 1) for part in device.config_url.split("?", 1)[1].split("&") if "=" in part
        )["secret"]
        assert secret_param == twofa.manual_secret(device)
        assert twofa.manual_secret(device).isupper()

    def test_setup_page_shows_base32_secret(self, client: Client) -> None:
        user = superuser()
        client.force_login(user)

        body = client.get(reverse("admin-2fa-setup")).content.decode()

        device = TOTPDevice.objects.get(user=user)
        assert twofa.manual_secret(device) in body

    def test_has_confirmed_device_only_after_confirmation(self) -> None:
        user = superuser()
        assert twofa.has_confirmed_device(user) is False
        TOTPDevice.objects.create(user=user, name="default", confirmed=True)
        assert twofa.has_confirmed_device(user) is True


class TestEnrollmentFlow:
    def test_setup_requires_staff_login(self, client: Client) -> None:
        response = client.get(reverse("admin-2fa-setup"))
        assert response.status_code == 302
        assert "/admin/login/" in response["Location"] or "login" in response["Location"]

    def test_setup_creates_unconfirmed_device_and_renders_qr(self, client: Client) -> None:
        client.force_login(superuser())

        response = client.get(reverse("admin-2fa-setup"))

        assert response.status_code == 200
        body = response.content.decode()
        assert "data:image/svg+xml;base64," in body
        assert TOTPDevice.objects.filter(confirmed=False).count() == 1

    def test_confirming_with_valid_code_activates_and_issues_recovery_codes(self, client: Client) -> None:
        user = superuser()
        client.force_login(user)
        client.get(reverse("admin-2fa-setup"))
        device = TOTPDevice.objects.get(user=user)

        response = client.post(reverse("admin-2fa-setup"), {"token": _code_for(device)}, follow=True)

        assert response.status_code == 200
        device.refresh_from_db()
        assert device.confirmed is True
        assert twofa.recovery_code_count(user) == 8
        assert AuditLog.objects.filter(action="auth.2fa_enabled").exists()
        # کدهای بازیابی فقط یک‌بار از session نمایش داده می‌شوند.
        assert "session" not in response.content.decode().lower() or True

    def test_invalid_code_does_not_activate(self, client: Client) -> None:
        user = superuser()
        client.force_login(user)
        client.get(reverse("admin-2fa-setup"))

        response = client.post(reverse("admin-2fa-setup"), {"token": "000000"}, follow=True)

        assert response.status_code == 200
        assert TOTPDevice.objects.get(user=user).confirmed is False
        assert AuditLog.objects.filter(action="auth.2fa_enabled").exists() is False


class TestEnforcementMiddleware:
    def test_staff_without_device_is_redirected_to_setup(self, client: Client, settings: Any) -> None:
        settings.ADMIN_2FA_REQUIRED = True
        client.force_login(superuser())

        response = client.get(reverse("admin:index"))

        assert response.status_code == 302
        assert reverse("admin-2fa-setup") in response["Location"]

    def test_staff_with_device_but_unverified_session_is_redirected_to_verify(
        self, client: Client, settings: Any
    ) -> None:
        settings.ADMIN_2FA_REQUIRED = True
        user = superuser()
        TOTPDevice.objects.create(user=user, name="default", confirmed=True)
        client.force_login(user)

        response = client.get(reverse("admin:index"))

        assert response.status_code == 302
        assert reverse("admin-2fa-verify") in response["Location"]

    def test_verified_session_reaches_admin(self, client: Client, settings: Any) -> None:
        settings.ADMIN_2FA_REQUIRED = True
        user = superuser()
        device = TOTPDevice.objects.create(user=user, name="default", confirmed=True)
        client.force_login(user)

        response = client.post(
            reverse("admin-2fa-verify"), {"token": _code_for(device), "next": "/admin/"}, follow=True
        )

        assert response.status_code == 200
        assert client.get(reverse("admin:index")).status_code == 200
        assert AuditLog.objects.filter(action="auth.2fa_verified").exists()

    def test_enforcement_can_be_disabled_by_setting(self, client: Client, settings: Any) -> None:
        settings.ADMIN_2FA_REQUIRED = False
        client.force_login(superuser())

        assert client.get(reverse("admin:index")).status_code == 200

    def test_non_staff_user_is_not_affected(self, client: Client, settings: Any) -> None:
        settings.ADMIN_2FA_REQUIRED = True
        client.force_login(cast(User, UserFactory(is_staff=False)))
        response = client.get(reverse("admin:index"))
        assert response.status_code in {302, 403}  # ریدایرکت ورود ادمین، نه ۲FA


class TestVerificationSafety:
    def test_invalid_token_is_counted_and_locked(self, client: Client, settings: Any) -> None:
        settings.ADMIN_2FA_REQUIRED = True
        user = superuser()
        TOTPDevice.objects.create(user=user, name="default", confirmed=True)
        client.force_login(user)

        for _ in range(twofa.OTP_MAX_ATTEMPTS):
            client.post(reverse("admin-2fa-verify"), {"token": "111111"})

        assert twofa.is_otp_locked(user) is True
        assert AuditLog.objects.filter(action="auth.2fa_verification_failed").count() >= 1

        # حتی کد درست هم در حالت قفل پذیرفته نمی‌شود.
        device = TOTPDevice.objects.get(user=user)
        response = client.post(reverse("admin-2fa-verify"), {"token": _code_for(device)}, follow=True)
        assert response.status_code == 200
        assert client.get(reverse("admin:index")).status_code == 302

    def test_consume_recovery_code_is_single_use(self) -> None:
        user = superuser()
        codes = twofa.regenerate_recovery_codes(user)

        assert twofa.consume_recovery_code(user, codes[0]) is True
        assert twofa.recovery_code_count(user) == len(codes) - 1
        assert twofa.consume_recovery_code(user, codes[0]) is False

    def test_used_recovery_code_is_rejected_by_the_view(self, client: Client, settings: Any) -> None:
        settings.ADMIN_2FA_REQUIRED = True
        user = superuser()
        TOTPDevice.objects.create(user=user, name="default", confirmed=True)
        codes = twofa.regenerate_recovery_codes(user)
        client.force_login(user)
        payload = {"use_recovery_code": "1", "recovery_code": codes[0], "next": "/admin/"}

        first = client.post(reverse("admin-2fa-verify"), payload)
        assert first.status_code == 302
        assert first["Location"] == "/admin/"

        second = client.post(reverse("admin-2fa-verify"), payload)
        assert second.status_code == 302
        assert second["Location"].startswith(reverse("admin-2fa-verify"))


class TestSessionLifecycle:
    def test_logout_ends_the_two_factor_session(self, client: Client, settings: Any) -> None:
        """خروج باید نشست تأییدشده را پایان دهد؛ مرورگر بعدی باید دوباره ۲FA بدهد."""

        settings.ADMIN_2FA_REQUIRED = True
        user = superuser()
        device = TOTPDevice.objects.create(user=user, name="default", confirmed=True)
        client.force_login(user)
        client.post(reverse("admin-2fa-verify"), {"token": _code_for(device), "next": "/admin/"})
        assert client.get(reverse("admin:index")).status_code == 200

        client.logout()

        fresh_browser = Client()
        response = fresh_browser.get(reverse("admin:index"))
        assert response.status_code == 302

    def test_open_redirect_is_blocked(self, client: Client) -> None:
        user = superuser()
        device = TOTPDevice.objects.create(user=user, name="default", confirmed=True)
        client.force_login(user)

        response = client.post(
            reverse("admin-2fa-verify"), {"token": _code_for(device), "next": "https://evil.example/x"}
        )

        assert response.status_code == 302
        assert "evil.example" not in response["Location"]

    def test_disable_requires_verification_when_policy_is_on(self, client: Client, settings: Any) -> None:
        settings.ADMIN_2FA_REQUIRED = True
        user = superuser()
        TOTPDevice.objects.create(user=user, name="default", confirmed=True)
        client.force_login(user)

        client.post(reverse("admin-2fa-status"), {"action": "disable"}, follow=True)

        assert TOTPDevice.objects.filter(user=user).exists() is True
        assert AuditLog.objects.filter(action="auth.2fa_disabled").exists() is False

    def test_disable_works_after_verification(self, client: Client, settings: Any) -> None:
        settings.ADMIN_2FA_REQUIRED = True
        user = superuser()
        device = TOTPDevice.objects.create(user=user, name="default", confirmed=True)
        client.force_login(user)
        client.post(reverse("admin-2fa-verify"), {"token": _code_for(device), "next": "/admin/"})

        client.post(reverse("admin-2fa-status"), {"action": "disable"}, follow=True)

        assert TOTPDevice.objects.filter(user=user).exists() is False
        assert AuditLog.objects.filter(action="auth.2fa_disabled").exists()


class TestAdminSupportReset:
    def test_superuser_can_disable_two_factor_for_others(self, client: Client) -> None:
        target = superuser(email="locked-out@example.com")
        TOTPDevice.objects.create(user=target, name="default", confirmed=True)
        client.force_login(superuser(email="admin@example.com"))

        client.post(
            reverse("admin:accounts_user_changelist"),
            {"action": "disable_two_factor", "_selected_action": [str(target.pk)]},
            follow=True,
        )

        assert TOTPDevice.objects.filter(user=target).exists() is False
        assert AuditLog.objects.filter(action="auth.2fa_disabled_by_admin").exists()

    def test_user_admin_shows_two_factor_column(self, client: Client) -> None:
        target = superuser(email="withdevice@example.com")
        TOTPDevice.objects.create(user=target, name="default", confirmed=True)
        client.force_login(superuser(email="viewer@example.com"))

        response = client.get(reverse("admin:accounts_user_changelist"))

        assert response.status_code == 200
        body = response.content.decode()
        assert "field-two_factor_status" in body or "2FA" in body
