#!/usr/bin/env python3
"""ابزار i18n پروژه (ADR-0030) — استخراج، ادغام، ترجمه‌یابی و کامپایل پیام‌ها.

چرا ابزار اختصاصی و نه ``manage.py makemessages``؟ روی هاست اشتراکی cPanel و در
محیط‌های توسعهٔ محدود، باینری‌های ``gettext`` (``xgettext``/``msgfmt``) همیشه
در دسترس نیستند. این اسکریپت:

- **استخراج** را با ``ast`` انجام می‌دهد (نه regex): هر فراخوانی به
  ``_()``/``gettext()``/``gettext_lazy()``/``ngettext()`` با آرگومان رشتهٔ
  ثابت شناسایی می‌شود؛ رشته‌های f-string یا متغیر به‌عنوان خطای استخراج
  گزارش می‌شوند (قانون ۹: متن UI نباید پویا باشد).
- **قالب‌ها** را هم اسکن می‌کند: ``{% trans %}`` و ``{% blocktrans %}``
  (شامل ``{% plural %}``) از ``backend/templates/**/*.html`` خوانده و
  ``{{ variable }}``ها به ``%(variable)s`` تبدیل می‌شوند — همان قراردادی که
  ``makemessages`` جنگو استفاده می‌کند، تا فایل ``.po`` با ابزار رسمی هم
  سازگار بماند.
- **ادغام** را با ``polib`` روی ``locale/<locale>/LC_MESSAGES/django.po``
  انجام می‌دهد: ترجمه‌های موجود حفظ، موارد جدید اضافه و موارد یتیم با
  ``#~`` (obsolete) علامت‌گذاری می‌شوند — یعنی فایل ``.po`` استاندارد و
  سازگار با ``gettext`` واقعی می‌ماند.
- **کامپایل** ``.po`` → ``.mo`` را با ``polib`` انجام می‌دهد (خروجی commit
  می‌شود، چون ``.mo`` در زمان اجرا لازم است و هاست cPanel معمولاً msgfmt ندارد).

دستورها:

    python scripts/i18n.py extract   # به‌روزرسانی .po از کد
    python scripts/i18n.py compile   # ساخت .mo از .po
    python scripts/i18n.py check     # گزارش نقص/یتیم/ترجمه‌نشده (exit code)
    python scripts/i18n.py stats     # آمار پوشش ترجمه

اجرا از ریشهٔ ``backend/`` (یا با ``--root``). هیچ وابستگی زمان‌اجرای جدیدی
اضافه نمی‌کند؛ ``polib`` فقط در ``requirements-dev.txt`` است.
"""

from __future__ import annotations

import argparse
import ast
import re
import sys
from collections.abc import Iterable, Iterator, Sequence
from dataclasses import dataclass, field
from pathlib import Path
from typing import Final

import polib

BACKEND_ROOT: Final[Path] = Path(__file__).resolve().parent.parent
SOURCE_DIRS: Final[tuple[str, ...]] = ("apps", "config", "scripts")
TEMPLATE_DIR: Final[str] = "templates"
PERSIAN_RANGE: Final[tuple[str, str]] = ("\u0600", "\u06ff")
TRANSLATED_FUNCTIONS: Final[frozenset[str]] = frozenset(
    {"_", "gettext", "gettext_lazy", "ugettext", "ugettext_lazy", "pgettext", "gettext_noop"}
)
PLURAL_FUNCTIONS: Final[frozenset[str]] = frozenset({"ngettext", "ungettext"})
HEADERS: Final[dict[str, str]] = {
    "Project-Id-Version": "Emmett Website",
    "Report-Msgid-Bugs-To": "",
    "MIME-Version": "1.0",
    "Content-Type": "text/plain; charset=UTF-8",
    "Content-Transfer-Encoding": "8bit",
}
LOCALE_LANGUAGE: Final[dict[str, str]] = {"fa": "Persian", "en": "English"}
LOCALE_PLURAL_FORMS: Final[dict[str, str]] = {
    "fa": "nplurals=2; plural=(n > 1);",
    "en": "nplurals=2; plural=(n != 1);",
}


def _has_persian(text: str) -> bool:
    """آیا رشته حرف فارسی/عربی دارد؟"""

    return any(PERSIAN_RANGE[0] <= character <= PERSIAN_RANGE[1] for character in text)


class ExtractionError(RuntimeError):
    """متن قابل‌ترجمهٔ پویا (f-string/متغیر) که طبق قانون ۹ مجاز نیست."""


