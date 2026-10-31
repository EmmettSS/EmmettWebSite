"""فید RSS بلاگ — آیتم ۵ بریف فاز ۴."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from django.contrib.syndication.views import Feed
from django.utils.translation import get_language

from apps.blog.models import BlogPost
from apps.core.feeds import LocalizedFeedMixin
from apps.core.utils.urls import absolute_localized_url

if TYPE_CHECKING:
    # ``Feed`` در django-stubs ``Generic[_Item, _Object]`` است، اما در زمان
    # اجرا کلاس واقعی Django از ``__class_getitem__`` پشتیبانی نمی‌کند؛ این
    # شاخه فقط برای mypy است، نه چیزی که واقعاً اجرا شود.
    _FeedBase = Feed[BlogPost, BlogPost]
else:
    _FeedBase = Feed


class LatestBlogPostsFeed(LocalizedFeedMixin, _FeedBase):
    description = "آخرین مطالب بلاگ Emmett"
    public_feed_path = "/blog/rss"

    @staticmethod
    def _locale() -> str:
        return get_language() or "fa"

    def title(self) -> str:
        return "Emmett Blog"

    def link(self) -> str:
        # URL مطلق لازم است: ``<link>`` نسبی در RSS نامعتبر و برای خواننده‌ها
        # بی‌معناست (دامنه از ``PUBLIC_SITE_URL`` می‌آید — ADR-0031).
        return absolute_localized_url(self._locale(), "/blog/")

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
        return absolute_localized_url(self._locale(), f"/blog/{item.slug}/")

    def item_pubdate(self, item: BlogPost) -> datetime | None:
        return item.published_at


__all__ = ["LatestBlogPostsFeed"]
