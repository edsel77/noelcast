"""
NoelCast Backend — Christmas Radio Station API
Proxies Radio Browser API calls with caching and CORS support.
"""

import asyncio
import time
import logging
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

# ── Cache ──────────────────────────────────────────────────────────────────────
_CACHE_TTL = 3600  # 1 hour
_cache: dict = {"stations": None, "fetched_at": 0}
_cache_lock = asyncio.Lock()

# ── Radio Browser API hosts ────────────────────────────────────────────────────
RADIO_BROWSER_HOSTS = [
    "de1.api.radio-browser.info",
    "nl1.api.radio-browser.info",
    "at1.api.radio-browser.info",
]

CHRISTMAS_TAGS = ["christmas", "xmas", "holiday music", "noel"]

# Fields we actually need (keeps payload small)
KEEP_FIELDS = {
    "stationuuid",
    "name",
    "url",
    "url_resolved",
    "homepage",
    "tags",
    "country",
    "countrycode",
    "language",
    "languagecodes",
    "codec",
    "bitrate",
    "votes",
    "lastcheckok",
    "geo_lat",
    "geo_long",
}


async def _fetch_by_tag(client: httpx.AsyncClient, host: str, tag: str) -> list[dict]:
    """Fetch stations for a single tag from a given host."""
    url = f"https://{host}/json/stations/bytag/{tag}"
    params = {
        "limit": 200,
        "hidebroken": "true",
        "order": "votes",
        "reverse": "true",
    }
    resp = await client.get(url, params=params, timeout=15.0)
    resp.raise_for_status()
    return resp.json()


async def _try_fetch_from_hosts(tag: str) -> list[dict]:
    """Try each Radio Browser mirror until one responds."""
    async with httpx.AsyncClient() as client:
        for host in RADIO_BROWSER_HOSTS:
            try:
                return await _fetch_by_tag(client, host, tag)
            except Exception as exc:
                logger.warning("Host %s failed for tag %s: %s", host, tag, exc)
    return []


def _clean_station(raw: dict) -> Optional[dict]:
    """Strip fields, validate URL, return None if station unusable."""
    if not raw.get("url_resolved") and not raw.get("url"):
        return None
    if raw.get("lastcheckok") == 0:
        return None

    cleaned = {k: raw.get(k) for k in KEEP_FIELDS}
    # Prefer resolved URL
    cleaned["stream_url"] = raw.get("url_resolved") or raw.get("url")
    return cleaned


def _deduplicate(stations: list[dict]) -> list[dict]:
    seen: set[str] = set()
    result = []
    for s in stations:
        uid = s.get("stationuuid", "")
        if uid and uid not in seen:
            seen.add(uid)
            result.append(s)
    return result


async def get_christmas_stations(force_refresh: bool = False) -> list[dict]:
    """
    Returns a cached list of Christmas radio stations.
    Fetches from Radio Browser API if cache is stale.
    """
    async with _cache_lock:
        now = time.time()
        if (
            not force_refresh
            and _cache["stations"] is not None
            and now - _cache["fetched_at"] < _CACHE_TTL
        ):
            return _cache["stations"]

        logger.info("Fetching Christmas stations from Radio Browser API...")
        all_raw: list[dict] = []

        # Fetch all tags concurrently
        tasks = [_try_fetch_from_hosts(tag) for tag in CHRISTMAS_TAGS]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        for result in results:
            if isinstance(result, list):
                all_raw.extend(result)

        cleaned = [s for raw in all_raw if (s := _clean_station(raw)) is not None]
        unique = _deduplicate(cleaned)

        # Sort by votes descending
        unique.sort(key=lambda s: s.get("votes") or 0, reverse=True)

        _cache["stations"] = unique
        _cache["fetched_at"] = now

        logger.info("Loaded %d Christmas stations into cache.", len(unique))
        return unique
