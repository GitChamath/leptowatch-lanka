import random
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from lw import config, engine, ml, series  # noqa: E402


def outlook(level="watch", rain_signal=True, cases=None, normal=10.0, target="2019-06"):
    return {"level": level, "rain_signal": rain_signal, "rainy_days": 20, "rainy_days_normal": 15.0,
            "cases_data_month": cases, "cases_normal": normal if cases is not None else None,
            "case_signal": None if cases is None else cases > normal, "target": target}


class Logistic(unittest.TestCase):
    def test_learns_the_direction_of_a_signal(self):
        rnd = random.Random(1)
        X, y = [], []
        for _ in range(600):
            v = rnd.uniform(-2, 2)
            X.append([1.0, v])
            y.append(int(rnd.random() < 1 / (1 + 2.718 ** (-2 * v))))
        w = ml.fit_logreg(X, y, l2=0.0)
        self.assertGreater(w[1], 1.2)
        self.assertLess(abs(w[0]), 0.4)

    def test_auc_and_brier(self):
        self.assertEqual(ml.auc([0.1, 0.2, 0.8, 0.9], [0, 0, 1, 1]), 1.0)
        self.assertEqual(ml.auc([0.5, 0.5], [0, 1]), 0.5)
        self.assertAlmostEqual(ml.brier([1.0, 0.0], [1, 0]), 0.0)


class Calibration(unittest.TestCase):
    def _sample(self, shift):
        rnd = random.Random(2)
        p = [rnd.uniform(0.05, 0.95) for _ in range(3000)]
        y = [int(rnd.random() < min(max(q + shift, 0), 1)) for q in p]
        return p, y

    def test_well_calibrated_passes(self):
        p, y = self._sample(0.0)
        self.assertTrue(ml.calibration(p, y, base=0.5)["passed"])

    def test_off_by_twenty_points_fails(self):
        p, y = self._sample(0.2)
        self.assertFalse(ml.calibration(p, y, base=0.5)["bands_ok"])


class Risk(unittest.TestCase):
    model = {"passed": True, "model": {"w": [0.0] * len(ml.FEATURES), "platt": None}, "boot": [],
             "thresholds": {"warning_below": 0.55, "normal_at_or_above": 0.7}}

    def test_no_percentage_without_a_case_count(self):
        r = ml.risk(self.model, outlook(cases=None))
        self.assertIsNone(r["p"])
        self.assertTrue(r["needs_cases"])

    def test_no_percentage_when_the_check_failed(self):
        self.assertIsNone(ml.risk(dict(self.model, passed=False), outlook(cases=12)))

    def test_warning_with_a_low_estimate_disagrees(self):
        r = ml.risk(self.model, outlook(level="warning", cases=12))      # all-zero weights give 50%
        self.assertEqual(r["p"], 0.5)
        self.assertTrue(r["disagree"])
        self.assertFalse(ml.risk(self.model, outlook(level="watch", cases=12))["disagree"])


class Trees(unittest.TestCase):
    def test_boosted_trees_learn_a_threshold(self):
        rnd = random.Random(3)
        X = [[1.0, rnd.uniform(0, 1)] for _ in range(500)]
        y = [int(x[1] > 0.6) for x in X]
        p = ml.predict_gbt(ml.fit_gbt(X, y, rounds=40), X)
        self.assertGreater(ml.auc(p, y), 0.95)


class ProposalRules(unittest.TestCase):
    def setUp(self):
        self.m = series.month_range("2007-01", series.add_months("2007-01", 95))
        self.cases = {k: 10 for k in self.m}
        self.rain = {k: 10 for k in self.m}

    def test_seasonal_factor_needs_five_years(self):
        d = engine.District(self.m, self.cases, self.rain)
        self.assertIsNone(d._seasonal(7, 54))                  # four Julys of ratios so far
        self.assertIsNotNone(d._seasonal(7, 66))               # five

    def test_few_complete_months_are_low_confidence(self):
        for k in self.m[70:74]:                                # four of the last twelve months missing
            del self.cases[k]
        a = engine.District(self.m, self.cases, self.rain).assess(80, 2)
        self.assertTrue(a["low_confidence"])
        full = engine.District(self.m, {k: 10 for k in self.m}, self.rain).assess(80, 2)
        self.assertFalse(full["low_confidence"])

    def test_three_year_baseline_uses_no_future_data(self):
        saved, config.BASELINE = config.BASELINE, "three_year"
        try:
            base = engine.District(self.m, self.cases, self.rain).assess(80, 2)
            self.cases[self.m[85]] = 999
            again = engine.District(self.m, self.cases, self.rain).assess(80, 2)
        finally:
            config.BASELINE = saved
        self.assertEqual(base["case_signal"], again["case_signal"])
        self.assertEqual(base["level"], again["level"])


if __name__ == "__main__":
    unittest.main()
