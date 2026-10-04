"""مدل User سفارشی — از روز اول پروژه، طبق ADR-0007.

تصمیم‌های کلیدی (شرح کامل در ``docs/adr/0007-authentication-strategy.md``):

- ``email`` جایگزین ``username`` است (``USERNAME_FIELD``).
- احراز هویت فاز اول: ایمیل + رمز عبور استاندارد Django (بدون OTP).
- فیلد ``phone`` از هم‌اکنون وجود دارد تا توسعهٔ آیندهٔ اعلان/OTP پیامکی
  (Kavenegar) بدون migration ساختاری بزرگ ممکن باشد.
- ``public_id`` شناسهٔ منتشرشونده در API/URL عمومی است؛ ``id`` عددی داخلی
  هرگز در پاسخ API افشا نمی‌شود (جلوگیری از IDOR — قانون ۱۶).
"""

from __future__ import annotations

import uuid
from typing import Any, ClassVar

from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _


class UserManager(BaseUserManager["User"]):
    """منیجر سفارشی چون ``username`` حذف و ``email`` به USERNAME_FIELD تبدیل شده."""

    use_in_migrations = True

    def _create_user(self, email: str, password: str | None, **extra_fields: Any) -> User:
        if not email:
            raise ValueError(_("ایمیل الزامی است."))
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email: str, password: str | None = None, **extra_fields: Any) -> User:
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        extra_fields.setdefault("role", User.Role.CLIENT)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email: str, password: str | None = None, **extra_fields: Any) -> User:
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", User.Role.ADMIN)

        if extra_fields.get("is_staff") is not True:
            raise ValueError(_("ابرکاربر باید is_staff=True داشته باشد."))
        if extra_fields.get("is_superuser") is not True:
            raise ValueError(_("ابرکاربر باید is_superuser=True داشته باشد."))

        return self._create_user(email, password, **extra_fields)


class User(AbstractUser):
    """کاربر سفارشی پروژه — ایمیل به‌جای نام کاربری."""

    class Role(models.TextChoices):
        ADMIN = "admin", _("Admin")
        EDITOR = "editor", _("Editor")
        STUDENT = "student", _("Student")
        CLIENT = "client", _("Client")

    username = None  # type: ignore[assignment]
    email = models.EmailField(_("email address"), unique=True)
    phone = models.CharField(
        _("phone number"),
        max_length=20,
        blank=True,
        default="",
        help_text=_("برای توسعهٔ آیندهٔ اعلان/OTP پیامکی (Kavenegar)."),
    )
    role = models.CharField(_("role"), max_length=20, choices=Role.choices, default=Role.CLIENT)
    is_phone_verified = models.BooleanField(_("phone verified"), default=False)
    public_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False, db_index=True)
    created_at = models.DateTimeField(_("created at"), auto_now_add=True)
    updated_at = models.DateTimeField(_("updated at"), auto_now=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS: ClassVar[list[str]] = []

    objects = UserManager()  # type: ignore[assignment,misc]

    class Meta:
        verbose_name = _("User")
        verbose_name_plural = _("Users")
        ordering = ["-date_joined"]

    def __str__(self) -> str:
        return self.email
