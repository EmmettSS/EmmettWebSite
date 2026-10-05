from __future__ import annotations

from datetime import timedelta

import pytest
from django.contrib.contenttypes.models import ContentType
from django.core.management import call_command
from django.utils import timezone

from apps.ai_engine.models import AIContentArtifact, AIRequest, AISuggestion
from apps.blog.models import BlogPost

pytestmark = pytest.mark.django_db


def test_purging_one_year_ai_audit_preserves_share_and_content_artifact() -> None:
    post = BlogPost.objects.create(
        title="Retention test",
        slug="retention-test",
        excerpt="Test article",
        content="Article content",
        status=BlogPost.Status.PUBLISHED,
    )
    audit = AIRequest.objects.create(
        feature=AIRequest.Feature.BLOG_SUMMARY,
        locale="fa",
        status=AIRequest.Status.COMPLETED,
        input_payload={"post_public_id": str(post.public_id), "locale": "fa"},
    )
    old_created_at = timezone.now() - timedelta(days=400)
    AIRequest.all_objects.filter(pk=audit.pk).update(created_at=old_created_at)
    suggestion = AISuggestion.objects.create(
        request=AIRequest.objects.create(
            feature=AIRequest.Feature.ADVISOR,
            locale="fa",
            status=AIRequest.Status.COMPLETED,
        ),
        locale="fa",
        share_token_hash="d" * 64,
    )
    ContentType.objects.get_for_model(post)
    artifact = AIContentArtifact.objects.create(
        request=audit,
        content_type=ContentType.objects.get_for_model(post),
        object_id=post.pk,
        locale="fa",
        summary_text="Approved content is retained.",
        source_hash="e" * 64,
        status=AIContentArtifact.Status.APPROVED,
    )

    call_command("purge_ai_audit", "--days", "365")

    assert not AIRequest.all_objects.filter(pk=audit.pk).exists()
    suggestion.refresh_from_db()
    artifact.refresh_from_db()
    assert suggestion.pk is not None
    assert artifact.pk is not None
    assert artifact.request_id is None
