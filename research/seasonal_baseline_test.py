"""Detrended + deseasonalised test. Decision for month t is made with info up to t-LAG only."""
import sys, math, statistics as st
import openpyxl

sys.stdout.reconfigure(encoding="utf-8")
rows = list(openpyxl.load_workbook(sys.argv[1], read_only=True)["By zone (long)"].iter_rows(values_only=True))[1:]
data = {}
for d, z, c, rf, rd, *_ in rows:
    if d and c is not None:
        data.setdefault(z, []).append((d, int(d[5:7]), c, rf, rd))
START = 48  # 4 years warm-up so seasonal indices exist


def score(name, flags, truth):
    tp = sum(f and t for f, t in zip(flags, truth)); fp = sum(f and not t for f, t in zip(flags, truth))
    fn = sum((not f) and t for f, t in zip(flags, truth)); base = sum(truth) / len(truth)
    p = tp / (tp + fp) if tp + fp else 0; r = tp / (tp + fn) if tp + fn else 0
    f1 = 2 * p * r / (p + r) if p + r else 0
    print(f"    {name:<44} warn={tp+fp:3d}  prec={p:5.1%}  rec={r:5.1%}  F1={f1:.2f}  lift={p/base if base else 0:4.2f}x")


def corr(a, b):
    ma, mb = st.mean(a), st.mean(b)
    num = sum((x - ma) * (y - mb) for x, y in zip(a, b))
    return num / math.sqrt(sum((x - ma) ** 2 for x in a) * sum((y - mb) ** 2 for y in b))


for zone, s in data.items():
    n = len(s); C = [r[2] for r in s]; R = [r[4] for r in s]; M = [r[1] for r in s]
    level = lambda t: st.mean(C[max(0, t - 12):t]) or 1  # trailing 12-mo mean ending before t
    print(f"\n=== {zone} zone ===")
    for lag in (1, 2):
        T1, T2, A, B, P, Fr, Pa, AND, ca, ra = [], [], [], [], [], [], [], [], [], []
        for t in range(START, n):
            k = t - lag  # last month whose data we have
            # seasonal index per calendar month from data up to k: cases / trailing level
            si = {}
            for i in range(13, k + 1):
                si.setdefault(M[i], []).append(C[i] / (level(i) or 1))
            SI = {m: st.median(v) for m, v in si.items()}
            L = level(k + 1)                       # level known at decision time
            expected = L * SI[M[t]]
            # truth 1: "high month" = above trailing-24 median (detrended absolute high)
            thr = st.median(C[max(0, k - 23):k + 1])
            T1.append(C[t] > thr)
            # truth 2: "worse than a normal season" = above seasonal expectation
            T2.append(C[t] > expected)
            # rainy-days anomaly vs same calendar month history
            normR = st.median([R[i] for i in range(k) if M[i] == M[k]])
            wet = R[k] > normR
            A.append(R[k] > st.median(R[:k]))      # original-style rain rule
            B.append(expected > thr)               # calendar says this month is usually high
            P.append(C[k] > thr)                   # persistence: high already
            Fr.append(wet)
            Pa.append(C[k] > L * SI[M[k]])         # anomaly persistence: already worse than normal
            AND.append(expected > thr and wet)
            ca.append(math.log((C[t] + 1) / (expected + 1))); ra.append(R[k] - normR)
        print(f"  lag {lag}: Q1 'high month' (> trailing-24 median), base {sum(T1)/len(T1):.0%}")
        score("A. rain rule (rainy-days > median)", A, T1)
        score("B. calendar only", B, T1)
        score("C. persistence (cases already high)", P, T1)
        score("D. calendar AND wetter-than-usual", AND, T1)
        print(f"         Q2 'worse than a normal season' (> seasonal expectation), base {sum(T2)/len(T2):.0%}")
        score("F. wetter-than-usual rainy-days", Fr, T2)
        score("G. anomaly persistence (already worse)", Pa, T2)
        score("H. F AND G", [f and g for f, g in zip(Fr, Pa)], T2)
        print(f"         r(rainy-day anomaly, case anomaly) = {corr(ra, ca):.2f}   (n={len(ca)})")
