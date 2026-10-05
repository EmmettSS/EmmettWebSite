"""فید RSS دوره‌های آکادمی (فاز ۷ — ADR-0031).

هم‌ساخت با ``apps.blog.feeds``: URLها **مطلق** ساخته می‌شوند (الزام RSS:
``<link>`` نسبی برای خواننده‌ها نامعتبر است) و زبان از ``get_language()``
می‌آید که ``LocaleMiddleware`` از ``?language=``/هدر ``Accept-Language`` ست
می‌کند. فید در لایهٔ جنگو می‌ماند و فرانت‌اند فقط آن را در مسیر ``/academy/rss``
بازنشر می‌کند (تصمیم Q7 فاز ۷).
"""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from django.contrib.syndication.views import Feed
from django.utils.translation import get_language

from apps.academy.models import Course
from apps.core.feeds import LocalizedFeedMixin
from apps.core.utils.urls import absolute_localized_url

if TYPE_CHECKING:
    _FeedBase = Feed[Course, Course]
else:
    _FeedBase = Feed


class LatestCoursesFeed(LocalizedFeedMixin, _FeedBase):
    description = "آخرین دوره‌های آکادمی Emmett"
    public_feed_path = "/academy/rss"

    @staticmethod
    def _locale() -> str:
        return get_language() or "fa"

    def title(self) -> str:
        return "Emmett Academy"

    def link(self) -> str:
        return absolute_localized_url(self._locale(), "/academy/")

    def items(self) -> list[Course]:
        return list(
            Course.objects.filter(status=Course.Status.PUBLISHED)
            .select_related("instructor")
            .order_by("-created_at")[:20]
        )

    def item_title(self, item: Course) -> str:
        return str(item.title)

    def item_description(self, item: Course) -> str:
        return str(item.summary)

    def item_link(self, item: Course) -> str:
        return absolute_localized_url(self._locale(), f"/academy/{item.slug}/")

    def item_pubdate(self, item: Course) -> datetime | None:
        return item.published_at or item.created_at


__all__ = ["LatestCoursesFeed"]
