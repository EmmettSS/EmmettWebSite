"""منابع صادرات/واردات اپ ``blog`` (ADR-0029).

``BlogPost`` قابل واردات است (کلید پایدار: ``slug``) اما ``Comment`` — که
محتوای تولیدشدهٔ کاربر است — فقط صادر می‌شود؛ هیچ مسیری برای تزریق کامنت از
فایل در ادمین وجود ندارد (کاهش سطح حمله — ADR-0029).
"""

from __future__ import annotations

from apps.blog.models import BlogPost, Comment
from apps.core.resources import EmmettResource, i18n_fields


class BlogPostResource(EmmettResource):
    class Meta:
        model = BlogPost
        fields = i18n_fields(
            ("slug", "status", "author", "published_at", "view_count"),
            ("title", "excerpt", "content", "meta_title", "meta_description"),
        )
        export_order = fields
        import_id_fields = ("slug",)
        skip_unchanged = True
        report_skipped = True


class CommentResource(EmmettResource):
    class Meta:
        model = Comment
        fields = (
            "schema_version",
            "created_at",
            "post",
            "author",
            "parent",
            "status",
            "body",
        )
        export_order = fields


__all__ = ["BlogPostResource", "CommentResource"]
