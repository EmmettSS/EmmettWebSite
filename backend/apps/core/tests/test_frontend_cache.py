from __future__ import annotations

import json
from collections.abc import Callable
from typing import Any, cast
from unittest.mock import Mock

import pytest
from django.core.cache import cache
from django.db import transaction
from django.test import override_settings

from apps.core import frontend_cache


def test_model_tag_map_covers_public_content_dependencies() -> None:
    assert frontend_cache.tags_for_model("services.Service") == (
        "content:services",
        "content:projects",
        "search:site",
        "seo:sitemap",
    )
    assert "content:company" in frontend_cache.tags_for_model("portfolio.Project")
    assert frontend_cache.tags_for_model("accounts.User") == ("content:blog",)
    assert "feed:blog" in frontend_cache.tags_for_model("blog.BlogPost")
    assert "content:academy" in frontend_cache.tags_for_model("academy.Lesson")
    assert frontend_cache.tags_for_model("accounts.Profile") == ()


def test_scheduled_revalidation_runs_only_after_transaction_commit(monkeypatch: pytest.MonkeyPatch) -> None:
    callbacks: list[Callable[[], Any]] = []
    commit_options: dict[str, Any] = {}
    send = Mock(return_value=True)

    def register_callback(callback: Callable[[], Any], **kwargs: Any) -> None:
        callbacks.append(callback)
        commit_options.update(kwargs)

    monkeypatch.setattr(transaction, "on_commit", register_callback)
    monkeypatch.setattr(frontend_cache, "_send_revalidation", send)

    frontend_cache.schedule_frontend_revalidation(["content:blog", "content:blog", "feed:blog"])

    assert len(callbacks) == 1
    assert commit_options == {"robust": True}
    send.assert_not_called()
    callbacks[0]()
    send.assert_called_once_with(("content:blog", "feed:blog"))


def test_missing_webhook_configuration_uses_ttl_fallback() -> None:
    with override_settings(FRONTEND_REVALIDATE_URL="", FRONTEND_REVALIDATE_SECRET=""):
        assert not frontend_cache._send_revalidation(("content:blog",))


def test_invalid_webhook_url_fails_closed(monkeypatch: pytest.MonkeyPatch) -> None:
    called = False

    def unexpected_build_opener(*args: object, **kwargs: object) -> None:
        nonlocal called
        called = True

    monkeypatch.setattr(frontend_cache, "build_opener", unexpected_build_opener)
    with override_settings(
        FRONTEND_REVALIDATE_URL="javascript:alert(1)",
        FRONTEND_REVALIDATE_SECRET="test-secret",
    ):
        assert not frontend_cache._send_revalidation(("content:blog",))

    assert not called

    with override_settings(
        FRONTEND_REVALIDATE_URL="http://[",
        FRONTEND_REVALIDATE_SECRET="test-secret",
    ):
        assert not frontend_cache._send_revalidation(("content:blog",))


def test_sends_signed_allowlisted_tags_and_checks_response(monkeypatch: pytest.MonkeyPatch) -> None:
    captured: dict[str, Any] = {}

    class FakeResponse:
        status = 200

        def __enter__(self) -> FakeResponse:
            return self

        def __exit__(self, *args: object) -> None:
            return None

        def read(self) -> bytes:
            return json.dumps({"revalidated": ["content:blog", "feed:blog"]}).encode()

    class FakeOpener:
        def open(self, request: Any, *, timeout: int) -> FakeResponse:
            captured["request"] = request
            captured["timeout"] = timeout
            return FakeResponse()

    def fake_build_opener(handler: Any) -> FakeOpener:
        captured["handler"] = handler
        return FakeOpener()

    monkeypatch.setattr(frontend_cache, "build_opener", fake_build_opener)
    with override_settings(
        FRONTEND_REVALIDATE_URL="https://emmett.example/api/revalidate",
        FRONTEND_REVALIDATE_SECRET="a-long-test-secret",
        FRONTEND_REVALIDATE_TIMEOUT_SECONDS=3,
    ):
        assert frontend_cache._send_revalidation(("content:blog", "feed:blog"))

    request = captured["request"]
    assert request.full_url == "https://emmett.example/api/revalidate"
    assert request.get_method() == "POST"
    assert request.get_header("Authorization") == "Bearer a-long-test-secret"
    assert json.loads(request.data) == {"tags": ["content:blog", "feed:blog"]}
    assert captured["timeout"] == 3
    redirect_handler = captured["handler"]()
    assert (
        redirect_handler.redirect_request(
            None, None, 307, "Temporary Redirect", None, "https://elsewhere.test/"
        )
        is None
    )


