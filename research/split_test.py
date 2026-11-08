"""Pick districts on 2011-2017 only, then score the rain rule on 2018+ (no peeking)."""
import sys, runpy
sys.argv = [sys.argv[0]] + sys.argv[1:]
import io, contextlib
with open(__import__("os").devnull, "w", encoding="utf-8") as _null, contextlib.redirect_stdout(_null):
    g = runpy.run_path(sys.argv[0].replace("split_test.py", "district_test.py"), run_name="dt")
backtest, series, cases, rdays, score, binom_p, DRY = (g[k] for k in ("backtest","series","cases","rdays","score","binom_p","DRY"))
for lag in (2, 1):
    picked, later_all, later_pick = [], [], []
    for d in sorted(cases):
        if d not in rdays: continue
        recs = backtest(series(d, cases), series(d, rdays), lag)
        early = [r for r in recs if r["month"] < "2018-01"]; late = [r for r in recs if r["month"] >= "2018-01"]
        if not early or not late: continue
        tp, w, p, _ = score([r["wet"] for r in early], [r["truth"] for r in early])
        base = sum(r["truth"] for r in early) / len(early)
        later_all += late
        if w and p / base >= 1.15:
            picked.append(d); later_pick += late
    for name, recs in (("all districts", later_all), ("picked on 2011-17", later_pick)):
        truth = [r["truth"] for r in recs]; base = sum(truth) / len(truth)
        tp, w, p, rc = score([r["wet"] for r in recs], truth)
        tpb, wb, pb, rb = score([r["wet"] and r["persist"] for r in recs], truth)
        _, _, pp, rp = score([r["persist"] for r in recs], truth)
        print(f"lag {lag} | 2018+ {name:<18} n={len(recs):4d} base={base:4.0%} WET prec={p:4.0%} rec={rc:4.0%} lift={p/base:4.2f} p={binom_p(tp,w,base):.3f} | PERSIST {pp:4.0%} | BOTH {pb:4.0%} ({tpb}/{wb})")
    print("   picked:", ", ".join(picked))
