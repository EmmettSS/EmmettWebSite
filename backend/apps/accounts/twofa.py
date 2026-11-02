"""دو مرحله‌ای‌سازی ادمین (فاز ۷ — ADR-0033).

پیاده‌سازی روی ``django-otp`` (TOTP + کدهای بازیابی Static) سوار است؛ هیچ
رمزنگاری خودی نوشته نشده. این ماژول فقط منطق دامنه‌ای/UX را اضافه می‌کند:

- ``enrollment_qr_data_uri`` — QR به‌صورت SVG درون ``data:`` (بدون CDN/فایل
  استاتیک، سازگار با CSP ادمین).
- ``consume_recovery_code`` — بررسی و مصرف کد بازیابی (کد پس از استفاده حذف
  می‌شود تا replay ممکن نباشد).
- ``reset_failed_attempts`` / ``is_otp_locked`` — محافظت از صفحهٔ تأیید کد در
  برابر brute-force (۶ رقم یعنی فقط ۱٬۰۰۰٬۰۰۰ حالت؛ بدون محدودیت نرخ، حدس
  زدن عملی است).
"""

from __future__ import annotations

import base64
import binascii
import io
from typing import Any

from django.conf import settings
from django.core.cache import cache
from django_otp.plugins.otp_static.models import StaticDevice, StaticToken
from django_otp.plugins.otp_totp.models import TOTPDevice

OTP_ATTEMPT_PREFIX = "security:otp_attempts"
OTP_MAX_ATTEMPTS = 5
OTP_LOCK_SECONDS = 300


def get_totp_device(user: Any) -> TOTPDevice | None:
    """دستگاه TOTP این کاربر (ترجیحاً تأییدشده) را برمی‌گرداند."""

    return user.totpdevice_set.order_by("-confirmed", "id").first()


def has_confirmed_device(user: Any) -> bool:
    """آیا کاربر دست‌کم یک دستگاه TOTP تأییدشده دارد؟

    ``django-otp`` رابطهٔ معکوس ``totpdevice_set`` را به مدل User تزریق می‌کند
    ولی stub ندارد؛ به همین دلیل ورودی ``Any`` است و فقط از دو جای داخلی
    (middleware و viewها) فراخوانی می‌شود.
    """

    return bool(user.totpdevice_set.filter(confirmed=True).exists())


def is_verified(user: Any) -> bool:
    """آیا کاربر در این نشست ۲FA را پاس کرده است؟

    متد ``is_verified`` را ``OTPMiddleware`` به کاربر اضافه می‌کند و در stubs
    جنگو وجود ندارد؛ ``getattr`` با پیش‌فرض ``False`` هم تایپ را تمیز می‌کند و
    هم اگر middleware نصب نباشد، رفتار امن (ناتأییدشده) می‌دهد.
    """

    verify = getattr(user, "is_verified", None)
    return bool(verify()) if callable(verify) else False


def enrollment_qr_data_uri(device: TOTPDevice) -> str:
    """QR مربوط به ``otpauth://`` را به‌صورت data-URI با SVG برمی‌گرداند."""

    import qrcode
    import qrcode.image.svg

    factory = qrcode.image.svg.SvgPathImage
    image = qrcode.make(device.config_url, image_factory=factory, box_size=8, border=2)
    buffer = io.BytesIO()
    image.save(buffer)
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:image/svg+xml;base64,{encoded}"


def manual_secret(device: TOTPDevice) -> str:
    """کلید Base32 برای ورود دستی در اپ Authenticator.

    ``device.key`` در django-otp **hex** ذخیره می‌شود ولی Uری ``otpauth://`` و
    ورود دستی، Base32 می‌خواهند؛ نمایش مستقیم ``device.key`` در صفحه باعث
    «کد نامعتبر» در اپ کاربر می‌شد (کشف‌شده در تست فاز ۷).
    """

    return base64.b32encode(binascii.unhexlify(device.key.encode())).decode("ascii")


def issuer_name() -> str:
    return str(getattr(settings, "ADMIN_2FA_ISSUER", "Emmett"))


