# 🎄 NoelCast Backend

FastAPI backend for [NoelCast](../README.md) — a Christmas radio streaming app.

Proxies and caches station data from the [Radio Browser API](https://api.radio-browser.info/), serving a clean, deduplicated list of Christmas radio stations to the frontend.

---

## Tech Stack

- **[FastAPI](https://fastapi.tiangolo.com/)** — async Python web framework
- **[httpx](https://www.python-httpx.org/)** — async HTTP client for upstream API calls
- **[uvicorn](https://www.uvicorn.org/)** — ASGI server
- **[python-dotenv](https://pypi.org/project/python-dotenv/)** — environment variable loading

---

## Local Development

### Prerequisites

- Python 3.11+
- `pip`

### Setup

```bash
# 1. Clone the repo and navigate to the backend
cd backend

# 2. Create and activate a virtual environment
python -m venv venv
source venv/bin/activate      # macOS/Linux
venv\Scripts\activate         # Windows

# 3. Install dependencies
pip install -r requirements.txt

# 4. Copy the example env file and fill in your values
cp .env.example .env

# 5. Run the dev server
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.

Interactive docs (Swagger UI): `http://localhost:8000/docs`

---

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Required | Default | Description |
|---|---|---|---|
| `ALLOWED_ORIGINS` | Yes | — | Comma-separated list of allowed frontend origins for CORS |
| `PORT` | No | `8000` | Port to bind (set automatically by Render) |

**Example:**
```env
ALLOWED_ORIGINS=http://localhost:8081,http://localhost:19006,https://your-app.netlify.app
PORT=8000
```

> **Note:** Netlify deploy preview URLs (`*.netlify.app`) are automatically allowed via regex, so you don't need to list each preview URL manually.

---

## API Reference

### `GET /health`
Health check endpoint used by Render to verify the service is running.

```json
{ "status": "ok", "service": "noelcast-api" }
```

---

### `GET /stations`
Returns a paginated, cached list of Christmas radio stations.

**Query Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `q` | `string` | `""` | Search by name, country, or tags |
| `limit` | `int` | `100` | Max stations to return (1–500) |
| `offset` | `int` | `0` | Pagination offset |
| `refresh` | `bool` | `false` | Force a cache refresh |

**Example:**
```
GET /stations?q=christmas&limit=50&offset=0
```

**Response:**
```json
{
  "total": 42,
  "offset": 0,
  "limit": 50,
  "stations": [
    {
      "stationuuid": "...",
      "name": "Christmas FM",
      "stream_url": "https://...",
      "country": "Ireland",
      "countrycode": "IE",
      "tags": "christmas,holiday music",
      "bitrate": 128,
      "votes": 1500
    }
  ]
}
```

---

### `GET /stations/{station_uuid}`
Returns a single station by its UUID.

**Response:** A single station object (same shape as above), or `404` if not found.

---

## How Caching Works

Station data is fetched from the [Radio Browser API](https://api.radio-browser.info/) across multiple mirrors (`de1`, `nl1`, `at1`) for resilience.

- Results are **cached in memory** for **1 hour** (`_CACHE_TTL = 3600`)
- The cache is **pre-warmed on startup** via FastAPI's `lifespan` hook
- All four Christmas tags (`christmas`, `xmas`, `holiday music`, `noel`) are fetched **concurrently** with `asyncio.gather`
- Duplicates are removed by `stationuuid` before caching
- Cache access is protected by an `asyncio.Lock` to prevent thundering-herd on cold start

---

## Deployment (Render)

A `render.yaml` is included for one-click deployment to [Render](https://render.com/).

1. Fork this repo
2. Go to [Render Dashboard](https://dashboard.render.com/) → **New Web Service**
3. Connect your fork and point it to the `backend/` directory
4. Set `ALLOWED_ORIGINS` in the **Environment** tab to your frontend's deployed URL
5. Render will auto-detect `render.yaml` and configure the service

**Start command used by Render:**
```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```
