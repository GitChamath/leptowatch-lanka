"""Monthly district cases from WER year-to-date totals, interpolating the cumulative curve to month ends.
A month is filled only if the reports bracketing each month end are at most 42 days apart.
usage: monthly_interp.py wer_weekly.csv out_monthly.csv"""
import csv, datetime as dt, sys
from collections import defaultdict

src, out = sys.argv[1:3]
rows = list(csv.DictReader(open(src)))
dists = [k for k in rows[0] if k not in ("week_end", "week", "national_ytd")]
pts = defaultdict(lambda: defaultdict(list))            # year -> district -> [(date, ytd)]
for r in rows:
    d = dt.date.fromisoformat(r["week_end"])
    wk = int(r["week"] or 0)
    yr = d.year - 1 if (d.month == 1 and d.day <= 7 and wk >= 50) else d.year
    for k in dists:
        if r[k] != "":
            pts[yr][k].append((d, int(r[k])))

MAXGAP = 42
res = []
for yr in sorted(pts):
    for k in dists:
        p = sorted(set(pts[yr][k]))
        p = [(dt.date(yr - 1, 12, 31), 0)] + p              # year starts at zero
        # drop points that break monotonicity (parse glitches / revisions)
        clean = [p[0]]
        for d, v in p[1:]:
            if v >= clean[-1][1]:
                clean.append((d, v))
        p = clean

        def at(day):
            for (d0, v0), (d1, v1) in zip(p, p[1:]):
                if d0 <= day <= d1:
                    if (d1 - d0).days > MAXGAP:
                        return None
                    return v0 + (v1 - v0) * (day - d0).days / max(1, (d1 - d0).days)
            last_d, last_v = p[-1]                          # allow up to 7 days past the last report
            return last_v if 0 <= (day - last_d).days <= 7 else None

        ends = [dt.date(yr, m + 1, 1) - dt.timedelta(days=1) if m < 12 else dt.date(yr, 12, 31) for m in range(1, 13)]
        prev = 0.0
        for m, e in enumerate(ends, 1):
            cur = at(e)
            val = "" if cur is None or prev is None else round(cur - prev)
            res.append((f"{yr}-{m:02d}", k, val))
            prev = cur
with open(out, "w", newline="") as fh:
    w = csv.writer(fh); w.writerow(["month", "district", "cases"]); w.writerows(res)
cov = defaultdict(lambda: [0, 0])
for mo, k, v in res:
    cov[mo[:4]][1] += 1; cov[mo[:4]][0] += v != ""
print({y: f"{a * 100 // b}%" for y, (a, b) in sorted(cov.items())})
