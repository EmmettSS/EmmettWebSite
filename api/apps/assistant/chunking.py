"""Chunking + hashing + locale detection for the RAG corpus (feature card F-08).

Rules from the card: 400–600 characters per chunk with ~60 characters of overlap; unchanged
content must keep its hash so the nightly cron skips it instead of paying for a new embedding.
"""

from __future__ import annotations

import hashlib
import re
import unicodedata

CHUNK_SIZE = 520
CHUNK_OVERLAP = 60
PERSIAN_RE = re.compile(r"[\u0600-\u06FF]")
SENTENCE_RE = re.compile(r"(?<=[.!?؟。\n])\s+")


def content_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def detect_locale(text: str) -> str:
    """Persian when Persian letters dominate the alphabetic characters."""
    letters = [ch for ch in text if ch.isalpha()]
    if not letters:
        return "fa"
    persian = sum(1 for ch in letters if PERSIAN_RE.match(ch))
    return "fa" if persian / len(letters) >= 0.3 else "en"


def normalize_for_hash(text: str) -> str:
    text = unicodedata.normalize("NFC", text)
    return re.sub(r"[ \t]+", " ", text.replace("\r\n", "\n")).strip()


def chunk_text(text: str, size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    """Sentence-aware chunking. Deterministic for a given input, which keeps hashes stable."""
    cleaned = normalize_for_hash(text)
    if not cleaned:
        return []
    if len(cleaned) <= size:
        return [cleaned]

    sentences = [s.strip() for s in SENTENCE_RE.split(cleaned) if s.strip()]
    chunks: list[str] = []
    current = ""
    for sentence in sentences:
        # A single monster sentence is split hard so no chunk blows past the size budget.
        while len(sentence) > size:
            head, sentence = sentence[:size], sentence[size - overlap :]
            chunks.append(head.strip())
        if len(current) + len(sentence) + 1 <= size:
            current = f"{current} {sentence}".strip()
        else:
            if current:
                chunks.append(current)
            tail = current[-overlap:] if current else ""
            current = f"{tail} {sentence}".strip() if tail else sentence
    if current:
        chunks.append(current)
    return [chunk for chunk in chunks if chunk.strip()]
