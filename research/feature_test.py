"""Stronger rainfall features, selected on 2011-2017 and scored once on 2018+.

Pre-stated rules (written before any result was seen):
  - Target: same as district_test.py — month t worse than a normal season for that district.
  - Each feature is compared with its own same-calendar-month history (data up to t-lag only).
  - Thresholds: above the historical median (q50) or above the 67th percentile (q67).
  - Selection: on 2011-2017 pooled over all districts, the feature/threshold with the highest
    precision lift among those with recall >= 40%. Ties -> the simpler feature.
  - The winner (and the plain rainy-days baseline) is then scored once on 2018+. No re-selection.
usage: feature_test.py wer_monthly.csv chirps_daily_district.csv
"""
import csv, math, statistics as st, sys
from collections import defaultdict

sys.stdout.reconfigure(encoding="utf-8")
wer_csv, rain_csv = sys.argv[1:3]
START, SPLIT = 48, "2018-01"
months = [f"{y}-{m:02d}" for y in range(2007, 2027) for m in range(1, 13) if f"{y}-{m:02d}" <= "2026-09"]
MI = {k: i for i, k in enumerate(months)}

cases = defaultdict(dict)
for r in csv.DictReader(open(wer_csv)):
    if r["cases"] != "":
        cases[r["district"]][r["month"]] = int(r["cases"])

daily = defaultdict(lambda: defaultdict(list))          # district -> month -> [mm per day]
for r in csv.DictReader(open(rain_csv)):
    if r["rain_mm"] != "" and float(r["rain_mm"]) >= 0:
        daily[r["district"]][r["date"][:7]].append(float(r["rain_mm"]))


def monthly(d, fn):
    return [fn(daily[d][k]) if daily[d].get(k) else None for k in months]


def rolling(s, n):
    return [sum(s[i - n + 1:i + 1]) if i >= n - 1 and all(v is not None for v in s[i - n + 1:i + 1]) else None
            for i in range(len(s))]


def max5(v):
    return max(sum(v[i:i + 5]) for i in range(max(1, len(v) - 4)))


FEATURES = {
    "rainy-days (baseline)": lambda d: monthly(d, lambda v: sum(x >= 1 for x in v)),
    "rain total mm": lambda d: monthly(d, sum),
    "rainy-days, 2-month sum": lambda d: rolling(monthly(d, lambda v: sum(x >= 1 for x in v)), 2),
    "rain mm, 2-month sum": lambda d: rolling(monthly(d, sum), 2),
    "rain mm, 3-month sum": lambda d: rolling(monthly(d, sum), 3),
    "heavy-rain days (>=20 mm)": lambda d: monthly(d, lambda v: sum(x >= 20 for x in v)),
    "max 5-day rain": lambda d: monthly(d, max5),
}


def quantile(v, q):
    v = sorted(v); i = (len(v) - 1) * q; lo = int(i)
    return v[lo] + (v[min(lo + 1, len(v) - 1)] - v[lo]) * (i - lo)


def records(C, R, lag, q):
    M = [int(k[5:]) for k in months]
    def level(t):
        v = [C[i] for i in range(max(0, t - 12), t) if C[i] is not None]
        return st.mean(v) if len(v) >= 9 else None
    out = []
    for t in range(START, len(months)):
        k = t - lag
        if C[t] is None or R[k] is None:
            continue
        si = defaultdict(list)
        for i in range(13, k + 1):
            L = level(i)
            if C[i] is not None and L:
                si[M[i]].append(C[i] / L)
        L = level(k + 1)
        if not L or len(si.get(M[t], [])) < 3:
            continue
        expected = L * st.median(si[M[t]])
        hist = [R[i] for i in range(k) if M[i] == M[k] and R[i] is not None]
        if len(hist) < 3:
            continue
        out.append((months[t], C[t] > expected, R[k] > quantile(hist, q)))
    return out


def summarise(recs):
    truth = [r[1] for r in recs]; flag = [r[2] for r in recs]
    tp = sum(f and t for f, t in zip(flag, truth)); w = sum(flag); pos = sum(truth)
    base = pos / len(truth); p = tp / w if w else 0; rc = tp / pos if pos else 0
    z = (tp - 0.5 - w * base) / math.sqrt(w * base * (1 - base)) if w else 0
    return dict(n=len(recs), base=base, prec=p, rec=rc, lift=p / base if base else 0,
                pval=0.5 * math.erfc(z / math.sqrt(2)), tp=tp, w=w)


def line(label, s):
    return (f"  {label:<38} n={s['n']:4d} base={s['base']:4.0%} prec={s['prec']:4.0%} rec={s['rec']:4.0%} "
            f"lift={s['lift']:4.2f} p={s['pval']:.3f} ({s['tp']}/{s['w']})")


districts = sorted(d for d in cases if d in daily)
for lag in (2, 1):
    print(f"\n=== lag {lag}: SELECTION on 2011-2017 (all districts pooled) ===")
    results, cache = [], {}
    for fname, ffn in FEATURES.items():
        for q in (0.5, 0.67):
            recs = []
            for d in districts:
                C = [cases[d].get(k) for k in months]
                recs += records(C, ffn(d), lag, q)
            cache[(fname, q)] = recs
            s = summarise([r for r in recs if r[0] < SPLIT])
            results.append((fname, q, s))
            print(line(f"{fname} q{int(q * 100)}", s))
    eligible = [r for r in results if r[2]["rec"] >= 0.40]
    order = list(FEATURES)
    best = max(eligible, key=lambda r: (round(r[2]["lift"], 3), -order.index(r[0])))
    print(f"  -> selected: {best[0]} q{int(best[1] * 100)}")
    print(f"=== lag {lag}: HELD-OUT 2018+ (scored once) ===")
    for fname, q in ((best[0], best[1]), ("rainy-days (baseline)", 0.5)):
        print(line(f"{fname} q{int(q * 100)}", summarise([r for r in cache[(fname, q)] if r[0] >= SPLIT])))
