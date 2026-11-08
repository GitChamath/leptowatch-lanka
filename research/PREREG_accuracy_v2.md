# Pre-registration: accuracy round 2

Written 2026-11-08, before `research/accuracy_v2.py` was run for the first time.

## Honest caveat

2018 onwards has already been used to score the rule, the model comparison and the extra-signals test.
Any result here is a **second look** at that period, not a fresh test, and is reported as such.

## Ideas

1. **Yearly retraining.** Instead of one model frozen on 2011-2017, refit each year on every target month
   known by then. For predictions in year Y the model uses target months up to September of Y-1, so the
   three-month reporting delay is respected.
2. **District starting point.** The share of months that were above normal in that district, in the
   training months only (logit, shrunk toward the pooled rate with 24 pseudo-months).
3. **Paddy-season effects.** Rain anomaly x Maha and case anomaly x Maha, where Maha is a target month in
   October to February.

## Selection (development years only)

- Start from the current 8 features.
- Rolling check inside 2011-2017: train on targets before 2015 and score 2015, before 2016 -> 2016,
  before 2017 -> 2017. Mean log loss over the three years.
- Forward selection over the three new features in idea 2 and 3; stop when no feature lowers mean
  log loss by at least 0.002.
- Separately for one and two months ahead.

## Single scoring on 2018 onwards

Four versions are scored once: frozen current model, yearly-retrained current model, frozen selected model,
yearly-retrained selected model.

## Promotion rule (unchanged from round 1)

A version replaces the live model only if, against the frozen current model on 2018+, it passes the
calibration check, raises AUC by at least 0.01, and lowers the Brier score. If more than one passes, the
one with the lowest Brier score wins. If two months ahead now passes calibration, it gets a percentage too.
