# Feature Prioritization Agent

An AI-native product management tool that transforms raw user feedback into a prioritized feature backlog, RICE-scored clusters, and a ready-to-share PRD — all in a few minutes.

Built with **Claude** (Anthropic), **FastAPI**, and **React + TypeScript**.

---

## What it does

1. **Ingest feedback** — paste text items or upload a CSV / TXT file
2. **Cluster & score** — Claude groups feedback into 3–8 thematic clusters and assigns RICE scores (Reach × Impact × Confidence / Effort) with reasoning
3. **Prioritize** — interactive RICE table lets you tweak scores and see live ranking
4. **Generate PRD** — one-click PRD for any cluster, streamed in real time, editable in-browser
5. **Executive Summary** — one-page stakeholder brief generated from the full backlog
6. **Export** — download as CSV, Excel, DOCX, or Jira-import CSV; share a read-only link

---

## Tech stack

| Layer | Technology |
|---|---|
| AI | Claude Sonnet via [Anthropic SDK](https://github.com/anthropics/anthropic-sdk-python) |
| Backend | Python 3.11 · FastAPI · uvicorn · slowapi (rate limiting) |
| Frontend | React 18 · TypeScript · Vite 5 · Tailwind CSS 3 · Zustand |
| Streaming | Server-Sent Events (SSE) |
| Storage | JSON file session cache · Redis (optional, for rate-limit persistence) |
| Deploy | Docker + docker-compose · nginx |

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) **or** Python 3.11+ and Node 20+
- An [Anthropic API key](https://console.anthropic.com/)

---

## Quick start (Docker)

```bash
# 1. Clone the repo
git clone https://github.com/your-username/feature-prioritization.git
cd feature-prioritization

# 2. Create .env from the example and add your API key
cp .env.example .env
# edit .env and set ANTHROPIC_API_KEY=sk-ant-...

# 3. Build and run
docker compose up --build
```

Open **http://localhost** in your browser.

---

## Manual setup (without Docker)

### Backend

```bash
cd backend

# Create a virtual environment
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set the API key (or copy ../.env.example to ../.env and fill it in)
export ANTHROPIC_API_KEY=sk-ant-...

# Start the server
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**.

> The Vite dev server proxies `/api/*` to `http://localhost:8000` automatically.

---

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | **yes** | — | Your Anthropic API key |
| `ALLOWED_ORIGINS` | no | `http://localhost:5173,http://localhost:3000` | Comma-separated CORS origins |
| `TRUST_PROXY` | no | — | Set to `1` when behind a reverse proxy (nginx, Cloudflare) to honour `X-Forwarded-For` for rate limiting |
| `REDIS_URL` | no | in-memory | Redis connection string for persistent rate-limit storage, e.g. `redis://redis:6379` |
| `SESSION_CACHE_PATH` | no | `backend/.session_cache.json` | Path where sessions are written; useful for Docker volume mounts |
| `FRONTEND_PORT` | no | `80` | Host port for the nginx container |

---

## Rate limits

The `/api/cluster` endpoint is limited to **1 analysis per IP per day** to control API costs. Adjust the `@limiter.limit(...)` decorator in `backend/main.py` if you're running privately.

---

## Project structure

```
feature-prioritization/
├── backend/
│   ├── main.py              # FastAPI routes
│   ├── claude_client.py     # Prompt logic & Anthropic SDK calls
│   ├── session_manager.py   # JSON-based session persistence
│   ├── docx_export.py       # DOCX generation
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/      # React components (screens, UI primitives)
│   │   ├── store.ts         # Zustand global state
│   │   ├── api.ts           # Typed API client
│   │   ├── i18n.ts          # EN / RU translations
│   │   └── types.ts         # Shared TypeScript types
│   ├── nginx.conf
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── DEPLOY.md                # Production deployment notes
```

---

## Supported languages

English and Russian. The language toggle on the upload screen switches both the UI and the AI-generated content.

---

## License

MIT
