"""Extra per-decision numbers for the weekly accuracy round (research/PREREG_weekly_v2.md).

Rebuilds every weekly decision exactly as lw/weekly.py does, and adds a few more measurements that use only
data available on the decision day. Nothing here changes the live system.
"""
import datetime as dt
import statistics as st
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from lw import config, weekly  # noqa: E402

HEAVY_MM = 10.0


class District(weekly.District):
    def rainy(self, end):
        """The rule before round 2: rain over the last 28 days (the live engine now uses 56)."""
        days = [self.rain.get(end - dt.timedelta(i)) for i in range(weekly.WINDOW)]
        return None if any(v is None for v in days) else sum(v >= config.RAINY_DAY_MM for v in days)

    def heavy(self, end):
        days = [self.rain.get(end - dt.timedelta(i)) for i in range(weekly.WINDOW)]
        return None if any(v is None for v in days) else sum(v >= HEAVY_MM for v in days)

    def rainy_n(self, end, n):
        days = [self.rain.get(end - dt.timedelta(i)) for i in range(n)]
        return None if any(v is None for v in days) else sum(v >= config.RAINY_DAY_MM for v in days)

    def usual(self, f, w):
        hist = [x for k in range(1, 20) if (x := f(weekly.years_back(w, k))) is not None]
        return st.median(hist) if len(hist) >= config.HISTORY_MIN else None

    def extra(self, w, base):
        """Numbers beside the rule's own, all known on decision day w."""
        cw = self.cases.last_on_or_before(w)
        c, normal = base["cases_data_month"], base["cases_normal"]
        prev = self.cases.between(cw - dt.timedelta(56), cw - dt.timedelta(28)) if cw else None
        lv_now = self.level(cw) if cw else None
        lv_year_ago = self.level(weekly.years_back(cw, 1)) if cw else None
        hv, hv_n = self.heavy(w), self.usual(self.heavy, w)
        r56 = self.rainy_n(w, 56)
        r56_n = self.usual(lambda e: self.rainy_n(e, 56), w)
        return {
            "case_ratio": c / normal if c is not None and normal else None,
            "trend": (c + 1) / (prev + 1) if c is not None and prev is not None else None,
            "level_vs_year_ago": lv_now / lv_year_ago if lv_now and lv_year_ago else None,
            "rain_excess": base["rainy_days"] - base["rainy_days_normal"],
            "heavy_excess": None if hv is None or hv_n is None else hv - hv_n,
            "rain56_excess": None if r56 is None or r56_n is None else r56 - r56_n,
        }


def history(cons):
    pts, (rain, _) = weekly.case_points(cons), weekly.rain_days(cons)
    last_rain = max(max(r) for r in rain.values() if r)
    out = []
    for name in config.DISTRICTS:
        d = District(weekly.Cases(pts.get(name, {})), rain.get(name, {}))
        for w in weekly.decision_days(weekly.FIRST_DECISION, last_rain):
            for lead in weekly.LEADS:
                a = d.assess(w, lead)
                if a:
                    n = int(a["rain_signal"]) + int(bool(a["case_signal"]))       # the rule before round 2
                    a["level"] = "warning" if n == 2 else "watch" if n == 1 else "normal"
                    out.append(a | {"district": name} | d.extra(w, a))
    return out
