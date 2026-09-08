"""
Hybrid chatbot engine for Code Breaker Challenge 2.0.

Three layers are tried in order, from most precise to most general:

  1. STRUCTURED LOOKUP  - exact facts held as structured data (dates, fee,
     venue, committee members, contacts). Triggered by keyword/entity
     matching. This is fast and always 100% accurate for the facts it knows.

  2. FAQ RETRIEVAL (IR) - TF-IDF + cosine similarity over a bank of FAQ
     question variants, for paraphrased questions the structured layer
     doesn't recognise.

  3. DOCUMENT RETRIEVAL (IR) - TF-IDF + cosine similarity over chunks of
     text extracted from any event PDFs that have been ingested via
     chatbot/pdf_ingest.py. This is what makes the bot extend automatically
     once the 3 rulebook/brochure PDFs are added.

  4. FALLBACK - if nothing crosses the confidence threshold, the bot admits
     it doesn't know and hands the user to a human contact.
"""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

from .ir_engine import IRIndex

BASE_DIR = Path(__file__).resolve().parent.parent
KB_PATH = BASE_DIR / "data" / "knowledge_base.json"
DOC_CHUNKS_PATH = BASE_DIR / "data" / "document_chunks.json"

FAQ_THRESHOLD = 0.28
DOC_THRESHOLD = 0.22

# Synonym expansion so structured keyword matching is a little more forgiving.
POSITION_ALIASES = {
    "convenor": ["convenor", "convener", "organizer", "organiser"],
    "co-convenor": ["co-convenor", "co convenor", "coconvenor", "co-convener"],
    "treasurer": ["treasurer", "finance", "funds"],
    "technical": ["technical", "tech team", "technical team"],
    "stage": ["stage", "stage management", "anchoring"],
    "creative": ["creative", "design team", "graphics"],
    "social media": ["social media", "social-media", "instagram team"],
    "hospitality": ["hospitality", "guest management"],
    "registration": ["registration", "sign up team", "signup team", "register"],
    "discipline": ["discipline", "conduct"],
    "logistics": ["logistics", "arrangements"],
}

CATEGORY_KEYWORDS = {
    "dates": ["date", "dates", "when is", "when will", "schedule", "day"],
    "venue": ["venue", "where is", "where will", "location", "address", "held at"],
    "fee": ["fee", "fees", "cost", "price", "how much", "charges"],
    "team_size": ["team size", "members per team", "how many members", "how many people"],
    "cash_pool": ["prize", "cash", "reward", "win", "60k", "pool"],
    "registration_mode": ["register", "registration process", "sign up", "signup", "join", "qr"],
    "contacts": ["contact", "phone", "number", "call", "reach", "whatsapp", "mobile"],
    "website_social": ["website", "site", "instagram", "facebook", "social media", "handle"],
    "collaboration": ["sponsor", "collaboration", "partner", "supported by", "in collaboration"],
    "organizer": ["organiz", "organis", "department", "who is conducting", "who is hosting"],
    "about": ["what is code breaker", "what is cbc", "about the event", "tell me about"],
    "full_committee": ["full committee", "committee list", "core committee", "all committee members", "entire committee"],
    "quick_summary": ["quick facts", "event summary", "overview of event", "event overview"],
}

GREETING_PATTERNS = [r"^\s*(hi|hello|hey|hii+|good (morning|afternoon|evening))\s*[!.]?\s*$"]
THANKS_PATTERNS = [r"\b(thanks|thank you|thnx|ty)\b"]


def _norm(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower())


