"""New signals for the risk percentage, run exactly as pre-registered in research/PREREG_new_signals.md.

Candidates: case trend, rain over 3 months, heavy-rain days, neighbour cases, national cases.
Forward selection on 2011-2015 -> 2016-2017 log loss, one refit on 2011-2017, one score on 2018+.
Writes data/signal_test.json (shown on the How it works page).

usage: python research/signal_test.py
"""
import json
import math
import statistics as st
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from lw import config, engine, ml, store  # noqa: E402
from lw.series import month_range, monthly_cases, monthly_rain  # noqa: E402

INNER_SPLIT = "2016-01"
MIN_GAIN = 0.002
HEAVY_MM = 20.0
CANDIDATES = ["case trend", "rain 3 months", "heavy-rain days", "neighbour cases", "national cases"]


# ---------------------------------------------------------------- data
def neighbours():
    """Districts sharing a border: any two boundary vertices within about 1 km."""
    geo = json.load(open(config.GEO_PATH, encoding="utf-8"))
    cell = 0.01
    grid = defaultdict(set)
    for f in geo["features"]:
        name = f["properties"]["name"]
        for poly in f["geometry"]["coordinates"]:
            for ring in poly:
                for x, y in ring:
                    grid[(round(x / cell), round(y / cell))].add(name)
    adj = defaultdict(set)
    for (gx, gy), names in grid.items():
        near = set(names)
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                near |= grid.get((gx + dx, gy + dy), set())
        for a in names:
            adj[a] |= near - {a}
    return {d: sorted(adj[d]) for d in config.DISTRICTS}


def heavy_days(con):
    out = defaultdict(lambda: defaultdict(int))
    for r in con.execute("SELECT date, district, mm FROM rain_daily WHERE mm IS NOT NULL"):
        if r["mm"] >= HEAVY_MM:
            out[r["district"]][r["date"][:7]] += 1
    return out


def case_anomaly(model, k):
    """Log ratio of cases in month k to that month's normal, as the engine computes it at k."""
    if k < 0 or model.C[k] is None:
        return None
    level, si = model._level[k + 1], model._seasonal(model.M[k], k)
    if not level or not si:
        return None
    return math.log((model.C[k] + 1) / (level * si + 1))


def rel(x, hist):
    if x is None or len(hist) < 3:
        return None
    m = st.median(hist)
    return (x - m) / max(m, 1.0)


def load():
    with store.connect() as con:
        cases, (rainy, _) = monthly_cases(con), monthly_rain(con)
        heavy_raw = heavy_days(con)
    last = max(m for d in rainy.values() for m in d)
    months = month_range(config.FIRST_MONTH, last)
    models = {n: engine.District(months, cases.get(n, {}), rainy.get(n, {})) for n in config.DISTRICTS}
    adj = neighbours()

    # per district, per month index: case anomaly, 3-month rain anomaly, heavy-rain anomaly
    ca = {n: [case_anomaly(m, k) for k in range(len(months))] for n, m in models.items()}
    rain3, heavy = {}, {}
    for n, m in models.items():
        R = m.R
        win = [sum(R[k - 2:k + 1]) if k >= 2 and all(v is not None for v in R[k - 2:k + 1]) else None
               for k in range(len(months))]
        rain3[n] = [rel(win[k], [win[i] for i in range(k % 12, k, 12) if win[i] is not None]) for k in range(len(months))]
        H = [heavy_raw[n].get(months[k], 0) if R[k] is not None else None for k in range(len(months))]
        heavy[n] = [rel(H[k], [H[i] for i in range(k % 12, k, 12) if H[i] is not None]) for k in range(len(months))]
    national = [st.mean(v) if (v := [ca[n][k] for n in config.DISTRICTS if ca[n][k] is not None]) else None
                for k in range(len(months))]

    recs = []
    for n, model in models.items():
        for lag in config.LAGS:
            for t in range(config.WARMUP_MONTHS, len(months)):
                a = model.assess(t, lag)
                if not a or a["outcome"] is None:
                    continue
                k = t - lag
                nb = [ca[x][k] for x in adj[n] if ca[x][k] is not None]
                extra = {"case trend": ca[n][k - 1] if k >= 1 else None, "rain 3 months": rain3[n][k],
                         "heavy-rain days": heavy[n][k], "neighbour cases": st.mean(nb) if nb else None,
                         "national cases": national[k]}
                recs.append(a | {"district": n, "extra": {f: (v if v is not None else 0.0) for f, v in extra.items()}})
    return recs, adj


# ---------------------------------------------------------------- modelling
def X(recs, extras):
    return [ml.features(r) + [r["extra"][f] for f in extras] for r in recs]


def y(recs):
    return [int(r["outcome"]) for r in recs]


