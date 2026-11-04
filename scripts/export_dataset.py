"""Export every dataset LeptoWatch uses or produces into one folder, as CSV plus an Excel workbook.

    python scripts/export_dataset.py "<output folder>"

Writes cases (weekly year-to-date and monthly), rainfall (daily and monthly), officer counts,
alert history, evaluation results and district boundaries. Source PDFs and the original zone
dataset are copied separately (see the folder's README).
"""
import csv
import json
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from lw import config, engine, store  # noqa: E402
from lw.series import month_range, monthly_cases, monthly_rain  # noqa: E402


def write_csv(path, header, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(header)
        w.writerows(rows)
    return path


def main(out):
    out = Path(out)
    files = {}
    with store.connect() as con:
        # ---- cases
        rows = con.execute("SELECT week_end, week, district, ytd, national_ytd FROM case_reports ORDER BY week_end, district").fetchall()
        files["cases_weekly"] = write_csv(out / "1_cases" / "cases_weekly_year_to_date_by_district.csv",
            ["week_end", "week", "district", "cases_year_to_date", "national_year_to_date"], [tuple(r) for r in rows])
        cases = monthly_cases(con)
        last_case = max(m for d in cases.values() for m in d)
        months = month_range(config.FIRST_MONTH, last_case)
        files["cases_monthly"] = write_csv(out / "1_cases" / "cases_monthly_by_district.csv",
            ["month", "district", "cases"],
            [(m, d, cases[d][m]) for m in months for d in config.DISTRICTS if m in cases.get(d, {})])
        files["cases_monthly_wide"] = write_csv(out / "1_cases" / "cases_monthly_by_district_wide.csv",
            ["month"] + config.DISTRICTS, [[m] + [cases.get(d, {}).get(m, "") for d in config.DISTRICTS] for m in months])
        officer = con.execute("SELECT month, district, cases, entered_at FROM officer_counts ORDER BY month, district").fetchall()
        files["officer"] = write_csv(out / "1_cases" / "officer_entered_counts.csv",
            ["month", "district", "cases", "entered_at_utc"], [tuple(r) for r in officer])

        # ---- rainfall
        rain = con.execute("SELECT date, district, mm FROM rain_daily ORDER BY district, date").fetchall()
        files["rain_daily"] = write_csv(out / "2_rainfall" / "rainfall_daily_by_district_chirps.csv",
            ["date", "district", "rain_mm"], [(r[0], r[1], round(r[2], 2)) for r in rain])
        rainy, mm = monthly_rain(con)
        last_rain = max(m for d in rainy.values() for m in d)
        rmonths = month_range("2006-01", last_rain)
        files["rain_monthly"] = write_csv(out / "2_rainfall" / "rainfall_monthly_by_district.csv",
            ["month", "district", "rainy_days_ge_1mm", "rain_total_mm"],
            [(m, d, rainy[d][m], mm[d][m]) for d in config.DISTRICTS for m in rmonths if m in rainy.get(d, {})])

        # ---- model outputs
        state = engine.build_state(con)
    hist_cols = ["district", "lag", "data_month", "target", "level", "rain_signal", "case_signal", "rainy_days",
                 "rainy_days_normal", "cases_data_month", "cases_normal", "expected", "actual", "outcome"]
    hist = [[name] + [h.get(c) for c in hist_cols[1:]]
            for name, d in state["districts"].items() for h in d["history"]]
    files["alerts_history"] = write_csv(out / "3_model_outputs" / "alerts_history_by_district_month.csv", hist_cols, hist)
    cur = [[name, lag] + [c.get(k) for k in hist_cols[2:12]]
           for name, d in state["districts"].items() for lag, c in d["current"].items()]
    files["alerts_current"] = write_csv(out / "3_model_outputs" / "current_outlook.csv", hist_cols[:12], cur)

    ev = []
    for lag, periods in state["pooled"].items():
        for period, s in periods.items():
            for rule in ("warning", "any_alert", "rain_only_rule", "cases_only_rule"):
                r = s[rule]
                ev.append(["all districts", lag, "2011-2017" if period == "dev" else "2018+ (held-out)", rule,
                           s["months"], s["base_rate"], r["alerts"], r["correct"], r["precision"], r["recall"], r["lift"]])
    for name, d in state["districts"].items():
        for lag, s in d["track"].items():
            if s:
                r = s["warning"]
                ev.append([name, lag, "2011 onwards", "warning", s["months"], s["base_rate"],
                           r["alerts"], r["correct"], r["precision"], r["recall"], r["lift"]])
    files["evaluation"] = write_csv(out / "4_evaluation" / "rule_evaluation.csv",
        ["scope", "lead_months", "period", "rule", "district_months", "base_rate", "alerts", "correct",
         "precision", "recall", "lift"], ev)

    # ML: method comparison and the calibration check (same split as the system; see scripts/compare_models.py)
    comp = state.get("model_comparison", {}).get("lags", {})
    ml_rows = [[lag, r["method"], r["auc"], r["brier"], c["alerts_k"], r["precision_at_k"]]
               for lag, c in comp.items() for r in c["rows"]]
    files["ml"] = write_csv(out / "4_evaluation" / "ml_comparison_heldout_2018_onwards.csv",
        ["lead_months", "method", "roc_auc", "brier", "alerts_compared", "precision_at_same_alerts"], ml_rows)
    cal_rows = [[lag, m["method"], m["passed"], b["from"], b["to"], b["n"], b["predicted"], b["observed"], b["counted"], b["ok"]]
                for lag, m in state.get("ml", {}).items() for b in m["report"]["calibration"]["bands"]]
    files["calibration"] = write_csv(out / "4_evaluation" / "risk_percentage_calibration_2018_onwards.csv",
        ["lead_months", "model", "passed_check", "band_from", "band_to", "months", "mean_predicted", "observed_share",
         "counted_in_check", "within_10_points"], cal_rows)

    # ---- boundaries
    (out / "5_boundaries").mkdir(parents=True, exist_ok=True)
    shutil.copy(config.GEO_PATH, out / "5_boundaries" / "sri_lanka_districts_simplified.geojson")
    shutil.copy(config.DATA / "districts_raw.geojson", out / "5_boundaries" / "sri_lanka_districts_geoboundaries_adm2.geojson")

    json.dump({k: str(v.relative_to(out)) for k, v in files.items()}, open(out / "manifest.json", "w"), indent=2)
    for k, v in files.items():
        print(f"{k:<18} {v.relative_to(out)}")
    return files


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "export")
