"""Load the research snapshot (case reports 2006-2025, CHIRPS 2006-Sep 2026) into the local database.

Run once after cloning:  python scripts/seed.py
Then keep it current with:  python scripts/update.py
"""
import csv
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from lw import config, store  # noqa: E402


def write_geojson():
    """Simplified district boundaries (geoBoundaries ADM2, CC BY 4.0) with a plain `name` property."""
    raw = json.load(open(config.DATA / "districts_raw.geojson", encoding="utf-8"))
    feats = []
    for f in raw["features"]:
        g = f["geometry"]
        polys = [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]
        polys = [[[[round(x, 3), round(y, 3)] for x, y in ring[::2]] + [[round(ring[0][0], 3), round(ring[0][1], 3)]]
                  for ring in poly] for poly in polys]
        feats.append({"type": "Feature", "properties": {"name": f["properties"]["shapeName"].replace(" District", "")},
                      "geometry": {"type": "MultiPolygon", "coordinates": polys}})
    json.dump({"type": "FeatureCollection", "features": feats}, open(config.GEO_PATH, "w", encoding="utf-8"),
              separators=(",", ":"))


def main():
    config.DATA.mkdir(exist_ok=True)
    write_geojson()
    with store.connect() as con:
        rows = []
        for r in csv.DictReader(open(config.SEED / "wer_weekly.csv")):
            for d in config.DISTRICTS:
                if r.get(d):
                    rows.append(dict(week_end=r["week_end"], week=int(r["week"] or 0) or None, district=d,
                                     ytd=int(r[d]), national_ytd=int(r["national_ytd"]) if r["national_ytd"] else None,
                                     source="seed:wer_weekly.csv (archived WER PDFs)", fetched_at=store.now()))
        store.upsert_reports(con, rows)
        rain = [(r["date"], r["district"], float(r["rain_mm"])) for r in
                csv.DictReader(open(config.SEED / "chirps_daily_district.csv")) if r["rain_mm"]]
        store.upsert_rain(con, rain)
        store.log_run(con, "seed", "ok", f"{len(rows)} case rows, {len(rain)} rain rows")
        print(f"seeded {len(rows)} case-report rows and {len(rain)} daily rain rows")


if __name__ == "__main__":
    main()
