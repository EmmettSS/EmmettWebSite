"""BM25 retrieval — the fallback that must work *before* any provider is wired (card §۳.۴).

Pure Python, no new dependencies. The index is built from the chunk table and cached briefly;
for the expected corpus size (n ≈ 500–2000 chunks) this is well under the 50 ms budget.
"""

from __future__ import annotations

import math
import re
from collections import Counter

from apps.tools.normalize import normalize_persian

K1 = 1.5
B = 0.75
TOKEN_RE = re.compile(r"[0-9a-zA-Z_]+|[\u0600-\u06FF]+")
STOPWORDS = {
    "و", "در", "به", "از", "که", "این", "را", "با", "است", "برای", "آن", "یک", "می", "هم",
    "the", "a", "an", "of", "to", "in", "is", "are", "for", "and", "or", "on", "with",
}


def tokenize(text: str) -> list[str]:
    normalized = normalize_persian(text)["normalized"]
    tokens = []
    for raw in TOKEN_RE.findall(normalized.lower()):
        token = raw.strip()
        if not token or token in STOPWORDS or len(token) < 2:
            continue
        tokens.append(token)
    return tokens


class BM25Index:
    def __init__(self, chunks: list[dict]):
        self.chunks = chunks
        self.doc_tokens: list[list[str]] = [tokenize(chunk["text"]) for chunk in chunks]
        self.lengths = [len(tokens) for tokens in self.doc_tokens]
        self.avg_length = (sum(self.lengths) / len(self.lengths)) if self.lengths else 0.0
        self.term_freqs: list[Counter] = [Counter(tokens) for tokens in self.doc_tokens]
        self.doc_freq: Counter = Counter()
        for counter in self.term_freqs:
            self.doc_freq.update(counter.keys())
        self.total = len(chunks)

    def _idf(self, term: str) -> float:
        freq = self.doc_freq.get(term, 0)
        return math.log(1 + (self.total - freq + 0.5) / (freq + 0.5))

    def score(self, query_tokens: list[str], index: int) -> tuple[float, float]:
        """Returns (bm25 score, query-term coverage) for one document."""
        if not query_tokens:
            return 0.0, 0.0
        counter = self.term_freqs[index]
        length = self.lengths[index] or 1
        score = 0.0
        matched = 0
        for term in set(query_tokens):
            frequency = counter.get(term, 0)
            if not frequency:
                continue
            matched += 1
            denominator = frequency + K1 * (1 - B + B * length / (self.avg_length or 1))
            score += self._idf(term) * frequency * (K1 + 1) / denominator
        if len(set(query_tokens)) and matched:
            # A term only counts as covered when it appears in this chunk.
            score *= 1 + matched / len(set(query_tokens))
        return score, matched / len(set(query_tokens))

    def search(self, query: str, limit: int = 8) -> list[dict]:
        query_tokens = tokenize(query)
        if not query_tokens:
            return []
        scored = []
        for index in range(self.total):
            score, coverage = self.score(query_tokens, index)
            if score > 0:
                scored.append((score, coverage, index))
        scored.sort(key=lambda item: (-item[0], item[2]))
        results = []
        for score, coverage, index in scored[:limit]:
            chunk = self.chunks[index]
            results.append(
                {
                    "chunk_id": chunk.get("id"),
                    "source": chunk["source"],
                    "title": chunk.get("title", ""),
                    "url": chunk.get("url", ""),
                    "text": chunk["text"],
                    "score": round(score, 4),
                    "coverage": round(coverage, 4),
                }
            )
        return results
