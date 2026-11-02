"""Import existing Next.js message strings into ``core.Translation`` rows.

This command is intentionally create-only by default: running it on a live
site must never overwrite edits made in Django Admin. Use ``--overwrite`` only
when restoring the checked-in message files as the source of truth.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.core.frontend_cache import schedule_frontend_revalidation
from apps.core.models import Translation


class Command(BaseCommand):
    help = "Import frontend message strings as editable, localized site copy."

    def add_arguments(self, parser: Any) -> None:
        default_source = Path(settings.BASE_DIR).parent / "frontend" / "messages"
        parser.add_argument(
            "--source-dir",
            type=Path,
            default=default_source,
            help="Directory containing <locale>.json frontend message files.",
        )
        parser.add_argument(
            "--locale",
            action="append",
            dest="locales",
            help="Import only this locale; may be supplied more than once. Defaults to configured LANGUAGES.",
        )
        parser.add_argument(
            "--overwrite",
            action="store_true",
            help="Overwrite existing database values with file values (destructive to admin edits).",
        )

    def handle(self, *args: Any, **options: Any) -> None:
        source_dir: Path = options["source_dir"]
        locales = options["locales"] or [code for code, _label in settings.LANGUAGES]
        configured_locales = {code for code, _label in settings.LANGUAGES}
        unknown = sorted(set(locales) - configured_locales)
        if unknown:
            raise CommandError(f"Unsupported locale(s): {', '.join(unknown)}")

        if not source_dir.is_dir():
            raise CommandError(f"Frontend message directory does not exist: {source_dir}")

        created = updated = unchanged = skipped = 0
        changed_locales: set[str] = set()
        for locale in locales:
            source = source_dir / f"{locale}.json"
            if not source.is_file():
                raise CommandError(f"Frontend message file does not exist: {source}")
            try:
                payload = json.loads(source.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError) as exc:
                raise CommandError(f"Could not read valid JSON from {source}: {exc}") from exc
            if not isinstance(payload, dict):
                raise CommandError(f"The root value in {source} must be a JSON object.")

            key_max_length = Translation._meta.get_field("key").max_length
            for key, value in self._flatten_strings(payload):
                if key_max_length is not None and len(key) > key_max_length:
                    raise CommandError(f"Message key exceeds the database limit ({len(key)}): {key}")

                entry, was_created = Translation.objects.get_or_create(
                    namespace="site.copy",
                    key=key,
                    locale=locale,
                    defaults={"value": value, "is_html": False},
                )
                if was_created:
                    created += 1
                    changed_locales.add(locale)
                elif options["overwrite"]:
                    if entry.value != value or entry.is_html:
                        entry.value = value
                        entry.is_html = False
                        entry.save(update_fields=["value", "is_html", "updated_at"])
                        updated += 1
                        changed_locales.add(locale)
                    else:
                        unchanged += 1
                else:
                    skipped += 1

        if changed_locales:
            schedule_frontend_revalidation(f"site-copy:{locale}" for locale in changed_locales)

        self.stdout.write(
            self.style.SUCCESS(
                "Frontend copy import complete: "
                f"{created} created, {updated} updated, {skipped} existing preserved, "
                f"{unchanged} unchanged."
            )
        )

    @classmethod
    def _flatten_strings(cls, value: Any, prefix: str = "") -> list[tuple[str, str]]:
        """Flatten nested message objects/arrays while preserving indexed paths."""

        if isinstance(value, str):
            return [(prefix, value)] if prefix else []
        if isinstance(value, dict):
            flattened: list[tuple[str, str]] = []
            for key, child in value.items():
                child_prefix = f"{prefix}.{key}" if prefix else str(key)
                flattened.extend(cls._flatten_strings(child, child_prefix))
            return flattened
        if isinstance(value, list):
            flattened = []
            for index, child in enumerate(value):
                child_prefix = f"{prefix}.{index}" if prefix else str(index)
                flattened.extend(cls._flatten_strings(child, child_prefix))
            return flattened
        # Numeric/non-string values are structured data, not translatable copy.
        return []
