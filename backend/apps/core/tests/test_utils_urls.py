from __future__ import annotations

from apps.core.utils.urls import localized_path


class TestLocalizedPath:
    def test_fa_has_no_prefix(self) -> None:
        assert localized_path("fa", "/projects/x") == "/projects/x"

    def test_en_gets_prefixed(self) -> None:
        assert localized_path("en", "/projects/x") == "/en/projects/x"

    def test_adds_leading_slash_if_missing(self) -> None:
        assert localized_path("fa", "projects/x") == "/projects/x"
        assert localized_path("en", "projects/x") == "/en/projects/x"
