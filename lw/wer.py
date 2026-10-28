"""Weekly Epidemiological Report (WER) collector.

Each WER carries a table of notifiable diseases by RDHS district. Leptospirosis is the 6th disease
in every edition since 2007; column B is the year-to-date count. We read the dates from the PDF
itself, never from the file name or the fetch date.
"""
import datetime as dt
import io
import logging
import re
import time
import urllib.parse
import urllib.request

from . import config

logging.getLogger("pypdf").setLevel(logging.ERROR)

CANON = {"colom": "Colombo", "gampa": "Gampaha", "kalut": "Kalutara", "kandy": "Kandy", "matal": "Matale",
         "nuwar": "Nuwara Eliya", "galle": "Galle", "hamba": "Hambantota", "matar": "Matara", "jaffn": "Jaffna",
         "kilin": "Kilinochchi", "killi": "Kilinochchi", "manna": "Mannar", "vavun": "Vavuniya",
         "mulla": "Mullaitivu", "mulli": "Mullaitivu", "batti": "Batticaloa", "ampar": "Ampara",
         "trinc": "Trincomalee", "kurun": "Kurunegala", "putta": "Puttalam", "anura": "Anuradhapura",
         "polon": "Polonnaruwa", "badul": "Badulla", "monar": "Monaragala", "moner": "Monaragala",
         "ratna": "Ratnapura", "rathn": "Ratnapura", "kegal": "Kegalle", "kalmu": "Kalmunai"}
MONTHS = {m: i for i, m in enumerate(
    ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"], 1)}
TABLE = re.compile(r"Selected\s+notifiable\s+diseases\s+reported")
ROW = re.compile(r"^\s*([A-Za-z][A-Za-z .]*?)\s+((?:\d+\s+){11,}\d+)\s*$")
DATE = re.compile(r"(\d{1,2})\s*(?:st|nd|rd|th)?\s*([A-Za-z]{3,9})\s*[-,]?\s*(\d{4})")
WEEK = re.compile(r"(\d+)\s*(?:st|nd|rd|th)?\s*Week")
ISSUE = re.compile(r"(?i)vol(?:[_ .-]|%20)*(\d+)(?:[_ .-]|%20)*no(?:[_ .-]|%20)*(\d+)")
LEPTO_B = 11                 # index of leptospirosis year-to-date among the numbers after the district name


def district_name(raw):
    key = raw.replace(" ", "").lower()
    if key.startswith("srilanka"):
        return "SRI LANKA"
    if key[:5] in CANON:
        return CANON[key[:5]]
    # names truncated by the PDF text layer, e.g. "paha" for Gampaha
    for name in set(CANON.values()):
        if len(key) >= 4 and name.replace(" ", "").lower().endswith(key):
            return name
    return None


def parse_table_text(page):
    """Parse the district table from one page of text. Returns (week_end, week, {district: ytd}, national)."""
    m = TABLE.search(page)
    if not m:
        return None
    head = page[m.end():]
    head = head[: head.find("Week") + 4]
    dates = DATE.findall(head)
    if not dates or dates[-1][1][:3].lower() not in MONTHS:
        return None
    day, mon, year = int(dates[-1][0]), MONTHS[dates[-1][1][:3].lower()], int(dates[-1][2])
    try:
        week_end = dt.date(year, mon, day)
    except ValueError:
        return None
    wk = WEEK.search(head)
    counts, national = {}, None
    for line in page.splitlines():
        r = ROW.match(line)
        if not r:
            continue
        nums = [int(n) for n in r.group(2).split()]
        name = district_name(r.group(1))
        if name == "SRI LANKA":
            national = nums[LEPTO_B]
        elif name and name not in counts:
            counts[name] = nums[LEPTO_B]
    if "Kalmunai" in counts:                      # Kalmunai RDHS lies inside Ampara district
        counts["Ampara"] = counts.get("Ampara", 0) + counts.pop("Kalmunai")
    return week_end, int(wk.group(1)) if wk else None, counts, national


def parse_pdf(data):
    from pypdf import PdfReader
    for page in PdfReader(io.BytesIO(data)).pages:
        text = page.extract_text() or ""
        if TABLE.search(text) and "Week" in text:
            return parse_table_text(text)
    return None


def to_rows(parsed, source, fetched_at):
    week_end, week, counts, national = parsed
    return [dict(week_end=week_end.isoformat(), week=week, district=d, ytd=v, national_ytd=national,
                 source=source, fetched_at=fetched_at) for d, v in counts.items()]


def _get(url, timeout=90):
    req = urllib.request.Request(url, headers={"User-Agent": config.USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def list_live(year):
    """English WER PDF links for a year from the Epidemiology Unit site (may be offline)."""
    html = _get(config.WER_PAGE).decode("utf-8", "replace")
    links = re.findall(r'href="([^"]+\.pdf)"', html)
    return [u for u in links if "english" in u.lower() and ISSUE.search(u)
            and int(ISSUE.search(u).group(1)) == year - 1973]


def list_archive(year):
    """Fallback: archived copies from the Wayback Machine, as (url, timestamp)."""
    vol = year - 1973
    out = []
    for prefix in ("www.epid.gov.lk/web/images/pdf/wer/*", "epid.gov.lk/storage/post/pdfs/*"):
        q = urllib.parse.urlencode({"url": prefix, "filter": "statuscode:200", "collapse": "urlkey",
                                    "fl": "timestamp,original"})
        for line in _get(f"{config.WAYBACK_CDX}?{q}", timeout=240).decode().splitlines():
            ts, u = line.split(" ", 1)
            m = ISSUE.search(u)
            if m and int(m.group(1)) == vol and "english" in u.lower():
                out.append((f"https://web.archive.org/web/{ts}id_/{u}", ts))
    return out


def fetch(url):
    data = _get(url, timeout=120)
    if data[:4] != b"%PDF" or b"%%EOF" not in data[-2048:]:
        raise ValueError("incomplete PDF")
    return data


def collect(con, year, known_sources, log=print):
    """Download and parse WERs for `year` not seen before. Live site first, archive as fallback."""
    from .store import now, upsert_reports
    try:
        urls = [(u if u.startswith("http") else "https://www.epid.gov.lk" + u, None) for u in list_live(year)]
        origin = "live"
    except Exception as e:
        log(f"WER site unavailable ({e}); using archived copies")
        urls, origin = list_archive(year), "archive"
    added = 0
    for url, _ in urls:
        if url in known_sources:
            continue
        try:
            parsed = parse_pdf(fetch(url))
        except Exception as e:
            log(f"skip {url}: {e}")
            continue
        if parsed and parsed[2]:
            upsert_reports(con, to_rows(parsed, url, now()))
            added += 1
        time.sleep(1)
    return origin, added
