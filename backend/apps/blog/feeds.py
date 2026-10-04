"""فید RSS بلاگ — آیتم ۵ بریف فاز ۴."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from django.contrib.syndication.views import Feed
from django.utils.translation import get_language

from apps.blog.models import BlogPost
from apps.core.utils.urls import localized_path

if TYPE_CHECKING:
    # ``Feed`` در django-stubs ``Generic[_Item, _Object]`` است، اما در زمان
    # اجرا کلاس واقعی Django از ``__class_getitem__`` پشتیبانی نمی‌کند؛ این
    # شاخه فقط برای mypy است، نه چیزی که واقعاً اجرا شود.
    _FeedBase = Feed[BlogPost, BlogPost]
else:
    _FeedBase = Feed


class LatestBlogPostsFeed(_FeedBase):
    description = "آخرین مطالب بلاگ Emmett"

    @staticmethod
    def _locale() -> str:
        return get_language() or "fa"

    def title(self) -> str:
        return "Emmett Blog"

    def link(self) -> str:
        return localized_path(self._locale(), "/blog/")

    def items(self) -> list[BlogPost]:
        return list(
            BlogPost.objects.filter(status=BlogPost.Status.PUBLISHED)
            .select_related("author")
            .order_by("-published_at")[:20]
        )

    def item_title(self, item: BlogPost) -> str:
        return str(item.title)

    def item_description(self, item: BlogPost) -> str:
        return str(item.excerpt)

    def item_link(self, item: BlogPost) -> str:
        return localized_path(self._locale(), f"/blog/{item.slug}/")

    def item_pubdate(self, item: BlogPost) -> datetime | None:
        return item.published_at


__all__ = ["LatestBlogPostsFeed"]
