# Pre-registration: new signals for the risk percentage

Written 2026-11-08, before `research/signal_test.py` was run for the first time.

## Question

Can signals beyond "last month's rain" and "last month's cases" make the risk percentage more useful?
The Watch/Warning rule is not changed by this test. Only the percentage model may change.

## Candidate signals (all use data up to the decision month k only)

1. **Case trend**: the case anomaly of the month before (k-1), so the model sees whether cases are rising.
2. **Rain over 3 months**: rainy days in k-2..k against the median of the same 3-month window in earlier years.
3. **Heavy-rain days**: days with at least 20 mm (district average) in month k, against that calendar month's median.
4. **Neighbour cases**: the mean case anomaly of the districts that share a border, in month k.
5. **National cases**: the mean case anomaly of all 25 districts in month k.

A missing value is set to 0 (the "usual" value). The existing "case missing" flag stays.

## Selection (development years only)

- Start from the current 8-feature logistic regression.
- Inner split: fit on targets 2011-2015, score log loss on targets 2016-2017.
- Forward selection: add the candidate that lowers the 2016-2017 log loss most. Stop when no candidate
  lowers it by at least 0.002.
- Done separately for one and two months ahead.

## Single test on 2018 onwards

The selected model is refitted on 2011-2017 and scored once on 2018+, next to the current model.

## Promotion rule (it goes live only if all three hold)

1. It passes the same calibration check as now (Brier below the base rate; every band with 30+ months
   within 10 points).
2. Its AUC on 2018+ is at least 0.01 higher than the current model's.
3. Its Brier score on 2018+ is lower than the current model's.

If any fails, the result is reported on the How it works page as "tested, not adopted", and nothing in the
live system changes. If two months ahead now passes calibration, a percentage is shown there too.
