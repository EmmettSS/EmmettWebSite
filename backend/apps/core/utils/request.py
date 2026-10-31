"""استخراج امن و یکپارچهٔ IP واقعی کلاینت پشت reverse proxy."""

from __future__ import annotations

from django.conf import settings
from django.http import HttpRequest


def get_client_ip(request: HttpRequest) -> str | None:
    """IP واقعی کلاینت را هم‌راستا با ``REST_FRAMEWORK["NUM_PROXIES"]`` استخراج می‌کند.

    چرا از **راست** می‌خوانیم نه ``split(",")[0]``:
    هر reverse proxy مطمئن، آدرس همتای TCP واقعی را به **انتهای** هدر
    ``X-Forwarded-For`` اضافه (یا با ``RequestHeader set`` جایگزین) می‌کند؛
    در حالی که سمت **چپ** همان مقداری است که کلاینت ناشناس می‌تواند جعل کند
    (مثلاً ``X-Forwarded-For: 1.2.3.4`` برای دور زدن ``LoginLockout`` و آلوده‌سازی
    ``AuditLog``). با خواندن از راست به تعداد ``NUM_PROXIES``:

    - ``NUM_PROXIES <= 0``: هدرهای پراکسی کاملاً نادیده گرفته شده و ``REMOTE_ADDR``
      برمی‌گردد (مناسب حالت اتصال مستقیم بدون پراکسی).
    - ``NUM_PROXIES == 1`` (پیش‌فرض استقرار cPanel پشت Apache/Passenger):
      آخرین عضو زنجیره (``addrs[-1]``) یعنی IP واقعی کاربر در لبهٔ Apache برمی‌گردد
      و هر پیشوند ساختگی کلاینت دور ریخته می‌شود.
    - ``NUM_PROXIES == 2`` (مثلاً CDN کلادفلر/آروان جلوتر از Apache بدون ``mod_remoteip``):
      عضو یکی‌مانده‌به‌آخر (``addrs[-2]``) برمی‌گردد.
    """
    remote_addr: str | None = (request.META.get("REMOTE_ADDR") or "").strip() or None
    rf_settings: dict[str, object] = getattr(settings, "REST_FRAMEWORK", {})
    raw_num_proxies = rf_settings.get("NUM_PROXIES")
    num_proxies: int | None = int(raw_num_proxies) if isinstance(raw_num_proxies, int) else None

    if num_proxies is not None and num_proxies <= 0:
        return remote_addr

    forwarded_for: str = request.META.get("HTTP_X_FORWARDED_FOR") or ""
    addrs = [entry.strip() for entry in forwarded_for.split(",") if entry.strip()]
    if addrs:
        if num_proxies is None:
            return addrs[-1]
        return addrs[-min(num_proxies, len(addrs))]

    real_ip: str = (request.META.get("HTTP_X_REAL_IP") or "").strip()
    if real_ip:
        return real_ip

    return remote_addr


__all__ = ["get_client_ip"]
