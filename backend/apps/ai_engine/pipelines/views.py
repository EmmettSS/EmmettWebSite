from __future__ import annotations

import hashlib
from typing import Any, cast

from django.db import transaction
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.ai_engine.models import AIConcept, AISuggestion
from apps.ai_engine.pipelines.advisor import generate_advisor_suggestion
from apps.ai_engine.pipelines.errors import AIRequestError
from apps.ai_engine.pipelines.estimator import estimate_project
from apps.ai_engine.pipelines.public_serializers import (
    AdvisorCreateResponseSerializer,
    AISuggestionPublicSerializer,
    EstimateResponseSerializer,
)
from apps.ai_engine.pipelines.serializers import (
    AdvisorLeadRequestSerializer,
    AdvisorRequestSerializer,
    EstimatorRequestSerializer,
)
from apps.ai_engine.utils import requester_pseudonym, resolve_locale
from apps.core.throttling import AIEngineRateThrottle, ContactFormRateThrottle
from apps.leads.models import Contact, Lead
from apps.leads.notifications import notify_new_contact
from apps.leads.serializers import ContactResponseSerializer

_PUBLIC_CONCEPTS = (
    "concepts__solution_area",
    "concepts__complexity",
    "concepts__delivery_scope",
    "concepts__related_service",
    "concepts__related_product",
)


def _public_error(exc: AIRequestError, locale: str) -> Response:
    messages = {
        "fa": "در حال حاضر امکان پردازش درخواست وجود ندارد. لطفاً کمی بعد دوباره تلاش کنید.",
        "en": "The request could not be processed right now. Please try again shortly.",
    }
    return Response(
        {"code": exc.code, "detail": messages[locale]},
        status=exc.http_status,
        headers={"Cache-Control": "no-store"},
    )


@method_decorator(csrf_protect, name="dispatch")
class AdvisorCreateView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AIEngineRateThrottle]

    @extend_schema(
        request=AdvisorRequestSerializer,
        responses={201: AdvisorCreateResponseSerializer},
        tags=["AI advisor"],
    )
    def post(self, request: Request) -> Response:
        serializer = AdvisorRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        locale = resolve_locale(request)
        try:
            result = generate_advisor_suggestion(
                input_data=cast(dict[str, object], serializer.validated_data),
                locale=locale,
                requester_hash=requester_pseudonym(request),
            )
        except AIRequestError as exc:
            return _public_error(exc, locale)

        suggestion = (
            AISuggestion.objects.filter(pk=result.suggestion.pk)
            .select_related("request")
            .prefetch_related(*_PUBLIC_CONCEPTS)
            .get()
        )
        response_data = {
            "share_token": result.share_token,
            "suggestion": AISuggestionPublicSerializer(suggestion, context={"locale": locale}).data,
        }
        response = Response(response_data, status=status.HTTP_201_CREATED)
        response["Cache-Control"] = "no-store"
        response["X-Robots-Tag"] = "noindex, nofollow"
        return response


class SharedSuggestionView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        responses={200: AISuggestionPublicSerializer},
        tags=["AI advisor"],
    )
    def get(self, request: Request, token: str) -> Response:
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        try:
            suggestion = (
                AISuggestion.objects.filter(
                    share_token_hash=token_hash,
                    share_revoked_at__isnull=True,
                    is_displayable=True,
                    is_active=True,
                    deleted_at__isnull=True,
                )
                .prefetch_related(*_PUBLIC_CONCEPTS)
                .get()
            )
        except AISuggestion.DoesNotExist as exc:
            raise NotFound("Shared result is unavailable.") from exc

        locale = resolve_locale(request)
        response = Response(
            AISuggestionPublicSerializer(suggestion, context={"locale": locale}).data,
            status=status.HTTP_200_OK,
        )
        response["Cache-Control"] = "no-store"
        response["X-Robots-Tag"] = "noindex, nofollow"
        return response


@method_decorator(csrf_protect, name="dispatch")
class ProjectEstimateView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AIEngineRateThrottle]

    @extend_schema(
        request=EstimatorRequestSerializer,
        responses={200: EstimateResponseSerializer},
        tags=["AI estimator"],
    )
    def post(self, request: Request) -> Response:
        serializer = EstimatorRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        locale = resolve_locale(request)
        result = estimate_project(
            input_data=cast(dict[str, object], serializer.validated_data),
            locale=locale,
            requester_hash=requester_pseudonym(request),
        )
        response = Response(EstimateResponseSerializer(result).data, status=status.HTTP_200_OK)
        response["Cache-Control"] = "no-store"
        return response


@method_decorator(csrf_protect, name="dispatch")
class AdvisorLeadCreateView(APIView):
    """Create the Contact and Lead for a shared concept; contact details never enter AI audit."""

    permission_classes = [AllowAny]
    throttle_classes = [ContactFormRateThrottle]

    @extend_schema(
        request=AdvisorLeadRequestSerializer,
        responses={201: ContactResponseSerializer},
        tags=["AI advisor"],
    )
    def post(self, request: Request) -> Response:
        serializer = AdvisorLeadRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = cast(dict[str, Any], serializer.validated_data)
        locale = resolve_locale(request)
        token = cast(str, validated["share_token"])
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        try:
            suggestion = AISuggestion.objects.get(
                share_token_hash=token_hash,
                share_revoked_at__isnull=True,
                is_displayable=True,
                is_active=True,
                deleted_at__isnull=True,
            )
            concept = AIConcept.objects.get(
                public_id=validated["concept_public_id"],
                suggestion=suggestion,
                is_active=True,
                deleted_at__isnull=True,
            )
        except (AISuggestion.DoesNotExist, AIConcept.DoesNotExist) as exc:
            raise NotFound("Shared result is unavailable.") from exc

        contact_data = cast(dict[str, Any], validated["contact"])
        contact_data.pop("consent_given", None)
        contact_data["message"] = contact_data.get("message") or (
            "درخواست بررسی ایدهٔ پیشنهادی از مشاور هوشمند."
            if locale == "fa"
            else "Request to review a concept from the creative advisor."
        )
        with transaction.atomic():
            contact = Contact.objects.create(
                **contact_data,
                source=Contact.Source.AI_ASSISTANT,
                consent_given=True,
                ip_address=None,
                user_agent="",
            )
            Lead.objects.create(contact=contact, ai_suggestion=suggestion, ai_concept=concept)
        notify_new_contact(contact)
        response = Response(ContactResponseSerializer(contact).data, status=status.HTTP_201_CREATED)
        response["Cache-Control"] = "no-store"
        return response
