from __future__ import annotations

from typing import Any

from django.contrib import admin
from django.http import HttpRequest
from modeltranslation.admin import TranslationAdmin

from apps.blog.models import BlogPost, Comment
from apps.core.models import log_action


@admin.register(BlogPost)
class BlogPostAdmin(TranslationAdmin[BlogPost]):
    list_display = ("title", "status", "author", "reading_time_minutes", "view_count", "published_at")
    list_filter = ("status", "categories")
    search_fields = ("title", "excerpt", "slug")
    filter_horizontal = ("categories", "tags")
    autocomplete_fields = ("author", "cover_image")
    readonly_fields = ("reading_time_minutes", "view_count")


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin[Comment]):
    """تعدیل کامنت از طریق Django Admin طبق ADR-0025 (بدون داشبورد جدا)."""

    list_display = ("post", "author", "status", "created_at")
    list_filter = ("status", "post")
    search_fields = ("body", "author__email")
    autocomplete_fields = ("post", "author", "parent")
    actions = ["approve_comments", "reject_comments"]

    @admin.action(description="Approve selected comments")
    def approve_comments(self, request: HttpRequest, queryset: Any) -> None:
        comment_ids = list(queryset.values_list("pk", flat=True))
        queryset.update(status=Comment.Status.APPROVED)
        self._log_moderation(request, "approved", comment_ids)

    @admin.action(description="Reject selected comments")
    def reject_comments(self, request: HttpRequest, queryset: Any) -> None:
        comment_ids = list(queryset.values_list("pk", flat=True))
        queryset.update(status=Comment.Status.REJECTED)
        self._log_moderation(request, "rejected", comment_ids)

    @staticmethod
    def _log_moderation(request: HttpRequest, decision: str, comment_ids: list[int]) -> None:
        """ثبت یک رویداد در AuditLog به ازای هر اقدام تعدیل دسته‌ای (ADR-0013)."""

        if not comment_ids:
            return
        log_action(
            action="blog.comment_moderated",
            actor=request.user if request.user.is_authenticated else None,
            metadata={"decision": decision, "comment_ids": comment_ids},
        )
