"""Daily CHIRPS rainfall averaged over each Sri Lankan district, via the ClimateSERV API.
usage: chirps_fetch.py districts.geojson outdir [District,District...]"""
import json, os, sys, time, urllib.parse, urllib.request

API = "https://climateserv.servirglobal.net/api/"
geo, out = sys.argv[1], sys.argv[2]
only = set(sys.argv[3].split(",")) if len(sys.argv) > 3 else None
os.makedirs(out, exist_ok=True)


def area(r):
    return abs(sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(r, r[1:])) / 2)


def get(url, timeout=120):
    with urllib.request.urlopen(url, timeout=timeout) as r:
        return json.loads(r.read())


for f in json.load(open(geo, encoding="utf-8"))["features"]:
    name = f["properties"]["shapeName"].replace(" District", "")
    if only and name not in only:
        continue
    fn = os.path.join(out, f"{name}.json")
    if os.path.exists(fn):
        continue
    g = f["geometry"]
    rings = [g["coordinates"][0]] if g["type"] == "Polygon" else [p[0] for p in g["coordinates"]]
    ring = max(rings, key=area)                       # main landmass
    step = max(1, len(ring) // 80)                    # keep ~80 vertices for a short URL
    ring = ring[::step]
    ring = [[round(x, 4), round(y, 4)] for x, y in ring] + [[round(ring[0][0], 4), round(ring[0][1], 4)]]
    gj = json.dumps({"type": "Polygon", "coordinates": [ring]}, separators=(",", ":"))
    rows = []
    for y0 in range(2006, 2027, 5):                   # 5-year chunks
        y1 = min(y0 + 4, 2026)
        end = "09/30/2026" if y1 == 2026 else f"12/31/{y1}"
        q = urllib.parse.urlencode({"datatype": 0, "begintime": f"01/01/{y0}", "endtime": end,
                                    "intervaltype": 0, "operationtype": 5, "geometry": gj})
        for attempt in range(4):
            try:
                rid = get(API + "submitDataRequest/?" + q)[0]
                for _ in range(120):
                    p = get(API + f"getDataRequestProgress/?id={rid}")[0]
                    if p >= 100 or p < 0:
                        break
                    time.sleep(3)
                data = get(API + f"getDataFromRequest/?id={rid}", timeout=300)["data"]
                rows += [(d["year"], d["month"], d["day"], d["value"]["avg"]) for d in data]
                break
            except Exception as e:
                print("retry", name, y0, e, flush=True)
                time.sleep(10)
    json.dump(rows, open(fn, "w"))
    print("ok", name, len(rows), flush=True)
