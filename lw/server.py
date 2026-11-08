"""Local API + dashboard server (standard library only).

GET  /                         dashboard
GET  /api/summary              current alerts, badges, track records, pooled results (no history)
GET  /api/district/<name>      one district with its full monthly history
GET  /api/replay?month=&lag=   what every district was told for a past month, and what happened
GET  /api/status               data freshness and recent runs
GET  /readme                    the technical README (plain text)
GET  /api/weekly               weekly rolling outlook (next 4 weeks and weeks 5-8), its back-test and model
POST /api/weekly_cases         officer counts for the last 28 days: district,YYYY-MM-DD,cases -> weekly outlook recomputed
POST /api/cases                officer counts as CSV lines: district,YYYY-MM,cases  -> alerts recomputed
"""
import json
import re
import threading
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import datetime as dt
import sqlite3

from . import config, engine, store, weekly

WEB = config.ROOT / "web"
TYPES = {".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
         ".css": "text/css; charset=utf-8", ".json": "application/json", ".geojson": "application/json",
         ".svg": "image/svg+xml"}
_lock = threading.Lock()
_state = {}
_mtime = None
WEEKLY_STATE = config.DATA / "weekly_state.json"
_weekly, _wmtime = {}, None


def load_weekly():
    global _weekly, _wmtime
    if not WEEKLY_STATE.exists():
        return {}
    m = WEEKLY_STATE.stat().st_mtime
    if m != _wmtime:
        _weekly, _wmtime = json.loads(WEEKLY_STATE.read_text(encoding="utf-8")), m
    return _weekly


def rebuild_weekly():
    """Live weekly outlook only, reusing the checked model (no retraining per count)."""
    with _lock:
        state = dict(load_weekly())
        cons = weekly.open_all()
        state["districts"] = weekly.live(cons, state.get("ml"))
        for c in cons:
            c.close()
        tmp = WEEKLY_STATE.with_suffix(".tmp")
        tmp.write_text(json.dumps(state, separators=(",", ":")), encoding="utf-8")
        tmp.replace(WEEKLY_STATE)
    load_weekly()


def load_state():
    """(Re)load state.json when it changed on disk, e.g. after a scheduled update."""
    global _state, _mtime
    mtime = config.STATE_PATH.stat().st_mtime
    if mtime != _mtime:
        _state = json.loads(config.STATE_PATH.read_text(encoding="utf-8"))
        _mtime = mtime


def rebuild():
    with _lock, store.connect() as con:
        state = engine.build_state(con, ml_model=_state.get("ml"))   # reuse the checked model; no retraining per count
        state["runs"] = store.recent_runs(con)
        engine.write_state(state)
        store.log_run(con, "build_state", "ok", "after officer counts")
    load_state()


def summary():
    return {k: v for k, v in _state.items() if k != "districts"} | {
        "districts": {n: {k: v for k, v in d.items() if k != "history"} for n, d in _state["districts"].items()}}


def replay(month, lag):
    out = {}
    for name, d in _state["districts"].items():
        rec = next((h for h in d["history"] if h["target"] == month and h["lag"] == lag), None)
        out[name] = rec
    return {"month": month, "lag": lag, "districts": out}


def parse_counts(text):
    rows, errors = [], []
    for n, line in enumerate(text.strip().splitlines(), 1):
        parts = [p.strip() for p in line.split(",")]
        if n == 1 and parts[0].lower() == "district":
            continue
        if len(parts) != 3:
            errors.append(f"line {n}: expected district,YYYY-MM,cases"); continue
        district, month, cases = parts
        match = next((d for d in config.DISTRICTS if d.lower() == district.lower()), None)
        if not match:
            errors.append(f"line {n}: unknown district '{district}'")
        elif not re.fullmatch(r"20\d\d-(0[1-9]|1[0-2])", month):
            errors.append(f"line {n}: month must be YYYY-MM")
        elif not cases.isdigit():
            errors.append(f"line {n}: cases must be a whole number")
        else:
            rows.append((month, match, int(cases)))
    return rows, errors


