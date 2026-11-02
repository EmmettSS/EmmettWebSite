from __future__ import annotations

from factory.declarations import Sequence
from factory.django import DjangoModelFactory

from apps.taxonomy.models import Category, Tag


class CategoryFactory(DjangoModelFactory[Category]):
    class Meta:
        model = Category
        django_get_or_create = ("slug",)

    name = Sequence(lambda n: f"دسته {n}")
    slug = Sequence(lambda n: f"category-{n}")
    scope = Category.Scope.SERVICE


class TagFactory(DjangoModelFactory[Tag]):
    class Meta:
        model = Tag
        django_get_or_create = ("slug",)

    name = Sequence(lambda n: f"برچسب {n}")
    slug = Sequence(lambda n: f"tag-{n}")