@dataclass(frozen=True)
class Message:
    """یک رشتهٔ قابل‌ترجمهٔ یافت‌شده در کد."""

    msgid: str
    plural_msgid: str | None = None
    locations: tuple[tuple[str, int], ...] = ()


@dataclass
class ExtractionResult:
    messages: dict[str, Message] = field(default_factory=dict)

    def add(self, message: Message) -> None:
        existing = self.messages.get(message.msgid)
        if existing is None:
            self.messages[message.msgid] = message
            return
        locations = tuple(sorted({*existing.locations, *message.locations}))
        self.messages[message.msgid] = Message(
            msgid=message.msgid,
            plural_msgid=existing.plural_msgid or message.plural_msgid,
            locations=locations,
        )


def _literal_string(node: ast.AST, *, source: str, line: int) -> str:
    if isinstance(node, ast.Constant) and isinstance(node.value, str):
        return node.value
    raise ExtractionError(
        f"{source}:{line}: msgid باید رشتهٔ ثابت باشد (f-string/متغیر مجاز نیست — قانون ۹)."
    )


def _extract_from_call(node: ast.Call, *, source: str, result: ExtractionResult) -> None:
    name: str | None = None
    if isinstance(node.func, ast.Name):
        name = node.func.id
    elif isinstance(node.func, ast.Attribute):
        name = node.func.attr

    if name in PLURAL_FUNCTIONS:
        if len(node.args) < 2:
            return
        singular = _literal_string(node.args[0], source=source, line=node.lineno)
        plural = _literal_string(node.args[1], source=source, line=node.lineno)
        result.add(
            Message(msgid=singular, plural_msgid=plural, locations=((source, node.lineno),))
        )
        return

    if name in TRANSLATED_FUNCTIONS:
        if not node.args:
            return
        msgid = _literal_string(node.args[0], source=source, line=node.lineno)
        result.add(Message(msgid=msgid, locations=((source, node.lineno),)))


def extract_from_python(path: Path, *, root: Path) -> ExtractionResult:
    """استخراج پیام‌ها از یک فایل پایتون با پیمایش AST."""

    result = ExtractionResult()
    source = path.relative_to(root).as_posix()
    tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
    for node in ast.walk(tree):
        if isinstance(node, ast.Call):
            _extract_from_call(node, source=source, result=result)
    return result


_TEMPLATE_TRANS_RE: Final[re.Pattern[str]] = re.compile(
    r"""\{%\s*trans\s+(?P<quote>["'])(?P<msgid>.*?)(?<!\\)(?P=quote)[^%]*?%\}""",
    re.DOTALL,
)
_TEMPLATE_BLOCK_RE: Final[re.Pattern[str]] = re.compile(
    r"""\{%\s*blocktrans\b(?P<options>.*?)%\}(?P<body>.*?)\{%\s*endblocktrans\s*%\}""",
    re.DOTALL,
)
_TEMPLATE_VAR_RE: Final[re.Pattern[str]] = re.compile(r"\{\{\s*(?P<expr>[^{}]+?)\s*\}\}")
_TEMPLATE_COMMENT_RE: Final[re.Pattern[str]] = re.compile(
    r"\{%\s*comment\s*%\}.*?\{%\s*endcomment\s*%\}|\{#.*?#\}", re.DOTALL
)
_TEMPLATE_PLURAL_RE: Final[re.Pattern[str]] = re.compile(r"\{%\s*plural\s*%\}")


def _normalize_whitespace(text: str) -> str:
    """فشرده‌سازی فاصله‌ها/خطوط جدید متن قالب (رفتار ``makemessages``)."""

    return " ".join(text.split())


def _blocktrans_msgid(body: str, *, source: str, line: int) -> str:
    """تبدیل بدنهٔ ``blocktrans`` به msgid با placeholderهای ``%(name)s``."""

    def replace(match: re.Match[str]) -> str:
        expression = match.group("expr").split("|", 1)[0].strip()
        name = expression.split(".")[-1] if expression else "value"
        return f"%({name})s"

    return _normalize_whitespace(_TEMPLATE_VAR_RE.sub(replace, body))


