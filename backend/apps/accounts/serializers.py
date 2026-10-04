from __future__ import annotations

from typing import Any

from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from apps.accounts.models import Favorite, Profile, User


class RegisterSerializer(serializers.ModelSerializer[User]):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ("email", "password", "first_name", "last_name", "phone")

    def validate_password(self, value: str) -> str:
        validate_password(value)
        return value

    def create(self, validated_data: dict[str, Any]) -> User:
        password = validated_data.pop("password")
        return User.objects.create_user(password=password, **validated_data)


class LoginSerializer(serializers.Serializer[dict[str, Any]]):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class ProfileSerializer(serializers.ModelSerializer[Profile]):
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = ("avatar_url", "bio", "locale_preference", "job_title", "company_name")

    def get_avatar_url(self, obj: Profile) -> str | None:
        return obj.avatar.file.url if obj.avatar else None


class MeSerializer(serializers.ModelSerializer[User]):
    profile = ProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = (
            "public_id",
            "email",
            "first_name",
            "last_name",
            "phone",
            "role",
            "is_phone_verified",
            "profile",
        )
        read_only_fields = ("public_id", "email", "role", "is_phone_verified")


class MeUpdateSerializer(serializers.ModelSerializer[User]):
    """برای PATCH ``/auth/me/`` — فقط فیلدهای قابل‌تغییر توسط خودِ کاربر."""

    bio = serializers.CharField(source="profile.bio", required=False, allow_blank=True)
    locale_preference = serializers.ChoiceField(
        source="profile.locale_preference", choices=[("fa", "fa"), ("en", "en")], required=False
    )
    job_title = serializers.CharField(source="profile.job_title", required=False, allow_blank=True)
    company_name = serializers.CharField(source="profile.company_name", required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ("first_name", "last_name", "phone", "bio", "locale_preference", "job_title", "company_name")

    def update(self, instance: User, validated_data: dict[str, Any]) -> User:
        profile_data = validated_data.pop("profile", {})
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()

        if profile_data:
            profile, _created = Profile.objects.get_or_create(user=instance)
            for field, value in profile_data.items():
                setattr(profile, field, value)
            profile.save()

        return instance


class FavoriteCreateSerializer(serializers.Serializer[dict[str, Any]]):
    content_type = serializers.ChoiceField(choices=["service", "project", "course", "blog_post"])
    public_id = serializers.UUIDField()


class FavoriteSerializer(serializers.ModelSerializer[Favorite]):
    content_type_label = serializers.CharField(source="content_type.model", read_only=True)
    target_title = serializers.SerializerMethodField()

    class Meta:
        model = Favorite
        fields = ("id", "content_type_label", "object_id", "target_title", "created_at")

    def get_target_title(self, obj: Favorite) -> str | None:
        target = obj.target
        return str(getattr(target, "title", None)) if target is not None else None