def create_confirmed_device(user: Any, *, name: str = "") -> TOTPDevice:
    """دستگاه تأییدشدهٔ جدید می‌سازد (برای تست/راه‌اندازی برنامه‌نویسی‌شدهٔ ادمین)."""

    device, _created = TOTPDevice.objects.get_or_create(
        user=user, name=name or "default", defaults={"confirmed": True}
    )
    if not device.confirmed:
        device.confirmed = True
        device.save(update_fields=["confirmed"])
    return device


# ---------------------------------------------------------------------------
# کدهای بازیابی
# ---------------------------------------------------------------------------


def recovery_code_count(user: Any) -> int:
    device = StaticDevice.objects.filter(user=user, confirmed=True).first()
    if device is None:
        return 0
    return int(device.token_set.count())


def regenerate_recovery_codes(user: Any) -> list[str]:
    """مجموعهٔ کدهای بازیابی را بازتولید می‌کند و متن خام را **یک‌بار** برمی‌گرداند.

    کدها در DB فقط هش‌شده ذخیره می‌شوند (``StaticToken.token`` هش است)؛ پس
    تنها نقطه‌ای که متن خام در دسترس است همین خروجی است و به کاربر یک‌بار
    نمایش داده می‌شود.
    """

    device, _created = StaticDevice.objects.get_or_create(
        user=user, name="recovery", defaults={"confirmed": True}
    )
    if not device.confirmed:
        device.confirmed = True
        device.save(update_fields=["confirmed"])

    device.token_set.all().delete()
    count = int(getattr(settings, "ADMIN_2FA_RECOVERY_CODE_COUNT", 8))
    # ``StaticToken`` خودش متد ``random_token`` دارد؛ ``device.token_set.create()``
    # مسیر Manager جنگو است و توکن را **خالی** می‌سازد (باگ واقعی کشف‌شده در تست
    # فاز ۷: همهٔ کدهای بازیابی رشتهٔ تهی بودند). پس توکن را صریح می‌دهیم.
    return [device.token_set.create(token=StaticToken.random_token()).token for _ in range(count)]


def consume_recovery_code(user: Any, code: str) -> bool:
    """کد بازیابی را در صورت معتبر بودن مصرف می‌کند (یک‌بارمصرف)."""

    device = StaticDevice.objects.filter(user=user, confirmed=True).first()
    if device is None:
        return False
    token = code.strip().replace(" ", "").lower()
    if not token:  # ورودی تهی هرگز نباید با توکن خالیِ رکوردها تطبیق داده شود
        return False
    for candidate in device.token_set.all():
        if candidate.token == token:
            candidate.delete()
            return True
    return False


# ---------------------------------------------------------------------------
# محافظت از صفحهٔ تأیید کد
# ---------------------------------------------------------------------------


def _attempt_key(user_id: int) -> str:
    return f"{OTP_ATTEMPT_PREFIX}:{user_id}"


def otp_attempts_left(user: Any) -> int:
    used = int(cache.get(_attempt_key(int(user.pk)), 0) or 0)
    return max(OTP_MAX_ATTEMPTS - used, 0)


def is_otp_locked(user: Any) -> bool:
    return otp_attempts_left(user) <= 0


def register_otp_failure(user: Any) -> int:
    """یک تلاش ناموفق ثبت می‌کند و تعداد تلاش‌های باقی‌مانده را برمی‌گرداند."""

    key = _attempt_key(int(user.pk))
    used = int(cache.get(key, 0) or 0) + 1
    cache.set(key, used, timeout=OTP_LOCK_SECONDS)
    return max(OTP_MAX_ATTEMPTS - used, 0)


def reset_otp_attempts(user: Any) -> None:
    cache.delete(_attempt_key(int(user.pk)))


def static_token_used(token: StaticToken) -> bool:  # pragma: no cover - کمکی برای تست/خوانایی
    return bool(token.token)


__all__ = [
    "consume_recovery_code",
    "create_confirmed_device",
    "enrollment_qr_data_uri",
    "get_totp_device",
    "has_confirmed_device",
    "is_otp_locked",
    "issuer_name",
    "manual_secret",
    "otp_attempts_left",
    "recovery_code_count",
    "regenerate_recovery_codes",
    "register_otp_failure",
    "reset_otp_attempts",
]
