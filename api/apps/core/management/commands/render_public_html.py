import json
import os
from pathlib import Path
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.template.loader import render_to_string
from apps.content.models import CaseStudy, JobOpening, Post


class Command(BaseCommand):
    help = "Render bilingual content detail documents for crawlers; never requires JS or a headless browser."

    def add_arguments(self, parser):
        parser.add_argument("--incremental", action="store_true")
        parser.add_argument("--force", action="store_true")

    def handle(self, *args, **opts):
        output_path = os.getenv("STATIC_BRIDGE_DIR")
        root = (
            Path(output_path).expanduser().resolve()
            if output_path
            else settings.BASE_DIR.parent / "web" / "dist"
        )
        base = os.getenv("PUBLIC_SITE_URL", "").rstrip("/")
        if not base and not settings.DEBUG:
            raise CommandError(
                "PUBLIC_SITE_URL is required in production for canonical/hreflang URLs"
            )
        for collection, route in (
            (Post, "posts"),
            (CaseStudy, "case-studies"),
            (JobOpening, "jobs"),
        ):
            for item in collection.objects.filter(status="published"):
                for locale in ("fa", "en"):
                    title = getattr(item, f"title_{locale}") or item.title_fa
                    body = getattr(item, f"body_{locale}") or item.body_fa
                    url_fa = f"{base}/fa/{route}/{item.slug}/"
                    url_en = f"{base}/en/{route}/{item.slug}/"
                    url = url_fa if locale == "fa" else url_en
                    target = root / locale / route / item.slug / "index.html"
                    if (
                        opts["incremental"]
                        and not opts["force"]
                        and target.exists()
                        and target.stat().st_mtime >= item.updated_at.timestamp()
                    ):
                        continue
                    target.parent.mkdir(parents=True, exist_ok=True)
                    context = {
                        "locale": locale,
                        "title": title,
                        "description": body[:180],
                        "body": body,
                        "canonical": url,
                        "canonical_fa": url_fa,
                        "canonical_en": url_en,
                        "alternate_url": url_en if locale == "fa" else url_fa,
                        "alternate_label": "English" if locale == "fa" else "فارسی",
                        "json_ld": json.dumps(
                            [
                                {
                                    "@context": "https://schema.org",
                                    "@type": "BlogPosting",
                                    "headline": title,
                                    "inLanguage": locale,
                                    "url": url,
                                    "mainEntityOfPage": url,
                                    "datePublished": item.created_at.isoformat(),
                                    "dateModified": item.updated_at.isoformat(),
                                    # Honest authorship: the organization, never a fabricated person (B5/B6).
                                    "author": {"@type": "Organization", "name": "Emmett"},
                                    "publisher": {"@type": "Organization", "name": "Emmett"},
                                },
                                {
                                    "@context": "https://schema.org",
                                    "@type": "BreadcrumbList",
                                    "itemListElement": [
                                        {
                                            "@type": "ListItem",
                                            "position": 1,
                                            "name": "خانه" if locale == "fa" else "Home",
                                            "item": f"{base}/{locale}/",
                                        },
                                        {
                                            "@type": "ListItem",
                                            "position": 2,
                                            "name": "نوشته‌ها" if locale == "fa" else "Posts",
                                            "item": f"{base}/{locale}/posts/",
                                        },
                                        {"@type": "ListItem", "position": 3, "name": title, "item": url},
                                    ],
                                },
                            ],
                            ensure_ascii=False,
                        ).replace("<", "\\u003c"),
                    }
                    target.write_text(
                        render_to_string("core/content.html", context), encoding="utf-8"
                    )
                    self.stdout.write(str(target))
