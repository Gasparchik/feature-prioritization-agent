# Deploy

Three services run together: **backend** (FastAPI/uvicorn), **frontend** (built React app served by nginx, which also proxies `/api` to the backend) and **redis** (for persistent rate-limit counters).

## Prerequisites

- Docker + Docker Compose
- An Anthropic API key

## 1. Configure

Copy the example env file and fill it in:

```bash
cp .env.example .env
```

At minimum set `ANTHROPIC_API_KEY`. For a real deploy also set `ALLOWED_ORIGINS` to the public URL where the frontend will be served.

| Variable | What it does |
| --- | --- |
| `ANTHROPIC_API_KEY` | **Required.** Used by all generation endpoints. |
| `ALLOWED_ORIGINS` | Comma-separated CORS allowlist. Set to the public frontend URL in prod. |
| `TRUST_PROXY` | When set, backend reads `X-Forwarded-For` for rate-limit keying. Compose sets this to `1` automatically. |
| `REDIS_URL` | Redis connection string. Compose wires this to the bundled redis service. |
| `SESSION_CACHE_PATH` | Where session JSON is written. Compose mounts a named volume at this path. |
| `FRONTEND_PORT` | Host port for the frontend (default `80`). |

## 2. Build and run

```bash
docker compose up -d --build
```

Visit `http://localhost` (or whatever `FRONTEND_PORT` you set).

To follow logs:

```bash
docker compose logs -f backend
docker compose logs -f frontend
```

To stop:

```bash
docker compose down
```

Add `-v` to also wipe the redis cache and saved sessions:

```bash
docker compose down -v
```

## 3. Behind your own reverse proxy

If you front this with nginx / Caddy / Cloudflare Tunnel, the frontend container already serves both the static app and the `/api/*` proxy on port 80 — point your proxy at that single port.

Make sure the outer proxy forwards `X-Forwarded-For` so the backend can apply per-IP rate limits correctly. `TRUST_PROXY=1` is already set in `docker-compose.yml`.

## 4. Updating

Pull, rebuild, restart:

```bash
git pull
docker compose up -d --build
```

Named volumes (`session-data`, `redis-data`) survive rebuilds, so saved sessions and rate-limit counters persist.

## Running without Docker

**Backend:**

```bash
cd backend
pip install -r requirements.txt
export ANTHROPIC_API_KEY=sk-ant-...
uvicorn main:app --host 0.0.0.0 --port 8000
```

**Frontend (production build):**

```bash
cd frontend
npm install
npm run build
npm run preview -- --host 0.0.0.0 --port 80
```

For production-grade serving, copy `frontend/dist` to your static host and point a reverse proxy at the backend for `/api/*`.

## Notes

- Rate limit is **1 cluster analysis per IP per day**. Generation endpoints (PRD, summary) are not rate-limited.
- Without `REDIS_URL`, rate-limit state is in-memory and resets on backend restart — fine for a single instance, not for HA.
- The legacy Streamlit app at the repo root (`app.py`, top-level `requirements.txt`) is not part of this deployment.
