"""District risk engine.

For a target month t and a lead of `lag` months, only data up to month k = t - lag is used.

  Rain signal  : rainy-days in month k above that district's median for the same calendar month.
  Case signal  : cases in month k above the district's normal for that month
                 (seasonal pattern x trailing 12-month level). Only complete months count; the
                 seasonal factor needs at least five past years; a level built from fewer than
                 nine of the last twelve months, or from an older window, is marked low confidence.
  Warning      : both signals.   Watch: one signal.   Normal: neither.

The outcome a warning is judged against: cases in month t above the district's normal for month t.
These rules match research/district_test.py and research/final_table.py.
"""
import json
import statistics as st
from collections import defaultdict

from . import config, ml
from .series import add_months, month_range, monthly_cases, monthly_rain


class District:
    def __init__(self, months, cases, rainy):
        self.months = months
        self.M = [int(m[5:]) for m in months]
        self.C = [cases.get(m) for m in months]
        self.R = [rainy.get(m) for m in months]
        self._count = [self._months_in(i) for i in range(len(months) + 1)]
        self._level = [self._trailing(i) for i in range(len(months) + 1)]
        self._ratios = defaultdict(list)                       # calendar month -> [(index, cases/level)]
        for i, c in enumerate(self.C):
            if i >= 13 and c is not None and self._level[i]:
                self._ratios[self.M[i]].append((i, c / self._level[i]))

    def _months_in(self, t):
        return sum(c is not None for c in self.C[max(0, t - 12):t])

    def _trailing(self, t):
        v = [c for c in self.C[max(0, t - 12):t] if c is not None]
        return st.mean(v) if len(v) >= config.LEVEL_MIN_MONTHS else None

    def _seasonal(self, cal_month, upto):
        r = [x for i, x in self._ratios[cal_month] if i <= upto]
        return st.median(r) if len(r) >= config.SEASONAL_MIN_YEARS else None

    def _same_month(self, t):
        """Alternative usual level: median of the same calendar month in the previous three years (2+ needed)."""
        prev = [self.C[t - 12 * j] for j in (1, 2, 3) if t - 12 * j >= 0 and self.C[t - 12 * j] is not None]
        return st.median(prev) if len(prev) >= 2 else None

    def assess(self, t, lag):
        k = t - lag
        if k < 0 or k >= len(self.months) or self.R[k] is None:
            return None
        rain_hist = [self.R[i] for i in range(k) if self.M[i] == self.M[k] and self.R[i] is not None]
        if len(rain_hist) < config.HISTORY_MIN:
            return None
        rain_norm = st.median(rain_hist)
        rain_signal = self.R[k] > rain_norm

        level_now, level_from = self._level[k + 1], self.months[k]
        low_conf = self._count[k + 1] < config.LEVEL_FULL_MONTHS
        live = t >= len(self.months)
        if level_now is None and live:
            # Live outlook only: public case data stops months before today, so fall back to the most
            # recent 12-month level within two years. The back-test never uses this fallback.
            for back in range(k, max(-1, k - 24), -1):
                if self._level[back + 1]:
                    # report the last month that actually has case data, not the end of the 12-month window
                    last = next(i for i in range(back, -1, -1) if self.C[i] is not None)
                    level_now, level_from = self._level[back + 1], self.months[last]
                    low_conf = True
                    break
        cal_t = (self.M[k] - 1 + lag) % 12 + 1
        si_k, si_t = self._seasonal(self.M[k], k), self._seasonal(cal_t, k)
        case_normal = level_now * si_k if level_now and si_k else None
        expected = level_now * si_t if level_now and si_t else None
        if config.BASELINE == "three_year" and not live:
            case_normal, expected = self._same_month(k), self._same_month(t)
        case_signal = None if self.C[k] is None or case_normal is None else self.C[k] > case_normal

        actual = self.C[t] if t < len(self.C) else None
        outcome = None if actual is None or expected is None else actual > expected
        signals = int(rain_signal) + int(bool(case_signal))
        return {
            "target": add_months(self.months[k], lag), "data_month": self.months[k], "lag": lag,
            "level": "warning" if signals == 2 else "watch" if signals == 1 else "normal",
            "rain_signal": rain_signal, "case_signal": case_signal,
            "rainy_days": self.R[k], "rainy_days_normal": round(rain_norm, 1),
            "cases_data_month": self.C[k], "cases_normal": round(case_normal, 1) if case_normal else None,
            "normal_based_on": level_from if case_normal else None,
            "low_confidence": bool(low_conf) if case_normal else None,
            "expected": round(expected, 1) if expected else None, "actual": actual, "outcome": outcome,
        }


