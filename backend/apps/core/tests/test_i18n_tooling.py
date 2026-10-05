"""تست‌های ابزار i18n پروژه — فاز ۶ (ADR-0030).

ابزار ``scripts/i18n.py`` جای ``makemessages``/``compilemessages`` جنگو را
می‌گیرد (باینری‌های gettext روی هاست هدف و در sandbox در دسترس نیستند). این
تست‌ها همان قرارداد را قفل می‌کنند:

- استخراج از پایتون با ``ast`` (f-string = خطای صریح، نه نادیده‌گرفتن).
- استخراج از قالب‌های Django (``trans``/``blocktrans`` با placeholder).
- پوشش کامل: هیچ msgid کدی بدون مدخل در ``.po`` نماند و همهٔ ردیف‌های فارسی
  ترجمه داشته باشند، و پیام‌های فارسی‌نویس معادل انگلیسی داشته باشند.
- کامپایل ``.mo`` و اثبات عملی ترجمه در زمان اجرا.
"""

from __future__ import annotations

from pathlib import Path

import polib
import pytest
from django.utils import translation
from django.utils.translation import gettext

from apps.core.utils.numerals import format_number
from scripts import i18n

BACKEND_ROOT = Path(__file__).resolve().parents[3]


class TestPythonExtraction:
    def test_extracts_gettext_calls(self, tmp_path: Path) -> None:
        source = tmp_path / "sample.py"
        source.write_text(
            "from django.utils.translation import gettext_lazy as _\n"
            'TITLE = _("Dashboard")\n'
            'OTHER = gettext("Settings")\n',
            encoding="utf-8",
        )

        result = i18n.extract_from_python(source, root=tmp_path)

        assert set(result.messages) == {"Dashboard", "Settings"}

    def test_dynamic_msgid_is_an_error(self, tmp_path: Path) -> None:
        """f-string به‌عنوان متن قابل‌ترجمه، طبق قانون ۹ ممنوع است."""

        source = tmp_path / "bad.py"
        source.write_text('_ = gettext\n_("Hello " + name)\n', encoding="utf-8")

        with pytest.raises(i18n.ExtractionError):
            i18n.extract_from_python(source, root=tmp_path)

    def test_ngettext_collects_plural(self, tmp_path: Path) -> None:
        source = tmp_path / "plural.py"
        source.write_text('ngettext("%d item", "%d items", 2)\n', encoding="utf-8")

        result = i18n.extract_from_python(source, root=tmp_path)

        assert result.messages["%d item"].plural_msgid == "%d items"


class TestTemplateExtraction:
    def test_trans_tag(self, tmp_path: Path) -> None:
        template = tmp_path / "page.html"
        template.write_text('{% load i18n %}<h1>{% trans "Dashboard" %}</h1>', encoding="utf-8")

        assert set(i18n.extract_from_template(template, root=tmp_path).messages) == {"Dashboard"}

    def test_blocktrans_becomes_percent_placeholder(self, tmp_path: Path) -> None:
        template = tmp_path / "welcome.html"
        template.write_text(
            "{% blocktrans with name=user.email %}Welcome, {{ name }}{% endblocktrans %}",
            encoding="utf-8",
        )

        assert set(i18n.extract_from_template(template, root=tmp_path).messages) == {"Welcome, %(name)s"}

    def test_blocktrans_plural(self, tmp_path: Path) -> None:
        template = tmp_path / "plural.html"
        template.write_text(
            "{% blocktrans count total=items|length %}{{ total }} item"
            "{% plural %}{{ total }} items{% endblocktrans %}",
            encoding="utf-8",
        )

        message = i18n.extract_from_template(template, root=tmp_path).messages["%(total)s item"]
        assert message.plural_msgid == "%(total)s items"

    def test_commented_out_strings_are_ignored(self, tmp_path: Path) -> None:
        template = tmp_path / "commented.html"
        template.write_text(
            '{% comment %}{% trans "Hidden" %}{% endcomment %}{# {% trans "Also hidden" %} #}',
            encoding="utf-8",
        )

        assert i18n.extract_from_template(template, root=tmp_path).messages == {}


class TestRealProjectCoverage:
    """وضعیت واقعی مخزن: باید کامل و سبز باشد."""

    def test_every_source_message_has_a_po_entry(self) -> None:
        messages = i18n.collect_messages(BACKEND_ROOT).messages
        assert len(messages) > 300  # کل پنل (مدل‌ها + ادمین + قالب‌ها) پوشش دارد

        for locale in ("fa", "en"):
            pofile = polib.pofile(str(i18n.po_path(BACKEND_ROOT, locale)))
            entries = {entry.msgid for entry in pofile if entry.msgid}
            assert set(messages) - entries == set(), locale

    def test_fa_translation_is_complete(self) -> None:
        pofile = polib.pofile(str(i18n.po_path(BACKEND_ROOT, "fa")))
        untranslated = sorted(entry.msgid for entry in pofile if entry.msgid and not entry.translated())

        assert untranslated == []

    def test_persian_authored_messages_have_english_translations(self) -> None:
        """msgid‌های فارسی (متن‌های خودمان) باید معادل انگلیسی داشته باشند."""

        pofile = polib.pofile(str(i18n.po_path(BACKEND_ROOT, "en")))
        missing = sorted(
            entry.msgid
            for entry in pofile
            if entry.msgid and i18n._has_persian(entry.msgid) and not entry.translated()
        )

        assert missing == []

    def test_command_check_passes(self, capsys: pytest.CaptureFixture[str]) -> None:
        assert i18n.command_check(BACKEND_ROOT, ["fa", "en"]) == 0
        assert "موفق" in capsys.readouterr().out

    def test_compiled_mo_files_exist_and_are_fresh(self) -> None:
        for locale in ("fa", "en"):
            po = i18n.po_path(BACKEND_ROOT, locale)
            mo = i18n.mo_path(BACKEND_ROOT, locale)
            assert mo.exists(), f"{locale}/django.mo در مخزن نیست (ادمین انگلیسی می‌ماند)"
            assert mo.stat().st_mtime >= po.stat().st_mtime - 1, "mo قدیمی‌تر از po است: دوباره compile کنید"


class TestRuntimeTranslation:
    """اثبات عملی: ترجمه در زمان اجرا (بعد از کامپایل) کار می‌کند."""

    def test_persian_admin_strings_are_translated(self) -> None:
        with translation.override("fa"):
            assert gettext("Dashboard") == "داشبورد"
            assert gettext("Publish selected content") == "انتشار محتوای انتخاب‌شده"
            assert gettext("Export") == "خروجی"  # از کاتالوگ خود جنگو، فقط تایید فعال بودن fa

    def test_english_locale_returns_source_strings(self) -> None:
        with translation.override("en"):
            assert gettext("Dashboard") == "Dashboard"
            assert gettext("Publish selected content") == "Publish selected content"

    def test_numbers_follow_locale(self) -> None:
        # قرارداد پروژه (ADR-0004): جداکنندهٔ هزارگان یکسان، فقط ارقام متفاوت.
        assert format_number(1234, "fa") == "۱,۲۳۴"
        assert format_number(1234, "en") == "1,234"
