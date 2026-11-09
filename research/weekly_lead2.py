"""A separate rule for weeks 5-8 (research/PREREG_weekly_lead2.md).

    python research/weekly_lead2.py select    # development years only -> data/weekly_lead2_select.json
    python research/weekly_lead2.py heldout   # the one held-out run of the chosen rule -> data/weekly_lead2.json

Rebuilds every weeks 5-8 decision exactly as lw/weekly.py does (officer counts, and public reports 8 weeks late),
adds the numbers the candidate rules need, all known on the decision day, and relabels each record per rule.
"""
import datetime as dt
import itertools
import json
import statistics as st
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from lw import config, engine, weekly  # noqa: E402

LEAD = 2
CURRENT = {"R": 56, "e": 0, "k": 1.4, "trend": False, "season": False}
GRID = [{"R": R, "e": e, "k": k, "trend": t, "season": s}
        for R, e, k, t, s in itertools.product((28, 56, 84), (0, 3, 6), (1.0, 1.2, 1.4, 1.7, 2.0), (False, True), (False, True))]
MIN_RECALL_SHARE, MIN_ALERTS = 0.8, 150


class Rain:
    """Rainy-day counts over any window, from prefix sums."""

    def __init__(self, rain):
        self.start = min(rain) if rain else dt.date(2100, 1, 1)
        n = (max(rain) - self.start).days + 1 if rain else 0
        self.wet, self.miss = [0] * (n + 1), [0] * (n + 1)
        for i in range(n):
            v = rain.get(self.start + dt.timedelta(i))
            self.wet[i + 1] = self.wet[i] + (v is not None and v >= config.RAINY_DAY_MM)
            self.miss[i + 1] = self.miss[i] + (v is None)

    def rainy(self, end, n):
        b = (end - self.start).days + 1
        a = b - n
        if a < 0 or b >= len(self.wet) or self.miss[b] - self.miss[a]:
            return None
        return self.wet[b] - self.wet[a]

    def excess(self, w, n):
        x = self.rainy(w, n)
        hist = [h for k in range(1, 20) if (h := self.rainy(weekly.years_back(w, k), n)) is not None]
        return None if x is None or len(hist) < config.HISTORY_MIN else x - st.median(hist)


def records():
    """Weeks 5-8 records for both back-tests, with the extra numbers each candidate rule needs."""
    cons = weekly.open_all()
    pts, (rain, _) = weekly.case_points(cons), weekly.rain_days(cons)
    last_rain = max(max(r) for r in rain.values() if r)
    out = {0: [], weekly.PUBLIC_DELAY: []}
    for name in config.DISTRICTS:
        d = weekly.District(weekly.Cases(pts.get(name, {})), rain.get(name, {}))
        rn = Rain(rain.get(name, {}))
        for w in weekly.decision_days(weekly.FIRST_DECISION, last_rain):
            ex = None
            for delay in out:
                a = d.assess(w, LEAD, delay=delay)
                if not a:
                    continue
                if ex is None:
                    ex = {R: rn.excess(w, R) for R in (28, 56, 84)}
                c = normal = prev = season_up = None
                if a["cases_to"]:
                    cw = dt.date.fromisoformat(a["cases_to"])
                    lv, si_now = d.level(cw), d.seasonal(cw, cw)
                    c = d.window(cw)
                    normal = lv * si_now if lv and si_now else None
                    prev = d.cases.between(cw - dt.timedelta(56), cw - dt.timedelta(28))
                    si_t = d.seasonal(w + dt.timedelta(weekly.WINDOW * LEAD), cw)
                    season_up = None if not si_t or not si_now else si_t > si_now
                out[delay].append(a | {"district": name, "c": c, "normal": normal, "prev": prev,
                                       "season_up": season_up, "rain_ex": ex})
    return out


def label(r, p):
    ex = r["rain_ex"][p["R"]]
    rain = ex is not None and ex > p["e"]
    c, n = r["c"], r["normal"]
    case_up = c is not None and n is not None and c > n
    strong = case_up and c > p["k"] * n
    if p["trend"]:
        strong = strong and r["prev"] is not None and c > r["prev"]
    if p["season"]:
        strong = strong and bool(r["season_up"])
    level = "warning" if rain and strong else "watch" if rain or case_up else "normal"
    return {"level": level, "outcome": r["outcome"], "rain_signal": rain, "case_signal": r["case_signal"]}


