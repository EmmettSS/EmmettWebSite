"""Corpus indexing: upsert chunks by hash and embed only what changed.

Runs from cron (``process_jobs --kind=embed``), never in a user request — the §5.3 pattern.
When no provider is configured the chunks are still stored (hash + text) so BM25 works today and
embeddings can be backfilled later without re-chunking anything.
"""

from __future__ import annotations

from django.core.cache import cache
from django.db import transaction

from .corpus import chunk_documents
from .models import AssistantChunk
from .providers import ProviderError, get_provider
from .retrieval import CACHE_KEY


def _to_blob(vector: list[float]) -> bytes:
    import numpy as np

    return np.asarray(vector, dtype="float32").tobytes()


def sync_corpus(embed: bool = True, batch_size: int = 32, provider=None) -> dict:
    rows = chunk_documents()
    provider = provider or get_provider()
    stats = {"chunks": len(rows), "created": 0, "updated": 0, "deleted": 0, "embedded": 0, "skipped": 0, "provider": provider.name}

    existing = {(chunk.source, chunk.ordinal): chunk for chunk in AssistantChunk.objects.all()}
    keep: set[tuple[str, int]] = set()
    pending: list[AssistantChunk] = []

    with transaction.atomic():
        for row in rows:
            key = (row["source"], row["ordinal"])
            keep.add(key)
            chunk = existing.get(key)
            if chunk is None:
                chunk = AssistantChunk.objects.create(
                    source=row["source"],
                    url=row["url"],
                    title=row["title"],
                    kind=row["kind"],
                    locale=row["locale"],
                    ordinal=row["ordinal"],
                    text=row["text"],
                    content_hash=row["content_hash"],
                )
                stats["created"] += 1
                pending.append(chunk)
                continue
            if chunk.content_hash == row["content_hash"] and chunk.text == row["text"]:
                stats["skipped"] += 1
                continue
            chunk.url, chunk.title, chunk.kind = row["url"], row["title"], row["kind"]
            chunk.locale, chunk.text, chunk.content_hash = row["locale"], row["text"], row["content_hash"]
            chunk.embedding = None  # changed content must be re-embedded
            chunk.embed_provider = ""
            chunk.save(
                update_fields=["url", "title", "kind", "locale", "text", "content_hash", "embedding", "embed_provider", "updated_at"]
            )
            stats["updated"] += 1
            pending.append(chunk)

        stale = [key for key in existing if key not in keep]
        for key in stale:
            existing[key].delete()
            stats["deleted"] += 1

    if embed and provider.available and pending:
        for start in range(0, len(pending), batch_size):
            batch = pending[start : start + batch_size]
            try:
                vectors = provider.embed([chunk.text for chunk in batch])
            except ProviderError:
                stats["embedding_error"] = True
                break
            if not vectors or len(vectors) != len(batch):
                stats["embedding_error"] = True
                break
            for chunk, vector in zip(batch, vectors):
                chunk.embedding = _to_blob(vector)
                chunk.embed_provider = provider.name
                chunk.save(update_fields=["embedding", "embed_provider", "updated_at"])
                stats["embedded"] += 1

    cache.delete(CACHE_KEY)
    return stats


def corpus_stats() -> dict:
    from django.db.models import Count

    total = AssistantChunk.objects.count()
    embedded = AssistantChunk.objects.exclude(embedding=None).count()
    by_kind = {
        row["kind"]: row["count"]
        for row in AssistantChunk.objects.values("kind").annotate(count=Count("id"))
    }
    return {"chunks": total, "embedded": embedded, "by_kind": by_kind}
