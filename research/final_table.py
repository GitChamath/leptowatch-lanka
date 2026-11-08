"""Final held-out table for the proposal: Watch (rain), cases-above-normal, Warning (both).
All 25 districts pooled; development period 2011-2017, held-out 2018+. Rules fixed in advance
(rainy-days above the same-month median; no feature or district selection).
usage: final_table.py wer_monthly.csv chirps_daily_district.csv"""
import csv, json, math, os, sys, tempfile
from collections import defaultdict

sys.stdout.reconfigure(encoding="utf-8")
here = os.path.dirname(os.path.abspath(__file__))
wer_csv, rain_csv = sys.argv[1:3]

# district_test.py reads one JSON per district; rebuild that layout from the saved CSV
tmp = tempfile.mkdtemp()
rows = defaultdict(list)
for r in csv.DictReader(open(rain_csv)):
    y, m, d = map(int, r["date"].split("-"))
    rows[r["district"]].append((y, m, d, float(r["rain_mm"]) if r["rain_mm"] else None))
for k, v in rows.items():
    json.dump(v, open(os.path.join(tmp, k + ".json"), "w"))

import runpy, contextlib
sys.argv = [sys.argv[0], wer_csv, tmp, "none.xlsx"]
with open(os.devnull, "w", encoding="utf-8") as null, contextlib.redirect_stdout(null):
    g = runpy.run_path(os.path.join(here, "district_test.py"), run_name="dt")
backtest, series, cases, rdays = (g[k] for k in ("backtest", "series", "cases", "rdays"))


def stats(recs, key):
    truth = [r["truth"] for r in recs]
    flag = [key(r) for r in recs]
    tp = sum(f and t for f, t in zip(flag, truth)); w = sum(flag); pos = sum(truth)
    base = pos / len(truth)
    z = (tp - 0.5 - w * base) / math.sqrt(w * base * (1 - base))
    return f"{tp}/{w} prec={tp / w:4.0%} rec={tp / pos:4.0%} lift={tp / w / base:4.2f} p={0.5 * math.erfc(z / math.sqrt(2)):.4f}"


for lag in (1, 2):
    allrecs = []
    for d in sorted(cases):
        if d in rdays:
            allrecs += backtest(series(d, cases), series(d, rdays), lag)
    for name, recs in (("2011-2017", [r for r in allrecs if r["month"] < "2018-01"]),
                       ("2018+ held-out", [r for r in allrecs if r["month"] >= "2018-01"])):
        base = sum(r["truth"] for r in recs) / len(recs)
        print(f"lag {lag} {name:<15} n={len(recs)} base={base:.1%}")
        print("   Watch (rain)        ", stats(recs, lambda r: r["wet"]))
        print("   Cases above normal  ", stats(recs, lambda r: r["persist"]))
        print("   Warning (both)      ", stats(recs, lambda r: r["wet"] and r["persist"]))
