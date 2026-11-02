from __future__ import annotations

import json
from io import StringIO
from pathlib import Path

import pytest
from django.core.management import call_command
from django.urls import reverse
from rest_framework.test import APIClient

from apps.core.models import Translation


@pytest.mark.django_db
class TestFrontendCopyTranslationsAPI:
    def test_returns_only_plain_public_copy_for_requested_locale(self) -> None:
        Translation.objects.create(namespace="site.copy", key="ui.hero.title", locale="fa", value="عنوان")
        Translation.objects.create(namespace="site.copy", key="ui.hero.title", locale="en", value="Title")
        Translation.objects.create(namespace="internal", key="secret", locale="fa", value="private")
        Translation.objects.create(
            namespace="site.copy", key="ui.hero.raw", locale="fa", value="<script>bad</script>", is_html=True
        )
        Translation.objects.create(namespace="site.copy", key="ui.hero.empty", locale="fa", value="")

        response = APIClient().get(reverse("frontend-copy-translations"), {"locale": "fa"})

        assert response.status_code == 200
        assert response.json() == {"locale": "fa", "messages": {"ui.hero.title": "عنوان"}}

    @pytest.mark.parametrize("locale", ["", "fr", "FA"])
    def test_rejects_missing_or_unsupported_locale(self, locale: str) -> None:
        response = APIClient().get(reverse("frontend-copy-translations"), {"locale": locale})

        assert response.status_code == 400
        assert "messages" not in response.json()


@pytest.mark.django_db
def test_import_frontend_copy_is_non_destructive_by_default(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    (tmp_path / "fa.json").write_text(
        json.dumps(
            {
                "ui": {
                    "hero": {"title": "عنوان اولیه", "stats": [{"label": "وضعیت"}]},
                    "unusedNumericData": 42,
                }
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    Translation.objects.create(namespace="site.copy", key="ui.hero.title", locale="fa", value="ویرایش مدیر")
    output = StringIO()
    scheduled_tags: list[tuple[str, ...]] = []
    monkeypatch.setattr(
        "apps.core.management.commands.import_frontend_copy.schedule_frontend_revalidation",
        lambda tags: scheduled_tags.append(tuple(tags)),
    )

    call_command(
        "import_frontend_copy",
        source_dir=tmp_path,
        locales=["fa"],
        stdout=output,
    )

    title = Translation.objects.get(namespace="site.copy", key="ui.hero.title", locale="fa")
    stat_label = Translation.objects.get(namespace="site.copy", key="ui.hero.stats.0.label", locale="fa")
    numeric_entry_exists = Translation.objects.filter(
        namespace="site.copy", key="ui.unusedNumericData", locale="fa"
    ).exists()

    assert title.value == "ویرایش مدیر"
    assert stat_label.value == "وضعیت"
    assert not numeric_entry_exists
    assert "1 created" in output.getvalue()
    assert "1 existing preserved" in output.getvalue()
    assert scheduled_tags == [("site-copy:fa",)]


def test_translation_path_limit_is_checked_against_model_field() -> None:
    from apps.core.management.commands.import_frontend_copy import Command

    flattened = Command._flatten_strings({"section": [{"heading": "Heading"}]})

    assert flattened == [("section.0.heading", "Heading")]
