"""
Ingest event PDFs (rulebook, brochure, schedule, etc.) into the chatbot's
document knowledge base so the IR layer can retrieve answers from them.

Usage (command line):
    python -m chatbot.pdf_ingest data/pdfs/rulebook.pdf
    python -m chatbot.pdf_ingest data/pdfs/*.pdf

Each PDF is split into ~120-word overlapping chunks and appended to
data/document_chunks.json. Re-running ingestion for the same filename
replaces that file's previous chunks, so it's safe to re-run after fixing
a PDF.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import List

import pdfplumber

BASE_DIR = Path(__file__).resolve().parent.parent
DOC_CHUNKS_PATH = BASE_DIR / "data" / "document_chunks.json"

CHUNK_WORDS = 120
OVERLAP_WORDS = 20


def extract_text(pdf_path: Path) -> str:
    text_parts = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text() or ""
            text_parts.append(page_text)
    return "\n".join(text_parts)


def chunk_text(text: str, source: str) -> List[dict]:
    # Collapse whitespace, split into words for simple fixed-size chunking.
    clean = re.sub(r"\s+", " ", text).strip()
    words = clean.split(" ")
    chunks = []
    start = 0
    idx = 0
    while start < len(words):
        end = min(start + CHUNK_WORDS, len(words))
        chunk_words = words[start:end]
        chunk_text_str = " ".join(chunk_words).strip()
        if chunk_text_str:
            chunks.append({
                "source": source,
                "chunk_id": f"{source}::{idx}",
                "text": chunk_text_str,
            })
            idx += 1
        if end == len(words):
            break
        start = end - OVERLAP_WORDS
    return chunks


def load_existing() -> List[dict]:
    if DOC_CHUNKS_PATH.exists():
        return json.loads(DOC_CHUNKS_PATH.read_text(encoding="utf-8"))
    return []


def save_chunks(chunks: List[dict]) -> None:
    DOC_CHUNKS_PATH.parent.mkdir(parents=True, exist_ok=True)
    DOC_CHUNKS_PATH.write_text(json.dumps(chunks, indent=2, ensure_ascii=False), encoding="utf-8")


def ingest(pdf_path: Path) -> int:
    source = pdf_path.name
    text = extract_text(pdf_path)
    new_chunks = chunk_text(text, source)

    existing = load_existing()
    # Replace any previous chunks from the same file so re-ingesting is safe.
    existing = [c for c in existing if c["source"] != source]
    existing.extend(new_chunks)
    save_chunks(existing)
    return len(new_chunks)


def main(argv: List[str]) -> None:
    parser = argparse.ArgumentParser(description="Ingest event PDFs into the chatbot knowledge base.")
    parser.add_argument("pdfs", nargs="+", help="Path(s) to PDF file(s) to ingest.")
    args = parser.parse_args(argv)

    for pdf_arg in args.pdfs:
        pdf_path = Path(pdf_arg)
        if not pdf_path.exists():
            print(f"  Skipping (not found): {pdf_path}")
            continue
        n = ingest(pdf_path)
        print(f"  Ingested {pdf_path.name}: {n} chunk(s) added.")

    print("Done. Restart the Flask app (or it will pick up new chunks on next restart) to use the new content.")


if __name__ == "__main__":
    main(sys.argv[1:])
