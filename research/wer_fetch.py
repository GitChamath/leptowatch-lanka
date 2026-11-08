"""Download selected archived WER PDFs (one per ~month end) from the Wayback Machine.
usage: wer_fetch.py cdx.txt outdir [vol:no,vol:no ...]   (no list -> month-end plan for all years)"""
import re, sys, os, time, urllib.request

cdx, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
idx = {}
for line in open(cdx):
    parts = line.split()
    if len(parts) != 2:
        continue
    ts, u = parts
    lu = u.lower()
    if "sinhala" in lu or "tamil" in lu:
        continue
    m = re.search(r"(?i)vol(?:[_ .-]|%20)*(\d+)(?:[_ .-]|%20)*no(?:[_ .-]|%20)*(\d+)", u)
    if not m:
        continue
    key = (int(m.group(1)), int(m.group(2)))
    # prefer plain english file names, keep the earliest capture
    idx.setdefault(key, []).append((0 if "english" in lu else 1, ts, u))

if len(sys.argv) > 3:
    plan = [tuple(map(int, s.split(":"))) for s in sys.argv[3].split(",")]
else:
    # issue N carries Table 1 for roughly week N-1; pick issues just after each month end,
    # plus next year's No 01 (week 52/53 of the previous year)
    issues = [5, 9, 14, 18, 22, 27, 31, 36, 40, 44, 49]
    plan = []
    for vol in range(34, 54):
        plan += [(vol, n) for n in issues] + [(vol, 1)]

for key in plan:
    if key not in idx:
        # try neighbouring issue numbers
        alt = [(key[0], key[1] + d) for d in (1, -1, 2) if (key[0], key[1] + d) in idx]
        if not alt:
            print("missing", key, flush=True)
            continue
        key = alt[0]
    fn = os.path.join(out, f"v{key[0]}_n{key[1]:02d}.pdf")
    if os.path.exists(fn) and os.path.getsize(fn) > 10000:
        continue
    done = False
    for _, ts, u in sorted(idx[key])[:4]:
        url = f"https://web.archive.org/web/{ts}id_/{u}"
        try:
            with urllib.request.urlopen(url, timeout=120) as r:
                data = r.read()
        except Exception as e:
            print("err", key, e, flush=True); time.sleep(3); continue
        if data[:4] == b"%PDF" and b"%%EOF" in data[-2048:]:
            open(fn, "wb").write(data); print("ok", key, len(data), flush=True); done = True; break
        print("bad copy", key, len(data), flush=True); time.sleep(1)
    if not done:
        print("failed", key, flush=True)
    time.sleep(1)
