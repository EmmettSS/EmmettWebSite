"""استخراج اطلاعات امنیتی مشترک از HttpRequest (IP واقعی پشت پراکسی و...)."""

from __future__ import annotations

from django.http import HttpRequest


def get_client_ip(request: HttpRequest) -> str | None:
    """IP واقعی کلاینت را برمی‌گرداند؛ پشت reverse proxy اول ``X-Forwarded-For`` را می‌خواند."""

    forwarded_for: str | None = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    remote_addr: str | None = request.META.get("REMOTE_ADDR")
    return remote_addr


__all__ = ["get_client_ip"]
