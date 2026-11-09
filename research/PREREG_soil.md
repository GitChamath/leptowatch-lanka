# Soil moisture test — plan and result (not adopted)

Date: 9 November 2026. Same method as weekly accuracy round 2 (`PREREG_weekly_v2.md`): explore on development
decisions only (target window before January 2018), pick by a rule fixed in advance, and run the held-out years
(2018 onwards) once, only for the chosen rule.

## Idea

Leptospira survive in waterlogged soil. Soil wetness might measure that more directly than counting rainy days.

## Data

- NASA POWER daily soil wetness (MERRA-2 based), top soil (GWETTOP) and root zone (GWETROOT), 0 = dry, 1 = saturated,
  one grid point near the middle of each district, 2006 to 5 November 2026 (`research/soil_fetch_power.py`).
- NASA POWER runs about 4 days behind, so each Saturday's soil window ends 4 days before it.
- Open-Meteo soil moisture was tried first but hit the free daily request limit after 6 districts, so it was not
  used.

## Candidates (12) and selection rule

Soil wetness averaged over the last 28 or 56 days, top soil or root zone, against the median of the same window in
earlier years ("soil wetter than usual"). Each used as the wetness signal (instead of 8-week rain), together with it
(AND), or as an alternative (OR). A Warning still needs cases above 1.4 × usual.

**Selection:** the highest average development precision over the two distances among rules keeping at least 80% of
the current rule's development recall; adopted only if it then beats the current rule on held-out years at both
distances.

## Result on development years (`python research/soil_test.py --explore`)

| Rule | Warning right, next 4 weeks | Weeks 5–8 | Caught, next 4 weeks |
|---|---|---|---|
| **Current: rain over 8 weeks** | **72.1%** (312) | **65.4%** (231) | 20.8% |
| Rain OR top soil, 28 days (best soil rule passing the recall floor) | 70.9% (402) | 60.9% (304) | 26.3% |
| Rain AND top soil, 28 days | 71.5% (137) | 63.6% (110) | 9.1% |
| Top soil, 28 days, instead of rain | 69.6% (227) | 56.8% (183) | 14.6% |

The current rule had the highest development precision, so **no soil rule was chosen and the held-out years were not
used**. Soil wetness adds nothing over 8 weeks of rainy days at district level. One side note: rain AND wet soil made
the wetness signal on its own more precise (about 62% against 56%), but it fires too rarely to be useful.
