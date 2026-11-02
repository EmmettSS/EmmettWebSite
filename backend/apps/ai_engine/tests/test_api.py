from __future__ import annotations

import hashlib
import json
from typing import Any
from unittest.mock import patch

import pytest
from django.core.cache import cache
from django.utils import timezone
from rest_framework.test import APIClient

from apps.ai_engine.models import AIConcept, AIRequest, AISuggestion, CatalogOption
from apps.ai_engine.providers.base import ProviderCompletion
from apps.leads.models import Contact, Lead

pytestmark = pytest.mark.django_db

_ADVISOR_INPUT: dict[str, object] = {
    "job_role": "owner",
    "business_size": "11_50",
    "city_scale": "metropolitan",
    "budget_range": "not_sure",
    "team_size": "2_5",
    "goals": ["automate_processes", "improve_customer_support"],
}


def _idea(description_en: str = "A focused workflow tool for the support team.") -> dict[str, object]:
    return {
        "title_fa": "سامانهٔ یکپارچهٔ پشتیبانی",
        "title_en": "Unified support workspace",
        "description_fa": "یک ابزار متمرکز برای سامان‌دهی درخواست‌های پشتیبانی.",
        "description_en": description_en,
        "benefit_fa": "پیگیری روشن‌تر درخواست‌ها و هماهنگی بهتر تیم.",
        "benefit_en": "Clearer request tracking and team coordination.",
        "solution_area": "workflow_automation",
        "complexity": "standard",
        "delivery_scope": "mvp",
        "related_service_slug": None,
        "related_product_slug": None,
    }


class FakeProvider:
    provider_name = "fake-provider"
    model_name = "fake-model"

    def __init__(self, payload: dict[str, object]) -> None:
        self.payload = payload
        self.calls: list[dict[str, object]] = []

    def complete(self, *, system_prompt: str, user_message: str, max_tokens: int) -> ProviderCompletion:
        self.calls.append(
            {"system_prompt": system_prompt, "user_message": user_message, "max_tokens": max_tokens}
        )
        return ProviderCompletion(
            content=json.dumps(self.payload, ensure_ascii=False),
            provider_name=self.provider_name,
            model_name=self.model_name,
            input_tokens=120,
            output_tokens=90,
        )


def test_catalog_endpoint_localizes_labels_and_exposes_only_active_options() -> None:
    inactive = CatalogOption.objects.get(catalog__key="goal", key="reduce_costs")
    inactive.is_active = False
    inactive.save(update_fields=["is_active", "updated_at"])

    response = APIClient().get(
        "/api/v1/ai/catalogs/?keys=business_size,goal",
        HTTP_ACCEPT_LANGUAGE="en-US,en;q=0.9",
    )

    assert response.status_code == 200
    catalogs = {item["key"]: item for item in response.data}
    assert catalogs["business_size"]["label"] == "Business size"
    assert catalogs["business_size"]["options"][0]["label"] == "Just me"
    assert "reduce_costs" not in {item["key"] for item in catalogs["goal"]["options"]}


def test_advisor_generates_private_audit_and_public_share_without_inputs() -> None:
    provider = FakeProvider({"ideas": [_idea()]})
    with patch("apps.ai_engine.pipelines.advisor.get_provider", return_value=provider):
        response = APIClient().post(
            "/api/v1/ai/advisor/",
            _ADVISOR_INPUT,
            format="json",
            HTTP_ACCEPT_LANGUAGE="fa-IR,fa;q=0.9",
            HTTP_USER_AGENT="must-not-enter-ai-audit",
        )

    assert response.status_code == 201
    token = response.data["share_token"]
    assert len(token) >= 40
    result = response.data["suggestion"]
    assert len(result["concepts"]) == 1
    assert "job_role" not in result
    assert "goals" not in result
    assert "budget_range" not in result
    assert response["X-Robots-Tag"] == "noindex, nofollow"

    audit = AIRequest.objects.get(feature=AIRequest.Feature.ADVISOR)
    assert audit.input_payload == {
        "budget_range": "not_sure",
        "business_size": "11_50",
        "city_scale": "metropolitan",
        "goals": ["automate_processes", "improve_customer_support"],
        "job_role": "owner",
        "team_size": "2_5",
    }
    assert len(audit.requester_hash) == 64
    assert audit.provider_name == "fake-provider"
    assert audit.prompt_version == 1
    assert audit.input_tokens == 120
    assert not {"ip_address", "user_agent", "email", "phone", "name"}.intersection(
        field.name for field in AIRequest._meta.fields
    )
    assert "must-not-enter-ai-audit" not in str(audit.input_payload)
    assert len(AISuggestion.objects.get(request=audit).share_token_hash or "") == 64
    assert "share_token" not in str(audit.input_payload)

    public_response = APIClient().get(f"/api/v1/ai/results/{token}/", HTTP_ACCEPT_LANGUAGE="en-US")
    assert public_response.status_code == 200
    assert public_response.data["concepts"][0]["title"] == "Unified support workspace"
    assert "input_payload" not in public_response.data
    assert "share_token" not in public_response.data