def extract_from_template(path: Path, *, root: Path) -> ExtractionResult:
    """استخراج پیام‌ها از یک قالب HTML (``trans`` و ``blocktrans``)."""

    result = ExtractionResult()
    source = path.relative_to(root).as_posix()
    raw = path.read_text(encoding="utf-8")
    content = _TEMPLATE_COMMENT_RE.sub(" ", raw)

    for match in _TEMPLATE_TRANS_RE.finditer(content):
        msgid = match.group("msgid").strip()
        if not msgid:
            continue
        line = content[: match.start()].count("\n") + 1
        result.add(Message(msgid=msgid, locations=((source, line),)))

    for match in _TEMPLATE_BLOCK_RE.finditer(content):
        line = content[: match.start()].count("\n") + 1
        body = match.group("body")
        parts = _TEMPLATE_PLURAL_RE.split(body)
        singular = _blocktrans_msgid(parts[0], source=source, line=line)
        plural = _blocktrans_msgid(parts[1], source=source, line=line) if len(parts) > 1 else None
        if singular:
            result.add(Message(msgid=singular, plural_msgid=plural, locations=((source, line),)))

    return result


def iter_template_files(root: Path) -> Iterator[Path]:
    base = root / TEMPLATE_DIR
    if not base.exists():
        return
    yield from sorted(base.rglob("*.html"))


def iter_source_files(root: Path) -> Iterator[Path]:
    for directory in SOURCE_DIRS:
        base = root / directory
        if not base.exists():
            continue
        for path in sorted(base.rglob("*.py")):
            if "migrations" in path.parts:
                # migrationها کد تولیدشده‌اند و رشتهٔ UI ندارند.
                continue
            yield path


def collect_messages(root: Path) -> ExtractionResult:
    """استخراج همهٔ پیام‌ها از کد پایتون پروژه."""

    combined = ExtractionResult()
    for path in iter_source_files(root):
        for message in extract_from_python(path, root=root).messages.values():
            combined.add(message)
    for template in iter_template_files(root):
        for message in extract_from_template(template, root=root).messages.values():
            combined.add(message)
    return combined


def po_path(root: Path, locale: str) -> Path:
    return root / "locale" / locale / "LC_MESSAGES" / "django.po"


def mo_path(root: Path, locale: str) -> Path:
    return po_path(root, locale).with_suffix(".mo")


def load_or_create_po(path: Path, *, locale: str) -> polib.POFile:
    if path.exists():
        return polib.pofile(str(path))

    path.parent.mkdir(parents=True, exist_ok=True)
    pofile = polib.POFile()
    metadata = dict(HEADERS)
    metadata["Language"] = locale
    metadata["Language-Team"] = f"Emmett {LOCALE_LANGUAGE.get(locale, locale)}"
    metadata["Plural-Forms"] = LOCALE_PLURAL_FORMS.get(locale, "nplurals=2; plural=(n != 1);")
    for key, value in metadata.items():
        pofile.metadata[key] = value
    return pofile


def sync_po(pofile: polib.POFile, messages: dict[str, Message]) -> dict[str, int]:
    """ادغام پیام‌های استخراج‌شده در فایل .po (حفظ ترجمه‌های موجود)."""

    existing = {entry.msgid: entry for entry in pofile if entry.msgid}
    added = 0
    for msgid, message in messages.items():
        entry = existing.get(msgid)
        occurrences = [(path, lineno) for path, lineno in message.locations]
        if entry is None:
            entry = polib.POEntry(msgid=msgid, msgstr="", occurrences=occurrences)
            if message.plural_msgid:
                entry.msgid_plural = message.plural_msgid
                entry.msgstr_plural = {"0": "", "1": ""}
            pofile.append(entry)
            added += 1
        else:
            entry.occurrences = occurrences
            if message.plural_msgid and not entry.msgid_plural:
                entry.msgid_plural = message.plural_msgid
                entry.msgstr_plural = {"0": "", "1": ""}

    removed = 0
    for entry in list(pofile):
        if entry.msgid and entry.msgid not in messages and entry not in pofile.obsolete_entries():
            entry.obsolete = True
            pofile.obsolete_entries().append(entry)
            pofile.remove(entry)
            removed += 1

    return {"added": added, "obsolete": removed, "total": len([e for e in pofile if e.msgid])}


def compile_po(pofile: polib.POFile, destination: Path) -> int:
    destination.parent.mkdir(parents=True, exist_ok=True)
    pofile.save_as_mofile(str(destination))
    return len([entry for entry in pofile if entry.msgid and (entry.msgstr or entry.msgstr_plural)])


def command_extract(root: Path, locales: Sequence[str]) -> int:
    messages = collect_messages(root).messages
    print(f"استخراج: {len(messages)} پیام یکتا از کد.")
    status = 0
    for locale in locales:
        path = po_path(root, locale)
        pofile = load_or_create_po(path, locale=locale)
        stats = sync_po(pofile, messages)
        pofile.save(str(path))
        untranslated = len([entry for entry in pofile if entry.msgid and not entry.translated()])
        print(
            f"  [{locale}] {path.relative_to(root)} → افزوده {stats['added']}، "
            f"منسوخ {stats['obsolete']}، کل {stats['total']}، ترجمه‌نشده {untranslated}"
        )
    return status


