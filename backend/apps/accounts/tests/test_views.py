from __future__ import annotations

from typing import cast

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import Favorite, Profile, User
from apps.accounts.tests.factories import UserFactory
from apps.services.models import Service
from apps.services.tests.factories import ServiceFactory

pytestmark = pytest.mark.django_db


class TestCsrfTokenView:
    def test_sets_csrf_cookie(self) -> None:
        client = APIClient(enforce_csrf_checks=True)
        response = client.get("/api/v1/auth/csrf/")
        assert response.status_code == 200
        assert "csrftoken" in response.cookies


class TestRegisterView:
    def test_creates_user_and_logs_in(self) -> None:
        client = APIClient()
        response = client.post(
            "/api/v1/auth/register/",
            {
                "email": "new@example.com",
                "password": "Str0ngP@ssword!",
                "first_name": "New",
                "last_name": "User",
            },
        )

        assert response.status_code == 201
        assert response.data["email"] == "new@example.com"
        assert User.objects.filter(email="new@example.com").exists()

        # already logged-in via session after register
        me_response = client.get("/api/v1/auth/me/")
        assert me_response.status_code == 200

    def test_weak_password_is_rejected(self) -> None:
        client = APIClient()
        response = client.post(
            "/api/v1/auth/register/",
            {"email": "weak@example.com", "password": "123"},
        )
        assert response.status_code == 400

    def test_duplicate_email_is_rejected(self) -> None:
        UserFactory(email="dup@example.com")
        client = APIClient()
        response = client.post(
            "/api/v1/auth/register/",
            {"email": "dup@example.com", "password": "Str0ngP@ssword!"},
        )
        assert response.status_code == 400

    def test_profile_is_auto_created_on_registration(self) -> None:
        client = APIClient()
        client.post(
            "/api/v1/auth/register/",
            {"email": "autoprofile@example.com", "password": "Str0ngP@ssword!"},
        )
        user = User.objects.get(email="autoprofile@example.com")
        assert Profile.objects.filter(user=user).exists()


class TestLoginView:
    def test_valid_credentials_logs_in(self) -> None:
        UserFactory(email="login@example.com", password="Str0ngP@ssword!")
        client = APIClient()
        response = client.post(
            "/api/v1/auth/login/", {"email": "login@example.com", "password": "Str0ngP@ssword!"}
        )
        assert response.status_code == 200
        assert response.data["email"] == "login@example.com"

    def test_invalid_password_returns_401(self) -> None:
        UserFactory(email="login2@example.com", password="Str0ngP@ssword!")
        client = APIClient()
        response = client.post(
            "/api/v1/auth/login/", {"email": "login2@example.com", "password": "wrong"}
        )
        assert response.status_code == 401

    def test_unknown_email_returns_401(self) -> None:
        client = APIClient()
        response = client.post(
            "/api/v1/auth/login/", {"email": "nobody@example.com", "password": "whatever"}
        )
        assert response.status_code == 401


class TestLogoutView:
    def test_requires_authentication(self) -> None:
        client = APIClient()
        response = client.post("/api/v1/auth/logout/")
        assert response.status_code == 403

    def test_logs_out_authenticated_user(self) -> None:
        user = cast(User, UserFactory(password="Str0ngP@ssword!"))
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.post("/api/v1/auth/logout/")
        assert response.status_code == 204


class TestMeView:
    def test_requires_authentication(self) -> None:
        client = APIClient()
        response = client.get("/api/v1/auth/me/")
        assert response.status_code == 403

    def test_returns_current_user_profile(self) -> None:
        user = cast(User, UserFactory())
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.get("/api/v1/auth/me/")
        assert response.status_code == 200
        assert response.data["email"] == user.email
        assert "profile" in response.data

    def test_patch_updates_profile_fields(self) -> None:
        user = cast(User, UserFactory())
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.patch(
            "/api/v1/auth/me/",
            {"first_name": "علی", "bio": "توسعه‌دهنده", "locale_preference": "en"},
            format="json",
        )
        assert response.status_code == 200
        user.refresh_from_db()
        assert user.first_name == "علی"
        assert user.profile.bio == "توسعه‌دهنده"
        assert user.profile.locale_preference == "en"

    def test_cannot_update_role_via_patch(self) -> None:
        user = cast(User, UserFactory(role=User.Role.CLIENT))
        client = APIClient()
        client.force_authenticate(user=user)
        client.patch("/api/v1/auth/me/", {"role": "admin"}, format="json")
        user.refresh_from_db()
        assert user.role == User.Role.CLIENT


class TestFavorites:
    def test_list_requires_authentication(self) -> None:
        client = APIClient()
        response = client.get("/api/v1/auth/favorites/")
        assert response.status_code == 403

    def test_add_and_list_favorite(self) -> None:
        user = cast(User, UserFactory())
        service = cast(Service, ServiceFactory())
        client = APIClient()
        client.force_authenticate(user=user)

        add_response = client.post(
            "/api/v1/auth/favorites/add/",
            {"content_type": "service", "public_id": str(service.public_id)},
            format="json",
        )
        assert add_response.status_code == 201

        list_response = client.get("/api/v1/auth/favorites/")
        assert list_response.status_code == 200
        assert len(list_response.data["results"]) == 1

    def test_add_favorite_for_unknown_object_returns_404(self) -> None:
        import uuid

        user = cast(User, UserFactory())
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.post(
            "/api/v1/auth/favorites/add/",
            {"content_type": "service", "public_id": str(uuid.uuid4())},
            format="json",
        )
        assert response.status_code == 404

    def test_add_favorite_twice_does_not_duplicate(self) -> None:
        user = cast(User, UserFactory())
        service = cast(Service, ServiceFactory())
        client = APIClient()
        client.force_authenticate(user=user)

        client.post(
            "/api/v1/auth/favorites/add/",
            {"content_type": "service", "public_id": str(service.public_id)},
            format="json",
        )
        client.post(
            "/api/v1/auth/favorites/add/",
            {"content_type": "service", "public_id": str(service.public_id)},
            format="json",
        )

        assert Favorite.objects.filter(user=user).count() == 1

    def test_delete_own_favorite(self) -> None:
        user = cast(User, UserFactory())
        service = cast(Service, ServiceFactory())
        client = APIClient()
        client.force_authenticate(user=user)
        add_response = client.post(
            "/api/v1/auth/favorites/add/",
            {"content_type": "service", "public_id": str(service.public_id)},
            format="json",
        )
        favorite_id = add_response.data["id"]

        delete_response = client.delete(f"/api/v1/auth/favorites/{favorite_id}/")
        assert delete_response.status_code == 204
        assert not Favorite.objects.filter(pk=favorite_id).exists()

    def test_cannot_delete_another_users_favorite(self) -> None:
        owner = cast(User, UserFactory())
        intruder = cast(User, UserFactory())
        service = cast(Service, ServiceFactory())
        favorite = Favorite.objects.create(
            user=owner,
            content_type=__import__(
                "django.contrib.contenttypes.models", fromlist=["ContentType"]
            ).ContentType.objects.get_for_model(Service),
            object_id=service.pk,
        )

        client = APIClient()
        client.force_authenticate(user=intruder)
        response = client.delete(f"/api/v1/auth/favorites/{favorite.pk}/")
        assert response.status_code == 404
        assert Favorite.objects.filter(pk=favorite.pk).exists()
