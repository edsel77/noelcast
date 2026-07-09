"""
NoelCast — Knowledge Base Builder
-----------------------------------
One-time script to:
  1. Fetch all Christmas stations from Radio Browser API
  2. Build a rich text document per station
  3. Embed all documents using sentence-transformers (all-MiniLM-L6-v2)
  4. Save FAISS index + station metadata to backend/data/
  5. Upload both files to AWS S3 (optional — needs AWS creds in .env)

Usage:
    cd backend
    python scripts/build_knowledge_base.py

Estimated runtime: ~3-5 min on first run (model download ~90MB, one-time)
"""

import asyncio
import json
import os
import sys
import time
from pathlib import Path

# Fix Windows console UTF-8 encoding for emoji output
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# Allow importing from backend root
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

from stations import get_christmas_stations  # noqa: E402

DATA_DIR = Path(__file__).parent.parent / "data"
INDEX_PATH = DATA_DIR / "faiss.index"
META_PATH = DATA_DIR / "stations_meta.json"


def build_station_document(station: dict) -> str:
    """
    Create a rich, searchable text document for a station.
    This is what gets embedded into the vector space.
    """
    parts = []

    name = station.get("name", "").strip()
    if name:
        parts.append(f"Name: {name}")

    country = station.get("country", "")
    if country:
        parts.append(f"Country: {country}")

    tags = station.get("tags", "")
    if tags:
        # Clean up the tags string (often comma-separated)
        clean_tags = ", ".join(t.strip() for t in tags.split(",") if t.strip())
        parts.append(f"Tags: {clean_tags}")

    language = station.get("language", "")
    if language:
        parts.append(f"Language: {language}")

    bitrate = station.get("bitrate")
    if bitrate and bitrate > 0:
        quality = "high quality" if bitrate >= 128 else "standard quality"
        parts.append(f"Audio: {bitrate} kbps ({quality})")

    codec = station.get("codec", "")
    if codec:
        parts.append(f"Format: {codec}")

    # Add vibe keywords derived from name and tags for better semantic matching
    combined = f"{name} {tags}".lower()
    vibes = []
    if any(w in combined for w in ["jazz", "swing", "bebop"]):
        vibes.append("jazzy smooth relaxing")
    if any(w in combined for w in ["classical", "orchestra", "symphon"]):
        vibes.append("classical orchestral elegant")
    if any(w in combined for w in ["pop", "hits", "chart"]):
        vibes.append("pop upbeat energetic")
    if any(w in combined for w in ["acoustic", "folk", "country"]):
        vibes.append("acoustic warm cozy")
    if any(w in combined for w in ["carol", "traditional", "noel"]):
        vibes.append("traditional carols festive classic")
    if any(w in combined for w in ["lounge", "chill", "ambient"]):
        vibes.append("lounge chill ambient background")
    if vibes:
        parts.append(f"Vibe: {' '.join(vibes)}")

    return " | ".join(parts)


async def fetch_stations() -> list[dict]:
    print("📡 Fetching Christmas stations from Radio Browser API...")
    stations = await get_christmas_stations(force_refresh=True)
    print(f"   → {len(stations)} stations fetched.")
    return stations


def build_embeddings(stations: list[dict]):
    print("\n🤖 Loading fastembed model (all-MiniLM-L6-v2)...")
    print("   (Uses ONNX Runtime — much lighter than PyTorch, first run downloads ~45MB)")
    from fastembed import TextEmbedding  # type: ignore
    import numpy as np
    model = TextEmbedding(model_name="sentence-transformers/all-MiniLM-L6-v2")
    print("   → Model loaded.")

    print("\n📝 Building station documents...")
    documents = [build_station_document(s) for s in stations]
    print(f"   → {len(documents)} documents created.")

    print("\n⚡ Embedding documents (this may take a minute)...")
    t0 = time.time()
    # fastembed.embed() returns a generator of numpy arrays
    embeddings = np.array(list(model.embed(documents)), dtype="float32")
    elapsed = time.time() - t0
    print(f"   → Embeddings complete in {elapsed:.1f}s. Shape: {embeddings.shape}")

    return embeddings


def build_faiss_index(embeddings):
    import faiss  # type: ignore
    import numpy as np

    print("\n🗂️  Building FAISS index...")
    dim = embeddings.shape[1]
    index = faiss.IndexFlatIP(dim)  # Inner product (cosine sim on normalized vecs)
    index.add(np.array(embeddings, dtype="float32"))
    print(f"   → FAISS index built: {index.ntotal} vectors, dim={dim}")
    return index


def save_artifacts(index, stations: list[dict]):
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    import faiss  # type: ignore
    print(f"\n💾 Saving index to {INDEX_PATH}...")
    faiss.write_index(index, str(INDEX_PATH))

    print(f"💾 Saving metadata to {META_PATH}...")
    with open(META_PATH, "w", encoding="utf-8") as f:
        json.dump(stations, f, ensure_ascii=False, indent=2)

    print(f"   → Saved {len(stations)} station records.")


def upload_to_s3():
    from aws_storage import upload_index, index_exists_in_s3

    if not os.getenv("AWS_ACCESS_KEY_ID"):
        print("\n⚠️  AWS credentials not set — skipping S3 upload.")
        print("   To enable S3 storage, add AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY,")
        print("   AWS_REGION, and S3_BUCKET_NAME to your .env file.")
        return

    print("\n☁️  Uploading index to AWS S3...")
    success = upload_index(str(INDEX_PATH), str(META_PATH))
    if success:
        print("   ✅ Index uploaded to S3 successfully!")
    else:
        print("   ❌ S3 upload failed — local index still works fine.")


async def main():
    print("=" * 60)
    print("[NoelCast] RAG Knowledge Base Builder")
    print("=" * 60)

    # 1. Fetch stations
    stations = await fetch_stations()
    if not stations:
        print("ERROR: No stations fetched. Check your internet connection.")
        sys.exit(1)

    # 2. Build embeddings
    embeddings = build_embeddings(stations)

    # 3. Build FAISS index
    index = build_faiss_index(embeddings)

    # 4. Save locally
    save_artifacts(index, stations)

    # 5. Upload to S3 (optional)
    upload_to_s3()

    print("\n" + "=" * 60)
    print("SUCCESS: Knowledge base built!")
    print(f"   Index:    {INDEX_PATH}")
    print(f"   Metadata: {META_PATH}")
    print(f"   Stations: {len(stations)}")
    print("\nYou can now start the API and use POST /ask")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
