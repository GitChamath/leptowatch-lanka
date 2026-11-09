import datetime as dt
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from lw import weekly  # noqa: E402

D = dt.date


def year_points(year, per_week, gap=7):
    """Weekly year-to-date points with a constant count per week."""
    pts, d, total = [(D(year - 1, 12, 31), 0)], D(year, 1, 7), 0
    while d.year == year:
        total += per_week * gap // 7
        pts.append((d, total))
        d += dt.timedelta(gap)
    pts.append((D(year, 12, 31), total + per_week * (D(year, 12, 31) - pts[-1][0]).days // 7))
    return pts


class Cases(unittest.TestCase):
    def setUp(self):
        self.c = weekly.Cases({2020: year_points(2020, 7), 2021: year_points(2021, 7)})

    def test_window_inside_a_year(self):
        self.assertAlmostEqual(self.c.between(D(2020, 3, 7), D(2020, 4, 4)), 28, delta=1)

    def test_window_across_new_year(self):
        self.assertAlmostEqual(self.c.between(D(2020, 12, 15), D(2021, 1, 12)), 28, delta=2)

    def test_gap_too_long_is_refused(self):
        c = weekly.Cases({2020: [(D(2019, 12, 31), 0), (D(2020, 1, 4), 4), (D(2020, 3, 1), 60)]})
        self.assertIsNone(c.between(D(2020, 1, 10), D(2020, 2, 7)))


class Engine(unittest.TestCase):
    def district(self, extra_rain=0):
        years = {y: year_points(y, 7) for y in range(2007, 2022)}
        rain = {}
        d = D(2007, 1, 1)
        while d <= D(2021, 12, 31):
            rain[d] = 2.0 if d.day % 2 else 0.0          # about half the days rainy, every year
            d += dt.timedelta(1)
        for i in range(extra_rain):
            rain[D(2020, 6, 6) - dt.timedelta(i)] = 5.0
        return weekly.District(weekly.Cases(years), rain)

    def test_usual_season_is_normal(self):
        a = self.district().assess(D(2020, 6, 6), 1)
        self.assertEqual(a["level"], "normal")

    def test_wetter_window_gives_watch(self):
        a = self.district(extra_rain=28).assess(D(2020, 6, 6), 1)
        self.assertTrue(a["rain_signal"])
        self.assertEqual(a["level"], "watch")

    def test_warning_needs_cases_well_above_normal(self):
        self.assertEqual(weekly.level_of(True, 120, 100), "watch")      # rain up, cases only 1.2 x normal
        self.assertEqual(weekly.level_of(True, 141, 100), "warning")    # rain up, cases above 1.4 x normal
        self.assertEqual(weekly.level_of(False, 300, 100), "watch")     # cases alone never give a Warning
        self.assertEqual(weekly.level_of(False, 90, 100), "normal")
        self.assertEqual(weekly.cases_for_warning(65), 92)

    def test_decision_uses_no_future_cases(self):
        d = self.district()
        before = d.assess(D(2020, 6, 6), 1)
        d.cases.years[2020] = [p if p[0] <= D(2020, 6, 6) else (p[0], p[1] * 3) for p in d.cases.years[2020]]
        d.cases._dates = {y: [x for x, _ in p] for y, p in d.cases.years.items()}
        d._level, d._ratio = {}, {}
        after = d.assess(D(2020, 6, 6), 1)
        for k in ("level", "rain_signal", "case_signal", "cases_data_month", "cases_normal"):
            self.assertEqual(before[k], after[k])

    def test_public_delay_ignores_reports_not_yet_online(self):
        w, delay = D(2020, 6, 6), weekly.PUBLIC_DELAY
        d = self.district()
        before = d.assess(w, 1, delay=delay)
        self.assertLessEqual((w - D.fromisoformat(before["cases_to"])).days, delay + 7)
        d.cases.years[2020] = [p if p[0] <= w - dt.timedelta(delay) else (p[0], p[1] * 3) for p in d.cases.years[2020]]
        d.cases._dates = {y: [x for x, _ in p] for y, p in d.cases.years.items()}
        d._level, d._ratio = {}, {}
        after = d.assess(w, 1, delay=delay)
        for k in ("level", "case_signal", "cases_data_month", "cases_to"):
            self.assertEqual(before[k], after[k])

    def test_live_uses_recent_public_report_and_officer_count_wins(self):
        d = self.district()
        d.cases.years[2020] = [p for p in d.cases.years[2020] if p[0] <= D(2020, 5, 1)]   # last report 5 weeks old
        d.cases._dates = {y: [x for x, _ in p] for y, p in d.cases.years.items()}
        w = D(2020, 6, 6)
        public = weekly.live_assess(d, w, 1, {})
        self.assertFalse(public["officer"])
        self.assertIsNotNone(public["cases_data_month"])
        self.assertLess(D.fromisoformat(public["cases_to"]), w)
        own = weekly.live_assess(d, w, 1, {w: 500})
        self.assertTrue(own["officer"])
        self.assertEqual((own["cases_data_month"], own["cases_to"]), (500, w.isoformat()))
        self.assertEqual(own["level"], "watch")                          # cases far above normal, rain usual


if __name__ == "__main__":
    unittest.main()
