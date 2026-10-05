"""Viewهای ۲FA ادمین (راه‌اندازی/تأیید/بازیابی) — فاز ۷، ADR-0033.

این‌ها viewهای Django (نه DRF) هستند چون بخشی از جریان مرورگری ادمین‌اند و
قالب‌های Jazzmin را رندر می‌کنند. ورود به آن‌ها نیازمند ``is_staff`` است.
"""

from __future__ import annotations

from typing import Any, cast
from urllib.parse import urlencode

from django.conf import settings
from django.contrib import messages
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib.auth.views import redirect_to_login
from django.http import HttpRequest, HttpResponse
from django.shortcuts import redirect, render
from django.urls import reverse
from django.utils.translation import gettext as _
from django.views import View
from django_otp import login as otp_login
from django_otp.plugins.otp_totp.models import TOTPDevice

from apps.accounts import twofa
from apps.accounts.models import User
from apps.core.logging import get_logger
from apps.core.models import log_action

logger = get_logger(__name__)


def _safe_next(request: HttpRequest, fallback: str | None = None) -> str:
    """``next`` را فقط اگر مسیر داخلی باشد می‌پذیرد (جلوگیری از open redirect)."""

    candidate = str(request.GET.get("next") or request.POST.get("next") or "")
    if candidate.startswith("/") and not candidate.startswith("//"):
        return candidate
    return fallback or reverse("admin:index")


def _staff_user(request: HttpRequest) -> User:
    """کاربر staff واردشده با نوع مشخص.

    پس از ``_staff_required`` قطعاً کاربر واردشده و staff است؛ این cast فقط
    ابهام ``User | AnonymousUser`` را برای mypy و ``log_action(target=…)``
    برمی‌دارد (بررسی واقعی دسترسی همان‌جا انجام شده است).
    """

    return cast(User, request.user)


def _staff_required(request: HttpRequest) -> HttpResponse | None:
    """اگر کاربر وارد نشده یا staff نیست، ریدایرکت ورود را برمی‌گرداند."""

    user = getattr(request, "user", None)
    if user is None or not user.is_authenticated:
        return redirect_to_login(request.get_full_path())
    if not user.is_staff:
        return HttpResponse(status=403)
    return None


class TwoFactorSetupView(LoginRequiredMixin, View):
    """راه‌اندازی دستگاه TOTP: نمایش QR/کلید و تأیید با یک کد معتبر."""

    template_name = "admin/twofa/setup.html"

    def get(self, request: HttpRequest) -> HttpResponse:
        if (guard := _staff_required(request)) is not None:
            return guard

        user = _staff_user(request)

        if twofa.has_confirmed_device(user):
            return redirect("admin-2fa-status")

        # دستگاه تأییدنشدهٔ قبلی (اگر کاربر صفحه را نیمه‌کاره رها کرده) پاک می‌شود
        # تا کلید روی صفحه و کلید واقعی همیشه یکی باشند.
        TOTPDevice.objects.filter(user=user, confirmed=False).delete()
        device = TOTPDevice.objects.create(user=user, name="default", confirmed=False)

        return render(
            request,
            self.template_name,
            {
                "title": _("Two-factor authentication setup"),
                "device": device,
                "qr_data_uri": twofa.enrollment_qr_data_uri(device),
                "secret_key": twofa.manual_secret(device),
                "otpauth_url": device.config_url,
                "issuer": twofa.issuer_name(),
                "next": _safe_next(request),
            },
        )

    def post(self, request: HttpRequest) -> HttpResponse:
        if (guard := _staff_required(request)) is not None:
            return guard

        user = _staff_user(request)

        device = TOTPDevice.objects.filter(user=user, confirmed=False).first()
        token = str(request.POST.get("token", "")).strip()
        if device is None:
            messages.error(request, _("No pending enrollment was found. Start again."))
            return redirect("admin-2fa-setup")
        if not device.verify_token(token):
            messages.error(request, _("That code is not valid. Check your authenticator app and try again."))
            return redirect("admin-2fa-setup")

        device.confirmed = True
        device.save(update_fields=["confirmed"])
        otp_login(request, device)
        log_action(action="auth.2fa_enabled", actor=user, target=user)
        logger.info("admin_2fa_enabled", user_id=user.pk)

        codes = twofa.regenerate_recovery_codes(user)
        request.session["recovery_codes"] = codes  # تا یک بار در صفحهٔ بعد نمایش داده شود
        messages.success(request, _("Two-factor authentication is now active."))
        return redirect("admin-2fa-recovery")


