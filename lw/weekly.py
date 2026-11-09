"""Weekly rolling outlook: every week, the last 4 weeks of rain and cases -> the next 4 weeks and the 4 after.

The monthly outlook waits for a month to end, and its rainfall is published weeks later, so its
"one month ahead" forecast arrives when that month is mostly over. This version decides on any day W
with what an officer can know that day:

  Rain signal : rainy days (>= 1 mm, district average) in the 56 days to W, above the median of the same
                56 days of the year in earlier years.
  Case signal : cases notified in the 28 days to W, above the district's normal for that window
                (52-week level x seasonal factor, as in the monthly engine).
  Warning     : rain signal AND cases above WARNING_CASE_RATIO x normal.   Watch: one signal.   Normal: neither.

The 8-week rain window and the 1.4 x normal Warning bar come from accuracy round 2
(research/PREREG_weekly_v2.md): chosen on 2011-2017, then scored once on 2018 onwards.

Judged against: cases in the next 28 days (lead 1) or in days 29-56 (lead 2) above the normal for that window.
Two back-tests: with the officer's own count for the 28 days to W (what the dashboard asks for), and with
public reports only, which go online about PUBLIC_DELAY days late. The live outlook uses the officer's count
when entered, otherwise the latest public report under PUBLIC_DELAY + 7 days old.
Weekly cases come from the year-to-date totals in each Weekly Epidemiological Report, interpolated
by day between reports no more than MAX_GAP days apart.
"""
import calendar
import datetime as dt
import sqlite3
import statistics as st
from bisect import bisect_left
from collections import defaultdict

from . import config, engine, ml, store

WINDOW = 28                 # days in each case window
RAIN_WINDOW = 56            # days of rain behind each decision (accuracy round 2)
WARNING_CASE_RATIO = 1.4    # a Warning needs cases above 1.4 x normal (accuracy round 2)
MAX_GAP = 21                # longest gap between reports we interpolate across
# Weekly Epidemiological Reports go online about 8 weeks after the week they cover: the upload time inside the
# Epidemiology Unit's file names is a median 57 days (never under 17) after the week's end for the 158 reports from
# 2023-2026 that carry one (2026 so far: 48 to 64 days). The public-only back-test and the live outlook allow for this.
PUBLIC_DELAY = 56
LEADS = (1, 2)              # 1: next 28 days; 2: days 29-56
SEASONAL_MIN_YEARS = 5
FIRST_DECISION = dt.date(2011, 1, 1)


# ---------------------------------------------------------------- cases as a continuous cumulative curve
def case_points(cons):
    """{district: {year: [(date, ytd)]}} from one or more databases (later ones add weeks the first lacks)."""
    pts = defaultdict(lambda: defaultdict(dict))
    for con in cons:
        for r in con.execute("SELECT week_end, week, district, ytd FROM case_reports"):
            d = dt.date.fromisoformat(r["week_end"])
            year = d.year - 1 if (d.month == 1 and d.day <= 7 and (r["week"] or 0) >= 50) else d.year
            pts[r["district"]][year][d] = r["ytd"]
    out = {}
    for district, years in pts.items():
        out[district] = {}
        for y, by_day in years.items():
            out[district][y] = never_falling([(dt.date(y - 1, 12, 31), 0)] + sorted(by_day.items()))
    return out


def never_falling(p):
    """Year-to-date never falls, so drop misread reports: keep the longest run of points that never decreases.
    (Dropping every point below the highest so far, as before, let one inflated misread wipe out the rest of the
    year, e.g. Kegalle on 13 Sep 2024.)"""
    best, prev = [1] * len(p), [-1] * len(p)
    for i in range(1, len(p)):
        for j in range(i):
            if p[j][1] <= p[i][1] and best[j] + 1 > best[i]:
                best[i], prev[i] = best[j] + 1, j
    i = max(range(len(p)), key=lambda k: (best[k], k))
    keep = []
    while i != -1:
        keep.append(p[i])
        i = prev[i]
    keep = keep[::-1]
    return keep if keep[0] == p[0] else [p[0]] + [x for x in keep if x[1] >= 0]


