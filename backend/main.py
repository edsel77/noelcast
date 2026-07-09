"""
NoelCast Backend — FastAPI App
Proxy for Christmas radio stations from Radio Browser API.
Includes RAG-powered AI station recommender (POST /ask).
"""

import os
import logging
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from stations import get_christmas_stations
import rag

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── CORS ───────────────────────────────────────────────────────────────────────
_origins_env = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:8081,http://localhost:19006,http://localhost:3000",
)
ALLOWED_ORIGINS = [o.strip() for o in _origins_env.split(",") if o.strip()]


# ── Startup: pre-warm cache + load RAG index ──────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🎄 NoelCast API starting up — pre-warming station cache...")
    for attempt in range(1, 4):
        try:
            stations = await get_christmas_stations()
            if stations:
                logger.info("Station cache warmed: %d stations loaded.", len(stations))
                break
            logger.warning("Pre-warm attempt %d returned 0 stations — retrying...", attempt)
        except Exception as exc:
            logger.warning("Pre-warm attempt %d failed: %s", attempt, exc)
        if attempt < 3:
            import asyncio as _asyncio
            await _asyncio.sleep(2)

    logger.info("🤖 Loading RAG vector index...")
    try:
        rag.load_index()
    except Exception as exc:
        logger.warning("RAG index load failed (POST /ask will return graceful fallback): %s", exc)

    yield
    logger.info("🎄 NoelCast API shutting down.")


# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="NoelCast API",
    description="Christmas radio station proxy with caching.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.netlify\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Routes ─────────────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    """Render health check endpoint."""
    return {"status": "ok", "service": "noelcast-api"}


@app.get("/stations")
async def list_stations(
    q: str = Query(default="", description="Search query (name/country/tag)"),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    refresh: bool = Query(default=False, description="Force cache refresh"),
):
    """
    Returns Christmas radio stations.
    Optional search by name, country, or tags.
    """
    try:
        stations = await get_christmas_stations(force_refresh=refresh)
    except Exception as exc:
        logger.error("Failed to fetch stations: %s", exc)
        raise HTTPException(status_code=502, detail="Failed to fetch stations from Radio Browser API.")

    if q:
        q_lower = q.lower()
        stations = [
            s for s in stations
            if q_lower in (s.get("name") or "").lower()
            or q_lower in (s.get("country") or "").lower()
            or q_lower in (s.get("tags") or "").lower()
        ]

    total = len(stations)
    paginated = stations[offset : offset + limit]

    return JSONResponse(
        content={
            "total": total,
            "offset": offset,
            "limit": limit,
            "stations": paginated,
        }
    )


@app.get("/stations/{station_uuid}")
async def get_station(station_uuid: str):
    """Returns a single station by UUID."""
    try:
        stations = await get_christmas_stations()
    except Exception as exc:
        logger.error("Failed to fetch station %s: %s", station_uuid, exc)
        raise HTTPException(status_code=502, detail="Failed to fetch stations.")

    for station in stations:
        if station.get("stationuuid") == station_uuid:
            return station

    raise HTTPException(status_code=404, detail="Station not found.")


@app.get("/cron")
async def cron_job():
    """Endpoint for cron jobs to keep the server alive."""
    return {"status": "ok", "message": "Server is alive."}


# ── RAG: AI Station Recommender ───────────────────────────────────────────────
class AskRequest(BaseModel):
    query: str
    k: int = 5  # number of stations to retrieve


@app.post("/ask")
async def ask_noelcast(body: AskRequest):
    """
    RAG-powered AI station recommender.
    Accepts a natural language query and returns an AI-generated
    recommendation with the top-K matching stations.

    Example:
        POST /ask
        { "query": "cozy jazzy Christmas music" }
    """
    query = body.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty.")
    if len(query) > 300:
        raise HTTPException(status_code=400, detail="Query too long (max 300 characters).")

    try:
        result = rag.ask(query, k=min(body.k, 10))
        return JSONResponse(content=result)
    except Exception as exc:
        logger.error("RAG pipeline error: %s", exc)
        raise HTTPException(status_code=500, detail="AI recommender encountered an error.")


@app.get("/ask/status")
async def ask_status():
    """Returns whether the RAG index is loaded and ready."""
    return {"ready": rag.is_ready()}
