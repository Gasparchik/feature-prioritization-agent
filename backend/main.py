import asyncio
import io
import json
import os
import sys
from pathlib import Path
from typing import Annotated, Any, Literal, Optional

import pandas as pd
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel, Field
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

load_dotenv(Path(__file__).parent.parent / ".env")

sys.path.insert(0, str(Path(__file__).parent))
from claude_client import ClaudeClient
from docx_export import generate_docx
import session_manager

app = FastAPI(title="Feature Prioritization API")

def _client_ip(request: Request) -> str:
    # When behind a trusted reverse proxy (nginx, Cloudflare, etc.), use the
    # first IP in X-Forwarded-For. Only honor it when TRUST_PROXY is set so a
    # direct client cannot spoof the header.
    if os.getenv("TRUST_PROXY"):
        fwd = request.headers.get("X-Forwarded-For")
        if fwd:
            return fwd.split(",")[0].strip()
    return get_remote_address(request)


limiter = Limiter(
    key_func=_client_ip,
    storage_uri=os.getenv("REDIS_URL") or "memory://",
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

_allowed_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _allowed_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def rice_score(r: int, i: float, c: int, e: float) -> float:
    return (r * i * (c / 100)) / e if e > 0 else 0.0


def rice_to_priority(score: float) -> str:
    if score >= 200: return "Highest"
    if score >= 100: return "High"
    if score >= 50:  return "Medium"
    if score >= 20:  return "Low"
    return "Lowest"


def effort_to_sp(effort: float) -> int:
    fibs = [1, 2, 3, 5, 8, 13, 21, 34]
    return min(fibs, key=lambda f: abs(f - effort * 8))


# ── Pydantic models ───────────────────────────────────────────────────────────

class ClusterRequest(BaseModel):
    feedback: Annotated[
        list[Annotated[str, Field(max_length=200)]],
        Field(min_length=3, max_length=20),
    ]
    language: Literal["ru", "en"] = "en"


class Rice(BaseModel):
    reach: int
    reach_reasoning: str
    impact: float
    impact_reasoning: str
    confidence: int
    confidence_reasoning: str
    effort: float
    effort_reasoning: str


class Cluster(BaseModel):
    id: int
    name: str
    description: str
    items: list[str]
    item_count: int
    rice: Rice
    rice_score: float


class GenerateRequest(BaseModel):
    clusters: list[Cluster]
    language: Literal["ru", "en"] = "en"
    initiative_id: Optional[int] = None


class ExportDocxRequest(BaseModel):
    clusters: list[Cluster]
    content: str
    language: Literal["ru", "en"] = "en"


class SessionSaveRequest(BaseModel):
    language: str
    step: str
    feedback_list: list[str]
    clusters: Optional[list[Any]] = None
    prd_content: Optional[str] = None
    summary_content: Optional[str] = None
    session_id: Optional[str] = None
    session_name: Optional[str] = None


class RenameRequest(BaseModel):
    name: str


# ── Upload ────────────────────────────────────────────────────────────────────

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    content = await file.read()
    fname = (file.filename or "").lower()
    try:
        if fname.endswith(".txt"):
            text = content.decode("utf-8", errors="replace")
            items = [ln.strip() for ln in text.splitlines() if ln.strip()]
            return {"type": "items", "items": items}
        elif fname.endswith(".xlsx"):
            df = pd.read_excel(io.BytesIO(content), engine="openpyxl")
        else:
            df = pd.read_csv(io.BytesIO(content))
        return {"type": "table", "columns": df.columns.tolist(),
                "data": df.head(500).fillna("").to_dict(orient="list")}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Clustering ────────────────────────────────────────────────────────────────

@app.post("/api/cluster")
@limiter.limit("1/day")
async def cluster_feedback(request: Request, req: ClusterRequest):
    if len(req.feedback) < 3:
        raise HTTPException(status_code=400, detail="Need at least 3 feedback items")
    try:
        result, usage = ClaudeClient().cluster_feedback(req.feedback, req.language)
        clusters = result["clusters"]
        for c in clusters:
            r = c["rice"]
            c["rice_score"] = rice_score(r["reach"], r["impact"], r["confidence"], r["effort"])
        return {"clusters": clusters, "usage": usage}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/cluster/stream")
@limiter.limit("1/day")
async def cluster_feedback_stream(request: Request, req: ClusterRequest):
    if len(req.feedback) < 3:
        raise HTTPException(status_code=400, detail="Need at least 3 feedback items")

    async def generate():
        n = len(req.feedback)
        yield f"data: {json.dumps({'phase': 'ingest', 'msg': f'Loaded {n} feedback items'})}\n\n"
        yield f"data: {json.dumps({'phase': 'clean', 'msg': 'Deduplicating and normalizing...'})}\n\n"
        yield f"data: {json.dumps({'phase': 'embed', 'msg': 'Vectorizing feedback...'})}\n\n"
        yield f"data: {json.dumps({'phase': 'cluster', 'msg': 'Clustering with Claude...'})}\n\n"
        try:
            loop = asyncio.get_event_loop()
            result, usage = await loop.run_in_executor(
                None, lambda: ClaudeClient().cluster_feedback(req.feedback, req.language)
            )
            clusters = result["clusters"]
            for c in clusters:
                r = c["rice"]
                c["rice_score"] = rice_score(r["reach"], r["impact"], r["confidence"], r["effort"])
            yield f"data: {json.dumps({'phase': 'label', 'msg': f'Found {len(clusters)} clusters'})}\n\n"
            yield f"data: {json.dumps({'phase': 'rice', 'msg': 'Scored RICE metrics for all clusters'})}\n\n"
            yield f"data: {json.dumps({'done': True, 'clusters': clusters, 'usage': usage})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


# ── Streaming ─────────────────────────────────────────────────────────────────

@app.post("/api/prd/stream")
async def stream_prd(req: GenerateRequest):
    client = ClaudeClient()
    clusters_dicts = [c.model_dump() for c in req.clusters]

    def generate():
        yield f"data: {json.dumps({'phase': 'prepare', 'msg': 'Preparing PRD prompt...'})}\n\n"
        yield f"data: {json.dumps({'phase': 'outline', 'msg': 'Structuring document sections...'})}\n\n"
        with client.stream_prd(clusters_dicts, req.language, req.initiative_id) as stream:
            for text in stream.text_stream:
                yield f"data: {json.dumps({'text': text})}\n\n"
            try:
                m = stream.get_final_message()
                yield f"data: {json.dumps({'done': True, 'usage': {'input': m.usage.input_tokens, 'output': m.usage.output_tokens}})}\n\n"
            except Exception:
                yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@app.post("/api/summary/stream")
async def stream_summary(req: GenerateRequest):
    client = ClaudeClient()
    clusters_dicts = [c.model_dump() for c in req.clusters]

    def generate():
        yield f"data: {json.dumps({'phase': 'prepare', 'msg': 'Preparing summary prompt...'})}\n\n"
        with client.stream_executive_summary(clusters_dicts, req.language) as stream:
            for text in stream.text_stream:
                yield f"data: {json.dumps({'text': text})}\n\n"
            yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


# ── Export ────────────────────────────────────────────────────────────────────

@app.post("/api/export/docx")
async def export_docx(req: ExportDocxRequest):
    try:
        data = generate_docx([c.model_dump() for c in req.clusters], req.content, req.language)
        return Response(content=data,
                        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                        headers={"Content-Disposition": "attachment; filename=feature_prd.docx"})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/export/csv")
async def export_csv(req: GenerateRequest):
    srt = sorted([c.model_dump() for c in req.clusters], key=lambda x: x["rice_score"], reverse=True)
    rows = [{"Rank": i + 1, "Feature": c["name"], "Reach": c["rice"]["reach"],
             "Impact": c["rice"]["impact"], "Confidence": f"{c['rice']['confidence']}%",
             "Effort": c["rice"]["effort"], "RICE Score": f"{c['rice_score']:.0f}"}
            for i, c in enumerate(srt)]
    csv_bytes = pd.DataFrame(rows).to_csv(index=False).encode("utf-8-sig")
    return Response(content=csv_bytes, media_type="text/csv",
                    headers={"Content-Disposition": "attachment; filename=feature_backlog.csv"})


@app.post("/api/export/xlsx")
async def export_xlsx(req: GenerateRequest):
    srt = sorted([c.model_dump() for c in req.clusters], key=lambda x: x["rice_score"], reverse=True)
    rows = [{"Rank": i + 1, "Feature": c["name"], "Reach": c["rice"]["reach"],
             "Impact": c["rice"]["impact"], "Confidence": f"{c['rice']['confidence']}%",
             "Effort": c["rice"]["effort"], "RICE Score": f"{c['rice_score']:.0f}"}
            for i, c in enumerate(srt)]
    buf = io.BytesIO()
    pd.DataFrame(rows).to_excel(buf, index=False, engine="openpyxl")
    return Response(content=buf.getvalue(),
                    media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    headers={"Content-Disposition": "attachment; filename=feature_backlog.xlsx"})


@app.post("/api/export/jira")
async def export_jira(req: GenerateRequest):
    srt = sorted([c.model_dump() for c in req.clusters], key=lambda x: x["rice_score"], reverse=True)
    rows = []
    for c in srt:
        items = c.get("items", [])
        rice = c["rice"]
        priority = rice_to_priority(c["rice_score"])
        epic_name = c["name"]
        epic_desc = (f"{c['description']}\n\nRICE Score: {c['rice_score']:.0f} | "
                     f"Reach: {rice['reach']} | Impact: {rice['impact']}x | "
                     f"Confidence: {rice['confidence']}% | Effort: {rice['effort']} person-months")
        if items:
            epic_desc += "\n\nUser Feedback:\n" + "\n".join(f"- {i}" for i in items)
        rows.append({"Issue Type": "Epic", "Summary": epic_name, "Description": epic_desc,
                     "Priority": priority, "Story Points": effort_to_sp(rice["effort"]),
                     "Epic Name": epic_name, "Epic Link": "",
                     "Labels": f"product-backlog rice-{c['rice_score']:.0f}"})
        for item in items:
            rows.append({"Issue Type": "Story",
                         "Summary": item[:120] + ("…" if len(item) > 120 else ""),
                         "Description": f"User feedback:\n{item}", "Priority": priority,
                         "Story Points": "", "Epic Name": "", "Epic Link": epic_name,
                         "Labels": "user-feedback"})
    cols = ["Issue Type", "Summary", "Description", "Priority",
            "Story Points", "Epic Name", "Epic Link", "Labels"]
    csv_bytes = pd.DataFrame(rows, columns=cols).to_csv(index=False).encode("utf-8-sig")
    return Response(content=csv_bytes, media_type="text/csv",
                    headers={"Content-Disposition": "attachment; filename=jira_import.csv"})


# ── Sessions ──────────────────────────────────────────────────────────────────

@app.get("/api/sessions")
async def get_sessions():
    return session_manager.list_sessions()


@app.post("/api/sessions")
async def save_session(req: SessionSaveRequest):
    data = {k: v for k, v in req.model_dump().items()
            if k not in ("session_id", "session_name")}
    sid = session_manager.save(data, session_id=req.session_id, name=req.session_name)
    return {"id": sid}


@app.get("/api/sessions/{session_id}")
async def load_session(session_id: str):
    data = session_manager.load(session_id)
    if data is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return data


@app.put("/api/sessions/{session_id}")
async def rename_session(session_id: str, req: RenameRequest):
    session_manager.rename(session_id, req.name)
    return {"ok": True}


@app.delete("/api/sessions/{session_id}")
async def delete_session(session_id: str):
    session_manager.delete(session_id)
    return {"ok": True}
