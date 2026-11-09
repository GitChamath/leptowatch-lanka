# Neighbouring-district cases — written before the held-out run

Date: 9 November 2026. Same method as weekly accuracy round 2 (`PREREG_weekly_v2.md`) and the soil test
(`PREREG_soil.md`): explore on development decisions only (target window before January 2018), pick by a rule fixed in
advance, run held-out years (2018 onwards) once, only for the chosen rule. The result is reported whatever it is.

## Idea

Outbreaks often cross district borders (shared rivers, paddy tracts, floods). If the districts next door already have
more cases than usual, a district's own rise may be the start of the same wave.

## Measure

Neighbours' case ratio = cases notified in the last 4 weeks in all districts sharing a border, divided by the sum of
their usual numbers, from the same data each district's own decision uses that Saturday
(`research/neighbour_test.py`; borders from `data/districts.geojson`).

## Candidates (rain over 8 weeks is required in all; Watch unchanged)

| Warning when | Next 4 weeks: right / caught | Weeks 5–8: right / caught |
|---|---|---|
| current: own cases > 1.4 × usual | 72.1% / 20.8% (312) | 65.4% / 14.8% (231) |
| own > 1.4, or own > 1 and neighbours > 1.4 | 71.2% / 22.8% (347) | 66.4% / 16.7% (256) |
| **own > 1.4, or own > 1 and neighbours > 2** | **71.8% / 22.1% (333)** | **66.4% / 16.1% (247)** |
| own > 1.4 and neighbours > 1 | 75.5% / 14.2% (204) | 67.3% / 10.1% (153) |
| own > 1.2 and neighbours > 1.2 | 74.2% / 13.0% (190) | 65.2% / 9.0% (141) |

(development years only)

**Selection:** the highest average development precision over the two distances among rules keeping at least 80% of
the current rule's development recall at both distances. The two "and neighbours" rules are more precise but catch
too few bad periods (about 65–70% of the current rule's), so they are not eligible.

**Chosen:** a Warning when rain over 8 weeks is above usual AND (own cases above 1.4 × usual, OR own cases above usual
and the neighbours' cases above 2 × usual). Average development precision 69.1% against 68.8%, a very small
difference, with slightly more bad periods caught.

**Adoption:** only if the chosen rule's held-out Warning precision is higher than the current rule's at both
distances.

## Held-out result (one run, `data/neighbour_test.json`)

| Held-out 2018+ | Current rule | Neighbour rule |
|---|---|---|
| Warning right, next 4 weeks | **71.8%** (890 of 1,239) | 71.4% (915 of 1,282) |
| Warning right, weeks 5–8 | 66.3% (831 of 1,253) | **66.5%** (864 of 1,299) |
| Bad periods caught, next 4 weeks | 28.7% | 29.5% |
| Bad periods caught, weeks 5–8 | 27.5% | 28.6% |

It did not beat the current rule at both distances, so it was **not adopted**. Neighbours' cases add about one more
caught period in a hundred without making Warnings more reliable. (Both rules here are scored from the rounded case
numbers stored in each record, which is why the current rule shows 890 of 1,239 rather than the engine's 893 of 1,245.)