class TwoFactorVerifyView(LoginRequiredMixin, View):
    """تأیید کد در هر نشست (پس از ورود با نام کاربری/رمز)."""

    template_name = "admin/twofa/verify.html"

    def get(self, request: HttpRequest) -> HttpResponse:
        if (guard := _staff_required(request)) is not None:
            return guard

        user = _staff_user(request)

        if twofa.is_verified(user):
            return redirect(_safe_next(request))
        if not twofa.has_confirmed_device(user):
            return redirect("admin-2fa-setup")

        return render(
            request,
            self.template_name,
            {
                "title": _("Two-factor authentication"),
                "attempts_left": twofa.otp_attempts_left(user),
                "next": _safe_next(request),
                "recovery_enabled": twofa.recovery_code_count(user) > 0,
            },
        )

    def post(self, request: HttpRequest) -> HttpResponse:
        if (guard := _staff_required(request)) is not None:
            return guard

        user = _staff_user(request)

        if twofa.is_otp_locked(user):
            messages.error(request, _("Too many invalid codes. Wait a few minutes and try again."))
            return redirect(f"{reverse('admin-2fa-verify')}?{urlencode({'next': _safe_next(request)})}")

        if request.POST.get("use_recovery_code"):
            code = str(request.POST.get("recovery_code", ""))
            if twofa.consume_recovery_code(user, code):
                device = twofa.get_totp_device(user)
                if device is not None:
                    otp_login(request, device)
                twofa.reset_otp_attempts(user)
                log_action(action="auth.2fa_recovery_used", actor=user, target=user)
                remaining = twofa.recovery_code_count(user)
                messages.warning(
                    request,
                    _("Recovery code accepted. %(count)s code(s) left.") % {"count": remaining},
                )
                return redirect(_safe_next(request))
            twofa.register_otp_failure(user)
            log_action(action="auth.2fa_verification_failed", actor=user, target=user)
            messages.error(request, _("That recovery code is not valid."))
            return redirect(f"{reverse('admin-2fa-verify')}?{urlencode({'next': _safe_next(request)})}")

        token = str(request.POST.get("token", "")).strip()
        device = twofa.get_totp_device(user)
        if device is None or not device.verify_token(token):
            remaining = twofa.register_otp_failure(user)
            log_action(action="auth.2fa_verification_failed", actor=user, target=user)
            messages.error(
                request,
                _("That code is not valid. %(count)s attempt(s) left.") % {"count": remaining},
            )
            return redirect(f"{reverse('admin-2fa-verify')}?{urlencode({'next': _safe_next(request)})}")

        otp_login(request, device)
        twofa.reset_otp_attempts(user)
        log_action(action="auth.2fa_verified", actor=user, target=user)
        return redirect(_safe_next(request))


class TwoFactorStatusView(LoginRequiredMixin, View):
    """وضعیت ۲FA + امکان غیرفعال‌سازی (فقط با کد معتبر یا با ابرکاربر)."""

    template_name = "admin/twofa/status.html"

    def get(self, request: HttpRequest) -> HttpResponse:
        if (guard := _staff_required(request)) is not None:
            return guard

        user = _staff_user(request)

        device = twofa.get_totp_device(user)
        return render(
            request,
            self.template_name,
            {
                "title": _("Two-factor authentication status"),
                "device": device,
                "confirmed": bool(device and device.confirmed),
                "required": bool(settings.ADMIN_2FA_REQUIRED),
                "recovery_count": twofa.recovery_code_count(user),
                "next": _safe_next(request),
            },
        )

    def post(self, request: HttpRequest) -> HttpResponse:
        if (guard := _staff_required(request)) is not None:
            return guard

        user = _staff_user(request)

        if request.POST.get("action") == "disable":
            if settings.ADMIN_2FA_REQUIRED and not twofa.is_verified(user):
                messages.error(request, _("Verify a code before disabling two-factor authentication."))
                return redirect("admin-2fa-status")
            TOTPDevice.objects.filter(user=user).delete()
            from django_otp.plugins.otp_static.models import StaticDevice

            StaticDevice.objects.filter(user=user).delete()
            log_action(action="auth.2fa_disabled", actor=user, target=user)
            logger.warning("admin_2fa_disabled", user_id=user.pk)
            messages.warning(request, _("Two-factor authentication was disabled for your account."))
            return redirect("admin-2fa-status")

        if request.POST.get("action") == "regenerate":
            codes = twofa.regenerate_recovery_codes(user)
            request.session["recovery_codes"] = codes
            log_action(action="auth.2fa_recovery_generated", actor=user, target=user)
            messages.success(request, _("New recovery codes were generated."))
            return redirect("admin-2fa-recovery")

        return redirect("admin-2fa-status")


class TwoFactorRecoveryView(LoginRequiredMixin, View):
    """نمایش یک‌بارهٔ کدهای بازیابی (فقط از session، نه از دیتابیس)."""

    template_name = "admin/twofa/recovery.html"

    def get(self, request: HttpRequest) -> HttpResponse:
        if (guard := _staff_required(request)) is not None:
            return guard

        user = _staff_user(request)

        codes: Any = request.session.pop("recovery_codes", None)
        return render(
            request,
            self.template_name,
            {
                "title": _("Recovery codes"),
                "codes": codes or [],
                "remaining": twofa.recovery_code_count(user),
                "next": _safe_next(request),
            },
        )


__all__ = [
    "TwoFactorRecoveryView",
    "TwoFactorSetupView",
    "TwoFactorStatusView",
    "TwoFactorVerifyView",
]
