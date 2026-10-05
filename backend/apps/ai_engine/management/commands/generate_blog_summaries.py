from __future__ import annotations

import hashlib
from typing import Any

from django.contrib.contenttypes.models import ContentType
from django.core.management.base import BaseCommand, CommandError

from apps.ai_engine.models import AIContentArtifact
from apps.ai_engine.pipelines.blog_summary import _source_text, generate_blog_summary
from apps.ai_engine.pipelines.errors import AIRequestError
from apps.blog.models import BlogPost


class Command(BaseCommand):
    help = "Generate draft AI summaries for published blog posts; an admin must approve before display."

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument("--post-public-id", type=str)
        parser.add_argument("--locale", choices=("fa", "en"))
        parser.add_argument("--limit", type=int, default=20)
        parser.add_argument("--force", action="store_true")

    def handle(self, *args: Any, **options: Any) -> None:
        limit = int(options["limit"])
        if not 1 <= limit <= 100:
            raise CommandError("--limit must be between 1 and 100")
        posts = BlogPost.objects.filter(
            status=BlogPost.Status.PUBLISHED,
            is_active=True,
            deleted_at__isnull=True,
        ).order_by("-published_at")
        public_id = options.get("post_public_id")
        if public_id:
            posts = posts.filter(public_id=public_id)
        posts = posts[:limit]
        locales = (str(options["locale"]),) if options.get("locale") else ("fa", "en")
        force = bool(options["force"])
        generated = 0
        skipped = 0
        failed = 0

        for post in posts:
            content_type = ContentType.objects.get_for_model(post, for_concrete_model=False)
            for locale in locales:
                source = _source_text(post, locale)
                if not source:
                    skipped += 1
                    continue
                source_hash = hashlib.sha256(source.encode("utf-8")).hexdigest()
                current = AIContentArtifact.objects.filter(
                    content_type=content_type,
                    object_id=post.pk,
                    locale=locale,
                    source_hash=source_hash,
                    is_stale=False,
                )
                if current.exists() and not force:
                    skipped += 1
                    continue
                try:
                    artifact = generate_blog_summary(post=post, locale=locale)
                except AIRequestError as exc:
                    failed += 1
                    self.stderr.write(f"{post.public_id} [{locale}]: {exc.code}")
                    continue
                generated += 1
                self.stdout.write(f"Draft {artifact.pk} created for {post.public_id} [{locale}].")

        self.stdout.write(
            self.style.SUCCESS(
                f"Summary run finished: {generated} drafts, {skipped} skipped, {failed} failed."
            )
        )