def command_compile(root: Path, locales: Sequence[str]) -> int:
    for locale in locales:
        path = po_path(root, locale)
        if not path.exists():
            print(f"  [{locale}] فایل .po وجود ندارد: {path}", file=sys.stderr)
            return 1
        pofile = polib.pofile(str(path))
        translated = compile_po(pofile, mo_path(root, locale))
        print(f"  [{locale}] {mo_path(root, locale).relative_to(root)} ← {translated} ترجمه")
    return 0


def command_check(root: Path, locales: Sequence[str]) -> int:
    messages = collect_messages(root).messages
    problems: list[str] = []
    for locale in locales:
        path = po_path(root, locale)
        if not path.exists():
            problems.append(f"[{locale}] فایل ترجمه وجود ندارد: {path.relative_to(root)}")
            continue
        pofile = polib.pofile(str(path))
        entries = {entry.msgid: entry for entry in pofile if entry.msgid}

        missing = sorted(set(messages) - set(entries))
        if missing:
            problems.append(f"[{locale}] {len(missing)} پیام ترجمه‌نشده در .po:")
            problems.extend(f"    - {msgid}" for msgid in missing[:20])

        obsolete = sorted(entry.msgid for entry in pofile.obsolete_entries() if entry.msgid)
        if obsolete:
            problems.append(f"[{locale}] {len(obsolete)} مدخل منسوخ (#~) که باید حذف شود:")
            problems.extend(f"    ~ {msgid}" for msgid in obsolete[:20])

        if locale == "fa":
            untranslated = sorted(
                entry.msgid for entry in entries.values() if not entry.translated()
            )
            if untranslated:
                problems.append(f"[{locale}] {len(untranslated)} پیام بدون ترجمهٔ فارسی:")
                problems.extend(f"    ? {msgid}" for msgid in untranslated[:20])
        else:
            # پیام‌هایی که خودشان فارسی نوشته شده‌اند (مثل متن‌های حقوقی/برند) در
            # حالت انگلیسی هم باید ترجمه داشته باشند، وگرنه کاربر EN متن فارسی
            # می‌بیند.
            persian = sorted(
                entry.msgid
                for entry in entries.values()
                if _has_persian(entry.msgid) and not entry.translated()
            )
            if persian:
                problems.append(f"[{locale}] {len(persian)} پیام فارسی بدون معادل انگلیسی:")
                problems.extend(f"    ? {msgid}" for msgid in persian[:20])

    if problems:
        print("بررسی i18n ناموفق:\n" + "\n".join(problems), file=sys.stderr)
        return 1
    print("بررسی i18n موفق: همهٔ پیام‌های کد در .po هستند و فارسی کامل ترجمه شده است.")
    return 0


def command_stats(root: Path, locales: Sequence[str]) -> int:
    total_messages = len(collect_messages(root).messages)
    print(f"پیام‌های کد: {total_messages}")
    for locale in locales:
        path = po_path(root, locale)
        if not path.exists():
            print(f"  [{locale}] .po ندارد")
            continue
        pofile = polib.pofile(str(path))
        entries = [entry for entry in pofile if entry.msgid]
        translated = [entry for entry in entries if entry.translated()]
        ratio = (len(translated) / len(entries) * 100) if entries else 0.0
        print(f"  [{locale}] {len(translated)}/{len(entries)} = {ratio:.1f}%")
    return 0


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="ابزار i18n پروژهٔ امیت (ADR-0030)")
    parser.add_argument("command", choices=("extract", "compile", "check", "stats"))
    parser.add_argument("--root", type=Path, default=BACKEND_ROOT, help="ریشهٔ backend/")
    parser.add_argument("--locale", action="append", default=None, help="زبان هدف (پیش‌فرض: fa و en)")
    args = parser.parse_args(list(argv) if argv is not None else None)

    root: Path = args.root.resolve()
    locales: Sequence[str] = args.locale or ["fa", "en"]

    try:
        if args.command == "extract":
            return command_extract(root, locales)
        if args.command == "compile":
            return command_compile(root, locales)
        if args.command == "check":
            return command_check(root, locales)
        return command_stats(root, locales)
    except ExtractionError as error:
        print(f"خطای استخراج: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
