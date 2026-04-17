import os
import re
import json
import logging
import warnings
import numpy as np

warnings.filterwarnings("ignore")
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from flask import Flask, render_template, request, jsonify
from flask_cors import CORS

# Lazy-load heavy models
_model = None
_nltk_ready = False

def get_model():
    global _model
    if _model is None:
        logger.info("Loading SBERT model...")
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer("all-MiniLM-L6-v2")
        logger.info("SBERT model loaded.")
    return _model

def ensure_nltk():
    global _nltk_ready
    if not _nltk_ready:
        import nltk
        for pkg in ["punkt", "punkt_tab", "stopwords"]:
            try:
                nltk.download(pkg, quiet=True)
            except Exception:
                pass
        _nltk_ready = True

app = Flask(__name__)
CORS(app)


# ──────────────────────────────────────────────
#  TEXT UTILITIES
# ──────────────────────────────────────────────

def split_into_sentences(text: str) -> list[str]:
    """Split text into sentences using simple regex (no NLTK dependency)."""
    text = text.strip()
    # Split on sentence-ending punctuation followed by whitespace/end
    raw = re.split(r'(?<=[.!?])\s+', text)
    sentences = [s.strip() for s in raw if s.strip() and len(s.strip()) > 10]
    return sentences


def normalize(text: str) -> str:
    text = text.lower()
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'[^\w\s.,!?;:\'-]', '', text)
    return text.strip()


def get_embeddings(sentences: list[str]) -> np.ndarray:
    model = get_model()
    embeddings = model.encode(sentences, convert_to_numpy=True, show_progress_bar=False)
    return embeddings


def cosine_similarity_matrix(emb_a: np.ndarray, emb_b: np.ndarray) -> np.ndarray:
    """Compute cosine similarity between every pair of sentences."""
    # Normalize
    norm_a = emb_a / (np.linalg.norm(emb_a, axis=1, keepdims=True) + 1e-9)
    norm_b = emb_b / (np.linalg.norm(emb_b, axis=1, keepdims=True) + 1e-9)
    return norm_a @ norm_b.T  # [len_a, len_b]


# ──────────────────────────────────────────────
#  CORE DETECTION
# ──────────────────────────────────────────────

def detect_plagiarism(text_a: str, text_b: str):
    sents_a = split_into_sentences(text_a)
    sents_b = split_into_sentences(text_b)

    if not sents_a or not sents_b:
        return {"error": "One or both documents are too short or contain no valid sentences."}

    norm_a = [normalize(s) for s in sents_a]
    norm_b = [normalize(s) for s in sents_b]

    emb_a = get_embeddings(norm_a)
    emb_b = get_embeddings(norm_b)

    sim_matrix = cosine_similarity_matrix(emb_a, emb_b)

    # For each sentence in B, find the best match in A
    matches = []
    b_scores = []

    for j, sent_b in enumerate(sents_b):
        best_i = int(np.argmax(sim_matrix[:, j]))
        best_score = float(sim_matrix[best_i, j])
        b_scores.append(best_score)

        if best_score >= 0.85:
            match_type = "Direct"
        elif best_score >= 0.65:
            match_type = "Paraphrased"
        else:
            match_type = "Original"

        if match_type in ("Direct", "Paraphrased"):
            matches.append({
                "sent_a": sents_a[best_i],
                "sent_b": sent_b,
                "score": round(best_score, 4),
                "type": match_type,
                "index_a": best_i,
                "index_b": j,
            })

    # Overall similarity: mean of best-match scores for each B sentence
    overall_score = float(np.mean(b_scores)) if b_scores else 0.0

    # Sentence-level labels for B
    sentence_labels = []
    for j, sent_b in enumerate(sents_b):
        best_i = int(np.argmax(sim_matrix[:, j]))
        best_score = float(sim_matrix[best_i, j])
        if best_score >= 0.85:
            label = "Direct"
        elif best_score >= 0.65:
            label = "Paraphrased"
        else:
            label = "Original"
        sentence_labels.append({
            "sentence": sent_b,
            "score": round(best_score, 4),
            "label": label,
        })

    direct_count = sum(1 for m in matches if m["type"] == "Direct")
    paraphrased_count = sum(1 for m in matches if m["type"] == "Paraphrased")
    plagiarized_pct = round((direct_count + paraphrased_count) / max(len(sents_b), 1) * 100, 1)

    if overall_score >= 0.75 or plagiarized_pct >= 60:
        verdict = "High"
        verdict_color = "#ef4444"
    elif overall_score >= 0.55 or plagiarized_pct >= 30:
        verdict = "Moderate"
        verdict_color = "#f59e0b"
    else:
        verdict = "Low"
        verdict_color = "#22c55e"

    # Style analysis (basic AI-generated hint)
    avg_sent_len_a = np.mean([len(s.split()) for s in sents_a]) if sents_a else 0
    avg_sent_len_b = np.mean([len(s.split()) for s in sents_b]) if sents_b else 0
    style_note = _style_analysis(sents_b, avg_sent_len_b)

    return {
        "overall_score": round(overall_score * 100, 1),
        "plagiarized_pct": plagiarized_pct,
        "direct_count": direct_count,
        "paraphrased_count": paraphrased_count,
        "original_count": len(sents_b) - direct_count - paraphrased_count,
        "total_sentences_a": len(sents_a),
        "total_sentences_b": len(sents_b),
        "verdict": verdict,
        "verdict_color": verdict_color,
        "matches": matches,
        "sentence_labels": sentence_labels,
        "style_note": style_note,
        "avg_sent_len_a": round(avg_sent_len_a, 1),
        "avg_sent_len_b": round(avg_sent_len_b, 1),
    }


