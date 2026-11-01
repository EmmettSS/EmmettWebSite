"""کلاس‌های پایهٔ مشترک ViewSet — کاهش تکرار بین اپ‌های محتوایی عمومی.

تنظیم پیش‌فرض پروژه (``REST_FRAMEWORK.DEFAULT_PERMISSION_CLASSES``)
``IsAuthenticated`` است (مناسب برای endpointهای حساس حساب کاربری)؛ محتوای
عمومی ویترین (Service/Project/Course/BlogPost/Category/Tag/...) باید صراحتاً
``AllowAny`` را override کند — این کلاس پایه همان override مشترک را فراهم
می‌کند تا هر اپ آن را فراموش نکند.
"""

from __future__ import annotations

from typing import Generic, TypeVar

from django.db import models
from rest_framework.permissions import AllowAny
from rest_framework.viewsets import ReadOnlyModelViewSet

_ModelT = TypeVar("_ModelT", bound=models.Model)


class PublicReadOnlyViewSet(ReadOnlyModelViewSet[_ModelT], Generic[_ModelT]):
    """ViewSet فقط-خواندنی و عمومی (بدون نیاز به ورود) برای محتوای ویترین."""

    permission_classes = [AllowAny]
    lookup_field = "slug"
