from __future__ import annotations

from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.throttling import ContactFormRateThrottle
from apps.core.utils.request import get_client_ip
from apps.leads.models import Contact, Lead, Newsletter
from apps.leads.notifications import notify_new_contact
from apps.leads.serializers import (
    ContactCreateSerializer,
    ContactResponseSerializer,
    NewsletterCreateSerializer,
)


class ContactCreateView(APIView):
    """فرم تماس عمومی — بدون نیاز به ورود، اما throttle سخت‌گیرانه (قانون ۱۶)."""

    permission_classes = [AllowAny]
    throttle_classes = [ContactFormRateThrottle]

    def post(self, request: Request) -> Response:
        serializer = ContactCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        django_request = request._request
        contact = serializer.save(
            source=Contact.Source.WEBSITE_FORM,
            ip_address=get_client_ip(django_request),
            user_agent=django_request.META.get("HTTP_USER_AGENT", "")[:500],
        )
        # پایپ‌لاین فروش: هر Contact جدید یک Lead با status=new می‌سازد.
        Lead.objects.create(contact=contact)
        notify_new_contact(contact)
        return Response(ContactResponseSerializer(contact).data, status=status.HTTP_201_CREATED)


class NewsletterSubscribeView(APIView):
    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        serializer = NewsletterCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "subscribed"}, status=status.HTTP_201_CREATED)


__all__ = ["ContactCreateView", "NewsletterSubscribeView", "Newsletter"]
