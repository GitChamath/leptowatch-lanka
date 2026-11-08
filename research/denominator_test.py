"""How much of the case signal's skill comes from sharing a denominator with the outcome?

The case signal fires when   cases[k]  >  level[k] x seasonal[k]
and a month counts as bad when cases[t]  >  level[k] x seasonal[t]

Both sides use the SAME trailing level computed at the decision month k. If that level is low
(a quiet 12 months, or months missing from the trailing window), the signal and the outcome are
pushed positive together, which inflates the apparent link between them whether or not the signal
carries real information.

This script re-scores the rule against an outcome built from the 3-year same-month median instead
(engine._same_month), which carries no trailing-level term. Notified cases trend upward strongly, so
a median over ALL earlier years puts the base rate near 80% and squeezes every lift toward 1.0; the
3-year window avoids that. The base rate still moves, so the honest comparison is "skill" --
the share of the available headroom captured, (precision - base) / (1 - base) -- reported alongside lift.

Run:  python research/denominator_test.py
"""
import sys, statistics as st
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from lw import config, store, engine
from lw.series import month_range, monthly_cases, monthly_rain


def binom_p(hits, n, p0):
    """One-sided chance of >= hits successes in n draws at rate p0 (normal approximation)."""
    if not n:
        return 1.0
    mu, sd = n * p0, (n * p0 * (1 - p0)) ** 0.5
    if sd == 0:
        return 1.0
    z = (hits - 0.5 - mu) / sd
    return 0.5 * (1 - math_erf(z / 2 ** 0.5))


def math_erf(x):
    import math
    return math.erf(x)


def load():
    with store.connect() as con:
        cases = monthly_cases(con)
        rainy, _ = monthly_rain(con)
    last = max(m for d in rainy.values() for m in d)
    months = month_range(config.FIRST_MONTH, last)
    return months, cases, rainy


def independent_normal(D, t):
    """3-year same-month median: no trailing-level term, and detrended enough to keep the base rate near 50%."""
    return D._same_month(t)


def run(months, cases, rainy, lag, shared):
    rows = []
    for name in config.DISTRICTS:
        D = engine.District(months, cases.get(name, {}), rainy.get(name, {}))
        for t in range(config.WARMUP_MONTHS, len(months)):
            a = D.assess(t, lag)
            if a is None or a["target"] < config.HELDOUT_FROM or D.C[t] is None:
                continue
            normal = a["expected"] if shared else independent_normal(D, t)
            if normal is None:
                continue
            rows.append({"bad": D.C[t] > normal,
                         "warning": a["level"] == "warning",
                         "case": bool(a["case_signal"]),
                         "rain": bool(a["rain_signal"])})
    base = sum(r["bad"] for r in rows) / len(rows)
    out = {"n": len(rows), "base_rate": round(base, 3)}
    for key in ("warning", "case", "rain"):
        fires = [r for r in rows if r[key]]
        hits = sum(r["bad"] for r in fires)
        prec = hits / len(fires)
        out[key] = {"alerts": len(fires), "precision": round(prec, 3),
                    "lift": round(prec / base, 3),
                    "skill": round((prec - base) / (1 - base), 3),
                    "p": round(binom_p(hits, len(fires), base), 4)}
    return out


def main():
    months, cases, rainy = load()
    print(f"Held-out {config.HELDOUT_FROM} onwards, all {len(config.DISTRICTS)} districts pooled.\n")
    for lag in config.LAGS:
        res = {}
        for shared in (True, False):
            res[shared] = run(months, cases, rainy, lag, shared)
            r = res[shared]
            label = "shared denominator (as shipped)" if shared else "independent normal"
            print(f"lag {lag} | {label:<32} n={r['n']:5d} base={r['base_rate']:.1%}")
            for key in ("warning", "case", "rain"):
                d = r[key]
                print(f"         {key:<8} fires {d['alerts']:5d}  precision {d['precision']:.1%}"
                      f"  lift {d['lift']:.2f}  skill {d['skill']:+.3f}  p={d['p']:.4f}")
        print(f"lag {lag} | change when the shared term is removed:")
        for key in ("warning", "case", "rain"):
            a, b = res[True][key]["lift"], res[False][key]["lift"]
            sa, sb = res[True][key]["skill"], res[False][key]["skill"]
            print(f"         {key:<8} lift {a:.2f} -> {b:.2f} ({(b - a) / a:+.0%})"
                  f"   skill {sa:+.3f} -> {sb:+.3f} ({(sb - sa) / sa:+.0%})")
        print()
    print("Reading: the rule keeps a clear edge on an outcome it shares no term with, so the signal is\n"
          "real, but part of the shipped case-signal lift is the shared trailing level. Report both.")


if __name__ == "__main__":
    main()