class Cases:
    def __init__(self, years):
        self.years = years
        self._dates = {y: [d for d, _ in p] for y, p in years.items()}

    def ytd(self, day):
        """Cases so far in day's year, at the end of `day`, or None if the reports around it are too far apart."""
        p = self.years.get(day.year)
        if not p:
            return None
        ds = self._dates[day.year]
        i = bisect_left(ds, day)
        if i < len(ds) and ds[i] == day:
            return p[i][1]
        if i >= len(ds):                                          # after the last report: carry it up to 7 days, as the
            return p[-1][1] if (day - ds[-1]).days <= 7 else None  # monthly series does (e.g. to close the year)
        if i == 0:
            return None
        (d0, v0), (d1, v1) = p[i - 1], p[i]
        if (d1 - d0).days > MAX_GAP:
            return None
        return v0 + (v1 - v0) * (day - d0).days / (d1 - d0).days

    def last_on_or_before(self, day):
        """Date of the latest report published on or before `day`."""
        best = None
        for y in (day.year - 1, day.year):                       # an early-January report can close the previous year
            ds = self._dates.get(y)
            if ds:
                i = bisect_left(ds, day + dt.timedelta(1)) - 1
                if i >= 1 and (best is None or ds[i] > best):    # index 0 is the synthetic 31 Dec start point
                    best = ds[i]
        return best

    def between(self, start, end):
        """Cases in (start, end]."""
        if start.year == end.year:
            a, b = self.ytd(start), self.ytd(end)
            return None if a is None or b is None else max(0.0, b - a)
        a, b = self.ytd(start), self.ytd(dt.date(start.year, 12, 31))      # rest of the first year
        if a is None or b is None:
            return None
        total = max(0.0, b - a)
        for y in range(start.year + 1, end.year):                         # any whole years in between
            full = self.ytd(dt.date(y, 12, 31))
            if full is None:
                return None
            total += full
        b = self.ytd(end)                                                  # the new year starts from 0
        return None if b is None else total + b


# ---------------------------------------------------------------- rain
def rain_days(cons):
    """Daily district rain: Open-Meteo (current to today) where stored, otherwise CHIRPS. One source per district."""
    om, ch = defaultdict(dict), defaultdict(dict)
    for con in cons:
        if con.execute("SELECT 1 FROM sqlite_master WHERE name='rain_om'").fetchone():
            for r in con.execute("SELECT date, district, mm FROM rain_om WHERE mm IS NOT NULL"):
                om[r["district"]][dt.date.fromisoformat(r["date"])] = r["mm"]
    for r in cons[0].execute("SELECT date, district, mm FROM rain_daily WHERE mm IS NOT NULL"):
        ch[r["district"]][dt.date.fromisoformat(r["date"])] = r["mm"]
    source = {d: ("open-meteo" if len(om.get(d, {})) > 6000 else "chirps") for d in config.DISTRICTS}
    return {d: (om[d] if source[d] == "open-meteo" else ch[d]) for d in config.DISTRICTS}, source


def years_back(day, k):
    y = day.year - k
    return day.replace(year=y, day=min(day.day, calendar.monthrange(y, day.month)[1]))


class District:
    def __init__(self, cases, rain):
        self.cases, self.rain = cases, rain
        self._level, self._ratio = {}, {}

    def rainy(self, end):
        days = [self.rain.get(end - dt.timedelta(i)) for i in range(RAIN_WINDOW)]
        return None if any(v is None for v in days) else sum(v >= config.RAINY_DAY_MM for v in days)

    def window(self, end):
        return self.cases.between(end - dt.timedelta(WINDOW), end)

    def level(self, w):
        """Average 28-day count over the 364 days to w."""
        if w not in self._level:
            n = self.cases.between(w - dt.timedelta(364), w)
            self._level[w] = None if n is None else n * WINDOW / 364
        return self._level[w]

    def ratio(self, end):
        """Window count / level at that time, for seasonal factors."""
        if end not in self._ratio:
            c, lv = self.window(end), self.level(end - dt.timedelta(WINDOW))
            self._ratio[end] = c / lv if c is not None and lv else None
        return self._ratio[end]

    def seasonal(self, end, before):
        """Median ratio for the same window end in earlier years, using only windows that ended by `before`."""
        r = []
        for k in range(1, 20):
            e = years_back(end, k)
            if e < dt.date(2007, 2, 1):
                break
            if e <= before:
                x = self.ratio(e)
                if x is not None:
                    r.append(x)
        return st.median(r) if len(r) >= SEASONAL_MIN_YEARS else None

    def assess(self, w, lead, delay=0, max_age=7):
        """Decision on Saturday w. Case reports count as published `delay` days after the week they cover, and
        the latest published one is used if it is at most `max_age` days older than that.
        delay=0: the officer's own count for the 4 weeks to w (the figure the dashboard asks for).
        delay=PUBLIC_DELAY: public Weekly Epidemiological Reports only, as they really appear online."""
        rd = self.rainy(w)
        if rd is None:
            return None
        hist = [x for k in range(1, 20) if (x := self.rainy(years_back(w, k))) is not None]
        if len(hist) < config.HISTORY_MIN:
            return None
        rn = st.median(hist)
        # cases: the window ends at the latest report available on decision day; interpolating to w itself would
        # borrow a report that does not exist yet.
        seen = w - dt.timedelta(delay)
        cw = self.cases.last_on_or_before(seen)
        if cw is None or (seen - cw).days > max_age:
            cw = None
            lv = c = si_now = None
        else:
            lv, c, si_now = self.level(cw), self.window(cw), self.seasonal(cw, cw)
        normal = lv * si_now if lv and si_now else None
        t_end = w + dt.timedelta(WINDOW * lead)
        si_t = self.seasonal(t_end, cw or w)
        expected = lv * si_t if lv and si_t else None
        case_signal = None if c is None or normal is None else c > normal
        actual = self.cases.between(t_end - dt.timedelta(WINDOW), t_end)
        rain_signal = rd > rn
        return {
            "decided": w.isoformat(), "target": t_end.isoformat()[:7], "target_end": t_end.isoformat(), "lag": lead,
            "level": level_of(rain_signal, c, normal), "cases_for_warning": cases_for_warning(normal),
            "rain_signal": rain_signal, "case_signal": case_signal,
            "rainy_days": rd, "rainy_days_normal": round(rn, 1), "cases_to": cw.isoformat() if cw else None,
            "cases_data_month": None if c is None else round(c), "cases_normal": round(normal, 1) if normal else None,
            "expected": round(expected, 1) if expected else None,
            "actual": None if actual is None else round(actual), "low_confidence": None,
            "outcome": None if actual is None or expected is None else actual > expected,
        }