def test_advisor_cache_skips_provider_but_mints_a_new_share_token_each_time() -> None:
    cache.clear()
    provider = FakeProvider({"ideas": [_idea()]})
    with patch("apps.ai_engine.pipelines.advisor.get_provider", return_value=provider):
        client = APIClient()
        first = client.post("/api/v1/ai/advisor/", _ADVISOR_INPUT, format="json")
        second = client.post("/api/v1/ai/advisor/", _ADVISOR_INPUT, format="json")

    assert first.status_code == 201
    assert second.status_code == 201
    assert len(provider.calls) == 1
    assert first.data["share_token"] != second.data["share_token"]
    audits = list(AIRequest.objects.filter(feature=AIRequest.Feature.ADVISOR).order_by("created_at"))
    assert len(audits) == 2
    assert audits[0].cache_hit is False
    assert audits[1].cache_hit is True
    assert audits[0].request_hash == audits[1].request_hash


def test_guardrail_fails_closed_and_records_only_rule_flags() -> None:
    provider = FakeProvider({"ideas": [_idea("Guaranteed investment return for your business.")]})
    with patch("apps.ai_engine.pipelines.advisor.get_provider", return_value=provider):
        response = APIClient().post("/api/v1/ai/advisor/", _ADVISOR_INPUT, format="json")

    assert response.status_code == 422
    assert response.data["code"] == "output_blocked"
    assert AIRequest.objects.filter(status=AIRequest.Status.BLOCKED).count() == 1
    blocked = AIRequest.objects.get(status=AIRequest.Status.BLOCKED)
    assert "medical-financial-advice" in blocked.guardrail_flags
    assert not AISuggestion.objects.exists()
    assert "Guaranteed investment return" not in str(blocked.input_payload)


def test_inactive_catalog_key_is_rejected_before_provider_call() -> None:
    goal = CatalogOption.objects.get(catalog__key="goal", key="automate_processes")
    goal.is_active = False
    goal.save(update_fields=["is_active", "updated_at"])
    provider = FakeProvider({"ideas": [_idea()]})

    with patch("apps.ai_engine.pipelines.advisor.get_provider", return_value=provider):
        response = APIClient().post("/api/v1/ai/advisor/", _ADVISOR_INPUT, format="json")

    assert response.status_code == 400
    assert provider.calls == []
    assert not AIRequest.objects.exists()


def test_estimator_is_deterministic_has_no_price_and_uses_db_rule() -> None:
    payload = {**_ADVISOR_INPUT, "delivery_scope": "mvp"}
    with patch(
        "apps.ai_engine.pipelines.advisor.get_provider",
        side_effect=AssertionError("must not call provider"),
    ):
        response = APIClient().post(
            "/api/v1/ai/estimates/", payload, format="json", HTTP_ACCEPT_LANGUAGE="en"
        )

    assert response.status_code == 200
    assert response["Cache-Control"] == "no-store"
    assert response.data == {
        "delivery_scope": "mvp",
        "delivery_scope_label": "MVP",
        "minimum_working_days": 5,
    }
    audit = AIRequest.objects.get(feature=AIRequest.Feature.ESTIMATOR)
    assert audit.status == AIRequest.Status.COMPLETED
    assert audit.provider_name == ""
    assert audit.request_hash
    assert "cost" not in response.data


