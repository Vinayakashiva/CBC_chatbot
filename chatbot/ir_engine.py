"""
Lightweight IR (Information Retrieval) engine.

Wraps a scikit-learn TF-IDF vectorizer + cosine similarity search over a
list of text entries. Used for two purposes in this app:

  1. Matching a user's free-text question against a bank of FAQ question
     variants (see data/knowledge_base.json -> "faqs").
  2. Matching a user's free-text question against chunks of text extracted
     from uploaded event PDFs (see chatbot/pdf_ingest.py).

This keeps the retrieval logic generic and reusable instead of writing it
twice.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import List, Sequence

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


@dataclass
class Match:
    index: int
    score: float


class IRIndex:
    """A small searchable TF-IDF index over a list of strings."""

    def __init__(self, corpus: Sequence[str]):
        self.corpus: List[str] = list(corpus)
        self._vectorizer = None
        self._matrix = None
        if self.corpus:
            self._vectorizer = TfidfVectorizer(
                lowercase=True,
                stop_words="english",
                ngram_range=(1, 2),
                min_df=1,
            )
            self._matrix = self._vectorizer.fit_transform(self.corpus)

    @property
    def is_empty(self) -> bool:
        return not self.corpus

    def search(self, query: str, top_k: int = 1) -> List[Match]:
        """Return the top_k best matching corpus entries for `query`."""
        if self.is_empty or not query.strip():
            return []
        query_vec = self._vectorizer.transform([query])
        sims = cosine_similarity(query_vec, self._matrix)[0]
        top_indices = np.argsort(sims)[::-1][:top_k]
        return [Match(index=int(i), score=float(sims[i])) for i in top_indices]
