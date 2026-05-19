import json
import os
import time
import uuid as _uuid_mod
from datetime import datetime
from pathlib import Path

_FILE = Path(os.getenv("SESSION_CACHE_PATH") or (Path(__file__).parent / ".session_cache.json"))


def _now() -> float:
    return time.time()


def _load_raw() -> dict:
    if not _FILE.exists():
        return {"sessions": []}
    try:
        data = json.loads(_FILE.read_text(encoding="utf-8"))
        if "sessions" not in data:
            return {"sessions": [{"id": "legacy", "name": datetime.now().strftime("%b %d · %H:%M"),
                                   "ts": _now(), "data": data}]}
        return data
    except Exception:
        return {"sessions": []}


def _save_raw(raw: dict):
    try:
        _FILE.write_text(json.dumps(raw, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception:
        pass


def list_sessions() -> list[dict]:
    sessions = _load_raw()["sessions"]
    return sorted([{"id": s["id"], "name": s["name"], "ts": s["ts"]} for s in sessions],
                  key=lambda x: x["ts"], reverse=True)


def save(data: dict, session_id: str | None = None, name: str | None = None) -> str:
    raw = _load_raw()
    if session_id:
        for s in raw["sessions"]:
            if s["id"] == session_id:
                s["data"] = data
                s["ts"] = _now()
                if name is not None:
                    s["name"] = name
                _save_raw(raw)
                return session_id
    sid = _uuid_mod.uuid4().hex[:8]
    raw["sessions"].append({"id": sid,
                             "name": name or datetime.now().strftime("%b %d · %H:%M"),
                             "ts": _now(), "data": data})
    _save_raw(raw)
    return sid


def load(session_id: str | None = None) -> dict | None:
    raw = _load_raw()
    if not raw["sessions"]:
        return None
    if session_id:
        for s in raw["sessions"]:
            if s["id"] == session_id:
                return s["data"]
        return None
    return max(raw["sessions"], key=lambda x: x["ts"])["data"]


def rename(session_id: str, name: str):
    raw = _load_raw()
    for s in raw["sessions"]:
        if s["id"] == session_id:
            s["name"] = name
            break
    _save_raw(raw)


def delete(session_id: str):
    raw = _load_raw()
    raw["sessions"] = [s for s in raw["sessions"] if s["id"] != session_id]
    _save_raw(raw)
