"""CHIRPS daily rainfall averaged over each district polygon, via the ClimateSERV API (no raster code needed)."""
import datetime as dt
import json
import time
import urllib.parse
import urllib.request

from . import config


def _get(url, timeout=120):
    req = urllib.request.Request(url, headers={"User-Agent": config.USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read())


def district_polygons():
    """Main polygon of each district, thinned to ~80 vertices so it fits in a request URL."""
    def area(ring):
        return abs(sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(ring, ring[1:])) / 2)

    out = {}
    for f in json.load(open(config.GEO_PATH, encoding="utf-8"))["features"]:
        g = f["geometry"]
        rings = [g["coordinates"][0]] if g["type"] == "Polygon" else [p[0] for p in g["coordinates"]]
        ring = max(rings, key=area)
        ring = ring[:: max(1, len(ring) // 80)]
        ring = [[round(x, 4), round(y, 4)] for x, y in ring]
        out[f["properties"]["name"]] = {"type": "Polygon", "coordinates": [ring + [ring[0]]]}
    return out


def fetch_range(polygon, start, end):
    """Daily district-average rainfall (mm) between two dates, inclusive."""
    q = urllib.parse.urlencode({
        "datatype": 0, "intervaltype": 0, "operationtype": 5,           # CHIRPS, daily, average
        "begintime": start.strftime("%m/%d/%Y"), "endtime": end.strftime("%m/%d/%Y"),
        "geometry": json.dumps(polygon, separators=(",", ":"))})
    rid = _get(config.CLIMATESERV + "submitDataRequest/?" + q)[0]
    for _ in range(120):
        p = _get(config.CLIMATESERV + f"getDataRequestProgress/?id={rid}")[0]
        if p >= 100 or p < 0:
            break
        time.sleep(3)
    data = _get(config.CLIMATESERV + f"getDataFromRequest/?id={rid}", timeout=300)["data"]
    return [(f"{d['year']}-{d['month']:02d}-{d['day']:02d}", d["value"]["avg"]) for d in data
            if d["value"]["avg"] is not None and d["value"]["avg"] >= 0]


def collect(con, log=print, today=None):
    """Fetch rainfall from the day after each district's last stored date up to today."""
    from .store import last_rain_date, upsert_rain
    today = today or dt.date.today()
    added = 0
    for name, poly in district_polygons().items():
        last = last_rain_date(con, name)
        start = dt.date.fromisoformat(last) + dt.timedelta(days=1) if last else dt.date(2006, 1, 1)
        if start > today:
            continue
        while start <= today:                                           # 5-year chunks keep requests small
            end = min(today, dt.date(start.year + 4, 12, 31))
            try:
                rows = fetch_range(poly, start, end)
                upsert_rain(con, [(d, name, mm) for d, mm in rows])
                added += len(rows)
            except Exception as e:
                log(f"rain {name} {start}..{end} failed: {e}")
                break
            start = end + dt.timedelta(days=1)
    return added
