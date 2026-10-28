"""Turn stored rows into aligned monthly series per district."""
import calendar
import datetime as dt
from collections import defaultdict

from . import config


def month_range(first, last):
    y, m = map(int, first.split("-"))
    out = []
    while f"{y}-{m:02d}" <= last:
        out.append(f"{y}-{m:02d}")
        y, m = (y + 1, 1) if m == 12 else (y, m + 1)
    return out


def add_months(month, n):
    y, m = map(int, month.split("-"))
    total = y * 12 + (m - 1) + n
    return f"{total // 12}-{total % 12 + 1:02d}"


def monthly_cases(con):
    """Monthly cases per district from year-to-date report totals, interpolated to month ends.

    A month is left empty when the reports either side of a month end are more than
    MAX_REPORT_GAP_DAYS apart. Officer-entered counts override report-derived values.
    """
    pts = defaultdict(lambda: defaultdict(list))              # year -> district -> [(date, ytd)]
    for r in con.execute("SELECT week_end, week, district, ytd FROM case_reports"):
        d = dt.date.fromisoformat(r["week_end"])
        year = d.year - 1 if (d.month == 1 and d.day <= 7 and (r["week"] or 0) >= 50) else d.year
        pts[year][r["district"]].append((d, r["ytd"]))

    out = defaultdict(dict)
    for year, by_d in pts.items():
        for district, p in by_d.items():
            p = [(dt.date(year - 1, 12, 31), 0)] + sorted(set(p))
            clean = [p[0]]
            for d, v in p[1:]:                                # year-to-date never falls; drop glitches
                if v >= clean[-1][1]:
                    clean.append((d, v))

            def at(day):
                for (d0, v0), (d1, v1) in zip(clean, clean[1:]):
                    if d0 <= day <= d1:
                        if (d1 - d0).days > config.MAX_REPORT_GAP_DAYS:
                            return None
                        return v0 + (v1 - v0) * (day - d0).days / max(1, (d1 - d0).days)
                last_d, last_v = clean[-1]
                return last_v if 0 <= (day - last_d).days <= 7 else None

            prev = 0.0
            for m in range(1, 13):
                cur = at(dt.date(year, m, calendar.monthrange(year, m)[1]))
                if cur is not None and prev is not None and cur >= prev:
                    out[district][f"{year}-{m:02d}"] = round(cur - prev)
                prev = cur
    for r in con.execute("SELECT month, district, cases FROM officer_counts"):
        out[r["district"]][r["month"]] = r["cases"]
    return out


def monthly_rain(con):
    """Rainy-days (>= RAINY_DAY_MM) and total mm per district and complete month."""
    days, wet, total = defaultdict(int), defaultdict(int), defaultdict(float)
    for r in con.execute("SELECT date, district, mm FROM rain_daily WHERE mm IS NOT NULL"):
        key = (r["district"], r["date"][:7])
        days[key] += 1
        wet[key] += r["mm"] >= config.RAINY_DAY_MM
        total[key] += r["mm"]
    rainy, mm = defaultdict(dict), defaultdict(dict)
    for (district, month), n in days.items():
        y, m = map(int, month.split("-"))
        if n >= calendar.monthrange(y, m)[1]:                 # only complete months
            rainy[district][month] = wet[(district, month)]
            mm[district][month] = round(total[(district, month)], 1)
    return rainy, mm
