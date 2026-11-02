"""ادمین اپ ``blog`` — مقالات، کامنت‌ها و تعدیل (فاز ۶).

تعدیل کامنت از طریق Django Admin است (ADR-0025)؛ در فاز ۶ ابزارهای آن کامل‌تر
شد: فیلتر تاریخ/نویسنده، جست‌وجوی دوزبانه، ستون‌های خلاصه، و صادرات CSV برای
گزارش‌گیری. کامنت هرگز از فایل وارد نمی‌شود (``ExportOnly``).
"""

from __future__ import annotations

from typing import Any

from django.contrib import admin
from django.http import HttpRequest
from django.utils.translation import gettext_lazy as _

from apps.blog.models import BlogPost, Comment
from apps.blog.resources import BlogPostResource, CommentResource
from apps.core.admin_mixins import (
    EmmettImportExportAdmin,
    ImportDisabledMixin,
    PublishWorkflowMixin,
    RecordStateFilter,
    SoftDeleteAdminMixin,
    render_status_pill,
)
from apps.core.models import log_action


@admin.register(BlogPost)
class BlogPostAdmin(PublishWorkflowMixin, SoftDeleteAdminMixin, EmmettImportExportAdmin):
    resource_class = BlogPostResource
    list_display = (
        "title",
        "status_badge",
        "author",
        "reading_time_minutes",
        "view_count",
        "published_at",
    )
    list_display_links = ("title",)
    list_filter = ("status", "author", "categories", "created_at", RecordStateFilter)
    search_fields = ("title_fa", "title_en", "excerpt_fa", "excerpt_en", "content_fa", "slug")
    autocomplete_fields = ("author", "cover_image", "categories", "tags", "og_image")
    readonly_fields = (
        "reading_time_minutes",
        "view_count",
        "content_html",
        "public_id",
        "created_at",
        "updated_at",
        "deleted_at",
    )
    date_hierarchy = "created_at"
    list_select_related = ("author",)
    fieldsets = (
        (None, {"fields": ("title", "slug", "excerpt", "content")}),
        (_("Media"), {"fields": ("cover_image",)}),
        (_("Authoring"), {"fields": ("author", "reading_time_minutes", "view_count", "categories", "tags")}),
        (_("Publication"), {"fields": ("status", "published_at")}),
        (_("SEO"), {"fields": ("meta_title", "meta_description", "og_image", "canonical_path")}),
        (
            _("Technical details"),
            {
                "classes": ("collapse",),
                "fields": ("content_html", "public_id", "created_at", "updated_at", "deleted_at"),
            },
        ),
    )


@admin.register(Comment)
class CommentAdmin(ImportDisabledMixin, EmmettImportExportAdmin, SoftDeleteAdminMixin):
    """تعدیل کامنت‌ها — فقط صادرات (بدون واردات) و کامل‌کردن ابزارهای بازبینی."""

    resource_class = CommentResource
    list_display = ("short_body", "post", "author", "status_badge", "created_at")
    list_display_links = ("short_body",)
    list_filter = ("status", "created_at", "post", RecordStateFilter)
    search_fields = ("body", "author__email", "post__title_fa", "post__title_en")
    autocomplete_fields = ("post", "author", "parent")
    date_hierarchy = "created_at"
    list_select_related = ("post", "author")
    actions = ("approve_comments", "reject_comments")

    @admin.display(description=_("Comment"))
    def short_body(self, obj: Comment) -> str:
        body = (obj.body or "").strip().replace("\n", " ")
        return body if len(body) <= 70 else f"{body[:69]}…"

    @admin.display(description=_("Moderation status"), ordering="status")
    def status_badge(self, obj: Comment) -> str:
        return render_status_pill(str(obj.status), Comment.Status.choices)

    @admin.action(description=_("Approve selected comments"), permissions=["change"])
    def approve_comments(self, request: HttpRequest, queryset: Any) -> None:
        self._moderate(request, queryset, decision=Comment.Status.APPROVED)

    @admin.action(description=_("Reject selected comments"), permissions=["change"])
    def reject_comments(self, request: HttpRequest, queryset: Any) -> None:
        self._moderate(request, queryset, decision=Comment.Status.REJECTED)

    def _moderate(self, request: HttpRequest, queryset: Any, *, decision: str) -> None:
        """تعدیل گروهی + ثبت در ``AuditLog`` (ADR-0013) — همان قرارداد فاز ۴."""

        comment_ids = list(queryset.values_list("pk", flat=True))
        if not comment_ids:
            self.message_user(request, _("Nothing to moderate: no comment was selected."))
            return
        queryset.update(status=decision)
        log_action(
            action="blog.comment_moderated",
            actor=request.user if request.user.is_authenticated else None,
            metadata={"decision": decision, "comment_ids": comment_ids},
        )
        self.message_user(
            request,
            _("Moderated %(count)s comment(s).") % {"count": len(comment_ids)},
        )


__all__ = ["BlogPostAdmin", "CommentAdmin"]
