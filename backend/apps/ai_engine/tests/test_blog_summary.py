from __future__ import annotations

import hashlib
import json
from typing import cast
from unittest.mock import patch

import pytest
from django.contrib.contenttypes.models import ContentType
from django.utils import timezone
from rest_framework.test import APIClient

from apps.ai_engine.models import AIContentArtifact, AIRequest
from apps.ai_engine.pipelines.blog_summary import generate_blog_summary
from apps.ai_engine.pipelines.errors import AIContentUnavailable
from apps.ai_engine.providers.base import ProviderCompletion
from apps.blog.models import BlogPost

pytestmark = pytest.mark.django_db


class FakeSummaryProvider:
    provider_name = "fake-provider"
    model_name = "fake-summary"

    def __init__(self) -> None:
        self.user_messages: list[str] = []

    def complete(self, *, system_prompt: str, user_message: str, max_tokens: int) -> ProviderCompletion:
        self.user_messages.append(user_message)
        return ProviderCompletion(
            content=json.dumps(
                {
                    "summary_fa": "خلاصه‌ای کوتاه و دقیق از مقاله برای خواننده.",
                    "summary_en": "A concise, accurate summary of the article for readers.",
                },
                ensure_ascii=False,
            ),
            provider_name=self.provider_name,
            model_name=self.model_name,
            input_tokens=200,
            output_tokens=50,
        )


def _localized_content(post: BlogPost, locale: str) -> str:
    return cast(str, getattr(post, f"content_{locale}"))


def _published_post() -> BlogPost:
    post = BlogPost.objects.create(
        title_fa="عنوان مقاله",
        title_en="Article title",
        slug="summary-review-test",
        excerpt_fa="چکیدهٔ مقاله",
        excerpt_en="Article excerpt",
        content_fa="متن مقالهٔ منتشرشده دربارهٔ یک سامانهٔ نرم‌افزاری.",
        content_en="Published article content about a software system.",
        status=BlogPost.Status.PUBLISHED,
        published_at=timezone.now(),
    )
    return post


def test_summary_is_draft_and_audit_does_not_store_article_body() -> None:
    post = _published_post()
    provider = FakeSummaryProvider()
    with patch("apps.ai_engine.pipelines.blog_summary.get_provider", return_value=provider):
        artifact = generate_blog_summary(post=post, locale="fa")

    assert artifact.status == AIContentArtifact.Status.DRAFT
    assert artifact.summary_text == "خلاصه‌ای کوتاه و دقیق از مقاله برای خواننده."
    audit = AIRequest.objects.get(feature=AIRequest.Feature.BLOG_SUMMARY)
    assert audit.input_payload == {"post_public_id": str(post.public_id), "locale": "fa"}
    assert _localized_content(post, "fa") not in json.dumps(audit.input_payload, ensure_ascii=False)
    assert _localized_content(post, "fa") in provider.user_messages[0]


def test_only_current_admin_approved_summary_is_returned_from_public_blog_api() -> None:
    post = _published_post()
    provider = FakeSummaryProvider()
    with patch("apps.ai_engine.pipelines.blog_summary.get_provider", return_value=provider):
        artifact = generate_blog_summary(post=post, locale="fa")

    client = APIClient()
    draft_response = client.get(f"/api/v1/blog/{post.slug}/", HTTP_ACCEPT_LANGUAGE="fa")
    assert draft_response.status_code == 200
    assert draft_response.data["ai_summary"] is None

    artifact.status = AIContentArtifact.Status.APPROVED
    artifact.reviewed_at = timezone.now()
    artifact.save(update_fields=["status", "reviewed_at", "updated_at"])
    approved_response = client.get(f"/api/v1/blog/{post.slug}/", HTTP_ACCEPT_LANGUAGE="fa")
    assert approved_response.data["ai_summary"] == artifact.summary_text

    locale = "fa"
    setattr(post, f"content_{locale}", "متن تازه و به\u200cروزشدهٔ مقاله دربارهٔ نرم\u200cافزار.")
    post.save(update_fields=["content_fa", "updated_at"])
    artifact.refresh_from_db()
    assert artifact.is_stale is True
    stale_response = client.get(f"/api/v1/blog/{post.slug}/", HTTP_ACCEPT_LANGUAGE="fa")
    assert stale_response.data["ai_summary"] is None


def test_summary_refuses_unpublished_blog_post() -> None:
    post = _published_post()
    post.status = BlogPost.Status.DRAFT
    post.save(update_fields=["status", "updated_at"])
    with pytest.raises(AIContentUnavailable):
        generate_blog_summary(post=post, locale="fa")
    assert not AIRequest.objects.exists()


def test_blog_artifact_hash_matches_source_but_audit_has_no_source_text() -> None:
    post = _published_post()
    provider = FakeSummaryProvider()
    with patch("apps.ai_engine.pipelines.blog_summary.get_provider", return_value=provider):
        artifact = generate_blog_summary(post=post, locale="en")

    expected_hash = hashlib.sha256(_localized_content(post, "en").encode("utf-8")).hexdigest()
    assert artifact.source_hash == expected_hash
    assert artifact.content_type == ContentType.objects.get_for_model(post)
    audit = AIRequest.objects.get(feature=AIRequest.Feature.BLOG_SUMMARY)
    assert _localized_content(post, "en") not in json.dumps(audit.input_payload, ensure_ascii=False)
