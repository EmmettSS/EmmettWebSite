"""Shared API niceties. The product speaks Persian first, so rate-limit errors must too."""

import math

from rest_framework.exceptions import APIException
from rest_framework.throttling import AnonRateThrottle

THROTTLE_MESSAGE = {
    "message_fa": "تعداد درخواست‌ها زیاد است. کمی بعد دوباره تلاش کنید.",
    "message_en": "Too many requests. Please try again shortly.",
}


class PersianThrottled(APIException):
    """Same 429 semantics as DRF, with a bilingual body the UI can render directly."""

    status_code = 429
    default_code = "throttled"

    def __init__(self, wait=None, detail=None):
        payload = dict(detail or THROTTLE_MESSAGE)
        if wait is not None:
            payload["retry_after_seconds"] = int(math.ceil(wait))
        super().__init__(payload)


class PersianThrottleMixin:
    """DRF calls ``view.throttled()`` (not the throttle class), so the view carries the mixin."""

    def throttled(self, request, wait):  # noqa: D102
        raise PersianThrottled(wait)


class PersianRateThrottle(AnonRateThrottle):
    """Kept for call sites that only need Fa/En-aware throttling behaviour."""