def logloss(p, yy):
    return -sum(math.log(max(min(q, 1 - 1e-9), 1e-9)) if t else math.log(max(min(1 - q, 1 - 1e-9), 1e-9))
                for q, t in zip(p, yy)) / len(yy)


def fit_prob(train, test, extras):
    w = ml.fit_logreg(X(train, extras), y(train))
    return [ml.prob({"w": w, "platt": None}, x) for x in X(test, extras)]


def select(dev):
    inner_tr = [r for r in dev if r["target"] < INNER_SPLIT]
    inner_va = [r for r in dev if r["target"] >= INNER_SPLIT]
    chosen, steps = [], []
    best = logloss(fit_prob(inner_tr, inner_va, chosen), y(inner_va))
    steps.append({"features": [], "logloss_2016_2017": round(best, 4)})
    while True:
        trials = {f: logloss(fit_prob(inner_tr, inner_va, chosen + [f]), y(inner_va))
                  for f in CANDIDATES if f not in chosen}
        if not trials:
            break
        f, ll = min(trials.items(), key=lambda kv: kv[1])
        steps.append({"tried": {k: round(v, 4) for k, v in trials.items()}})
        if best - ll < MIN_GAIN:
            break
        chosen.append(f)
        best = ll
        steps.append({"features": list(chosen), "logloss_2016_2017": round(best, 4)})
    return chosen, steps


def publishable(dev, test, extras, base_dev):
    """Same route as lw/ml.py: raw model, and if it fails the check, refit on 2011-2015 + Platt on 2016-2017."""
    w = ml.fit_logreg(X(dev, extras), y(dev))
    p = [ml.prob({"w": w, "platt": None}, x) for x in X(test, extras)]
    cal = ml.calibration(p, y(test), base_dev)
    method = "raw"
    if not cal["passed"]:
        early = [r for r in dev if r["target"] < ml.RECAL_TRAIN_END]
        late = [r for r in dev if r["target"] >= ml.RECAL_TRAIN_END]
        w = ml.fit_logreg(X(early, extras), y(early))
        Xl = X(late, extras)
        platt_b, platt_a = ml.fit_logreg([[1.0, ml._logit(ml.prob({"w": w, "platt": None}, x))] for x in Xl], y(late), l2=0.0)
        model = {"w": w, "platt": [platt_a, platt_b]}
        p = [ml.prob(model, x) for x in X(test, extras)]
        cal = ml.calibration(p, y(test), base_dev)
        method = "recalibrated"
    return p, cal, method, w


def main():
    recs, adj = load()
    out = {"preregistration": "research/PREREG_new_signals.md", "neighbours": adj, "lags": {}}
    for lag in config.LAGS:
        rs = [r for r in recs if r["lag"] == lag]
        dev = [r for r in rs if r["target"] < config.HELDOUT_FROM]
        test = [r for r in rs if r["target"] >= config.HELDOUT_FROM]
        base_dev = sum(y(dev)) / len(dev)
        yt = y(test)
        k = sum(r["level"] == "warning" for r in test)

        chosen, steps = select(dev)
        res = {}
        for name, extras in (("current", []), ("new", chosen)):
            p, cal, method, w = publishable(dev, test, extras, base_dev)
            res[name] = {"features": extras, "method": method, "auc": round(ml.auc(p, yt), 3),
                         "brier": cal["brier"], "brier_base_rate": cal["brier_base_rate"], "passed": cal["passed"],
                         "precision_at_k": round(ml.precision_at(p, yt, k), 3),
                         "weights": dict(zip(ml.FEATURES + extras, [round(v, 3) for v in w]))}
        cur, new = res["current"], res["new"]
        rules = {"passes_calibration": new["passed"], "auc_up_0_01": new["auc"] >= cur["auc"] + 0.01,
                 "brier_lower": new["brier"] < cur["brier"]}
        adopt = bool(chosen) and all(rules.values())
        out["lags"][str(lag)] = {"test_months": len(test), "alerts_k": k, "selected": chosen, "selection_steps": steps,
                                 "current": cur, "new": new, "promotion_rule": rules, "adopted": adopt}
        print(f"\nlag {lag}: selected {chosen or 'nothing'}")
        for name in ("current", "new"):
            r = res[name]
            print(f"  {name:<8} AUC {r['auc']:.3f}  Brier {r['brier']:.4f} (base {r['brier_base_rate']:.4f})  "
                  f"calibration {'passed' if r['passed'] else 'FAILED'} ({r['method']})  precision@{k} {r['precision_at_k']:.1%}")
        print(f"  promotion rule: {rules} -> {'ADOPT' if adopt else 'not adopted'}")
    (config.DATA / "signal_test.json").write_text(json.dumps(out, indent=1), encoding="utf-8")
    print("\nwritten data/signal_test.json")


if __name__ == "__main__":
    main()
