from __future__ import annotations

import uuid

import pytest

from apps.core.models import SearchIndexEntry
from apps.core.search import remove_from_index, search, sync_search_index

pytestmark = pytest.mark.django_db


class TestSyncSearchIndex:
    def test_creates_entry_when_indexable(self) -> None:
        public_id = uuid.uuid4()
        sync_search_index(
            content_type="service",
            object_id=1,
            public_id=public_id,
            locale="fa",
            title="طراحی وب‌سایت",
            body="توضیحات خدمت طراحی وب‌سایت حرفه‌ای",
            url_path="/services/web-design",
            category_label="طراحی",
        )

        entry = SearchIndexEntry.objects.get(content_type="service", object_id=1, locale="fa")
        assert entry.title == "طراحی وب‌سایت"
        assert entry.public_id == public_id
        assert entry.url_path == "/services/web-design"

    def test_updates_existing_entry_instead_of_duplicating(self) -> None:
        public_id = uuid.uuid4()
        sync_search_index(
            content_type="service",
            object_id=2,
            public_id=public_id,
            locale="fa",
            title="نسخهٔ اول",
            body="بدنه",
            url_path="/services/x",
        )
        sync_search_index(
            content_type="service",
            object_id=2,
            public_id=public_id,
            locale="fa",
            title="نسخهٔ دوم",
            body="بدنه به‌روزشده",
            url_path="/services/x",
        )

        entries = SearchIndexEntry.objects.filter(content_type="service", object_id=2, locale="fa")
        assert entries.count() == 1
        assert entries.first().title == "نسخهٔ دوم"  # type: ignore[union-attr]

    def test_not_indexable_removes_entry(self) -> None:
        sync_search_index(
            content_type="service",
            object_id=3,
            public_id=uuid.uuid4(),
            locale="fa",
            title="پیش‌نویس",
            body="بدنه",
            url_path="/services/draft",
        )
        sync_search_index(
            content_type="service",
            object_id=3,
            public_id=uuid.uuid4(),
            locale="fa",
            title="پیش‌نویس",
            body="بدنه",
            url_path="/services/draft",
            is_indexable=False,
        )

        assert not SearchIndexEntry.objects.filter(content_type="service", object_id=3).exists()

    def test_title_and_url_path_are_truncated_to_field_max_length(self) -> None:
        sync_search_index(
            content_type="service",
            object_id=4,
            public_id=uuid.uuid4(),
            locale="fa",
            title="x" * 300,
            body="بدنه",
            url_path="y" * 300,
            category_label="z" * 200,
        )

        entry = SearchIndexEntry.objects.get(content_type="service", object_id=4)
        assert len(entry.title) == 255
        assert len(entry.url_path) == 255
        assert len(entry.category_label) == 100


class TestRemoveFromIndex:
    def test_removes_all_locales_for_an_object(self) -> None:
        for locale in ("fa", "en"):
            sync_search_index(
                content_type="project",
                object_id=10,
                public_id=uuid.uuid4(),
                locale=locale,
                title="Project",
                body="Body",
                url_path="/projects/x",
            )

        remove_from_index(content_type="project", object_id=10)

        assert not SearchIndexEntry.objects.filter(content_type="project", object_id=10).exists()


class TestSearch:
    def test_empty_query_returns_empty_list(self) -> None:
        assert search(query="   ", locale="fa") == []

    def test_finds_entry_by_title_substring(self) -> None:
        sync_search_index(
            content_type="blog_post",
            object_id=20,
            public_id=uuid.uuid4(),
            locale="fa",
            title="راهنمای امنیت وب",
            body="محتوای کامل مقاله",
            url_path="/blog/web-security-guide",
        )

        results = search(query="امنیت", locale="fa")

        assert any(r.url_path == "/blog/web-security-guide" for r in results)

    def test_does_not_mix_locales(self) -> None:
        sync_search_index(
            content_type="blog_post",
            object_id=21,
            public_id=uuid.uuid4(),
            locale="en",
            title="Security Guide",
            body="Full article body",
            url_path="/en/blog/security-guide",
        )

        fa_results = search(query="Security", locale="fa")
        en_results = search(query="Security", locale="en")

        assert not any(r.url_path == "/en/blog/security-guide" for r in fa_results)
        assert any(r.url_path == "/en/blog/security-guide" for r in en_results)

    def test_no_match_returns_empty_list(self) -> None:
        assert search(query="نامرتبط‌ترین‌عبارت‌ممکن", locale="fa") == []
