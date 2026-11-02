from __future__ import annotations

from typing import cast

import pytest
from django.contrib.admin.sites import AdminSite

from apps.accounts.models import User
from apps.accounts.tests.factories import UserFactory
from apps.blog.admin import CommentAdmin
from apps.blog.models import Comment
from apps.blog.tests.factories import BlogPostFactory, CommentFactory
from apps.core.models import AuditLog
from apps.core.tests.admin_helpers import admin_request

pytestmark = pytest.mark.django_db


class TestCommentModerationAuditLog:
    """ADR-0013: تعدیل محتوا («مشابه» رویدادهای حساس صریحاً نام‌برده‌شده) باید ثبت شود."""

    def _admin(self) -> CommentAdmin:
        return CommentAdmin(Comment, AdminSite())

    def test_approve_action_logs_moderator_and_comment_ids(self) -> None:
        moderator = cast(User, UserFactory(is_staff=True, role=User.Role.ADMIN))
        post = BlogPostFactory()
        comment = cast(
            Comment, CommentFactory(post=post, author=UserFactory(), status=Comment.Status.PENDING)
        )
        request = admin_request(moderator, "/admin/blog/comment/")

        comment_admin = self._admin()
        queryset = Comment.objects.filter(pk=comment.pk)
        comment_admin.approve_comments(request, queryset)

        comment.refresh_from_db()
        assert comment.status == Comment.Status.APPROVED

        entry = AuditLog.objects.get(action="blog.comment_moderated")
        assert entry.actor == moderator
        assert entry.metadata == {"decision": "approved", "comment_ids": [comment.pk]}

    def test_reject_action_logs_decision(self) -> None:
        moderator = cast(User, UserFactory(is_staff=True, role=User.Role.ADMIN))
        post = BlogPostFactory()
        comment = cast(
            Comment, CommentFactory(post=post, author=UserFactory(), status=Comment.Status.PENDING)
        )
        request = admin_request(moderator, "/admin/blog/comment/")

        comment_admin = self._admin()
        comment_admin.reject_comments(request, Comment.objects.filter(pk=comment.pk))

        entry = AuditLog.objects.get(action="blog.comment_moderated")
        assert entry.metadata["decision"] == "rejected"

    def test_action_on_empty_queryset_does_not_log(self) -> None:
        moderator = cast(User, UserFactory(is_staff=True, role=User.Role.ADMIN))
        request = admin_request(moderator, "/admin/blog/comment/")

        comment_admin = self._admin()
        comment_admin.approve_comments(request, Comment.objects.none())

        assert not AuditLog.objects.filter(action="blog.comment_moderated").exists()
