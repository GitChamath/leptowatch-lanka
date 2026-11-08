"""Re-run the 'worse than a normal season' back-test on live sources: WER district cases + CHIRPS district rainfall.
Same rules as seasonal_baseline_test.py: decision for month t uses only data up to t-lag; 48-month warm-up.
usage: district_test.py wer_monthly.csv chirps_dir zone_source.xlsx"""
import csv, json, math, os, sys, statistics as st
from collections import defaultdict

sys.stdout.reconfigure(encoding="utf-8")
wer_csv, chirps_dir, zone_xlsx = sys.argv[1:4]
RAINY_MM = 1.0
START = 48
DRY = ["Anuradhapura", "Polonnaruwa", "Hambantota", "Monaragala", "Ampara", "Batticaloa", "Trincomalee",
       "Vavuniya", "Mannar", "Mullaitivu", "Kilinochchi", "Jaffna", "Puttalam", "Kurunegala"]

# ---------- data
cases = defaultdict(dict)                                 # district -> {"YYYY-MM": n}
for r in csv.DictReader(open(wer_csv)):
    if r["cases"] != "":
        cases[r["district"]][r["month"]] = int(r["cases"])
rain, rdays = defaultdict(dict), defaultdict(dict)
for fn in os.listdir(chirps_dir):
    d = fn[:-5]
    for y, m, day, v in json.load(open(os.path.join(chirps_dir, fn))):
        k = f"{y}-{m:02d}"
        if v is None or v < 0:
            continue
        rain[d][k] = rain[d].get(k, 0) + v
        rdays[d][k] = rdays[d].get(k, 0) + (v >= RAINY_MM)
months = [f"{y}-{m:02d}" for y in range(2007, 2027) for m in range(1, 13)]
months = [k for k in months if k <= "2026-09"]


def score(flags, truth):
    tp = sum(f and t for f, t in zip(flags, truth)); fp = sum(f and not t for f, t in zip(flags, truth))
    fn_ = sum((not f) and t for f, t in zip(flags, truth))
    p = tp / (tp + fp) if tp + fp else float("nan"); r = tp / (tp + fn_) if tp + fn_ else float("nan")
    return tp, tp + fp, p, r


def binom_p(k, n, q):
    if n > 400:                                          # normal approximation for large n
        z = (k - 0.5 - n * q) / math.sqrt(n * q * (1 - q))
        return 0.5 * math.erfc(z / math.sqrt(2))
    return sum(math.comb(n, i) * q ** i * (1 - q) ** (n - i) for i in range(k, n + 1))


def corr(a, b):
    if len(a) < 10:
        return float("nan")
    ma, mb = st.mean(a), st.mean(b)
    den = math.sqrt(sum((x - ma) ** 2 for x in a) * sum((y - mb) ** 2 for y in b))
    return sum((x - ma) * (y - mb) for x, y in zip(a, b)) / den if den else float("nan")


def backtest(C, R, lag):
    """C, R: lists aligned to `months` (None = missing). Returns per-month records for the Q2 test."""
    M = [int(k[5:]) for k in months]
    out = []
    def level(t):
        v = [C[i] for i in range(max(0, t - 12), t) if C[i] is not None]
        return st.mean(v) if len(v) >= 9 else None
    for t in range(START, len(months)):
        k = t - lag
        if C[t] is None or R[k] is None or C[k] is None:
            continue
        si = defaultdict(list)
        for i in range(13, k + 1):
            L = level(i)
            if C[i] is not None and L:
                si[M[i]].append(C[i] / L)
        L = level(k + 1)
        if not L or M[t] not in si or M[k] not in si or len(si[M[t]]) < 3:
            continue
        SI = {m: st.median(v) for m, v in si.items()}
        expected = L * SI[M[t]]
        hist_r = [R[i] for i in range(k) if M[i] == M[k] and R[i] is not None]
        if len(hist_r) < 3:
            continue
        normR = st.median(hist_r)
        out.append(dict(month=months[t], truth=C[t] > expected, wet=R[k] > normR,
                        persist=C[k] > L * SI[M[k]],
                        ca=math.log((C[t] + 1) / (expected + 1)), ra=R[k] - normR))
    return out


