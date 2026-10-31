from __future__ import annotations

from apps.core.utils.markdown import (
    estimate_reading_time,
    extract_toc,
    render_markdown,
    render_markdown_i18n_fields,
)


class TestRenderMarkdown:
    def test_empty_input_returns_empty_string(self) -> None:
        assert render_markdown("") == ""
        assert render_markdown("   ") == ""

    def test_renders_basic_markdown_to_html(self) -> None:
        html = render_markdown("# Title\n\nSome **bold** text.")
        assert "<h1" in html
        assert "<strong>bold</strong>" in html

    def test_sanitizes_script_tags(self) -> None:
        html = render_markdown("Hello <script>alert('xss')</script>")
        assert "<script>" not in html
        assert "alert" not in html

    def test_sanitizes_disallowed_attributes(self) -> None:
        html = render_markdown('<p onclick="alert(1)">hi</p>')
        assert "onclick" not in html

    def test_headings_get_ids_for_toc(self) -> None:
        html = render_markdown("## Section One\n\n## Section Two")
        assert 'id="section-one"' in html
        assert 'id="section-two"' in html

    def test_tables_extension_enabled(self) -> None:
        markdown_table = "| A | B |\n| - | - |\n| 1 | 2 |"
        html = render_markdown(markdown_table)
        assert "<table>" in html


class TestExtractToc:
    def test_extracts_h2_and_h3_headings(self) -> None:
        html = render_markdown("## First\n\n### Nested\n\n## Second")
        toc = extract_toc(html)

        assert len(toc) == 3
        assert toc[0] == {"level": "2", "id": "first", "text": "First"}
        assert toc[1]["level"] == "3"

    def test_empty_html_returns_empty_list(self) -> None:
        assert extract_toc("") == []


class TestEstimateReadingTime:
    def test_empty_text_returns_zero(self) -> None:
        assert estimate_reading_time("") == 0

    def test_short_text_returns_at_least_one_minute(self) -> None:
        assert estimate_reading_time("short text here") == 1

    def test_long_text_scales_with_word_count(self) -> None:
        long_text = " ".join(["word"] * 1000)
        assert estimate_reading_time(long_text, words_per_minute=200) == 5


class TestRenderMarkdownI18nFields:
    def test_sets_html_for_both_locales_independently(self) -> None:
        class Dummy:
            description_fa = "# سلام"
            description_en = "# Hello"

        instance = Dummy()
        render_markdown_i18n_fields(instance, ["description"])

        assert "<h1" in instance.description_html_fa  # type: ignore[attr-defined]
        assert "سلام" in instance.description_html_fa  # type: ignore[attr-defined]
        assert "Hello" in instance.description_html_en  # type: ignore[attr-defined]

    def test_missing_attribute_treated_as_empty(self) -> None:
        class Dummy:
            pass

        instance = Dummy()
        render_markdown_i18n_fields(instance, ["missing"])

        assert instance.missing_html_fa == ""  # type: ignore[attr-defined]
        assert instance.missing_html_en == ""  # type: ignore[attr-defined]