def test_backend_sitemap_cache_is_expired_even_without_frontend_webhook() -> None:
    cache.set("seo:sitemap:entries:v1", [{"path": "/old"}], timeout=60)

    with override_settings(FRONTEND_REVALIDATE_URL="", FRONTEND_REVALIDATE_SECRET=""):
        frontend_cache._send_revalidation(("seo:sitemap",))

    assert cache.get("seo:sitemap:entries:v1") is None


@pytest.mark.django_db
def test_service_taxonomy_changes_are_connected_to_cache_invalidation(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from apps.services import signals as service_signals
    from apps.services.models import Service
    from apps.services.tests.factories import ServiceFactory
    from apps.taxonomy.models import Category
    from apps.taxonomy.tests.factories import CategoryFactory

    invalidate = Mock()
    monkeypatch.setattr(service_signals, "invalidate_model_cache", invalidate)
    service = cast(Service, ServiceFactory(slug="cache-tagged-service"))
    invalidate.assert_called_with(service)

    category = cast(Category, CategoryFactory(slug="cache-tagged-category"))
    service.categories.add(category)
    assert invalidate.call_args_list[-1].args == (service,)


@pytest.mark.django_db
def test_user_name_changes_invalidate_cached_blog_author_labels(monkeypatch: pytest.MonkeyPatch) -> None:
    from apps.accounts import signals as account_signals
    from apps.accounts.models import User
    from apps.accounts.tests.factories import UserFactory
    from apps.blog.tests.factories import BlogPostFactory

    invalidate = Mock()
    monkeypatch.setattr(account_signals, "invalidate_model_cache", invalidate)
    user = cast(User, UserFactory())
    BlogPostFactory(author=user)
    invalidate.reset_mock()

    user.first_name = "Updated author"
    user.save(update_fields=["first_name"])
    invalidate.assert_called_once_with("blog.BlogPost")

    invalidate.reset_mock()
    user.is_active = False
    user.save(update_fields=["is_active"])
    invalidate.assert_not_called()


@pytest.mark.django_db
def test_case_study_and_lesson_changes_invalidate_parent_pages(monkeypatch: pytest.MonkeyPatch) -> None:
    from apps.academy import signals as academy_signals
    from apps.academy.models import Course
    from apps.academy.tests.factories import CourseFactory, LessonFactory
    from apps.portfolio import signals as portfolio_signals
    from apps.portfolio.models import Project
    from apps.portfolio.tests.factories import CaseStudyFactory, ProjectFactory

    project_invalidate = Mock()
    monkeypatch.setattr(portfolio_signals, "invalidate_model_cache", project_invalidate)
    project = ProjectFactory(slug="cache-tagged-project")
    project_invalidate.reset_mock()
    CaseStudyFactory(project=project)
    project_invalidate.assert_called_once_with(Project)

    course_invalidate = Mock()
    monkeypatch.setattr(academy_signals, "invalidate_model_cache", course_invalidate)
    course = CourseFactory(slug="cache-tagged-course")
    course_invalidate.reset_mock()
    LessonFactory(course=course)
    course_invalidate.assert_called_once_with(Course)
