from django.db import transaction
from django.core import signing
from django.urls import reverse
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from .models import (
    ContactLead,
    EmailOutbox,
    NewsletterSubscriber,
    WaitlistSignup,
)


class WriteThrottle(AnonRateThrottle):
    rate = "5/hour"


class ContactSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120)
    email = serializers.EmailField()
    message = serializers.CharField(max_length=5000)
    locale = serializers.ChoiceField(choices=["fa", "en"], default="fa")
    website = serializers.CharField(
        required=False, allow_blank=True, write_only=True
    )  # honeypot


class ContactView(APIView):
    serializer_class = ContactSerializer
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [WriteThrottle]

    def post(self, request):
        serializer = ContactSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if serializer.validated_data.get("website"):
            return Response({"accepted": True}, status=202)
        with transaction.atomic():
            data = serializer.validated_data
            lead = ContactLead.objects.create(
                name=data["name"],
                email=data["email"],
                message=data["message"],
                locale=data["locale"],
            )
            EmailOutbox.objects.create(
                recipient=data["email"],
                subject="We received your message",
                body="Thank you. The Emmett team will follow up.",
            )
        return Response(
            {"accepted": True, "id": lead.pk}, status=status.HTTP_201_CREATED
        )


class NewsletterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    locale = serializers.ChoiceField(choices=["fa", "en"], default="fa")
    website = serializers.CharField(required=False, allow_blank=True)


class NewsletterView(APIView):
    serializer_class = NewsletterSerializer
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [WriteThrottle]

    @transaction.atomic
    def post(self, request):
        s = NewsletterSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        data = s.validated_data
        if data.get("website"):
            return Response({"accepted": True}, status=202)
        obj, created = NewsletterSubscriber.objects.get_or_create(
            email=data["email"], defaults={"locale": data["locale"]}
        )
        if created:
            token = signing.TimestampSigner(salt="emmett-newsletter").sign(obj.email)
            obj.confirmation_token = token
            obj.save(update_fields=["confirmation_token"])
            confirm_url = (
                request.build_absolute_uri(reverse("newsletter-confirm"))
                + f"?token={token}"
            )
            EmailOutbox.objects.create(
                recipient=obj.email,
                subject="Confirm newsletter subscription",
                body=f"Confirm within 48 hours: {confirm_url}\nUnsubscribe: {request.build_absolute_uri(reverse('newsletter-unsubscribe'))}?token={token}",
            )
        return Response({"accepted": True}, status=202)


class NewsletterTokenSerializer(serializers.Serializer):
    token = serializers.CharField(max_length=400)


class NewsletterConfirmView(APIView):
    serializer_class = NewsletterTokenSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        token = NewsletterTokenSerializer(data=request.query_params)
        token.is_valid(raise_exception=True)
        try:
            email = signing.TimestampSigner(salt="emmett-newsletter").unsign(
                token.validated_data["token"], max_age=48 * 60 * 60
            )
            subscriber = NewsletterSubscriber.objects.get(
                email=email, confirmation_token=token.validated_data["token"]
            )
        except (
            signing.BadSignature,
            signing.SignatureExpired,
            NewsletterSubscriber.DoesNotExist,
        ):
            return Response(
                {"detail": "Invalid or expired confirmation token"}, status=400
            )
        subscriber.active = True
        subscriber.save(update_fields=["active"])
        return Response({"confirmed": True})


class NewsletterUnsubscribeView(APIView):
    serializer_class = NewsletterTokenSerializer
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [WriteThrottle]

    def post(self, request):
        serializer = NewsletterTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            email = signing.TimestampSigner(salt="emmett-newsletter").unsign(
                serializer.validated_data["token"], max_age=48 * 60 * 60
            )
            subscriber = NewsletterSubscriber.objects.get(
                email=email, confirmation_token=serializer.validated_data["token"]
            )
        except (
            signing.BadSignature,
            signing.SignatureExpired,
            NewsletterSubscriber.DoesNotExist,
        ):
            return Response(
                {"detail": "Invalid or expired unsubscribe token"}, status=400
            )
        subscriber.active = False
        subscriber.confirmation_token = ""
        subscriber.save(update_fields=["active", "confirmation_token"])
        return Response({"unsubscribed": True})


class WaitlistSerializer(serializers.Serializer):
    product = serializers.CharField(max_length=80)
    email = serializers.EmailField()
    use_case = serializers.CharField(max_length=2000, allow_blank=True, required=False)
    website = serializers.CharField(required=False, allow_blank=True)


class WaitlistView(APIView):
    serializer_class = WaitlistSerializer
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [WriteThrottle]

    @transaction.atomic
    def post(self, request):
        s = WaitlistSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        data = s.validated_data
        if data.get("website"):
            return Response({"accepted": True}, status=202)
        row = WaitlistSignup.objects.create(
            product=data["product"],
            email=data["email"],
            use_case=data.get("use_case", ""),
        )
        EmailOutbox.objects.create(
            recipient=row.email,
            subject="Waitlist request received",
            body="Your request is recorded for review.",
        )
        return Response({"accepted": True}, status=202)