def score(records):
    """Precision/recall of each alert level against outcomes."""
    judged = [r for r in records if r["outcome"] is not None]
    if not judged:
        return None
    pos = sum(r["outcome"] for r in judged)
    base = pos / len(judged)
    out = {"months": len(judged), "base_rate": round(base, 3)}
    for name, hit in (("warning", lambda r: r["level"] == "warning"),
                      ("any_alert", lambda r: r["level"] != "normal"),
                      ("rain_only_rule", lambda r: r["rain_signal"]),
                      ("cases_only_rule", lambda r: bool(r["case_signal"]))):
        flagged = [r for r in judged if hit(r)]
        tp = sum(r["outcome"] for r in flagged)
        prec = tp / len(flagged) if flagged else None
        out[name] = {"alerts": len(flagged), "correct": tp, "precision": round(prec, 3) if prec is not None else None,
                     "recall": round(tp / pos, 3) if pos else None,
                     "lift": round(prec / base, 2) if prec is not None and base else None}
    return out


def level_record(records):
    """How often each alert level was right, with counts and the period covered.

    Warning and Watch are right when the month turned out above normal; Normal is right when it did not.
    """
    judged = [r for r in records if r["outcome"] is not None]
    out = {}
    for level in ("warning", "watch", "normal"):
        recs = [r for r in judged if r["level"] == level]
        right = sum((r["outcome"] if level != "normal" else not r["outcome"]) for r in recs)
        out[level] = {"times": len(recs), "right": right,
                      "share": round(right / len(recs), 3) if recs else None,
                      "from": min((r["target"] for r in recs), default=None),
                      "to": max((r["target"] for r in recs), default=None)}
    return out


def badge(stats):
    if not stats or stats["months"] < config.BADGE_MIN_MONTHS or stats["any_alert"]["lift"] is None:
        return "insufficient"
    lift = stats["any_alert"]["lift"]
    return "high" if lift >= config.BADGE_HIGH else "medium" if lift >= config.BADGE_MEDIUM else "low"


def build_state(con, districts=None, ml_model=None):
    """All districts' outlooks and history. Pass ml_model (a previous state's "ml") to reuse it instead of retraining."""
    cases, (rainy, rain_mm) = monthly_cases(con), monthly_rain(con)
    last_rain = max((m for d in rainy.values() for m in d), default=None)
    last_case = max((m for d in cases.values() for m in d), default=None)
    if not last_rain:
        raise RuntimeError("no rainfall data; run scripts/seed.py or scripts/update.py first")
    months = month_range(config.FIRST_MONTH, last_rain)
    horizon = [add_months(last_rain, lag) for lag in config.LAGS]

    state = {"data": {"last_rain_month": last_rain, "last_case_month": last_case,
                      "last_case_report": con.execute("SELECT MAX(week_end) FROM case_reports").fetchone()[0],
                      "officer_months": [dict(r) for r in con.execute(
                          "SELECT district, month, cases FROM officer_counts ORDER BY month DESC LIMIT 50")]},
             "horizon": horizon, "districts": {}, "pooled": {}}
    pooled = defaultdict(list)
    everything = []
    for name in districts or config.DISTRICTS:
        model = District(months, cases.get(name, {}), rainy.get(name, {}))
        history, current = [], {}
        for lag in config.LAGS:
            for t in range(config.WARMUP_MONTHS, len(months) + lag):
                a = model.assess(t, lag)
                if a is None:
                    continue
                if t >= len(months):
                    current[str(lag)] = a
                else:
                    a["rain_mm"] = rain_mm.get(name, {}).get(a["data_month"])
                    history.append(a)
                    everything.append(a)
                    period = "heldout" if a["target"] >= config.HELDOUT_FROM else "dev"
                    pooled[(lag, period)].append(a)
        track = {str(lag): score([h for h in history if h["lag"] == lag]) for lag in config.LAGS}
        records = {str(lag): {
            "all": level_record([h for h in history if h["lag"] == lag]),
            "heldout": level_record([h for h in history if h["lag"] == lag and h["target"] >= config.HELDOUT_FROM]),
        } for lag in config.LAGS}
        state["districts"][name] = {
            "current": current, "track": track, "records": records, "badge": badge(track[str(config.LAGS[-1])]),
            "history": [{k: v for k, v in h.items() if k != "data_month"} | {"data_month": h["data_month"]}
                        for h in history],
        }
    for (lag, period), recs in pooled.items():
        state["pooled"].setdefault(str(lag), {})[period] = score(recs)
    state["ml"] = ml_model or ml.train(everything)
    for d in state["districts"].values():
        for lag, a in d["current"].items():
            a["risk"] = ml.risk(state["ml"].get(lag), a)
    for name in ("model_comparison", "baseline_comparison", "signal_test", "accuracy_v2"):
        f = config.DATA / f"{name}.json"
        if f.exists():
            state[name] = json.loads(f.read_text(encoding="utf-8"))
    return state


def write_state(state, path=None):
    path = path or config.STATE_PATH
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(state, separators=(",", ":")), encoding="utf-8")
    tmp.replace(path)