def test_revoked_shared_result_is_not_public() -> None:
    token = "a" * 43
    audit = AIRequest.objects.create(
        feature=AIRequest.Feature.ADVISOR,
        locale="fa",
        status=AIRequest.Status.COMPLETED,
        input_payload={"job_role": "owner"},
    )
    suggestion = AISuggestion.objects.create(
        request=audit,
        locale="fa",
        share_token_hash=hashlib.sha256(token.encode()).hexdigest(),
        share_revoked_at=timezone.now(),
    )
    response = APIClient().get(f"/api/v1/ai/results/{token}/")
    assert response.status_code == 404
    assert suggestion.is_displayable is True


def test_ai_lead_links_contact_to_result_without_a_new_ai_request() -> None:
    token = "b" * 43
    audit = AIRequest.objects.create(
        feature=AIRequest.Feature.ADVISOR,
        locale="fa",
        status=AIRequest.Status.COMPLETED,
        input_payload={"job_role": "owner"},
    )
    suggestion = AISuggestion.objects.create(
        request=audit,
        locale="fa",
        share_token_hash=hashlib.sha256(token.encode()).hexdigest(),
    )
    concept = AIConcept.objects.create(
        suggestion=suggestion,
        position=1,
        title_fa="پیشنهاد نمونه",
        title_en="Sample concept",
        description_fa="شرح فارسی",
        description_en="English description",
        benefit_fa="فایده",
        benefit_en="Benefit",
        solution_area=CatalogOption.objects.get(catalog__key="solution_area", key="web_platform"),
        complexity=CatalogOption.objects.get(catalog__key="complexity", key="simple"),
        delivery_scope=CatalogOption.objects.get(catalog__key="delivery_scope", key="mvp"),
    )
    payload: dict[str, Any] = {
        "share_token": token,
        "concept_public_id": str(concept.public_id),
        "contact": {
            "name": "مریم رضایی",
            "email": "maryam@example.com",
            "phone": "09120000000",
            "project_type": "website",
            "budget_range": "not_sure",
            "timeline": "flexible",
            "message": "برای بررسی تماس بگیرید.",
            "consent_given": True,
        },
    }
    before = AIRequest.objects.count()
    with patch("apps.ai_engine.pipelines.views.notify_new_contact"):
        response = APIClient().post("/api/v1/ai/leads/", payload, format="json")

    assert response.status_code == 201
    assert response["Cache-Control"] == "no-store"
    lead = Lead.objects.select_related("contact", "ai_suggestion", "ai_concept").get(
        contact__email="maryam@example.com"
    )
    assert lead.ai_suggestion_id == suggestion.pk
    assert lead.ai_concept_id == concept.pk
    assert lead.contact is not None
    assert lead.contact.source == Contact.Source.AI_ASSISTANT
    assert lead.contact.ip_address is None
    assert lead.contact.user_agent == ""
    assert AIRequest.objects.count() == before
    assert "maryam@example.com" not in json.dumps(audit.input_payload)


def test_public_estimator_enforces_csrf_without_requiring_login() -> None:
    client = APIClient(enforce_csrf_checks=True)
    client.get("/api/v1/auth/csrf/")
    csrf_token = client.cookies["csrftoken"].value
    payload = {**_ADVISOR_INPUT, "delivery_scope": "mvp"}

    rejected = client.post("/api/v1/ai/estimates/", payload, format="json")
    accepted = client.post(
        "/api/v1/ai/estimates/",
        payload,
        format="json",
        HTTP_X_CSRFTOKEN=csrf_token,
    )

    assert rejected.status_code == 403
    assert accepted.status_code == 200


def test_culturally_sensitive_advisor_output_is_blocked_and_audited() -> None:
    provider = FakeProvider({"ideas": [_idea("A political campaign platform for a customer group.")]})
    with patch("apps.ai_engine.pipelines.advisor.get_provider", return_value=provider):
        response = APIClient().post("/api/v1/ai/advisor/", _ADVISOR_INPUT, format="json")

    assert response.status_code == 422
    audit = AIRequest.objects.get(status=AIRequest.Status.BLOCKED)
    assert "sensitive-topics" in audit.guardrail_flags
    assert not AISuggestion.objects.exists()
