# Weekly outlook, a separate rule for weeks 5–8 — written before any run

Date: 9 November 2026. Written before `research/weekly_lead2.py` was first run.

## Why

The weekly outlook gives two outlooks, the next 4 weeks and weeks 5–8, but both come from one rule applied to
the same data on the decision day, so the two always show the same colour. Only their scores differ (held-out
Warning right 71.7% and 66.4% with officer counts). This round asks whether weeks 5–8 deserve their own rule.
The next-4-weeks rule is not touched.

## Candidate rules for weeks 5–8 (grid fixed here)

All use only data known on the decision day, exactly as `lw/weekly.py`.

- **Rain signal:** rainy days (≥ 1 mm) in the last **R** days above the median of the same R days in earlier
  years by more than **e** days. R: 28, 56, 84. e: 0, 3, 6.
- **Case condition for a Warning:** cases in the last 4 weeks above **k × usual**. k: 1.0, 1.2, 1.4, 1.7, 2.0.
- **Trend (optional):** cases in the last 4 weeks above the 4 weeks before. Off / on.
- **Season (optional):** the usual for the target window (weeks 5–8) above the usual for the last 4 weeks, i.e.
  the district's season is rising. Off / on.
- **Warning** = rain signal AND case condition AND every option switched on.
  **Watch** = rain signal OR cases above usual, when not a Warning. **Normal** = neither.

180 rules. The current rule is R = 56, e = 0, k = 1.4, trend off, season off.

## Selection (development years only: target window before January 2018)

Scored on the officer-count back-test (case reports known when the week ends), as in round 2:

1. Keep rules whose development Warning recall for weeks 5–8 is at least 80% of the current rule's, and that
   give at least 150 development Warnings.
2. Choose the highest development Warning precision. Ties: the simpler rule (fewer options on, then the rule
   closest to the current one).

The selection script scores development decisions only; held-out decisions are dropped before scoring.

## Held-out run (once)

Target windows from January 2018. The chosen rule is **adopted for weeks 5–8 only if its held-out Warning
precision beats the current rule's in both back-tests**: officer counts (current 66.4%, 834 of 1,256) and public
reports only, 8 weeks late (current 61.0%, 659 of 1,080). Otherwise nothing changes, and that is reported.

## Result (added after the selection run, 9 November 2026)

`python research/weekly_lead2.py select` (results in `data/weekly_lead2_select.json`). The current rule
reproduced the engine on all 20,700 weeks 5–8 decisions. On development years it was right 65.7% of the time
(233 Warnings, 15.0% of bad periods caught); 17 of the 180 rules met the recall and size bar, and **none beat
it**. The nearest were 12 weeks of rain with cases above 1.2 × usual and rising (also 65.7%, but fewer Warnings
and lower recall) and 8 weeks of rain with cases above 1.2 × usual (65.3%). Longer rain, higher rain bars, the
case trend and the season option all failed to help.

**The selection chose the current rule, so nothing changes and the held-out run was not made** (it could only
compare the current rule with itself). Weeks 5–8 keep the same rule as the next 4 weeks, so the two outlooks
always show the same colour; only how often each was right differs. The dashboard now shows them as one
8-week outlook, scored for weeks 1–4 and weeks 5–8.

## Declared

Held-out years 2018 onwards have been scored before (rounds 1 and 2, and the public-delay correction). This is
another look at them, with the choice made on development years only, and it is reported as such.
