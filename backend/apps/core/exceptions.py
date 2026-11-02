"""Exception Handler اختصاصی DRF.

هدف: یک قالب خطای یکنواخت برای تمام endpointهای API (صرف‌نظر از نوع خطا) +
لاگ ساختاریافتهٔ هر خطا برای قابلیت ردیابی و حسابرسی.

قالب خروجی:

```json
{
  "error": {
    "code": "validation_error",
    "message": "یک پیام خوانا برای کاربر/توسعه‌دهنده",
    "details": { ... جزئیات فیلد به فیلد در صورت وجود ... }
  }
}
```
"""

from __future__ import annotations

from typing import Any

from django.core.exceptions import PermissionDenied
from django.http import Http404
from rest_framework import exceptions as drf_exceptions
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_default_exception_handler

from apps.core.logging import get_logger

logger = get_logger(__name__)

_ERROR_CODE_MAP: dict[type[Exception], str] = {
    drf_exceptions.ValidationError: "validation_error",
    drf_exceptions.AuthenticationFailed: "authentication_failed",
    drf_exceptions.NotAuthenticated: "not_authenticated",
    drf_exceptions.PermissionDenied: "permission_denied",
    drf_exceptions.NotFound: "not_found",
    drf_exceptions.MethodNotAllowed: "method_not_allowed",
    drf_exceptions.Throttled: "throttled",
    PermissionDenied: "permission_denied",
    Http404: "not_found",
}


def _resolve_error_code(exc: Exception) -> str:
    for exc_type, code in _ERROR_CODE_MAP.items():
        if isinstance(exc, exc_type):
            return code
    return "internal_error"


def custom_exception_handler(exc: Exception, context: dict[str, Any]) -> Response | None:
    """تمام استثناهای DRF را به یک envelope یکنواخت تبدیل و لاگ می‌کند."""

    response = drf_default_exception_handler(exc, context)

    request = context.get("request")
    view = context.get("view")
    error_code = _resolve_error_code(exc)

    log = logger.bind(
        error_code=error_code,
        view=getattr(view, "__class__", type(None)).__name__,
        path=getattr(request, "path", None),
        method=getattr(request, "method", None),
    )

    if response is None:
        # خطای پیش‌بینی‌نشده (۵۰۰) — DRF پاسخ نمی‌دهد؛ ما باید لاگ کنیم و یک
        # پاسخ عمومی امن (بدون افشای جزئیات پیاده‌سازی) برگردانیم.
        log.error("unhandled_exception", exc_info=exc)
        return Response(
            {
                "error": {
                    "code": "internal_error",
                    "message": "خطای داخلی سرور رخ داد.",
                    "details": None,
                }
            },
            status=500,
        )

    log.warning("api_error", status_code=response.status_code)

    details = response.data if isinstance(response.data, (dict, list)) else None
    message = (
        str(exc) if not isinstance(exc, drf_exceptions.ValidationError) else "یک یا چند فیلد نامعتبر است."
    )

    response.data = {
        "error": {
            "code": error_code,
            "message": message,
            "details": details,
        }
    }
    return response
