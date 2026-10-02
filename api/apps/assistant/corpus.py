"""Builds the RAG corpus from *verifiable* Emmett content only (no invented claims).

Sources, in order of authority:
1. ``data/site_corpus.json`` — exported by ``web/scripts/export-corpus.ts`` from the very same
   files that render the public site (page copy, tool copy, FAQ). This is what makes a citation
   land on a real page.
2. ``docs/*.md`` and ``docs/ADRS/*.md`` — the engineering documentation that ships with the repo.
   These are not public pages yet, so their citations carry the file path and no link (recorded
   in OPEN-ITEMS until the Field Library publishes them).
3. ``apps.tools.catalog`` — the live tool catalogue, mirroring ``web/src/features/registry.ts``.

A document that cannot be verified from one of these sources must not be added.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path

from django.conf import settings

from .chunking import chunk_text, content_hash, detect_locale

DOC_DIR_CANDIDATES = ("docs",)
DOC_FILES = (
    "ARCHITECTURE.md",
    "DESIGN.md",
    "SECURITY.md",
    "CPANEL-PATTERNS.md",
    "I18N.md",
    "CONTENT_GUIDE.md",
    "API.md",
    "FEATURES.md",
)
TITLE_RE = re.compile(r"^#\s+(.+)$", re.M)


@dataclass
class Document:
    source: str
    title: str
    url: str
    kind: str
    locale_hint: str
    text: str
    meta: dict = field(default_factory=dict)


def _corpus_dir() -> Path | None:
    configured = getattr(settings, "ASSISTANT_CORPUS_DIR", "")
    candidates = [Path(configured)] if configured else []
    candidates += [Path(settings.BASE_DIR).parent / name for name in DOC_DIR_CANDIDATES]
    for candidate in candidates:
        if candidate.is_dir():
            return candidate
    return None


def _title_of(text: str, fallback: str) -> str:
    match = TITLE_RE.search(text)
    return match.group(1).strip() if match else fallback


def documents_from_docs() -> list[Document]:
    root = _corpus_dir()
    if root is None:
        return []
    paths = [root / name for name in DOC_FILES if (root / name).is_file()]
    adr_dir = root / "ADRS"
    if not adr_dir.is_dir():
        adr_dir = root / "adr"
    if adr_dir.is_dir():
        paths += sorted(adr_dir.glob("*.md"))
    documents: list[Document] = []
    for path in paths:
        text = path.read_text(encoding="utf-8", errors="replace").strip()
        if not text:
            continue
        relative = path.relative_to(root.parent).as_posix()
        documents.append(
            Document(
                source=relative,
                title=_title_of(text, relative),
                url="",  # repo docs are not published pages yet — see OPEN-ITEMS
                kind="doc",
                locale_hint=detect_locale(text),
                text=text,
            )
        )
    return documents


def documents_from_site_export() -> list[Document]:
    path = Path(getattr(settings, "ASSISTANT_SITE_CORPUS", Path(settings.BASE_DIR) / "apps/assistant/data/site_corpus.json"))
    if not path.is_file():
        return []
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return []

    documents: list[Document] = []

    for page in payload.get("pages", []):
        for lang in ("fa", "en"):
            copy = page.get("copy", {}).get(lang)
            if not copy:
                continue
            text = "\n".join(
                part
                for part in (
                    copy.get("eyebrow", ""),
                    copy.get("title", ""),
                    copy.get("accent", ""),
                    copy.get("intro", ""),
                    *[f"{card.get('title', '')}: {card.get('copy', '')}" for card in copy.get("cards", [])],
                    *[f"{metric[0]} — {metric[1]}" for metric in copy.get("metrics", [])],
                    *copy.get("capabilities", []),
                )
                if part
            )
            documents.append(
                Document(
                    source=f"site/pages/{page['id']}.{lang}",
                    title=f"{page.get('title', {}).get(lang) or page['id']}",
                    url=f"/{lang}{page.get('path', '')}",
                    kind="doc",
                    locale_hint=lang,
                    text=text,
                    meta={"page": page["id"]},
                )
            )

    for tool in payload.get("tools", []):
        for lang in ("fa", "en"):
            copy = tool.get("copy", {}).get(lang, {})
            text_parts = [
                copy.get("name", ""),
                copy.get("tagline", ""),
                copy.get("description", ""),
                *[f"{item}" for item in copy.get("howItWorks", [])],
                *[f"{item}" for item in copy.get("notes", [])],
            ]
            text = "\n".join(part for part in text_parts if part)
            if not text:
                continue
            documents.append(
                Document(
                    source=f"site/tools/{tool['id']}.{lang}",
                    title=copy.get("name", tool["id"]),
                    url=tool.get("path", {}).get(lang, ""),
                    kind="tool",
                    locale_hint=lang,
                    text=text,
                    meta={"tool": tool["id"], "version": tool.get("version", "")},
                )
            )

    for item in payload.get("faq", []):
        for lang in ("fa", "en"):
            question = item.get("question", {}).get(lang, "")
            answer = item.get("answer", {}).get(lang, "")
            if not question or not answer:
                continue
            documents.append(
                Document(
                    source=f"faq/{item['id']}.{lang}",
                    title=question,
                    url=item.get("url", {}).get(lang, ""),
                    kind="faq",
                    locale_hint=lang,
                    text=f"{question}\n{answer}",
                    meta={"faq": item["id"]},
                )
            )
    return documents


def documents_from_catalog() -> list[Document]:
    from apps.tools.catalog import TOOL_CATALOG

    documents: list[Document] = []
    for tool in TOOL_CATALOG:
        for lang, key in (("fa", "title_fa"), ("en", "title_en")):
            documents.append(
                Document(
                    source=f"catalog/{tool['id']}.{lang}",
                    title=tool[key],
                    url=tool.get(f"path_{lang}", ""),
                    kind="tool",
                    locale_hint=lang,
                    text=f"{tool[key]} — {tool.get('capability', '')} — {tool.get('status', '')}",
                    meta={"tool": tool["id"], "version": tool.get("version", "")},
                )
            )
    return documents


def all_documents() -> list[Document]:
    seen: set[str] = set()
    documents: list[Document] = []
    for document in documents_from_site_export() + documents_from_docs() + documents_from_catalog():
        if document.source in seen or not document.text.strip():
            continue
        seen.add(document.source)
        documents.append(document)
    return documents


def chunk_documents(documents: list[Document] | None = None) -> list[dict]:
    rows: list[dict] = []
    for document in documents if documents is not None else all_documents():
        for ordinal, chunk in enumerate(chunk_text(document.text)):
            rows.append(
                {
                    "source": document.source,
                    "url": document.url,
                    "title": document.title[:240],
                    "kind": document.kind,
                    "locale": document.locale_hint,
                    "ordinal": ordinal,
                    "text": chunk,
                    "content_hash": content_hash(chunk),
                    "meta": document.meta,
                }
            )
    return rows
