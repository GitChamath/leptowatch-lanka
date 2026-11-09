"""Soil-moisture test for the weekly outlook (research/PREREG_soil.md).

    python research/soil_test.py --explore   # development decisions only (targets before 2018)
    python research/soil_test.py             # the one held-out run of the pre-registered rule -> data/soil_test.json

Soil wetness (NASA POWER, MERRA-2 based; research/soil_fetch_power.py) is averaged over the last 28 or 56 days and
compared with the median of the same window in earlier years, like rainy days. NASA POWER runs about 4 days behind,
so each Saturday's window ends LAG_DAYS before it: only data that would have existed that day is used.
(Open-Meteo soil moisture was tried first but hit the free daily limit, so it was not used.)
"""
import datetime as dt
import json
import sqlite3
import statistics as st
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from lw import config, engine, openmeteo, weekly  # noqa: E402

LAYERS = {"top": 0, "root": 1}          # top soil, root zone
WINDOWS = (28, 56)
LAG_DAYS = 4


def soil_series():
    con = sqlite3.connect(openmeteo.WEEKLY_DB)
    out = defaultdict(dict)
    for d, name, a, b in con.execute("SELECT date, district, top, root FROM soil_power"):
        out[name][dt.date.fromisoformat(d)] = (a, b)
    return out


class Soil:
    def __init__(self, series):
        self.s = series
        self._mean = {}

    def mean(self, end, n, layer):
        k = (end, n, layer)
        if k not in self._mean:
            v = [self.s.get(end - dt.timedelta(i)) for i in range(n)]
            self._mean[k] = None if any(x is None or x[layer] is None for x in v) else sum(x[layer] for x in v) / n
        return self._mean[k]

    def anomaly(self, w, n, layer):
        w = w - dt.timedelta(LAG_DAYS)
        now = self.mean(w, n, layer)
        hist = [x for k in range(1, 20) if (x := self.mean(weekly.years_back(w, k), n, layer)) is not None]
        if now is None or len(hist) < config.HISTORY_MIN:
            return None
        return now - st.median(hist)


def history():
    cons = weekly.open_all()
    pts, (rain, _) = weekly.case_points(cons), weekly.rain_days(cons)
    soil = soil_series()
    last = min(max(max(r) for r in rain.values() if r), max(max(s) for s in soil.values()) + dt.timedelta(LAG_DAYS))
    out = []
    for name in config.DISTRICTS:
        d = weekly.District(weekly.Cases(pts.get(name, {})), rain.get(name, {}))
        so = Soil(soil.get(name, {}))
        for w in weekly.decision_days(weekly.FIRST_DECISION, last):
            extra = {f"soil_{lay}_{n}": so.anomaly(w, n, i) for lay, i in LAYERS.items() for n in WINDOWS}
            for lead in weekly.LEADS:
                a = d.assess(w, lead)
                if a:
                    c, nm = a["cases_data_month"], a["cases_normal"]
                    out.append(a | extra | {"district": name, "case_ratio": c / nm if c is not None and nm else None})
    return out


def relabel(r, moist, k=weekly.WARNING_CASE_RATIO):
    """Level under a rule whose wetness signal is `moist(r)`; a Warning needs wetness and cases above k x usual."""
    wet = bool(moist(r))
    cr = r["case_ratio"]
    case_up = bool(r["case_signal"])
    level = "warning" if wet and cr is not None and cr > k else "watch" if wet or case_up else "normal"
    return r | {"level": level, "rain_signal": wet}


def up(key):
    return lambda r: (r[key] or 0) > 0


CANDIDATES = {"current (rain 8 weeks)": lambda r: r["rain_signal"]}
for lay in LAYERS:
    for n in WINDOWS:
        key = f"soil_{lay}_{n}"
        CANDIDATES[f"soil {lay} {n}d"] = up(key)
        CANDIDATES[f"rain 8 weeks AND soil {lay} {n}d"] = lambda r, key=key: r["rain_signal"] and (r[key] or 0) > 0
        CANDIDATES[f"rain 8 weeks OR soil {lay} {n}d"] = lambda r, key=key: r["rain_signal"] or (r[key] or 0) > 0


def scores(recs, moist, period):
    res = {}
    for lead in weekly.LEADS:
        rs = [relabel(r, moist) for r in recs if r["lag"] == lead]
        rs = [r for r in rs if (r["target"] < config.HELDOUT_FROM) == (period == "dev")]
        res[str(lead)] = engine.score(rs)
    return res


def explore(recs):
    cur = scores(recs, CANDIDATES["current (rain 8 weeks)"], "dev")
    rows = []
    for name, f in CANDIDATES.items():
        s = scores(recs, f, "dev")
        ok = all(s[l]["warning"]["recall"] >= 0.8 * cur[l]["warning"]["recall"] for l in ("1", "2"))
        avg = (s["1"]["warning"]["precision"] + s["2"]["warning"]["precision"]) / 2
        rows.append((ok, avg, name, s))
    for ok, avg, name, s in sorted(rows, key=lambda x: (-x[0], -x[1])):
        print(f"{'OK ' if ok else '   '} avgP={avg:.3f}  {name:34} " + "  ".join(
            f"L{l} P={s[l]['warning']['precision']:.3f} R={s[l]['warning']['recall']:.3f} n={s[l]['warning']['alerts']} "
            f"wet-alone={s[l]['rain_only_rule']['precision']:.3f}" for l in ("1", "2")))


CHOSEN = None   # research/PREREG_soil.md: no soil rule beat the current one on development years, so none was run


def heldout(recs):
    out = {"chosen": CHOSEN, "results": {}}
    for name in ("current (rain 8 weeks)", CHOSEN):
        out["results"][name] = {p: scores(recs, CANDIDATES[name], p) for p in ("dev", "heldout")}
    cur, ch = out["results"]["current (rain 8 weeks)"]["heldout"], out["results"][CHOSEN]["heldout"]
    out["adopted"] = all(ch[l]["warning"]["precision"] > cur[l]["warning"]["precision"] for l in ("1", "2"))
    (config.DATA / "soil_test.json").write_text(json.dumps(out, indent=1), encoding="utf-8")
    for name, res in out["results"].items():
        for l in ("1", "2"):
            h = res["heldout"][l]["warning"]
            print(f"{name:34} lead {l}: held-out Warning {h['precision']:.1%} ({h['correct']}/{h['alerts']}), recall {h['recall']:.1%}")
    print("adopted:", out["adopted"])


if __name__ == "__main__":
    recs = history()
    if "--explore" in sys.argv:
        recs = [r for r in recs if r["target"] < config.HELDOUT_FROM]       # held-out records dropped up front
        explore(recs)
    else:
        assert CHOSEN, "write research/PREREG_soil.md and set CHOSEN first"
        heldout(recs)
