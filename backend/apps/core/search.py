"""جست‌وجوی سراسری — MySQL FULLTEXT (prod) / SQLite FTS5 (dev-test) — ADR-0021.

این ماژول دو مسئولیت دارد:

1. ``sync_search_index``: نقطهٔ ورود واحد برای هر اپ محتوایی تا رکورد خودش
   را در ``SearchIndexEntry`` به‌روز/حذف کند (فراخوانی از ``signals.py`` هر اپ).
2. ``search``: کوئری چندنوعی روی همان جدول، با پیاده‌سازی متفاوت بسته به
   ``connection.vendor`` اما امضای خروجی یکسان برای مصرف‌کنندهٔ API.

خودِ FULLTEXT index (MySQL)/جدول مجازی FTS5 (SQLite) در یک migration
اختصاصی در ``apps/core/migrations/`` ساخته می‌شود، نه اینجا.
"""

from __future__ import annotations

import uuid
from collections.abc import Callable
from dataclasses import dataclass

from django.db import connection

from apps.core.logging import get_logger
from apps.core.models import SearchIndexEntry

logger = get_logger(__name__)


@dataclass(frozen=True)
class SearchResult:
    content_type: str
    public_id: uuid.UUID
    title: str
    url_path: str
    category_label: str
    rank: float


def sync_search_index(
    *,
    content_type: str,
    object_id: int,
    public_id: uuid.UUID,
    locale: str,
    title: str,
    body: str,
    url_path: str,
    category_label: str = "",
    is_indexable: bool = True,
) -> None:
    """رکورد ایندکس را برای یک (content_type, object_id, locale) به‌روز یا حذف می‌کند."""

    if not is_indexable:
        SearchIndexEntry.objects.filter(
            content_type=content_type, object_id=object_id, locale=locale
        ).delete()
        return

    SearchIndexEntry.objects.update_or_create(
        content_type=content_type,
        object_id=object_id,
        locale=locale,
        defaults={
            "public_id": public_id,
            "title": title[:255],
            "body": body,
            "url_path": url_path[:255],
            "category_label": category_label[:100],
        },
    )


def remove_from_index(*, content_type: str, object_id: int) -> None:
    """حذف کامل یک شیء از ایندکس (هر دو locale) — هنگام حذف واقعی رکورد."""

    SearchIndexEntry.objects.filter(content_type=content_type, object_id=object_id).delete()


def _search_mysql(query: str, locale: str, limit: int) -> list[SearchResult]:
    sql = """
        SELECT content_type, public_id, title, url_path, category_label,
               MATCH(title, body) AGAINST (%s IN NATURAL LANGUAGE MODE) AS relevance
        FROM core_searchindexentry
        WHERE locale = %s AND MATCH(title, body) AGAINST (%s IN NATURAL LANGUAGE MODE)
        ORDER BY relevance DESC
        LIMIT %s
    """
    with connection.cursor() as cursor:
        cursor.execute(sql, [query, locale, query, limit])
        rows = cursor.fetchall()
    return [
        SearchResult(
            content_type=row[0],
            public_id=row[1] if isinstance(row[1], uuid.UUID) else uuid.UUID(str(row[1])),
            title=row[2],
            url_path=row[3],
            category_label=row[4] or "",
            rank=float(row[5]),
        )
        for row in rows
    ]


def _search_sqlite(query: str, locale: str, limit: int) -> list[SearchResult]:
    # جدول مجازی FTS5 با پسوند `_fts` (ر.ک. core migration مربوطه)؛ `rowid` همان
    # `id` جدول اصلی است (الگوی «external content table» در مستندات SQLite).
    sql = """
        SELECT e.content_type, e.public_id, e.title, e.url_path, e.category_label,
               bm25(core_searchindexentry_fts) AS relevance
        FROM core_searchindexentry_fts
        JOIN core_searchindexentry e ON e.id = core_searchindexentry_fts.rowid
        WHERE core_searchindexentry_fts MATCH %s AND e.locale = %s
        ORDER BY relevance LIMIT %s
    """
    fts_query = " ".join(f"{token}*" for token in query.split() if token)
    if not fts_query:
        return []
    with connection.cursor() as cursor:
        cursor.execute(sql, [fts_query, locale, limit])
        rows = cursor.fetchall()
    return [
        SearchResult(
            content_type=row[0],
            public_id=row[1] if isinstance(row[1], uuid.UUID) else uuid.UUID(str(row[1])),
            title=row[2],
            url_path=row[3],
            category_label=row[4] or "",
            # bm25() در SQLite هرچه کوچک‌تر (منفی‌تر) باشد مرتبط‌تر است؛ برای
            # یکدستی با خروجی MySQL (بزرگ‌تر = مرتبط‌تر) علامت را معکوس می‌کنیم.
            rank=-float(row[5]),
        )
        for row in rows
    ]


def _search_fallback(query: str, locale: str, limit: int) -> list[SearchResult]:
    """پشتیبان ساده برای backendهای ناشناخته (مثلاً در تست‌های غیرمعمول)."""

    qs = (
        SearchIndexEntry.objects.filter(locale=locale)
        .filter(**{"title__icontains": query})
        .order_by("-updated_at")[:limit]
    )
    return [
        SearchResult(
            content_type=e.content_type,
            public_id=e.public_id,
            title=e.title,
            url_path=e.url_path,
            category_label=e.category_label,
            rank=0.0,
        )
        for e in qs
    ]


def search(query: str, locale: str, limit: int = 20) -> list[SearchResult]:
    """جست‌وجوی سراسری — رفتار یکسان صرف‌نظر از دیتابیس فعال."""

    query = query.strip()
    if not query:
        return []

    vendor: str = connection.vendor
    handlers: dict[str, Callable[[str, str, int], list[SearchResult]]] = {
        "mysql": _search_mysql,
        "sqlite": _search_sqlite,
    }
    handler = handlers.get(vendor, _search_fallback)
    try:
        return handler(query, locale, limit)
    except Exception:  # noqa: BLE001 - اگر ایندکس FTS هنوز ساخته نشده (مثلاً قبل از migrate)
        logger.warning("search_index_fallback", vendor=vendor, query=query, exc_info=True)
        return _search_fallback(query, locale, limit)


__all__ = ["SearchResult", "sync_search_index", "remove_from_index", "search"]
