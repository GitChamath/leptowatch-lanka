# Weekly outlook, accuracy round 2 — written before the held-out run

Date: 9 November 2026. Everything below was chosen on development decisions only (target window before
January 2018). Held-out decisions (target 2018 onwards) are scored once, by `research/weekly_v2.py`, after
this file was written. The result is reported whatever it is.

## Starting point (development years)

| Current rule | Next 4 weeks | Weeks 5–8 |
|---|---|---|
| Warning right | 64.4% (374 alerts) | 62.0% (292 alerts) |
| Share of bad periods caught | 22.3% | 17.7% |

## What was explored on development years

All measured on the decision day with data available then (`research/weekly_features.py`):

- case ratio (cases in the last 4 weeks ÷ usual), at thresholds 1.0 to 2.0
- case trend (last 4 weeks ÷ the 4 weeks before)
- the district's 12-month level against a year earlier
- heavy-rain days (≥ 10 mm) in the last 4 weeks against usual
- rainy days in the last 8 weeks against usual

Trend, level against a year earlier and heavy rain added little or made Warnings worse. Rain over 8 weeks
helped at both distances.

## Grid and selection rule (fixed before looking at the result)

Warning = (rain condition) AND (cases > k × usual), optionally OR (cases ≥ m × usual on their own).

- rain condition: 4 weeks above usual (current); 4 and 8 weeks; 8 weeks; 4 weeks and heavy days not below usual
- k: 1.0, 1.2, 1.4
- m: none, 2.0, 3.0

**Selection:** the highest average development precision over the two distances, among rules that keep at
least 80% of the current rule's development recall at both distances.

## Chosen rule

- **Rain signal:** rainy days (≥ 1 mm) in the **last 8 weeks** above the median of the same 8 weeks in earlier
  years (was: last 4 weeks).
- **Case signal:** cases notified in the last 4 weeks above usual (unchanged).
- **Warning:** rain signal AND cases **at least 1.4 × usual** (40% above usual).
- **Watch:** exactly one of the rain signal or the case signal. **Normal:** neither.

On development years: Warning right 72.1% (312 alerts, 20.8% caught) for the next 4 weeks and 65.4% (231
alerts, 14.8% caught) for weeks 5–8. Rain over 8 weeks alone also beat rain over 4 weeks (55.8% vs 53.8%, and
57.2% vs 54.5%).

The simpler change alone (8-week rain, cases > usual) beat the current rule on both precision and recall at
both distances (68.3% / 27.4% and 65.3% / 21.1%); it is reported beside the chosen rule.

## Held-out run

Scores the current rule, the 8-week-only rule and the chosen rule on held-out decisions, the same way as
`lw/weekly.py` (`engine.score`). The chosen rule is adopted if its held-out Warning precision is higher than
the current rule's at both distances; otherwise nothing changes.