def level_of(rain_signal, cases, normal):
    """Warning: rain up and cases above 1.4 x normal. Watch: rain up or cases above normal. Normal: neither."""
    case_up = cases is not None and normal is not None and cases > normal
    if rain_signal and case_up and cases > WARNING_CASE_RATIO * normal:
        return "warning"
    return "watch" if rain_signal or case_up else "normal"


def cases_for_warning(normal):
    """Smallest whole number of cases above 1.4 x normal."""
    return None if not normal else int(WARNING_CASE_RATIO * normal) + 1


def decision_days(first, last):
    d = first + dt.timedelta((5 - first.weekday()) % 7)          # Saturdays
    while d <= last:
        yield d
        d += dt.timedelta(7)


def history(cons, districts=None, delay=0):
    """Back-test records for every district, Saturday and lead (delay: see District.assess)."""
    pts, (rain, _) = case_points(cons), rain_days(cons)
    last_rain = max(max(r) for r in rain.values() if r)
    out = []
    for name in districts or config.DISTRICTS:
        d = District(Cases(pts.get(name, {})), rain.get(name, {}))
        for w in decision_days(FIRST_DECISION, last_rain):
            for lead in LEADS:
                a = d.assess(w, lead, delay=delay)
                if a:
                    out.append(a | {"district": name})
    return out


def evaluate(recs):
    """Rule scores and the checked risk model, same split and pass mark as the monthly system."""
    res = {}
    for lead in LEADS:
        rs = [r for r in recs if r["lag"] == lead]
        res[str(lead)] = {
            "dev": engine.score([r for r in rs if r["target"] < config.HELDOUT_FROM]),
            "heldout": engine.score([r for r in rs if r["target"] >= config.HELDOUT_FROM]),
            "model": ml.train_lag([r for r in rs if r["outcome"] is not None], lead),
        }
    return res


def open_all():
    """Main database plus the weekly backfill, if present."""
    paths = [config.DB_PATH] + [p for p in [config.DATA / "weekly.sqlite"] if p.exists()]
    cons = []
    for p in paths:
        con = sqlite3.connect(p)
        con.row_factory = sqlite3.Row
        cons.append(con)
    return cons


# ---------------------------------------------------------------- live outlook
OFFICER_SCHEMA = """CREATE TABLE IF NOT EXISTS officer_weekly (
    end_date TEXT NOT NULL, district TEXT NOT NULL, cases INTEGER NOT NULL, entered_at TEXT,
    PRIMARY KEY (end_date, district))"""


def officer_counts(con):
    con.execute(OFFICER_SCHEMA)
    out = defaultdict(dict)
    for r in con.execute("SELECT end_date, district, cases FROM officer_weekly"):
        out[r["district"]][dt.date.fromisoformat(r["end_date"])] = r["cases"]
    return out


