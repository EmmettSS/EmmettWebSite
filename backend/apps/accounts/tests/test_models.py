from __future__ import annotations

from typing import cast

import pytest
from django.db import IntegrityError

from apps.accounts.models import User
from apps.accounts.tests.factories import UserFactory

pytestmark = pytest.mark.django_db


class TestUserManager:
    def test_create_user_normalizes_email_and_sets_password(self) -> None:
        user = User.objects.create_user(email="Someone@Example.com", password="Str0ngP@ssword!")

        assert user.email == "Someone@example.com"
        assert user.check_password("Str0ngP@ssword!")
        assert user.role == User.Role.CLIENT
        assert user.is_staff is False
        assert user.is_superuser is False

    def test_create_user_without_email_raises(self) -> None:
        with pytest.raises(ValueError):
            User.objects.create_user(email="", password="irrelevant")

    def test_create_superuser_sets_staff_and_superuser(self) -> None:
        admin = User.objects.create_superuser(email="admin@example.com", password="Str0ngP@ssword!")

        assert admin.is_staff is True
        assert admin.is_superuser is True
        assert admin.role == User.Role.ADMIN

    def test_create_superuser_rejects_explicit_is_staff_false(self) -> None:
        with pytest.raises(ValueError):
            User.objects.create_superuser(
                email="admin2@example.com", password="Str0ngP@ssword!", is_staff=False
            )


class TestUserModel:
    def test_email_is_username_field(self) -> None:
        assert User.USERNAME_FIELD == "email"
        assert User.REQUIRED_FIELDS == []

    def test_email_must_be_unique(self) -> None:
        User.objects.create_user(email="duplicate@example.com", password="Str0ngP@ssword!")
        with pytest.raises(IntegrityError):
            User.objects.create_user(email="duplicate@example.com", password="AnotherP@ss1!")

    def test_public_id_is_unique_and_auto_generated(self) -> None:
        user_a = cast(User, UserFactory())
        user_b = cast(User, UserFactory())

        assert user_a.public_id != user_b.public_id

    def test_str_returns_email(self) -> None:
        user = UserFactory(email="display@example.com")
        assert str(user) == "display@example.com"