class ChatbotEngine:
    def __init__(self, kb_path: Path = KB_PATH, doc_chunks_path: Path = DOC_CHUNKS_PATH):
        self.kb: Dict[str, Any] = json.loads(Path(kb_path).read_text(encoding="utf-8"))
        self.event = self.kb["event"]
        self.contacts = self.kb["contacts"]
        self.committee = self.kb["committee"]
        self.faqs = self.kb["faqs"]

        # Build the FAQ IR index: every phrased variant maps back to its FAQ entry.
        self._faq_variant_to_id: List[int] = []
        faq_corpus: List[str] = []
        for i, faq in enumerate(self.faqs):
            for q in faq["questions"]:
                faq_corpus.append(q)
                self._faq_variant_to_id.append(i)
        self.faq_index = IRIndex(faq_corpus)

        # Build the document IR index (empty until PDFs are ingested).
        self.doc_chunks: List[Dict[str, str]] = []
        if Path(doc_chunks_path).exists():
            self.doc_chunks = json.loads(Path(doc_chunks_path).read_text(encoding="utf-8"))
        self.doc_index = IRIndex([c["text"] for c in self.doc_chunks])

    # ---------------------------------------------------------------- utils
    def _format_contacts(self) -> str:
        lines = [f"- {c['name']} ({c['role']}): {c['phone']}" for c in self.contacts]
        return "You can reach out to the organizing team directly:\n" + "\n".join(lines)

    def _find_committee_match(self, query: str) -> tuple[Optional[Dict[str, str]], bool]:
        """Returns (entry, matched_by_name). matched_by_name=True bypasses the
        keyword gate in answer(), since a query naming someone directly is
        unambiguous even without words like 'who' or 'head'."""
        best, best_score = None, 0.0
        for entry in self.committee:
            # direct name lookup takes priority and is unambiguous on its own
            if entry["name"].lower() != "not assigned" and entry["name"].lower() in query:
                return entry, True
            pos = entry["position"].lower()
            tokens = set(re.findall(r"[a-z]+", pos))
            tokens.discard("co")  # avoid noisy single-letter/co token dominating
            if not tokens:
                continue
            query_words = set(re.findall(r"[a-z]+", query))
            hits = sum(1 for t in tokens if t in query_words)
            score = hits / len(tokens)
            if score > best_score:
                best_score, best = score, entry
        if best_score >= 0.5:
            return best, False
        return None, False

    def _committee_answer(self, entry: Dict[str, str]) -> str:
        if entry["name"] == "Not assigned" or not entry.get("name"):
            return f"The {entry['position']} position has not been assigned yet."
        usn = f" (USN: {entry['usn']})" if entry.get("usn") else ""
        return f"{entry['position']}: {entry['name']}{usn}."

    def _category_match(self, query: str) -> Optional[str]:
        for category, keywords in CATEGORY_KEYWORDS.items():
            if any(re.search(r"\b" + re.escape(kw) + r"\b", query) for kw in keywords):
                return category
        return None

    def _answer_for_category(self, category: str) -> str:
        e = self.event
        if category == "dates":
            return f"Code Breaker Challenge 2.0 will be held on {e['dates']}."
        if category == "venue":
            return f"The event will take place at {e['venue']}, {e['address']}."
        if category == "fee":
            return f"The registration fee is {e['registration_fee']}."
        if category == "team_size":
            return f"Teams must have {e['team_size']}."
        if category == "cash_pool":
            return f"There's a {e['cash_pool']}."
        if category == "registration_mode":
            return e["registration_mode"]
        if category == "contacts":
            return self._format_contacts()
        if category == "website_social":
            return f"Website: {e['website']} | Instagram: {e['instagram']} | Facebook: {e['facebook']}"
        if category == "collaboration":
            partners = ", ".join(e["supporting_bodies"])
            return f"CBC 2.0 is organized in collaboration with {e['collaboration']}, and supported by {partners}."
        if category == "organizer":
            return (f"CBC 2.0 is organized by the {e['department']} at {e['college']}. "
                    f"{e['approval']}")
        if category == "about":
            return (f"{e['name']} is a technical event by the {e['department']} at {e['college']}, "
                     f"happening on {e['dates']} at {e['venue']}.")
        if category == "full_committee":
            lines = [self._committee_answer(entry) for entry in self.committee]
            return "Here's the full core committee:\n\n" + "\n".join(f"• {l}" for l in lines)
        if category == "quick_summary":
            return (
                f"Quick facts about {e['name']}:\n"
                f"• Dates: {e['dates']}\n"
                f"• Venue: {e['venue']}\n"
                f"• Registration fee: {e['registration_fee']}\n"
                f"• Team size: {e['team_size']}\n"
                f"• Prize pool: {e['cash_pool']}"
            )
        return ""

    # -------------------------------------------------------------- public
    def answer(self, raw_query: str) -> Dict[str, Any]:
        query = _norm(raw_query)
        if not query:
            return self._reply("Please type a question and I'll do my best to help!", "system")

        if any(re.search(p, query) for p in GREETING_PATTERNS):
            return self._reply(
                "Hi there! I'm the CBC 2.0 assistant. Ask me about dates, venue, fees, "
                "team rules, prizes, registration, or the organizing committee.",
                "system",
            )
        if any(re.search(p, query) for p in THANKS_PATTERNS):
            return self._reply("You're welcome! All the best for Code Breaker Challenge 2.0 🚀", "system")

        # 1. Structured lookup: committee / contact person by role or name
        committee_entry, matched_by_name = self._find_committee_match(query)
        trigger_words = ["who", "contact", "usn", "role", "position", "head",
                          "convenor", "convener", "treasurer", "in charge", "incharge"]
        if committee_entry and (matched_by_name or any(k in query for k in trigger_words)):
            return self._reply(self._committee_answer(committee_entry), "knowledge_base")

        # 2. Structured lookup: known factual categories
        category = self._category_match(query)
        if category:
            return self._reply(self._answer_for_category(category), "knowledge_base")

        # 3. FAQ retrieval (IR)
        matches = self.faq_index.search(query, top_k=1)
        if matches and matches[0].score >= FAQ_THRESHOLD:
            faq_id = self._faq_variant_to_id[matches[0].index]
            return self._reply(self.faqs[faq_id]["answer"], "faq", score=matches[0].score)

        # 4. Document retrieval (IR) over ingested PDF chunks, if any
        if not self.doc_index.is_empty:
            doc_matches = self.doc_index.search(query, top_k=1)
            if doc_matches and doc_matches[0].score >= DOC_THRESHOLD:
                chunk = self.doc_chunks[doc_matches[0].index]
                return self._reply(
                    chunk["text"],
                    "document",
                    score=doc_matches[0].score,
                    source_doc=chunk.get("source"),
                )

        # 5. Fallback
        fallback = (
            "I don't have that information yet. "
            "Please reach out to the organizers for help:\n\n" + self._format_contacts()
        )
        return self._reply(fallback, "fallback")

    @staticmethod
    def _reply(text: str, source: str, score: float = None, source_doc: str = None) -> Dict[str, Any]:
        return {"answer": text, "source": source, "score": score, "source_doc": source_doc}


_engine_singleton: Optional[ChatbotEngine] = None


def get_engine() -> ChatbotEngine:
    global _engine_singleton
    if _engine_singleton is None:
        _engine_singleton = ChatbotEngine()
    return _engine_singleton
