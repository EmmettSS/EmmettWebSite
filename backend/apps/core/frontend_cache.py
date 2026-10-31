"""Cache-tag contract between Django's CMS and the public Next.js app."""

from __future__ import annotations

import json
from collections.abc import Iterable
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import HTTPRedirectHandler, Request, build_opener

from django.conf import settings
from django.core.cache import cache
from django.db import transaction
from structlog import get_logger

logger = get_logger(__name__)


class _RejectRedirects(HTTPRedirectHandler):
    """Never forward a server-to-server revalidation request or its secret."""

    def redirect_request(self, *args: Any, **kwargs: Any) -> None:
        return None


ALLOWED_FRONTEND_CACHE_TAGS = frozenset(
    {
        "content:services",
        "content:projects",
        "content:blog",
        "content:academy",
        "content:company",
        "search:site",
        "seo:settings",
        "seo:sitemap",
        "seo:redirects",
        "seo:faq:fa",
        "seo:faq:en",
        "site-copy:fa",
        "site-copy:en",
        "feed:blog",
        "feed:academy",
    }
)

CONTENT_TAGS: dict[str, tuple[str, ...]] = {
    "services.service": ("content:services", "content:projects", "search:site", "seo:sitemap"),
    "portfolio.project": ("content:projects", "content:company", "search:site", "seo:sitemap"),
    "portfolio.casestudy": ("content:projects", "seo:sitemap"),
    "blog.blogpost": ("content:blog", "search:site", "seo:sitemap", "feed:blog"),
    "blog.comment": ("content:blog",),
    "academy.course": ("content:academy", "search:site", "seo:sitemap", "feed:academy"),
    "academy.lesson": ("content:academy",),
    "academy.instructor": ("content:academy",),
    "accounts.user": ("content:blog",),
    "company.teammember": ("content:company",),
    "company.testimonial": ("content:company",),
    "core.faqitem": ("seo:sitemap", "seo:faq:fa", "seo:faq:en"),
    "core.redirect": ("seo:sitemap", "seo:redirects"),
    "core.sitesettings": ("seo:sitemap", "seo:settings"),
    "core.media": (
        "content:services",
        "content:projects",
        "content:blog",
        "content:academy",
        "content:company",
        "seo:sitemap",
    ),
    "taxonomy.category": (
        "content:services",
        "content:projects",
        "content:blog",
        "content:academy",
        "search:site",
        "seo:sitemap",
        "feed:blog",
        "feed:academy",
    ),
    "taxonomy.tag": (
        "content:services",
        "content:projects",
        "content:blog",
        "content:academy",
        "search:site",
        "seo:sitemap",
        "feed:blog",
        "feed:academy",
    ),
}


def tags_for_model(model_or_label: Any) -> tuple[str, ...]:
    """Return the cache tags affected by a persisted CMS model."""

    label = model_or_label if isinstance(model_or_label, str) else model_or_label._meta.label_lower
    return CONTENT_TAGS.get(str(label).lower(), ())


def _expire_django_caches(tags: tuple[str, ...]) -> None:
    if "seo:sitemap" in tags:
        cache.delete("seo:sitemap:entries:v1")
    if "seo:redirects" in tags:
        cache.delete("seo:redirects:map:v1")


def _send_revalidation(tags: tuple[str, ...]) -> bool:
    _expire_django_caches(tags)

    url = str(getattr(settings, "FRONTEND_REVALIDATE_URL", "")).strip()
    secret = str(getattr(settings, "FRONTEND_REVALIDATE_SECRET", "")).strip()
    if not url and not secret:
        # Local development can rely on Next's bounded 60-second data cache TTL.
        return False
    if not url or not secret:
        logger.error(
            "frontend_revalidation_misconfigured", url_configured=bool(url), secret_configured=bool(secret)
        )
        return False

    try:
        parsed_url = urlparse(url)
        if (
            parsed_url.scheme not in {"http", "https"}
            or not parsed_url.hostname
            or parsed_url.username is not None
            or parsed_url.password is not None
            or parsed_url.fragment
        ):
            logger.error("frontend_revalidation_invalid_url")
            return False

        payload = json.dumps({"tags": tags}, separators=(",", ":")).encode("utf-8")
        request = Request(
            url,
            data=payload,
            headers={
                "Authorization": f"Bearer {secret}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            method="POST",
        )
        timeout = max(1, int(getattr(settings, "FRONTEND_REVALIDATE_TIMEOUT_SECONDS", 2)))
    except (TypeError, ValueError):
        logger.exception("frontend_revalidation_invalid_configuration")
        return False
    try:
        opener = build_opener(_RejectRedirects)
        with opener.open(request, timeout=timeout) as response:
            if response.status != 200:
                logger.warning("frontend_revalidation_rejected", status=response.status)
                return False
            result = json.loads(response.read().decode("utf-8"))
            revalidated = result.get("revalidated") if isinstance(result, dict) else None
            if not isinstance(revalidated, list) or not set(tags).issubset(revalidated):
                logger.warning("frontend_revalidation_incomplete_response")
                return False
            return True
    except (HTTPError, URLError, TimeoutError, OSError, ValueError):
        # Content saving must succeed even if the optional Next.js process is down;
        # the frontend's 60-second TTL remains the recovery path.
        logger.exception("frontend_revalidation_request_failed")
        return False


def schedule_frontend_revalidation(tags: Iterable[str]) -> None:
    """Expire the relevant caches after the enclosing database transaction commits."""

    requested_tags = {str(tag) for tag in tags if tag}
    invalid_tags = requested_tags - ALLOWED_FRONTEND_CACHE_TAGS
    if invalid_tags:
        logger.error("frontend_revalidation_unknown_tags", tags=sorted(invalid_tags))
    normalized_tags = tuple(sorted(requested_tags & ALLOWED_FRONTEND_CACHE_TAGS))
    if not normalized_tags:
        return
    transaction.on_commit(lambda: _send_revalidation(normalized_tags), robust=True)


def invalidate_model_cache(model_or_label: Any) -> None:
    """Schedule cache invalidation for one mapped CMS model."""

    schedule_frontend_revalidation(tags_for_model(model_or_label))


def invalidate_translation_cache(locale: str) -> None:
    """Schedule the public copy-cache invalidation for one supported locale."""

    if locale in {"fa", "en"}:
        schedule_frontend_revalidation((f"site-copy:{locale}",))
