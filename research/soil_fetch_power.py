"""Daily soil wetness per district from NASA POWER (MERRA-2 based; GWETTOP = top soil, GWETROOT = root zone,
0 = completely dry, 1 = saturated), for the soil-moisture test (research/PREREG_soil.md). Free, no key.
Stored in data/weekly.sqlite, table soil_power. NASA POWER is about 4 days behind real time.

    python research/soil_fetch_power.py
"""
import datetime as dt
import json
import sqlite3
import sys
import time
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from lw import config, openmeteo  # noqa: E402

URL = ("https://power.larc.nasa.gov/api/temporal/daily/point?parameters=GWETTOP,GWETROOT&community=AG"
       "&longitude={lon}&latitude={lat}&start={start}&end={end}&format=JSON")
SCHEMA = "CREATE TABLE IF NOT EXISTS soil_power (date TEXT, district TEXT, top REAL, root REAL, PRIMARY KEY (date, district))"


def centre(pts):
    """The grid point nearest the middle of the district's points (MERRA-2 cells are about 50 km wide)."""
    mx, my = sum(x for x, _ in pts) / len(pts), sum(y for _, y in pts) / len(pts)
    return min(pts, key=lambda p: (p[0] - mx) ** 2 + (p[1] - my) ** 2)


def main(start=dt.date(2006, 1, 1)):
    end = dt.date.today()
    con = sqlite3.connect(openmeteo.WEEKLY_DB)
    con.execute(SCHEMA)
    for name, pts in openmeteo.district_points().items():
        x, y = centre(pts)
        url = URL.format(lon=x, lat=y, start=start.strftime("%Y%m%d"), end=end.strftime("%Y%m%d"))
        req = urllib.request.Request(url, headers={"User-Agent": config.USER_AGENT})
        for attempt in range(5):
            try:
                with urllib.request.urlopen(req, timeout=300) as r:
                    p = json.loads(r.read())["properties"]["parameter"]
                break
            except Exception as e:                       # noqa: BLE001 - retry any network hiccup
                print(f"  {name}: {e}, retrying", flush=True)
                time.sleep(30)
        else:
            raise SystemExit(f"{name}: gave up")
        rows = []
        for d, top in p["GWETTOP"].items():
            root = p["GWETROOT"].get(d)
            if top is not None and top > -900 and root is not None and root > -900:
                rows.append((f"{d[:4]}-{d[4:6]}-{d[6:]}", name, top, root))
        con.executemany("INSERT OR REPLACE INTO soil_power VALUES (?,?,?,?)", rows)
        con.commit()
        print(f"{name}: {len(rows)} days at {y}, {x}; last {rows[-1][0] if rows else '-'}", flush=True)
        time.sleep(3)
    con.close()
    print("done")


if __name__ == "__main__":
    main()
