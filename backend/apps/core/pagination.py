"""صفحه‌بندی استاندارد DRF برای تمام endpointهای پروژه.

پاسخ یک envelope ثابت (``count``, ``total_pages``, ``next``, ``previous``,
``results``) برمی‌گرداند تا فرانت‌اند بتواند بدون بررسی ساختار متفاوت هر
endpoint، منطق صفحه‌بندی یکسانی پیاده‌سازی کند.
"""

from __future__ import annotations

import math
from typing import Any

from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100

    def get_paginated_response(self, data: Any) -> Response:
        assert self.page is not None  # noqa: S101 - فقط برای mypy؛ همیشه توسط DRF ست می‌شود
        assert self.request is not None  # noqa: S101
        total_count = self.page.paginator.count
        page_size = self.get_page_size(self.request) or self.page_size
        total_pages = math.ceil(total_count / page_size) if page_size else 1

        return Response(
            {
                "count": total_count,
                "total_pages": total_pages,
                "current_page": self.page.number,
                "next": self.get_next_link(),
                "previous": self.get_previous_link(),
                "results": data,
            }
        )
