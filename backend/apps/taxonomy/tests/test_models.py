from __future__ import annotations

from typing import cast

import pytest

from apps.taxonomy.models import Category, Tag
from apps.taxonomy.tests.factories import CategoryFactory, TagFactory

pytestmark = pytest.mark.django_db


class TestCategoryModel:
    def test_str_includes_scope(self) -> None:
        category = cast(Category, CategoryFactory(name="طراحی وب", scope=Category.Scope.SERVICE))
        assert str(category) == "طراحی وب (service)"

    def test_parent_child_relationship(self) -> None:
        parent = cast(Category, CategoryFactory(slug="parent-cat"))
        child = cast(Category, CategoryFactory(slug="child-cat", parent=parent))
        assert child.parent == parent
        assert parent.children.first() == child

    def test_deleting_parent_sets_null_on_children(self) -> None:
        parent = cast(Category, CategoryFactory(slug="to-delete"))
        child = cast(Category, CategoryFactory(slug="keeps-living", parent=parent))
        parent.delete(hard=True)
        child.refresh_from_db()
        assert child.parent is None

    def test_slug_must_be_unique(self) -> None:
        from django.db import IntegrityError

        Category.objects.create(name="یک", slug="duplicate-slug", scope=Category.Scope.BLOG)
        with pytest.raises(IntegrityError):
            Category.objects.create(name="دو", slug="duplicate-slug", scope=Category.Scope.BLOG)


class TestTagModel:
    def test_str_returns_name(self) -> None:
        tag = cast(Tag, TagFactory(name="پایتون"))
        assert str(tag) == "پایتون"
