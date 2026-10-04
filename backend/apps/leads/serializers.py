from __future__ import annotations

from typing import Any

from rest_framework import serializers

from apps.leads.models import Contact, Newsletter


class ContactCreateSerializer(serializers.ModelSerializer[Contact]):
    """سریالایزر ورودی فرم تماس — فقط فیلدهای قابل‌تنظیم توسط کاربر نهایی.

    ``ip_address``/``user_agent``/``source`` در view از خودِ request پر
    می‌شوند، نه از بدنهٔ درخواست (ضد جعل — قانون ۱۶).
    """

    class Meta:
        model = Contact
        fields = (
            "name",
            "email",
            "phone",
            "project_type",
            "budget_range",
            "timeline",
            "message",
            "consent_given",
        )

    def validate_consent_given(self, value: bool) -> bool:
        if not value:
            raise serializers.ValidationError("برای ارسال فرم باید رضایت اعلام شود.")
        return value


class ContactResponseSerializer(serializers.ModelSerializer[Contact]):
    class Meta:
        model = Contact
        fields = ("public_id", "name", "created_at")


class NewsletterCreateSerializer(serializers.ModelSerializer[Newsletter]):
    """سابسکرایب/عضویت مجدد باید idempotent باشد (``create`` از ``update_or_create``
    استفاده می‌کند)؛ به همین دلیل ``UniqueValidator`` خودکار DRF روی ``email``
    (به‌خاطر ``unique=True`` در مدل) باید صراحتاً غیرفعال شود — وگرنه عضویت
    مجدد با همان ایمیل همیشه با خطای اعتبارسنجی ۴۰۰ رد می‌شود.
    """

    class Meta:
        model = Newsletter
        fields = ("email", "phone", "locale_preference")
        extra_kwargs: dict[str, dict[str, list[object]]] = {"email": {"validators": []}}

    def create(self, validated_data: dict[str, Any]) -> Newsletter:
        newsletter: Newsletter
        newsletter, _created = Newsletter.objects.update_or_create(
            email=validated_data["email"],
            defaults={
                "phone": validated_data.get("phone", ""),
                "locale_preference": validated_data.get("locale_preference", "fa"),
            },
        )
        return newsletter
