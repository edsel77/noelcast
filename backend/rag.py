"""
NoelCast — RAG (Retrieval-Augmented Generation) Pipeline
---------------------------------------------------------
Flow:
  1. Load FAISS vector index (from S3 or local disk)
  2. Embed user query with sentence-transformers (all-MiniLM-L6-v2)
  3. Retrieve top-K semantically similar station documents via FAISS
  4. Generate a friendly recommendation with Groq LLM (Llama 3.1 8B)
"""

import json
import logging
import os
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# ── Paths ──────────────────────────────────────────────────────────────────────
DATA_DIR = Path(__file__).parent / "data"
INDEX_PATH = DATA_DIR / "faiss.index"
META_PATH = DATA_DIR / "stations_meta.json"

# ── Module-level singletons (loaded once) ─────────────────────────────────────
_model = None          # fastembed embedding model
_faiss_index = None    # FAISS index
_stations_meta: list[dict] = []  # Station metadata for retrieved docs

# ── Groq config ───────────────────────────────────────────────────────────────
GROQ_MODEL = "llama-3.1-8b-instant"   # Free tier — fast & capable
GROQ_MAX_TOKENS = 512

# ── Embedding model name (must match what build_knowledge_base.py used) ───────
EMBED_MODEL = "sentence-transformers/all-MiniLM-L6-v2"


def _load_model():
    """Load fastembed model (cached after first load).
    
    fastembed uses ONNX Runtime instead of PyTorch — uses ~100MB RAM vs ~500MB,
    making it safe for Render's free tier (512MB limit).
    """
    global _model
    if _model is None:
        logger.info("Loading fastembed model (%s)...", EMBED_MODEL)
        from fastembed import TextEmbedding  # type: ignore
        _model = TextEmbedding(model_name=EMBED_MODEL)
        logger.info("✅ Embedding model loaded.")
    return _model


def load_index() -> bool:
    """
    Load the FAISS index and station metadata into memory.
    Tries S3 first, falls back to local disk.
    Returns True if index was loaded successfully.
    """
    global _faiss_index, _stations_meta

    # Try to download from S3 if not already on disk
    if not INDEX_PATH.exists() or not META_PATH.exists():
        logger.info("FAISS index not found locally — attempting S3 download...")
        from aws_storage import download_index
        download_index(str(INDEX_PATH), str(META_PATH))

    # Load from disk
    if INDEX_PATH.exists() and META_PATH.exists():
        try:
            import faiss  # type: ignore
            logger.info("Loading FAISS index from disk...")
            _faiss_index = faiss.read_index(str(INDEX_PATH))

            with open(META_PATH, "r", encoding="utf-8") as f:
                _stations_meta = json.load(f)

            logger.info(
                "✅ RAG index loaded: %d vectors, %d stations.",
                _faiss_index.ntotal,
                len(_stations_meta),
            )
            return True
        except Exception as exc:
            logger.error("Failed to load FAISS index: %s", exc)
            return False
    else:
        logger.warning(
            "No FAISS index found locally or on S3. "
            "Run: python scripts/build_knowledge_base.py"
        )
        return False


def is_ready() -> bool:
    """Return True if the RAG pipeline is fully loaded and ready."""
    return _faiss_index is not None and len(_stations_meta) > 0


def embed_query(text: str):
    """Embed a user query into a dense vector using fastembed."""
    import numpy as np
    model = _load_model()
    # fastembed.embed() returns a generator of numpy arrays
    vecs = list(model.embed([text]))
    return np.array([vecs[0]], dtype="float32")


def retrieve(query: str, k: int = 5) -> list[dict]:
    """
    Retrieve the top-K most semantically similar stations for the query.
    Returns a list of station dicts.
    """
    if not is_ready():
        logger.warning("RAG index not loaded — cannot retrieve.")
        return []

    try:
        query_vec = embed_query(query)
        distances, indices = _faiss_index.search(query_vec, k)
        results = []
        for idx in indices[0]:
            if 0 <= idx < len(_stations_meta):
                results.append(_stations_meta[idx])
        return results
    except Exception as exc:
        logger.error("FAISS retrieval failed: %s", exc)
        return []


def _build_context(stations: list[dict]) -> str:
    """Format retrieved stations as LLM context."""
    lines = []
    for i, s in enumerate(stations, 1):
        parts = [f"Station {i}: {s.get('name', 'Unknown')}"]
        if s.get("country"):
            parts.append(f"Country: {s['country']}")
        if s.get("tags"):
            parts.append(f"Tags: {s['tags']}")
        if s.get("language"):
            parts.append(f"Language: {s['language']}")
        if s.get("bitrate"):
            parts.append(f"Bitrate: {s['bitrate']} kbps")
        lines.append(" | ".join(parts))
    return "\n".join(lines)


def generate_answer(query: str, stations: list[dict]) -> str:
    """
    Call the Groq LLM (Llama 3.1 8B) with retrieved station context
    to generate a friendly, personalised recommendation.
    """
    groq_key = os.getenv("GROQ_API_KEY")
    if not groq_key:
        # Fallback: return a simple template without LLM
        names = [s.get("name", "Unknown") for s in stations[:3]]
        return (
            f"Based on your vibe, here are some great Christmas stations: "
            + ", ".join(names)
            + ". Tap any to start listening! 🎄"
        )

    try:
        from groq import Groq  # type: ignore
        client = Groq(api_key=groq_key)

        context = _build_context(stations)
        system_prompt = (
            "You are NoelCast's cheerful AI music guide. "
            "You help users find Christmas radio stations that match their vibe. "
            "Keep responses warm, short (2-3 sentences), and festive. "
            "Always mention the station names from the context. "
            "End with a Christmas emoji."
        )
        user_prompt = (
            f"The user is looking for: \"{query}\"\n\n"
            f"Here are the best matching stations from our library:\n{context}\n\n"
            f"Write a short, friendly recommendation that mentions the station names."
        )

        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=GROQ_MAX_TOKENS,
            temperature=0.7,
        )
        return response.choices[0].message.content.strip()

    except Exception as exc:
        logger.error("Groq generation failed: %s", exc)
        names = [s.get("name", "Unknown") for s in stations[:3]]
        return (
            f"Here are stations that match your vibe: "
            + ", ".join(names)
            + " 🎄"
        )


def ask(query: str, k: int = 5) -> dict:
    """
    Full RAG pipeline entrypoint.
    Returns { answer: str, stations: list[dict] }
    """
    if not is_ready():
        return {
            "answer": (
                "The AI recommender is warming up — the knowledge base hasn't been "
                "built yet. Run `python scripts/build_knowledge_base.py` first. "
                "In the meantime, use the search bar above! 🎄"
            ),
            "stations": [],
            "ready": False,
        }

    stations = retrieve(query, k=k)
    answer = generate_answer(query, stations)

    return {
        "answer": answer,
        "stations": stations,
        "ready": True,
    }
