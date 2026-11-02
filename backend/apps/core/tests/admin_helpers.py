"""ابزار مشترک تست‌های ادمین (فاز ۶).

از فاز ۶ به بعد، اکشن‌های گروهی همیشه به کاربر «بازخورد پیام» می‌دهند
(``ModelAdmin.message_user``). در تست‌هایی که درخواست را با ``RequestFactory``
می‌سازند، میان‌افزار ``MessageMiddleware`` اجرا نمی‌شود و ``message_user`` خطای
``MessageFailure`` می‌دهد؛ این helper همان لایهٔ پیام را — دقیقاً مانند یک
درخواست واقعی — به درخواست مصنوعی وصل می‌کند.
"""

from __future__ import annotations

from typing import Any, cast

from django.contrib.auth.models import AnonymousUser
from django.contrib.messages.storage.cookie import CookieStorage
from django.http import HttpRequest
from django.test import RequestFactory

from apps.accounts.models import User
from apps.accounts.tests.factories import UserFactory


def admin_request(user: Any, path: str = "/admin/", *, method: str = "post") -> HttpRequest:
    """درخواست ادمین با کاربر دلخواه و لایهٔ پیام فعال."""

    factory = RequestFactory()
    request = factory.get(path) if method == "get" else factory.post(path)
    request.user = user if user is not None else AnonymousUser()
    # ``FallbackStorage`` (پیش‌فرض) به ``request.session`` نیاز دارد که در
    # درخواست مصنوعی وجود ندارد؛ ``CookieStorage`` برای «افزودن پیام» کافی است.
    # این صفت در ``HttpRequest`` استاب‌های جنگو اعلام نشده، پس از مسیر ``Any``
    # پر می‌شود (نه با setattr روی یک نام ثابت — همان برداشت B010).
    cast(Any, request)._messages = CookieStorage(request)
    return request


def superuser(email: str = "superuser@example.com") -> User:
    """کاربر ابرکاربر آماده برای تست‌های ادمین (تایپ‌شده، بدون mypy noise)."""

    return cast(User, UserFactory(email=email, is_staff=True, is_superuser=True))


__all__ = ["admin_request", "superuser"]
