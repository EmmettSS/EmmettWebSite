"""Retrieval: embeddings when a provider exists, BM25 always as the default and the fallback.

The similarity threshold is applied **here, before any LLM call** (card §۳.۲): a question the
corpus cannot answer returns «پیدا نکردم» and costs nothing.
"""

from __future__ import annotations

import os

from django.core.cache import cache

from .bm25 import BM25Index, tokenize
from .providers import ProviderError, get_provider

CACHE_KEY = "assistant:corpus:v1"
CACHE_SECONDS = 300
COSINE_THRESHOLD = float(os.getenv("ASSISTANT_SIMILARITY_THRESHOLD", "0.35"))
BM25_MIN_SCORE = float(os.getenv("ASSISTANT_BM25_MIN_SCORE", "0.6"))
BM25_MIN_COVERAGE = float(os.getenv("ASSISTANT_BM25_MIN_COVERAGE", "0.5"))
TOP_K = 6


def _load_chunks() -> list[dict]:
    """Chunks as plain dicts so the cache layer never holds model instances."""
    from .models import AssistantChunk

    cached = cache.get(CACHE_KEY)
    if cached is not None:
        return cached
    rows = [
        {
            "id": chunk.pk,
            "source": chunk.source,
            "url": chunk.url,
            "title": chunk.title,
            "kind": chunk.kind,
            "locale": chunk.locale,
            "text": chunk.text,
            "embedding": chunk.embedding,
        }
        for chunk in AssistantChunk.objects.all().only(
            "id", "source", "url", "title", "kind", "locale", "text", "embedding"
        )
    ]
    cache.set(CACHE_KEY, rows, CACHE_SECONDS)
    return rows


def _cosine_scores(chunks: list[dict], question: str) -> tuple[list[float], str]:
    import numpy as np

    provider = get_provider()
    if not provider.available:
        return [], "bm25"
    try:
        vectors = provider.embed([question])
    except ProviderError:
        return [], "bm25"
    if not vectors:
        return [], "bm25"
    query = np.asarray(vectors[0], dtype="float32")
    norm = float(np.linalg.norm(query)) or 1.0
    scores: list[float] = []
    for chunk in chunks:
        blob = chunk.get("embedding")
        if not blob:
            return [], "bm25"  # corpus not embedded yet → BM25 rather than half-answers
        vector = np.frombuffer(bytes(blob), dtype="float32")
        denominator = (float(np.linalg.norm(vector)) or 1.0) * norm
        scores.append(float(np.dot(vector, query) / denominator))
    return scores, "embedding"


def search(question: str, limit: int = TOP_K, locale: str | None = None) -> dict:
    chunks = _load_chunks()
    if locale:
        localized = [chunk for chunk in chunks if chunk["locale"] == locale]
        chunks = localized or chunks
    if not chunks:
        return {"method": "empty", "hits": [], "threshold": None}

    scores, method = _cosine_scores(chunks, question)
    if method == "embedding":
        ranked = sorted(zip(scores, chunks), key=lambda item: -item[0])[:limit]
        hits = [
            {**{k: v for k, v in chunk.items() if k != "embedding"}, "score": round(score, 4)}
            for score, chunk in ranked
            if score >= COSINE_THRESHOLD
        ]
        return {"method": "embedding", "hits": hits, "threshold": COSINE_THRESHOLD}

    index = BM25Index(chunks)
    raw_hits = index.search(question, limit=limit)
    hits = [
        {**{k: v for k, v in hit.items() if k != "embedding"}}
        for hit in raw_hits
        if hit["score"] >= BM25_MIN_SCORE and hit["coverage"] >= BM25_MIN_COVERAGE
    ]
    return {"method": "bm25", "hits": hits, "threshold": BM25_MIN_SCORE}


def question_terms(question: str) -> list[str]:
    return tokenize(question)