def live_assess(d, w, lead, officer):
    """Like District.assess, but the last 28 days' cases may come from an officer. Without one, the latest public
    report is used if it is under PUBLIC_DELAY + 7 days old, as in the public-only back-test. The normal falls
    back to the most recent 52-week level within two years, marked low confidence."""
    a = d.assess(w, lead, max_age=PUBLIC_DELAY + 7)
    if a is None:
        return None
    c = officer.get(w)
    if c is not None:
        rec = _live_record(d, w, lead, a, c, at=w, officer=True)
    elif a["cases_to"]:                                  # public report: judged at the end of its own window
        rec = _live_record(d, w, lead, a, a["cases_data_month"], at=dt.date.fromisoformat(a["cases_to"]), officer=False)
    else:
        rec = _live_record(d, w, lead, a, None, at=w, officer=False)
    # what an officer's count for the 28 days to w would be judged against, so a static copy of the dashboard
    # (scripts/export_static.py) can apply the same rule in the browser
    normal, expected, low = _normals(d, w, lead, at=w)
    return rec | {"officer_normal": normal, "officer_expected": round(expected, 1) if expected else None,
                  "officer_low": low, "officer_cases_for_warning": cases_for_warning(normal)}


def _normals(d, w, lead, at):
    """Normal for the 28 days to `at` and for the target window, from the 52-week level at `at`. If that level is
    missing (e.g. a report missing at a year end), the latest one within two years is used: low confidence."""
    lv, low = d.level(at), False
    if lv is None:
        for back in range(1, 105):
            lv = d.level(at - dt.timedelta(7 * back))
            if lv:
                low = True
                break
    si_now, si_t = d.seasonal(at, at), d.seasonal(w + dt.timedelta(WINDOW * lead), at)
    return (lv * si_now if lv and si_now else None), (lv * si_t if lv and si_t else None), low


def _live_record(d, w, lead, a, c, at, officer):
    """Live record for case count c over the 28 days to `at` (w for an officer's count, the report's own end date for
    a public report)."""
    normal, expected, low = _normals(d, w, lead, at)
    case_signal = None if c is None or normal is None else c > normal
    return a | {"cases_data_month": c, "cases_normal": round(normal, 1) if normal else None,
                "expected": round(expected, 1) if expected else None, "case_signal": case_signal,
                "level": level_of(a["rain_signal"], c, normal), "cases_for_warning": cases_for_warning(normal),
                "low_confidence": low, "cases_to": at.isoformat() if c is not None else None,
                "officer": officer, "actual": None, "outcome": None,
                "window_from": (at - dt.timedelta(WINDOW - 1)).isoformat(),
                "rain_from": (w - dt.timedelta(RAIN_WINDOW - 1)).isoformat(),
                "target_from": (w + dt.timedelta(WINDOW * (lead - 1) + 1)).isoformat()}


def rain_forecast(cons, rain, name, start):
    """Rainy days forecast in the next 14 days against the median of the same 14 days in past years."""
    rows = []
    for con in cons:
        if con.execute("SELECT 1 FROM sqlite_master WHERE name='rain_fc'").fetchone():
            rows += [(dt.date.fromisoformat(r["date"]), r["mm"]) for r in
                     con.execute("SELECT date, mm FROM rain_fc WHERE district=? ORDER BY date", (name,))]
    days = [(d, mm) for d, mm in rows if start < d <= start + dt.timedelta(14)]
    if len(days) < 10:
        return None
    wet = sum(mm >= config.RAINY_DAY_MM for _, mm in days) * 14 / len(days)
    hist = []
    for k in range(1, 20):
        s = years_back(start, k)
        v = [rain.get(s + dt.timedelta(i)) for i in range(1, 15)]
        if all(x is not None for x in v):
            hist.append(sum(x >= config.RAINY_DAY_MM for x in v))
    if len(hist) < 3:
        return None
    usual = st.median(hist)
    return {"from": (start + dt.timedelta(1)).isoformat(), "to": (start + dt.timedelta(14)).isoformat(),
            "rainy_days": round(wet), "usual": round(usual, 1), "wetter": wet > usual}


def live(cons, model=None, today=None):
    """Current weekly outlook for every district: next 28 days and days 29-56."""
    today = today or dt.date.today()
    pts, (rain, source) = case_points(cons), rain_days(cons)
    officer = officer_counts(cons[0])
    out = {}
    for name in config.DISTRICTS:
        r = rain.get(name, {})
        if not r:
            continue
        last = min(max(r), today)
        w = last - dt.timedelta((last.weekday() - 5) % 7)              # latest Saturday with rain data
        d = District(Cases(pts.get(name, {})), r)
        res = {"decided": w.isoformat(), "rain_source": source[name]}
        for lead in LEADS:
            a = live_assess(d, w, lead, officer.get(name, {}))
            if a and model:
                a["risk"] = ml.risk(model.get(str(lead)), a)
            res[str(lead)] = a
        res["forecast"] = rain_forecast(cons, r, name, w)
        out[name] = res
    return out
