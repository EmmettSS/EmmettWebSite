"""منابع صادرات/واردات اپ ``company`` (ADR-0029)."""

from __future__ import annotations

from apps.company.models import TeamMember, Testimonial
from apps.core.resources import EmmettResource, i18n_fields


class TeamMemberResource(EmmettResource):
    class Meta:
        model = TeamMember
        fields = i18n_fields(
            ("user", "full_name", "photo", "social_links", "order", "is_active"),
            ("role_title", "bio"),
        )
        export_order = fields
        import_id_fields = ("full_name",)
        skip_unchanged = True


class TestimonialResource(EmmettResource):
    class Meta:
        model = Testimonial
        fields = i18n_fields(
            ("author_name", "author_company", "author_photo", "related_project", "is_featured", "order"),
            ("author_role", "quote"),
        )
        export_order = fields
        import_id_fields = ("author_name", "author_company")
        skip_unchanged = True


__all__ = ["TeamMemberResource", "TestimonialResource"]
