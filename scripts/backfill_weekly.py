"""Fill in the weekly case history: every archived English WER from 2007 to 2024 we do not already hold.

The research snapshot kept about one report per month before 2025. A weekly outlook needs every week,
so this downloads the missing issues from the Internet Archive (one request per second), parses the
district table exactly as lw/wer.py does, and stores the rows in data/weekly.sqlite (same schema as
the main database) so the monthly system and its published numbers are not changed.

    python scripts/backfill_weekly.py            # resumable; already-stored issues are skipped
"""
import csv
import re
import sys
import time
import urllib.parse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from lw import config, store, wer  # noqa: E402

WEEKLY_DB = config.DATA / "weekly.sqlite"
CDX_CACHE = config.DATA / "cache" / "wer_cdx.txt"
INDEX = config.ROOT.parent / "LeptoWatch data" / "6_source_documents" / "wer_report_index.csv"
FIRST_YEAR, LAST_YEAR = 2007, 2024


def cdx_lines():
    if CDX_CACHE.exists():
        return CDX_CACHE.read_text().splitlines()
    out = []
    for prefix in ("www.epid.gov.lk/web/images/pdf/wer/*", "epid.gov.lk/storage/post/pdfs/*"):
        q = urllib.parse.urlencode({"url": prefix, "filter": "statuscode:200", "collapse": "urlkey",
                                    "fl": "timestamp,original"})
        out += wer._get(f"{config.WAYBACK_CDX}?{q}", timeout=300).decode().splitlines()
    CDX_CACHE.parent.mkdir(parents=True, exist_ok=True)
    CDX_CACHE.write_text("\n".join(out))
    return out


def candidates():
    """(volume, issue) -> archived URL of the English edition, for the years wanted."""
    best = {}
    for line in cdx_lines():
        if " " not in line:
            continue
        ts, u = line.split(" ", 1)
        lu = u.lower()
        m = wer.ISSUE.search(u)
        if not m or "english" not in lu or "sinhala" in lu or "tamil" in lu:
            continue
        vol, no = int(m.group(1)), int(m.group(2))
        if FIRST_YEAR - 1973 <= vol <= LAST_YEAR - 1973:
            best.setdefault((vol, no), f"https://web.archive.org/web/{ts}id_/{u}")
    return best


def held():
    have = set()
    if INDEX.exists():
        for r in csv.DictReader(open(INDEX, encoding="utf-8")):
            have.add((int(r["volume"]), int(r["issue"])))
    return have


def main():
    have = held()
    with store.connect(WEEKLY_DB) as con:
        con.execute("CREATE TABLE IF NOT EXISTS fetched (vol INTEGER, issue INTEGER, status TEXT, PRIMARY KEY (vol, issue))")
        done = {(r[0], r[1]) for r in con.execute("SELECT vol, issue FROM fetched")}
        cand = candidates()
        todo = sorted(k for k in cand if k not in have and k not in done)
        print(f"{len(cand)} archived issues for {FIRST_YEAR}-{LAST_YEAR}; {len(todo)} to fetch", flush=True)
        for i, (vol, no) in enumerate(todo, 1):
            url = cand[(vol, no)]
            status = "ok"
            try:
                parsed = wer.parse_pdf(wer.fetch(url))
                if parsed and parsed[2]:
                    store.upsert_reports(con, wer.to_rows(parsed, url, store.now()))
                else:
                    status = "no table"
            except Exception as e:                                    # keep going; it is logged
                status = f"error: {str(e)[:80]}"
            con.execute("INSERT OR REPLACE INTO fetched VALUES (?,?,?)", (vol, no, status))
            con.commit()
            print(f"[{i}/{len(todo)}] vol {vol} no {no}: {status}", flush=True)
            time.sleep(1)
        n = con.execute("SELECT COUNT(DISTINCT week_end) FROM case_reports").fetchone()[0]
    print(f"done: {n} weekly reports stored in {WEEKLY_DB.name}")


if __name__ == "__main__":
    main()
