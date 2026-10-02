"""F-08 API surface.

Privacy guardrails implemented here:
* the question text is kept only for the duration of the request and then wiped from the job row
  (``Job.payload`` is cleared) — the answer cache keys on a hash, never on the text;
* ``consent_to_log`` is accepted and never turns into content logging;
* every response carries the AI disclosure, and answers require citations.
"""

from __future__ import annotations

from django.core.cache import cache
from django.db import transaction
from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.api import PersianRateThrottle, PersianThrottleMixin
from apps.jobs.models import Job
from apps.jobs.polling import PollableJobView

from . import jobs as assistant_jobs  # noqa: F401  (registers handlers on import)
from .answers import AI_DISCLOSURE_EN, AI_DISCLOSURE_FA, MAX_QUESTION_CHARS, question_hash
from .corpus import documents_from_site_export
from .models import AssistantAnswer, AssistantFeedback

SUGGESTIONS_CACHE_KEY = "assistant:suggestions:v1"
SUGGESTIONS_FALLBACK = (
    ("پن‌تستور چطور کار می‌کند؟", "How does PenTestor work?"),
    ("روی چه پشته‌ای کار می‌کنید؟", "What stack do you work on?"),
    ("چه ابزارهایی روی سایت زنده است؟", "Which tools are live on the site?"),
    ("داده‌های من در ابزارها کجا می‌رود؟", "Where does my data go in the tools?"),
)


class AskThrottle(PersianRateThrottle):
    rate = "20/hour"


class FeedbackThrottle(PersianRateThrottle):
    rate = "30/hour"


class AskSerializer(serializers.Serializer):
    question = serializers.CharField()
    locale = serializers.ChoiceField(choices=["fa", "en"], default="fa")
    session_id = serializers.CharField(max_length=64, required=False, allow_blank=True)
    consent_to_log = serializers.BooleanField(default=False)
    website = serializers.CharField(required=False, allow_blank=True, write_only=True)  # honeypot


class AskAcceptedSerializer(serializers.Serializer):
    job_id = serializers.IntegerField()
    state = serializers.CharField()
    mode = serializers.CharField()
    disclosure = serializers.CharField()


class AssistantPollResponseSerializer(serializers.Serializer):
    job_id = serializers.IntegerField()
    state = serializers.CharField()
    progress = serializers.ListField(child=serializers.JSONField())
    offset_next = serializers.IntegerField()
    result = serializers.JSONField(required=False, allow_null=True)
    error = serializers.CharField(required=False, allow_null=True)


class SuggestionsResponseSerializer(serializers.Serializer):
    suggestions = serializers.ListField(child=serializers.JSONField())


class FeedbackSerializer(serializers.Serializer):
    answer_id = serializers.IntegerField()
    helpful = serializers.BooleanField()


class AssistantAskView(PersianThrottleMixin, APIView):
    serializer_class = AskSerializer
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [AskThrottle]

    @extend_schema(request=AskSerializer, responses=AskAcceptedSerializer)
    def post(self, request):
        serializer = AskSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        locale = data["locale"]

        if data.get("website"):
            return Response({"accepted": True}, status=status.HTTP_202_ACCEPTED)
        question = (data["question"] or "").strip()
        if not question:
            return Response(
                {"message_fa": "پرسش خالی است.", "message_en": "The question is empty."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(question) > MAX_QUESTION_CHARS:
            return Response(
                {
                    "message_fa": f"پرسش حداکثر {MAX_QUESTION_CHARS} کاراکتر می‌تواند باشد.",
                    "message_en": f"A question can be at most {MAX_QUESTION_CHARS} characters.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            job = Job.objects.create(
                kind=Job.Kind.ASK,
                payload={"question": question, "locale": locale, "job_id": None},
            )
            job.payload["job_id"] = job.pk
            job.save(update_fields=["payload"])

        def progress(step: dict) -> None:
            from apps.jobs.runner import models_json_append

            models_json_append(job.pk, step)

        # The card allows the worker to be this request ("چون سبک است"); the poll contract is
        # unchanged, so this can move to a background worker without touching the client.
        result = assistant_jobs.run_ask(
            {
                "job_id": job.pk,
                "question": question,
                "locale": locale,
                "query_hash": question_hash(question, locale),
            },
            progress,
        )
        job.refresh_from_db()

        # Privacy: the question must not survive in the job row.
        job.payload = {"locale": locale, "cleared": True}
        job.state = Job.State.DONE
        job.result = result
        job.save(update_fields=["payload", "state", "result"])

        return Response(
            {
                "job_id": job.pk,
                "state": job.state,
                "mode": result.get("mode", "bm25"),
                "disclosure": AI_DISCLOSURE_FA if locale == "fa" else AI_DISCLOSURE_EN,
            },
            status=status.HTTP_202_ACCEPTED,
        )


class AssistantPollView(PollableJobView):
    serializer_class = AssistantPollResponseSerializer
    permission_classes = [AllowAny]
    authentication_classes = []
    job_kind = Job.Kind.ASK


class AssistantSuggestionsView(APIView):
    serializer_class = SuggestionsResponseSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        locale = request.query_params.get("lang", "fa")
        payload = cache.get(f"{SUGGESTIONS_CACHE_KEY}:{locale}")
        if payload is None:
            payload = self.build(locale)
            cache.set(f"{SUGGESTIONS_CACHE_KEY}:{locale}", payload, 3600)
        return Response({"suggestions": payload})

    @staticmethod
    def build(locale: str) -> list[dict]:
        items: list[dict] = []
        try:
            for document in documents_from_site_export():
                if document.kind != "faq":
                    continue
                lang = "fa" if document.source.endswith(".fa") else "en"
                if lang != locale:
                    continue
                items.append({"id": document.source, "question": document.title, "url": document.url})
        except Exception:  # noqa: BLE001 - suggestions must never break the widget
            items = []
        if not items:
            index = 0 if locale == "fa" else 1
            items = [
                {"id": f"fallback-{n}", "question": pair[index], "url": ""}
                for n, pair in enumerate(SUGGESTIONS_FALLBACK)
            ]
        return items


class AssistantFeedbackView(PersianThrottleMixin, APIView):
    serializer_class = FeedbackSerializer
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [FeedbackThrottle]

    @extend_schema(request=FeedbackSerializer, responses=None)
    def post(self, request):
        serializer = FeedbackSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        answer = AssistantAnswer.objects.filter(pk=serializer.validated_data["answer_id"]).first()
        if answer is None:
            return Response({"accepted": False}, status=status.HTTP_404_NOT_FOUND)
        AssistantFeedback.objects.create(answer=answer, helpful=serializer.validated_data["helpful"])
        return Response({"accepted": True}, status=status.HTTP_202_ACCEPTED)
