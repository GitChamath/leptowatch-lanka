import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from lw import engine, series, store  # noqa: E402


def months(n):
    return series.month_range("2007-01", series.add_months("2007-01", n - 1))


class Engine(unittest.TestCase):
    def setUp(self):
        self.m = months(96)
        # flat seasonal cases and rain, so "normal" is well defined
        self.cases = {k: 10 for k in self.m}
        self.rain = {k: 10 for k in self.m}

    def test_normal_month_gives_normal(self):
        a = engine.District(self.m, self.cases, self.rain).assess(80, 2)
        self.assertEqual(a["level"], "normal")
        self.assertFalse(a["rain_signal"])

    def test_wet_month_gives_watch_and_wet_plus_cases_gives_warning(self):
        k = self.m[78]
        self.rain[k] = 20
        a = engine.District(self.m, self.cases, self.rain).assess(80, 2)
        self.assertEqual(a["level"], "watch")
        self.cases[k] = 30
        a = engine.District(self.m, self.cases, self.rain).assess(80, 2)
        self.assertEqual(a["level"], "warning")

    def test_uses_no_future_data(self):
        base = engine.District(self.m, self.cases, self.rain).assess(80, 2)
        self.cases[self.m[85]] = 999                         # change data after the decision month
        self.rain[self.m[85]] = 99
        again = engine.District(self.m, self.cases, self.rain).assess(80, 2)
        for key in ("level", "rain_signal", "case_signal", "expected"):
            self.assertEqual(base[key], again[key])

    def test_live_outlook_without_case_data_is_rain_only(self):
        cases = {k: v for k, v in self.cases.items() if k < self.m[60]}
        self.rain[self.m[-1]] = 30
        a = engine.District(self.m, cases, self.rain).assess(len(self.m) + 1, 2)
        self.assertEqual(a["level"], "watch")
        self.assertIsNone(a["case_signal"])

    def test_score(self):
        recs = [{"level": "warning", "rain_signal": True, "case_signal": True, "outcome": True},
                {"level": "warning", "rain_signal": True, "case_signal": True, "outcome": False},
                {"level": "normal", "rain_signal": False, "case_signal": False, "outcome": False},
                {"level": "watch", "rain_signal": True, "case_signal": False, "outcome": True}]
        s = engine.score(recs)
        self.assertEqual(s["base_rate"], 0.5)
        self.assertEqual(s["warning"]["precision"], 0.5)
        self.assertEqual(s["any_alert"]["recall"], 1.0)


class MonthlyCases(unittest.TestCase):
    def test_year_to_date_becomes_monthly(self):
        with tempfile.TemporaryDirectory() as tmp, store.connect(Path(tmp) / "t.sqlite") as con:
            rows = [("2020-01-31", 5, 10), ("2020-02-29", 9, 25), ("2020-03-31", 13, 25)]
            store.upsert_reports(con, [dict(week_end=d, week=w, district="Kandy", ytd=v, national_ytd=None,
                                            source="test", fetched_at="") for d, w, v in rows])
            c = series.monthly_cases(con)["Kandy"]
            self.assertEqual((c["2020-01"], c["2020-02"], c["2020-03"]), (10, 15, 0))

    def test_officer_counts_override(self):
        with tempfile.TemporaryDirectory() as tmp, store.connect(Path(tmp) / "t.sqlite") as con:
            store.upsert_officer(con, [("2026-09", "Kandy", 42)])
            self.assertEqual(series.monthly_cases(con)["Kandy"]["2026-09"], 42)



class LevelRecord(unittest.TestCase):
    def test_counts_right_per_level(self):
        recs = [{"level": "warning", "outcome": True, "target": "2019-01"},
                {"level": "warning", "outcome": False, "target": "2019-02"},
                {"level": "watch", "outcome": True, "target": "2019-03"},
                {"level": "normal", "outcome": False, "target": "2019-04"},
                {"level": "normal", "outcome": True, "target": "2019-05"},
                {"level": "watch", "outcome": None, "target": "2026-11"}]   # not judged yet
        r = engine.level_record(recs)
        self.assertEqual((r["warning"]["right"], r["warning"]["times"]), (1, 2))
        self.assertEqual((r["watch"]["right"], r["watch"]["times"]), (1, 1))
        self.assertEqual((r["normal"]["right"], r["normal"]["times"]), (1, 2))   # normal is right when NOT above normal
        self.assertEqual((r["warning"]["from"], r["warning"]["to"]), ("2019-01", "2019-02"))


if __name__ == "__main__":
    unittest.main()
