"""Accuracy round 2, run exactly as pre-registered in research/PREREG_accuracy_v2.md.

Yearly retraining, a district starting point, and paddy-season interactions.
Writes data/accuracy_v2.json.   usage: python research/accuracy_v2.py
"""
import json
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent))
from lw import config, ml  # noqa: E402
from signal_test import load, logloss  # noqa: E402

MIN_GAIN = 0.002
PSEUDO = 24
MAHA = {10, 11, 12, 1, 2}
CANDIDATES = ["district start", "rain x Maha", "cases x Maha"]


def priors(train):
    """Shrunk logit of each district's above-normal share, from training months only."""
    pooled = sum(r["outcome"] for r in train) / len(train)
    by = {}
    for r in train:
        n, k = by.get(r["district"], (0, 0))
        by[r["district"]] = (n + 1, k + r["outcome"])
    out = {}
    for d, (n, k) in by.items():
        p = (k + PSEUDO * pooled) / (n + PSEUDO)
        out[d] = math.log(p / (1 - p))
    base = math.log(pooled / (1 - pooled))
    return {d: v - base for d, v in out.items()}


def feats(r, extras, pri):
    x = ml.features(r)
    maha = float(int(r["target"][5:]) in MAHA)
    add = {"district start": pri.get(r["district"], 0.0), "rain x Maha": x[1] * maha, "cases x Maha": x[3] * maha}
    return x + [add[f] for f in extras]


def fit_predict(train, test, extras):
    pri = priors(train)
    w = ml.fit_logreg([feats(r, extras, pri) for r in train], [int(r["outcome"]) for r in train])
    return [ml.prob({"w": w, "platt": None}, feats(r, extras, pri)) for r in test]


def rolling_dev_loss(dev, extras):
    losses = []
    for year in ("2015", "2016", "2017"):
        tr = [r for r in dev if r["target"] < f"{year}-01"]
        te = [r for r in dev if r["target"][:4] == year]
        losses.append(logloss(fit_predict(tr, te, extras), [int(r["outcome"]) for r in te]))
    return sum(losses) / len(losses)


def select(dev):
    chosen, best = [], rolling_dev_loss(dev, [])
    steps = [{"features": [], "mean_logloss": round(best, 4)}]
    while True:
        trials = {f: rolling_dev_loss(dev, chosen + [f]) for f in CANDIDATES if f not in chosen}
        if not trials:
            break
        f, ll = min(trials.items(), key=lambda kv: kv[1])
        steps.append({"tried": {k: round(v, 4) for k, v in trials.items()}})
        if best - ll < MIN_GAIN:
            break
        chosen.append(f)
        best = ll
        steps.append({"features": list(chosen), "mean_logloss": round(best, 4)})
    return chosen, steps


def yearly(rs, test, extras):
    """For each test year Y, train on targets up to September of Y-1."""
    preds = {}
    for year in sorted({r["target"][:4] for r in test}):
        tr = [r for r in rs if r["target"] <= f"{int(year) - 1}-09"]
        te = [r for r in test if r["target"][:4] == year]
        for r, p in zip(te, fit_predict(tr, te, extras)):
            preds[id(r)] = p
    return [preds[id(r)] for r in test]


def main():
    recs, _ = load()
    out = {"preregistration": "research/PREREG_accuracy_v2.md",
           "caveat": "2018 onwards was used before; this is a second look, not a fresh test.", "lags": {}}
    for lag in config.LAGS:
        rs = [r for r in recs if r["lag"] == lag]
        dev = [r for r in rs if r["target"] < config.HELDOUT_FROM]
        test = [r for r in rs if r["target"] >= config.HELDOUT_FROM]
        yt = [int(r["outcome"]) for r in test]
        base_dev = sum(r["outcome"] for r in dev) / len(dev)
        k = sum(r["level"] == "warning" for r in test)
        chosen, steps = select(dev)

        versions = {
            "frozen, current features": fit_predict(dev, test, []),
            "yearly, current features": yearly(rs, test, []),
            "frozen, selected features": fit_predict(dev, test, chosen),
            "yearly, selected features": yearly(rs, test, chosen),
        }
        rows = {}
        for name, p in versions.items():
            cal = ml.calibration(p, yt, base_dev)
            rows[name] = {"auc": round(ml.auc(p, yt), 3), "brier": cal["brier"], "brier_base_rate": cal["brier_base_rate"],
                          "passed": cal["passed"], "precision_at_k": round(ml.precision_at(p, yt, k), 3), "ece": cal["ece"]}
        ref = rows["frozen, current features"]
        for name, r in rows.items():
            r["clears_bar"] = name != "frozen, current features" and r["passed"] and r["auc"] >= ref["auc"] + 0.01 \
                and r["brier"] < ref["brier"]
        winners = sorted((n for n, r in rows.items() if r["clears_bar"]), key=lambda n: rows[n]["brier"])
        out["lags"][str(lag)] = {"selected": chosen, "selection_steps": steps, "alerts_k": k, "test_months": len(test),
                                 "versions": rows, "adopted": winners[0] if winners else None}
        print(f"\nlag {lag}: selected {chosen or 'nothing'}  (steps: {steps})")
        for name, r in rows.items():
            print(f"  {name:<28} AUC {r['auc']:.3f}  Brier {r['brier']:.4f}  calib {'pass' if r['passed'] else 'FAIL'}"
                  f"  ECE {r['ece']:.3f}  prec@{k} {r['precision_at_k']:.1%}  {'CLEARS BAR' if r['clears_bar'] else ''}")
        print(f"  -> adopted: {winners[0] if winners else 'none'}")
    (config.DATA / "accuracy_v2.json").write_text(json.dumps(out, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
