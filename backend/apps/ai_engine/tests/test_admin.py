from __future__ import annotations

import pytest
from django.contrib import admin as django_admin
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from django.http import HttpRequest
from django.test import RequestFactory

from apps.accounts.models import User
from apps.ai_engine.admin import AIContentArtifactAdmin, AISuggestionAdmin
from apps.ai_engine.models import AIContentArtifact, AISuggestion

pytestmark = pytest.mark.django_db


def _admin_request(user: User) -> HttpRequest:
    request = RequestFactory().get("/admin/ai_engine/aisuggestion/")
    request.user = user
    return request


def _staff_user(email: str) -> User:
    user = User.objects.create_user(email=email, password="Str0ngP@ssword!")
    user.is_staff = True
    user.save(update_fields=["is_staff"])
    return user


def test_only_change_permission_allows_revoking_a_shared_suggestion() -> None:
    content_type = ContentType.objects.get_for_model(AISuggestion)
    view_permission = Permission.objects.get(content_type=content_type, codename="view_aisuggestion")
    change_permission = Permission.objects.get(content_type=content_type, codename="change_aisuggestion")
    artifact_type = ContentType.objects.get_for_model(AIContentArtifact)
    view_artifact_permission = Permission.objects.get(
        content_type=artifact_type, codename="view_aicontentartifact"
    )
    change_artifact_permission = Permission.objects.get(
        content_type=artifact_type, codename="change_aicontentartifact"
    )
    viewer = _staff_user("ai-viewer@example.com")
    viewer.user_permissions.add(view_permission, view_artifact_permission)
    editor = _staff_user("ai-editor@example.com")
    editor.user_permissions.add(
        view_permission,
        change_permission,
        view_artifact_permission,
        change_artifact_permission,
    )
    model_admin = AISuggestionAdmin(AISuggestion, django_admin.site)
    artifact_admin = AIContentArtifactAdmin(AIContentArtifact, django_admin.site)

    assert "revoke_shares" not in model_admin.get_actions(_admin_request(viewer))
    assert "revoke_shares" in model_admin.get_actions(_admin_request(editor))
    assert "approve_summaries" not in artifact_admin.get_actions(_admin_request(viewer))
    assert "reject_summaries" not in artifact_admin.get_actions(_admin_request(viewer))
    assert "approve_summaries" in artifact_admin.get_actions(_admin_request(editor))
    assert "reject_summaries" in artifact_admin.get_actions(_admin_request(editor))

    suggestion = AISuggestion.objects.create(locale="fa", share_token_hash="f" * 64)
    model_admin.revoke_shares(_admin_request(editor), AISuggestion.objects.filter(pk=suggestion.pk))
    suggestion.refresh_from_db()
    assert suggestion.share_revoked_at is not None
