"""F-06 API surface (guard 2 consent, guard 3 throttle+honeypot, guard 4 blocklist).

POST /api/v1/scanner/jobs/                       → 202 { job_id }  (checks blocklist first)
GET  /api/v1/scanner/jobs/<id>/poll/?offset=n    → progress + result summary
GET  /api/v1/scanner/results/<result_id>/        → public masked report (noindex)
POST /api/v1/scanner/results/<result_id>/unlock/ → emails a signed link for the full report
"""

from __future__ import annotations

import re

from django.conf import settings
from django.core import signing
from django.db import transaction
from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from apps.core.api import PersianRateThrottle, PersianThrottleMixin
from rest_framework.views import APIView

from apps.jobs.models import Job
from apps.jobs.polling import PollableJobView
from apps.leads.models import ContactLead, EmailOutbox

from . import blocklist
from .models import ScanJob, ScanResult
from .serializers import (
    ScanCreatedResponseSerializer,
    ScanPollResponseSerializer,
    ScanResultResponseSerializer,
    scan_result_payload,
)

UNLOCK_SALT = "emmett-scan-report"
UNLOCK_MAX_AGE = 7 * 24 * 60 * 60  # the report itself lives 7 days


class ScanUnlockSerializer(serializers.Serializer):
    email = serializers.EmailField()


class ScanThrottle(PersianRateThrottle):
    """Guard 3 — 5 scans per hour per IP."""

    rate = "5/hour"


class UnlockThrottle(PersianRateThrottle):
    rate = "10/hour"


class ScanRequestSerializer(serializers.Serializer):
    domain = serializers.CharField(max_length=253)
    consent = serializers.BooleanField()
    locale = serializers.ChoiceField(choices=["fa", "en"], default="fa")
    website = serializers.CharField(required=False, allow_blank=True, write_only=True)  # honeypot


class ScanJobCreateView(PersianThrottleMixin, APIView):
    serializer_class = ScanRequestSerializer
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScanThrottle]

    @extend_schema(request=ScanRequestSerializer, responses=ScanCreatedResponseSerializer)
    def post(self, request):
        serializer = ScanRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if data.get("website"):  # honeypot: behave as if accepted
            return Response({"accepted": True}, status=status.HTTP_202_ACCEPTED)
        if not data["consent"]:
            return Response(
                {
                    "message_fa": "برای شروع بررسی باید مالکیت دامنه یا اجازهٔ خود را تأیید کنید.",
                    "message_en": "Confirm that you own the domain or have permission before scanning.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        allowed, reason_fa, reason_en = blocklist.check_domain(data["domain"])
        if not allowed:
            return Response(
                {"message_fa": reason_fa, "message_en": reason_en, "reason": "blocked"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        domain = blocklist.normalize_domain(data["domain"])
        with transaction.atomic():
            job = Job.objects.create(
                kind=Job.Kind.SCAN,
                payload={
                    "domain": domain,
                    "locale": data["locale"],
                    "blocklist_version": blocklist.BLOCKLIST_VERSION,
                },
            )
            scan = ScanJob.objects.create(job=job, domain=domain, consented=True)
            job.payload["scan_id"] = scan.pk
            job.save(update_fields=["payload"])

        return Response(
            {
                "job_id": job.pk,
                "result_id": None,
                "domain": domain,
                "blocklist_version": blocklist.BLOCKLIST_VERSION,
                "estimated_seconds": 30,
            },
            status=status.HTTP_202_ACCEPTED,
        )


class ScanJobPollView(PollableJobView):
    serializer_class = ScanPollResponseSerializer
    permission_classes = [AllowAny]
    authentication_classes = []
    job_kind = Job.Kind.SCAN


class ScanResultView(APIView):
    serializer_class = ScanResultResponseSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, result_id: str):
        try:
            result = ScanResult.objects.select_related("scan").get(result_id=result_id)
        except ScanResult.DoesNotExist:
            return Response(
                {
                    "message_fa": "این گزارش پیدا نشد یا منقضی شده است.",
                    "message_en": "This report was not found or has expired.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )
        internal = _unlock_is_valid(request.query_params.get("unlock", ""), result)
        response = Response(scan_result_payload(result, internal=internal))
        response["X-Robots-Tag"] = "noindex, nofollow"
        return response


def _unlock_is_valid(token: str, result: ScanResult) -> bool:
    if not token:
        return False
    try:
        payload = signing.TimestampSigner(salt=UNLOCK_SALT).unsign(token, max_age=UNLOCK_MAX_AGE)
    except (signing.BadSignature, signing.SignatureExpired):
        return False
    return payload == result.result_id


class ScanUnlockView(PersianThrottleMixin, APIView):
    serializer_class = ScanUnlockSerializer
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [UnlockThrottle]

    def post(self, request, result_id: str):
        serializer = ScanUnlockSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = ScanResult.objects.select_related("scan").filter(result_id=result_id).first()
        if result is not None:
            token = signing.TimestampSigner(salt=UNLOCK_SALT).sign(result.result_id)
            link = request.build_absolute_uri(f"/api/v1/scanner/results/{result.result_id}/?unlock={token}")
            with transaction.atomic():
                ContactLead.objects.create(
                    name="scan-report",
                    email=serializer.validated_data["email"],
                    message=f"Full security report requested for {result.scan.domain} ({result.result_id})",
                    locale="fa",
                )
                EmailOutbox.objects.create(
                    recipient=serializer.validated_data["email"],
                    subject="Emmett — full security report link",
                    body=f"Your full report for {result.scan.domain} (valid 7 days): {link}",
                )
        return Response({"accepted": True}, status=status.HTTP_202_ACCEPTED)


EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _email_ok(value: str) -> bool:  # pragma: no cover - small helper for tests
    return bool(EMAIL_RE.match(value or ""))


def weights_payload() -> dict:
    from .grading import weights

    return {"weights": weights(), "source": "settings.SCANNER_SECTION_WEIGHTS", "env_override": bool(getattr(settings, "SCANNER_SECTION_WEIGHTS", None))}
