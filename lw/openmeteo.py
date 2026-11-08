"""Near-real-time district rainfall from Open-Meteo (free, no key), for the weekly outlook.

CHIRPS (used by the monthly system) is published weeks after the month ends, which makes any outlook
late. Open-Meteo's archive API serves ERA5-based daily rainfall from 1940 up to today, and its forecast
API the next 16 days. Each district is the average of up to POINTS points spread inside its main polygon.
Stored in data/weekly.sqlite: rain_om (history to today) and rain_fc (forecast, replaced each run).
"""
import datetime as dt
import json
import sqlite3
import time
import urllib.error
import urllib.parse
import urllib.request

from . import config

ARCHIVE = "https://archive-api.open-meteo.com/v1/archive"
FORECAST = "https://api.open-meteo.com/v1/forecast"
POINTS = 6
WEEKLY_DB = config.DATA / "weekly.sqlite"
SCHEMA = """
CREATE TABLE IF NOT EXISTS rain_om (date TEXT NOT NULL, district TEXT NOT NULL, mm REAL, PRIMARY KEY (date, district));
CREATE TABLE IF NOT EXISTS rain_fc (date TEXT NOT NULL, district TEXT NOT NULL, mm REAL, issued TEXT, PRIMARY KEY (date, district));
"""


def _inside(x, y, ring):
    c = False
    for (x1, y1), (x2, y2) in zip(ring, ring[1:]):
        if (y1 > y) != (y2 > y) and x < x1 + (y - y1) * (x2 - x1) / (y2 - y1):
            c = not c
    return c


def district_points():
    """Up to POINTS evenly spread grid points (0.05 deg) inside each district's main polygon."""
    out = {}
    for f in json.load(open(config.GEO_PATH, encoding="utf-8"))["features"]:
        polys = f["geometry"]["coordinates"]
        ring = max((p[0] for p in polys), key=len)
        xs, ys = [p[0] for p in ring], [p[1] for p in ring]
        grid = [(round(x / 20, 3), round(y / 20, 3))
                for x in range(int(min(xs) * 20), int(max(xs) * 20) + 1)
                for y in range(int(min(ys) * 20), int(max(ys) * 20) + 1)
                if _inside(x / 20, y / 20, ring)]
        if not grid:
            grid = [(sum(xs) / len(xs), sum(ys) / len(ys))]
        step = max(1, len(grid) // POINTS)
        out[f["properties"]["name"]] = grid[::step][:POINTS]
    return out


def _get(url, params, tries=12, wait=300):
    """GET with a polite back-off: the free tier limits long history requests per minute and per hour."""
    req = urllib.request.Request(url + "?" + urllib.parse.urlencode(params), headers={"User-Agent": config.USER_AGENT})
    for attempt in range(tries):
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            if e.code != 429 or attempt == tries - 1:
                raise
            print(f"  rate limited, waiting {wait}s", flush=True)
            time.sleep(wait)


def _average(resp):
    resp = resp if isinstance(resp, list) else [resp]
    days = resp[0]["daily"]["time"]
    out = []
    for i, d in enumerate(days):
        v = [r["daily"]["precipitation_sum"][i] for r in resp if r["daily"]["precipitation_sum"][i] is not None]
        out.append((d, round(sum(v) / len(v), 2) if v else None))
    return out


def collect(start=dt.date(2006, 1, 1), today=None, log=print):
    """Fetch history (resumable: from each district's last stored day) and the 16-day forecast."""
    today = today or dt.date.today()
    con = sqlite3.connect(WEEKLY_DB)
    con.executescript(SCHEMA)
    issued = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
    for name, pts in district_points().items():
        lat = ",".join(str(y) for _, y in pts)
        lon = ",".join(str(x) for x, _ in pts)
        last = con.execute("SELECT MAX(date) FROM rain_om WHERE district=?", (name,)).fetchone()[0]
        frm = max(start, dt.date.fromisoformat(last) - dt.timedelta(10)) if last else start   # refresh the last days
        try:
            rows = _average(_get(ARCHIVE, {"latitude": lat, "longitude": lon, "start_date": frm.isoformat(),
                                           "end_date": today.isoformat(), "daily": "precipitation_sum",
                                           "timezone": "Asia/Colombo"}))
            con.executemany("INSERT OR REPLACE INTO rain_om VALUES (?,?,?)", [(d, name, mm) for d, mm in rows if mm is not None])
            fc = _average(_get(FORECAST, {"latitude": lat, "longitude": lon, "daily": "precipitation_sum",
                                          "forecast_days": 16, "timezone": "Asia/Colombo"}))
            con.execute("DELETE FROM rain_fc WHERE district=?", (name,))
            con.executemany("INSERT INTO rain_fc VALUES (?,?,?,?)",
                            [(d, name, mm, issued) for d, mm in fc if mm is not None and d > today.isoformat()])
            con.commit()
            log(f"{name}: {len(rows)} days, {len(pts)} points")
        except Exception as e:
            log(f"{name}: failed ({e})")
        time.sleep(20)
    con.close()