class Handler(BaseHTTPRequestHandler):
    def _send(self, code, body, ctype="application/json"):
        data = body if isinstance(body, bytes) else json.dumps(body, separators=(",", ":")).encode()
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        url = urllib.parse.urlparse(self.path)
        q = urllib.parse.parse_qs(url.query)
        path = url.path
        if path.startswith("/api/"):
            load_state()
        if path == "/api/summary":
            return self._send(200, summary())
        if path.startswith("/api/district/"):
            name = urllib.parse.unquote(path.rsplit("/", 1)[1])
            d = _state["districts"].get(name)
            return self._send(200, d | {"name": name}) if d else self._send(404, {"error": "unknown district"})
        if path == "/api/replay":
            month, lag = q.get("month", [""])[0], int(q.get("lag", ["2"])[0])
            if not re.fullmatch(r"\d{4}-\d{2}", month):
                return self._send(400, {"error": "month must be YYYY-MM"})
            return self._send(200, replay(month, lag))
        if path == "/api/weekly":
            w = load_weekly()
            return self._send(200, w) if w else self._send(404, {"error": "no weekly outlook yet"})
        if path == "/api/status":
            return self._send(200, {"data": _state["data"], "runs": _state.get("runs", [])})
        if path == "/readme":                      # technical README for specialists, as plain text
            return self._send(200, (config.ROOT / "README.md").read_bytes(), "text/plain; charset=utf-8")
        if path == "/data/districts.geojson":
            return self._send(200, config.GEO_PATH.read_bytes(), TYPES[".geojson"])
        file = (WEB / ("index.html" if path in ("/", "") else urllib.parse.unquote(path).lstrip("/"))).resolve()
        root = WEB.resolve()
        if (file == root or root in file.parents) and file.is_file():   # stay inside web/ (built React app)
            return self._send(200, file.read_bytes(), TYPES.get(file.suffix, "application/octet-stream"))
        self._send(404, {"error": "not found"})

    def do_POST(self):
        if self.path not in ("/api/cases", "/api/weekly_cases"):
            return self._send(404, {"error": "not found"})
        length = int(self.headers.get("Content-Length") or 0)
        if length > 100_000:
            return self._send(413, {"error": "too large"})
        if self.path == "/api/weekly_cases":
            return self._weekly_cases(self.rfile.read(length).decode("utf-8", "replace"))
        rows, errors = parse_counts(self.rfile.read(length).decode("utf-8", "replace"))
        if errors or not rows:
            return self._send(400, {"error": "; ".join(errors) or "no rows"})
        with store.connect() as con:
            store.upsert_officer(con, rows)
            store.log_run(con, "officer_counts", "ok", f"{len(rows)} rows")
        rebuild()
        self._send(200, {"saved": len(rows)})

    def _weekly_cases(self, text):
        rows, errors = [], []
        for n, line in enumerate(text.strip().splitlines(), 1):
            parts = [p.strip() for p in line.split(",")]
            if len(parts) != 3:
                errors.append(f"line {n}: expected district,YYYY-MM-DD,cases"); continue
            district = next((d for d in config.DISTRICTS if d.lower() == parts[0].lower()), None)
            try:
                day = dt.date.fromisoformat(parts[1])
            except ValueError:
                day = None
            if not district:
                errors.append(f"line {n}: unknown district '{parts[0]}'")
            elif not day:
                errors.append(f"line {n}: date must be YYYY-MM-DD")
            elif not parts[2].isdigit():
                errors.append(f"line {n}: cases must be a whole number")
            else:
                rows.append((day.isoformat(), district, int(parts[2]), store.now()))
        if errors or not rows:
            return self._send(400, {"error": "; ".join(errors) or "no rows"})
        con = sqlite3.connect(config.DB_PATH)
        con.execute(weekly.OFFICER_SCHEMA)
        con.executemany("INSERT OR REPLACE INTO officer_weekly VALUES (?,?,?,?)", rows)
        con.commit()
        con.close()
        rebuild_weekly()
        self._send(200, {"saved": len(rows)})

    def log_message(self, fmt, *args):
        pass


def serve(port=8000):
    load_state()
    httpd = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"LeptoWatch running at http://127.0.0.1:{port}")
    httpd.serve_forever()
