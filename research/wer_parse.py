"""Parse leptospirosis year-to-date counts per district from WER PDFs, then derive monthly counts.
usage: wer_parse.py werdir out_weekly.csv out_monthly.csv"""
import csv, datetime as dt, glob, os, re, sys
import logging
from pypdf import PdfReader
logging.disable(logging.WARNING)

sys.stdout.reconfigure(encoding="utf-8")
werdir, out_w, out_m = sys.argv[1:4]

CANON = {"colom": "Colombo", "gampa": "Gampaha", "kalut": "Kalutara", "kandy": "Kandy", "matal": "Matale",
         "nuwar": "Nuwara Eliya", "galle": "Galle", "hamba": "Hambantota", "matar": "Matara", "jaffn": "Jaffna",
         "kilin": "Kilinochchi", "killi": "Kilinochchi", "manna": "Mannar", "vavun": "Vavuniya", "mulla": "Mullaitivu",
         "mulli": "Mullaitivu", "batti": "Batticaloa", "ampar": "Ampara", "trinc": "Trincomalee", "kurun": "Kurunegala",
         "putta": "Puttalam", "anura": "Anuradhapura", "polon": "Polonnaruwa", "badul": "Badulla", "monar": "Monaragala",
         "moner": "Monaragala", "ratna": "Ratnapura", "rathn": "Ratnapura", "kegal": "Kegalle", "kalmu": "Kalmunai"}
MONTHS = {m: i for i, m in enumerate(["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"], 1)}
ROW = re.compile(r"^\s*([A-Za-z][A-Za-z .]*?)\s+((?:\d+\s+){11,}\d+)\s*$")
DATE = re.compile(r"(\d{1,2})\s*(?:st|nd|rd|th)?\s*([A-Za-z]{3,9})\s*[-,]?\s*(\d{4})")

weekly = []
for f in sorted(glob.glob(os.path.join(werdir, "v*.pdf"))):
    try:
        pages = [p.extract_text() or "" for p in PdfReader(f).pages]
    except Exception as e:
        print("unreadable", os.path.basename(f), e); continue
    page = next((p for p in pages if re.search(r"Selected\s+notifiable\s+diseases\s+reported", p) and "Week" in p), None)
    if page is None:
        print("no table", os.path.basename(f)); continue
    head = page[re.search(r"Selected\s+notifiable\s+diseases\s+reported", page).end():]
    head = head[: head.find("Week") + 4]
    d = DATE.findall(head)
    wk = re.search(r"(\d+)\s*(?:st|nd|rd|th)?\s*Week", head)
    if not d or d[-1][1][:3].lower() not in MONTHS:
        print("no date", os.path.basename(f), head[:120].replace("\n", " ")); continue
    day, mon, yr = int(d[-1][0]), MONTHS[d[-1][1][:3].lower()], int(d[-1][2])
    try:
        end = dt.date(yr, mon, day)
    except ValueError:
        print("bad date", os.path.basename(f), d[-1]); continue
    got, total = {}, None
    for line in page.splitlines():
        m = ROW.match(line)
        if not m:
            continue
        nums = [int(n) for n in m.group(2).split()]
        key = m.group(1).replace(" ", "").lower()
        if key.startswith("srilanka"):
            total = nums[11]; continue
        name = CANON.get(key[:5]) or next((v for v in set(CANON.values()) if len(key) >= 4 and v.replace(" ", "").lower().endswith(key)), None)
        if name and name not in got:
            got[name] = nums[11]                        # 6th disease (leptospirosis), column B = year to date
    if "Kalmunai" in got:                              # Kalmunai RDHS lies within Ampara district
        got["Ampara"] = got.get("Ampara", 0) + got.pop("Kalmunai")
    s = sum(got.values())
    flag = "" if total is None or abs(s - total) <= max(5, 0.02 * total) else f" SUM {s} != TOTAL {total}"
    if len(got) < 24 or flag:
        print(os.path.basename(f), end, "districts", len(got), flag)
    weekly.append((end, wk.group(1) if wk else "", got, total))

dists = sorted({d for _, _, g, _ in weekly for d in g})
with open(out_w, "w", newline="") as fh:
    w = csv.writer(fh); w.writerow(["week_end", "week", "national_ytd"] + dists)
    for end, wk, g, tot in sorted(weekly, key=lambda r: r[0]):
        w.writerow([end, wk, tot] + [g.get(d, "") for d in dists])

# Monthly counts = difference of year-to-date at successive month ends (report within 6 days of month end).
by_year = {}
for end, wk, g, tot in weekly:
    yr = end.year if not (end.month == 1 and end.day < 7 and wk and int(wk) >= 50) else end.year - 1
    by_year.setdefault(yr, []).append((end, g))
rows = []
for yr, recs in sorted(by_year.items()):
    def ytd_at(m):
        if m == 0:
            return {d: 0 for d in dists}
        last = (dt.date(yr, 12, 31) if m == 12 else dt.date(yr, m + 1, 1) - dt.timedelta(days=1))
        best = min(recs, key=lambda r: abs((r[0] - last).days))
        return best[1] if abs((best[0] - last).days) <= 6 else None
    for m in range(1, 13):
        a, b = ytd_at(m - 1), ytd_at(m)
        for d in dists:
            v = "" if a is None or b is None or d not in b or d not in a else b[d] - a[d]
            if v != "" and v < 0:
                v = ""
            rows.append((f"{yr}-{m:02d}", d, v))
with open(out_m, "w", newline="") as fh:
    w = csv.writer(fh); w.writerow(["month", "district", "cases"]); w.writerows(rows)
print("reports", len(weekly), "years", sorted(by_year), "monthly rows", len(rows),
      "filled", sum(1 for r in rows if r[2] != ""))
