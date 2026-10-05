"""منابع صادرات/واردات اپ ``portfolio`` (ADR-0029)."""

from __future__ import annotations

from apps.core.resources import EmmettResource, i18n_fields
from apps.portfolio.models import CaseStudy, Project


class ProjectResource(EmmettResource):
    """پروژه‌ها (شامل محصولات داخلی مثل Pentestor/CRM — ``is_product``)."""

    class Meta:
        model = Project
        fields = i18n_fields(
            (
                "slug",
                "status",
                "client_name",
                "service",
                "year",
                "is_product",
                "is_featured",
                "order",
                "published_at",
            ),
            ("title", "summary", "meta_title", "meta_description"),
        )
        export_order = fields
        import_id_fields = ("slug",)
        skip_unchanged = True
        report_skipped = True


class CaseStudyResource(EmmettResource):
    """مطالعهٔ موردی (OneToOne با پروژه) — کلید پایدار: ``project`` (slug)."""

    class Meta:
        model = CaseStudy
        fields = i18n_fields(
            ("project", "technology_stack"),
            ("challenge", "approach", "architecture_notes", "implementation_notes", "result"),
        )
        export_order = fields
        import_id_fields = ("project",)
        skip_unchanged = True


__all__ = ["CaseStudyResource", "ProjectResource"]
