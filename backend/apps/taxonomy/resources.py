"""منابع صادرات/واردات اپ ``taxonomy`` (ADR-0029)."""

from __future__ import annotations

from apps.core.resources import EmmettResource, i18n_fields
from apps.taxonomy.models import Category, Tag


class CategoryResource(EmmettResource):
    class Meta:
        model = Category
        fields = i18n_fields(("slug", "scope", "parent"), ("name",))
        export_order = fields
        import_id_fields = ("slug",)
        skip_unchanged = True


class TagResource(EmmettResource):
    class Meta:
        model = Tag
        fields = i18n_fields(("slug",), ("name",))
        export_order = fields
        import_id_fields = ("slug",)
        skip_unchanged = True


__all__ = ["CategoryResource", "TagResource"]