def score(recs, p):
    return engine.score([label(r, p) for r in recs])


def name(p):
    return f"rain {p['R'] // 7} weeks > usual + {p['e']}, cases > {p['k']} x usual" + \
        (", rising" if p["trend"] else "") + (", season rising" if p["season"] else "")


def select():
    recs = records()
    # the engine's own labels must be reproduced by the current rule
    same = sum(label(r, CURRENT)["level"] == r["level"] for r in recs[0])
    print(f"current rule reproduces the engine on {same} of {len(recs[0])} records")
    dev = [r for r in recs[0] if r["target"] < config.HELDOUT_FROM]      # held-out records are dropped here
    cur = score(dev, CURRENT)["warning"]
    rows = []
    for p in GRID:
        s = score(dev, p)["warning"]
        rows.append({"rule": p, "name": name(p), "dev": s})
    ok = [x for x in rows if x["dev"]["recall"] >= MIN_RECALL_SHARE * cur["recall"] and x["dev"]["alerts"] >= MIN_ALERTS]
    dist = lambda p: sum(p[k] != CURRENT[k] for k in CURRENT)  # noqa: E731
    chosen = max(ok, key=lambda x: (round(x["dev"]["precision"], 4), -(x["rule"]["trend"] + x["rule"]["season"]),
                                    -dist(x["rule"])))
    out = {"current": {"rule": CURRENT, "dev": cur}, "eligible": len(ok), "chosen": chosen,
           "top": sorted(ok, key=lambda x: -x["dev"]["precision"])[:10]}
    (config.DATA / "weekly_lead2_select.json").write_text(json.dumps(out, indent=1), encoding="utf-8")
    print(f"current: dev {cur['precision']:.1%} ({cur['alerts']} alerts, recall {cur['recall']:.1%})")
    print(f"{len(ok)} of {len(GRID)} rules eligible; top by development precision:")
    for x in out["top"]:
        print(f"  {x['dev']['precision']:.1%} ({x['dev']['alerts']} alerts, recall {x['dev']['recall']:.1%})  {x['name']}")
    print("chosen:", chosen["name"])


def heldout():
    sel = json.loads((config.DATA / "weekly_lead2_select.json").read_text(encoding="utf-8"))
    p = sel["chosen"]["rule"]
    recs = records()
    res = {}
    for delay, label_ in ((0, "officer"), (weekly.PUBLIC_DELAY, "public")):
        held = [r for r in recs[delay] if r["target"] >= config.HELDOUT_FROM]
        dev = [r for r in recs[delay] if r["target"] < config.HELDOUT_FROM]
        res[label_] = {k: {"dev": score(dev, q), "heldout": score(held, q)} for k, q in (("current", CURRENT), ("chosen", p))}
        if label_ == "officer":
            lead1 = [r for r in weekly.history(weekly.open_all()) if r["lag"] == 1 and r["target"] >= config.HELDOUT_FROM]
            byk = {(r["district"], r["decided"]): r["level"] for r in lead1}
            ch = [label(r, p)["level"] for r in held]
            differs = sum(byk.get((r["district"], r["decided"])) not in (None, lv) for r, lv in zip(held, ch))
            res["differs_from_next_4_weeks"] = {"decisions": len(held), "different_colour": differs}
    adopted = all(res[x]["chosen"]["heldout"]["warning"]["precision"] > res[x]["current"]["heldout"]["warning"]["precision"]
                  for x in ("officer", "public"))
    out = {"rule": p, "name": sel["chosen"]["name"], "results": res, "adopted": adopted}
    (config.DATA / "weekly_lead2.json").write_text(json.dumps(out, indent=1), encoding="utf-8")
    for x in ("officer", "public"):
        for k in ("current", "chosen"):
            h, d = res[x][k]["heldout"]["warning"], res[x][k]["dev"]["warning"]
            print(f"{x:8} {k:8} dev {d['precision']:.1%} ({d['alerts']})  held-out {h['precision']:.1%} "
                  f"({h['correct']}/{h['alerts']}), recall {h['recall']:.1%}")
    print("different colour from next 4 weeks:", res["differs_from_next_4_weeks"])
    print("adopted:", adopted)


if __name__ == "__main__":
    {"select": select, "heldout": heldout}[sys.argv[1]]()