def report(label, recs):
    if not recs:
        print(f"  {label:<26} no data"); return
    truth = [r["truth"] for r in recs]; base = sum(truth) / len(truth)
    tp, w, p, r = score([x["wet"] for x in recs], truth)
    _, wp, pp, rp = score([x["persist"] for x in recs], truth)
    tpc, wc, pc, rc = score([x["wet"] and x["persist"] for x in recs], truth)
    pv = binom_p(tp, w, base) if w else float("nan")
    print(f"  {label:<26} n={len(recs):4d} base={base:4.0%} | WET prec={p:4.0%} rec={r:4.0%} lift={p/base:4.2f} p={pv:.3f}"
          f" | PERSIST prec={pp:4.0%} rec={rp:4.0%} | BOTH prec={pc:4.0%} ({tpc}/{wc}) | r={corr([x['ra'] for x in recs],[x['ca'] for x in recs]):.2f}")


def series(d, src):
    return [src[d].get(k) for k in months]


# ---------- A. sanity: WER zone totals vs the old zone dataset
try:
    import openpyxl
    rows = list(openpyxl.load_workbook(zone_xlsx, read_only=True)["Data (wide)"].iter_rows(values_only=True))[1:]
    old = {r[0]: r for r in rows if r[0]}
    print("A. Old 'Dry' zone cases vs WER sum of candidate dry districts, by year")
    for y in range(2007, 2019):
        o = sum(old[f"{y}-{m:02d}"][3] for m in range(1, 13) if f"{y}-{m:02d}" in old)
        w = sum(cases[d].get(f"{y}-{m:02d}", 0) for d in DRY for m in range(1, 13))
        w_nk = w - sum(cases["Kurunegala"].get(f"{y}-{m:02d}", 0) for m in range(1, 13))
        print(f"   {y}: old Dry={o:5d}   WER dry incl. Kurunegala={w:5d}   excl. Kurunegala={w_nk:5d}")
    # rainfall source check: old Met rainy-days (Dry) vs CHIRPS rainy-days averaged over dry districts
    met = [old[k][5] for k in months if k in old]
    chi = [st.mean(rdays[d][k] for d in DRY if k in rdays[d]) for k in months if k in old]
    print(f"   Met vs CHIRPS dry-zone rainy-days, monthly correlation r = {corr(met, chi):.2f}")
except Exception as e:
    print("A. skipped:", e)

# ---------- B. zone level, dry districts pooled into one series (closest to the old test)
print("\nB. Dry zone as one series (WER cases summed, CHIRPS rainy-days averaged), 2011+ test months")
C = [sum(cases[d][k] for d in DRY) if all(k in cases[d] for d in DRY) else None for k in months]
R = [st.mean(rdays[d][k] for d in DRY if k in rdays[d]) if any(k in rdays[d] for d in DRY) else None for k in months]
for lag in (1, 2):
    report(f"dry zone, lag {lag}", backtest(C, R, lag))

# ---------- C. district level
for lag in (2, 1):
    print(f"\nC. Districts, lag {lag} (rainy-days)")
    pooled = {"dry": [], "other": []}
    for d in sorted(cases):
        if d not in rdays:
            continue
        recs = backtest(series(d, cases), series(d, rdays), lag)
        report(d + (" *" if d in DRY else ""), recs)
        pooled["dry" if d in DRY else "other"] += recs
    report("POOLED dry districts", pooled["dry"])
    report("POOLED other districts", pooled["other"])

print("\nD. Same with monthly rainfall total instead of rainy-days, lag 2, pooled")
for grp in ("dry", "other"):
    recs = []
    for d in sorted(cases):
        if d in rain and ((d in DRY) == (grp == "dry")):
            recs += backtest(series(d, cases), series(d, rain), 2)
    report(f"POOLED {grp} (rain mm)", recs)
