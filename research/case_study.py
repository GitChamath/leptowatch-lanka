"""Case study: what the weekly outlook (current rule) would have said in Jaffna before the December 2024 outbreak.

    python research/case_study.py            # prints the week-by-week table used in research/case_jaffna_2024.md

A back-test: each Saturday uses only rain up to that day and cases as the officer would know them (reports dated on
or before it). The last column is the same rule with public reports only, as late as they go online (PUBLIC_DELAY).
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
    print("Saturday    | next 4 weeks | weeks 5-8 | rainy days (8 wk) / usual | cases (4 wk) / usual | cases in the next 4 weeks"
          " | public reports only: next 4 weeks (report to)")
    for w in weekly.decision_days(FROM, TO):
        a1, a2, p1 = d.assess(w, 1), d.assess(w, 2), d.assess(w, 1, delay=weekly.PUBLIC_DELAY)
        if not a1:
            continue
        fmt = lambda x: "-" if x is None else f"{x:g}"
        print(f"{w}  | {a1['level']:12} | {a2['level'] if a2 else '-':9} | {a1['rainy_days']} / {fmt(a1['rainy_days_normal'])}"
              f"{'':14}| {fmt(a1['cases_data_month'])} / {fmt(a1['cases_normal'])}{'':10}| {fmt(a1['actual'])}"
              f"{'':20}| {p1['level'] if p1 else '-'} ({p1['cases_to'] if p1 else '-'})")


if __name__ == "__main__":
    main()
