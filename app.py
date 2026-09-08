"""
Code Breaker Challenge 2.0 - Participant Query Chatbot
Flask app entry point.

Run locally:
    pip install -r requirements.txt
    python app.py
Then open http://127.0.0.1:5000
"""
from __future__ import annotations

from pathlib import Path

from flask import Flask, jsonify, render_template, request

from chatbot.engine import get_engine
from chatbot.pdf_ingest import ingest as ingest_pdf

BASE_DIR = Path(__file__).resolve().parent
PDF_UPLOAD_DIR = BASE_DIR / "data" / "pdfs"
PDF_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 20 * 1024 * 1024  # 20 MB upload cap


@app.route("/")
def index():
    engine = get_engine()
    return render_template("index.html", event=engine.event)


@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json(silent=True) or {}
    message = (data.get("message") or "").strip()
    if not message:
        return jsonify({"error": "Empty message"}), 400

    engine = get_engine()
    result = engine.answer(message)
    return jsonify(result)


@app.route("/api/suggestions")
def suggestions():
    """A handful of starter questions shown as quick-reply chips."""
    return jsonify([
        "When is the event?",
        "What is the registration fee?",
        "What is the team size?",
        "Who is the convenor?",
        "How do I register?",
        "What is the prize money?",
    ])


# --- Organizer-only utility: upload a PDF (rulebook/brochure/schedule) and
# ingest it into the chatbot's knowledge base without touching the server. ---
@app.route("/admin/upload", methods=["GET", "POST"])
def admin_upload():
    message = None
    if request.method == "POST":
        file = request.files.get("pdf")
        if file and file.filename.lower().endswith(".pdf"):
            save_path = PDF_UPLOAD_DIR / file.filename
            file.save(save_path)
            n_chunks = ingest_pdf(save_path)
            global _engine_needs_reload
            import chatbot.engine as engine_module
            engine_module._engine_singleton = None  # force reload with new doc chunks
            message = f"Ingested '{file.filename}' successfully ({n_chunks} chunks added)."
        else:
            message = "Please choose a valid .pdf file."
    return render_template("admin_upload.html", message=message)


if __name__ == "__main__":
    app.run(debug=True, port=5000)
