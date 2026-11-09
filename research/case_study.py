"""Case study: what the weekly outlook (current rule) would have said in Jaffna before the December 2024 outbreak.

    python research/case_study.py            # prints the week-by-week table used in research/case_jaffna_2024.md

A back-test: each Saturday uses only rain up to that day and case reports dated on or before it, the same way the
held-out accuracy is measured. In real use the case counts come from the officer, because public reports lag.
"""
import datetime as dt
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from lw import weekly  # noqa: E402

DISTRICT, FROM, TO = "Jaffna", dt.date(2024, 9, 28), dt.date(2025, 1, 11)


def main():
    cons = weekly.open_all()
    pts, (rain, _) = weekly.case_points(cons), weekly.rain_days(cons)
    d = weekly.District(weekly.Cases(pts[DISTRICT]), rain[DISTRICT])
    print("Saturday    | next 4 weeks | weeks 5-8 | rainy days (8 wk) / usual | cases (4 wk) / usual | cases in the next 4 weeks")
    for w in weekly.decision_days(FROM, TO):
        a1, a2 = d.assess(w, 1), d.assess(w, 2)
        if not a1:
            continue
        fmt = lambda x: "-" if x is None else f"{x:g}"
        print(f"{w}  | {a1['level']:12} | {a2['level'] if a2 else '-':9} | {a1['rainy_days']} / {fmt(a1['rainy_days_normal'])}"
              f"{'':14}| {fmt(a1['cases_data_month'])} / {fmt(a1['cases_normal'])}{'':10}| {fmt(a1['actual'])}")


if __name__ == "__main__":
    main()