def _style_analysis(sentences: list[str], avg_len: float) -> dict:
    """Heuristic AI-generated content hints."""
    hints = []
    if avg_len > 22:
        hints.append("Sentences are notably long, which is common in AI-generated text.")
    if avg_len < 8:
        hints.append("Very short sentences may indicate bullet-point style or fragmented writing.")
    
    # Check for filler phrases common in AI writing
    ai_phrases = [
        "it is important to note", "it should be noted", "in conclusion",
        "furthermore", "moreover", "additionally", "it is worth mentioning",
        "as mentioned above", "needless to say", "it goes without saying",
        "in today's world", "in the realm of", "delve into"
    ]
    full_text = " ".join(sentences).lower()
    found = [p for p in ai_phrases if p in full_text]
    if len(found) >= 3:
        hints.append(f"Multiple AI-typical phrases detected: {', '.join(found[:5])}.")
    elif found:
        hints.append(f"Some phrases typical of AI text detected: {', '.join(found)}.")

    # Lexical diversity
    words = full_text.split()
    unique_words = len(set(words))
    diversity = round(unique_words / max(len(words), 1), 3)
    if diversity < 0.4:
        hints.append(f"Low lexical diversity ({diversity}) may indicate repetitive or AI-generated content.")

    ai_probability = "Possible" if len(hints) >= 2 else "Unlikely"
    if not hints:
        hints.append("No strong indicators of AI-generated content detected.")

    return {
        "ai_probability": ai_probability,
        "hints": hints,
        "lexical_diversity": diversity,
        "avg_sentence_length": round(avg_len, 1),
    }


# ──────────────────────────────────────────────
#  ROUTES
# ──────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/analyze", methods=["POST"])
def analyze():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No JSON payload received."}), 400

    text_a = data.get("text_a", "").strip()
    text_b = data.get("text_b", "").strip()

    if not text_a or not text_b:
        return jsonify({"error": "Both Document A and Document B are required."}), 400
    if len(text_a) < 30 or len(text_b) < 30:
        return jsonify({"error": "Documents are too short for meaningful analysis (min 30 chars each)."}), 400

    try:
        result = detect_plagiarism(text_a, text_b)
        if "error" in result:
            return jsonify(result), 422
        return jsonify(result)
    except Exception as exc:
        logger.exception("Analysis failed")
        return jsonify({"error": str(exc)}), 500


@app.route("/api/health")
def health():
    return jsonify({"status": "ok", "model": "all-MiniLM-L6-v2"})


if __name__ == "__main__":
    logger.info("Starting Plagiarism Detection Server...")
    app.run(debug=True, host="0.0.0.0", port=5000)
