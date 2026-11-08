# Pre-registration: weekly rolling outlook

Written 2026-11-08, before the weekly back-test was run on the full weekly history.

## Why

The monthly outlook needs a finished month of cases and CHIRPS rainfall that is published weeks later,
so its "one month ahead" forecast arrives when that month is mostly over. The weekly outlook decides
every Saturday with data an officer can have that day.

## Rules (mirroring the monthly system; no tuning on results)

- Decision day W: every Saturday. Window: 28 days.
- Rain: rainy days (>= 1 mm, district average of up to 6 Open-Meteo points) in the 28 days to W, above
  the median of the same 28 days in earlier years (at least 3 years).
- Cases: cases in the 28 days to W (interpolated from weekly year-to-date reports no more than 21 days
  apart), above level x seasonal factor; level = cases in the 364 days to W scaled to 28 days; seasonal
  factor = median over at least 5 earlier years of (window cases / level then), windows ended by W only.
- Warning both, Watch one, Normal neither.
- Outcome: cases in the next 28 days (lead 1) or days 29-56 (lead 2) above level x seasonal factor for
  that window.
- Split: development targets before 2018, held-out 2018 onwards, scored once.
- Risk percentage: the same logistic regression, calibration check, recalibration route and
  high-priority threshold as lw/ml.py.

## Declared limits

- Overlapping weekly windows make neighbouring decisions highly correlated; precision is fine to report,
  but significance tests would be optimistic and are not claimed.
- Rain in the back-test is Open-Meteo's archive (ERA5-based); live rain for the most recent days comes from
  the same service, whose last few days are model estimates that can be revised.
- Weeks whose archived report is missing are interpolated across gaps up to 21 days, otherwise skipped.
- The 16-day rainfall forecast is shown to officers but is not part of the rule or the accuracy figures,
  because no archived forecasts exist to test it.
