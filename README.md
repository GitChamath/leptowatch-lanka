# LeptoWatch Lanka

A district-level leptospirosis early warning for Sri Lanka. Each month it combines rainfall that has
already fallen with the latest case counts, and tells a district health officer whether the coming
month is likely to be **worse than a normal season** for that district.

Population-level risk for planning prevention only. It does not diagnose, treat or advise individuals.

## Quick start

Needs Python 3.12 (tested on 3.12.10). Node 20+ is only needed to change the UI.

```
pip install -r requirements.txt
python scripts/seed.py          # load the snapshot in data/seed into data/leptowatch.sqlite and data/weekly.sqlite
python scripts/compare_models.py  # optional: method and baseline comparison shown on "How it works"
python scripts/build_state.py   # compute alerts, risk model, history and track record
python scripts/serve.py         # dashboard at http://127.0.0.1:8000
```

`python scripts/update.py` fetches new rainfall and case reports, then rebuilds alerts.
For the weekly outlook, `python -c "from lw import openmeteo; openmeteo.collect()"` fetches rain up to today and
`python scripts/build_weekly.py` rebuilds it. `.github/workflows/update.yml` runs all of this every Sunday and
commits the refreshed snapshot.
`python -m unittest discover -s tests` runs the tests.

The dashboard is a React app (Vite + Framer Motion) in `frontend/`. The built files are committed in `web/`,
so Node is only needed to change the UI:

```
cd frontend
npm install
npm run dev      # hot-reload UI on :5173, API proxied to the Python server on :8000
npm run build    # writes the production build to ../web
```

## How it decides

For a target month, using only data up to one or two months earlier:

| Signal | Rule |
|---|---|
| Rain | rainy days (≥ 1 mm, district average) above that district's median for the same calendar month |
| Cases | cases above the district's normal for that month (seasonal pattern × trailing 12-month level) |
| **Warning** | both signals |
| Watch | one signal |

A month counts as "worse than normal" when its cases exceed the district's normal for that month.

The normal uses only complete months. The trailing level needs at least 6 of the last 12 months, and the
seasonal factor is the median ratio over at least five past years. With fewer than 9 complete months, or
when the latest public reports are old, the outlook is marked **low confidence**.

**Risk percentage.** `lw/ml.py` fits a logistic regression on the same signals, trained on 2011–2017 only.
It is published only if it passes a calibration check fixed in advance: on 2018+ its Brier score must beat
always predicting the 2011–2017 base rate, and every 10-point band with at least 30 months must be within
10 points of what happened. Live outlooks use that exact checked model. A likely range comes from refits on
resampled years. The report flags "signals disagree" when the rule and the model point different ways
(thresholds from 2011–2017).

## How good it is

Rules were fixed on 2011–2017 data and scored once on 2018 onwards (all 25 districts pooled).
These numbers are recomputed by `scripts/build_state.py` (stored under `pooled` in `data/state.json`).
The dashboard shows each district's own record in its card and replays any past month under "Past seasons".

| Held-out 2018+ | 1-month lead | 2-month lead |
|---|---|---|
| Months worse than normal anyway | 53% | 54% |
| **Warning** right when it fires | **71%** (465 of 653) | **65%** (422 of 645) |
| Rain signal alone | 58% | 58% |
| Case signal alone | 67% | 62% |

What this means:

- The Warning (rain and cases together) is the useful signal: 1.34× the base rate one month ahead, 1.22× two months ahead.
- Rain alone is only a few points better than chance, so it is shown as a Watch.
- The rain signal was stronger in 2011–2017 (lift 1.28 at two months) than since 2018 (1.07).
  The one-month Warning held up (69% → 71%); the two-month Warning weakened (71% → 65%). Both periods are reported.

**Risk percentage.** One month ahead it passed its calibration check (Brier 0.219 vs 0.251 for the base rate,
AUC 0.70). Two months ahead it failed, also after recalibration, so no percentage is shown there. Months without
a case count were not well calibrated (predicted 62%, observed 55%), so the percentage is shown only when the
month's count is known.

**High-priority Warning.** A Warning whose one-month percentage is in the top 10% of 2011–2017 months (at least 73%)
is marked high priority. Threshold fixed on 2011–2017 (right 83% there); on 2018+ it was right 175 of 225 times (78%)
against a 53% base rate, but it catches only 15% of above-normal months, so it marks the clearest cases rather than
replacing the Warning. Two months ahead there is no percentage, so no high-priority tier. Recorded under
`ml.<lag>.high_priority` in `data/state.json`.

**Method comparison** (`scripts/compare_models.py`, trained on 2011–2017, tested on 2018+, each method given
as many alerts as the rule's Warnings):

| 1-month lead | AUC | Right, same number of alerts |
|---|---|---|
| Seasonal calendar | 0.51 | 54% |
| Rain alone | 0.58 | 58% |
| The rule | 0.65 | 71% |
| Last month's cases alone | 0.70 | 74% |
| Logistic regression | 0.70 | 72% |
| Gradient-boosted trees (comparison only) | 0.70 | 73% |

Most of the one-month skill comes from case counts carrying on; rain adds little on top. Two months ahead every
method is weaker (AUC 0.56–0.62). Results are in `data/model_comparison.json` and `data/baseline_comparison.json`.

**Declared deviation from the pre-registered baseline rule.** The proposal said we would compare the current
normal with the median of the same month over three years and "keep whichever is steadier and hides fewer real
rises." On that rule the three-year median wins: it is steadier (0.201 vs 0.398 median year-to-year change) and
flags more real rises (0.909 vs 0.844). **We did not switch, so this is a deviation and we report it rather than
hide it.** `scripts/compare_models.py` prints the deviation and records it under `deviation` in
`data/baseline_comparison.json`. The reason: the three-year median fits the months it is meant to describe
noticeably worse (0.511 vs 0.464 median absolute log error), which the preset rule did not weigh, and a normal
that tracks those months is the more defensible basis for an operational alert. Two things keep this honest —
switching would not improve the headline (one-month Warning lift is 1.34 either way; two-month lift is lower
under the three-year median, 1.19 vs 1.22, and its higher raw precision of 79% comes with a higher base rate of
59%), and the criterion it won on is itself weak, because the "real rise" test (1.5× the median of earlier years)
partly measures the strong upward trend in notified cases rather than surges.

**How much of the case signal is circular?** The case signal fires when cases exceed `level × seasonal`, and a
month counts as bad when cases exceed `level × seasonal` for the target month — both using the same trailing
level computed at the decision month. A low trailing level pushes signal and outcome positive together.
`research/denominator_test.py` re-scores the rule against an outcome built from the three-year same-month median,
which carries no trailing-level term. One month ahead the Warning's lift falls from 1.34 to 1.25 and its skill
(share of available headroom captured) from 0.386 to 0.353; the case signal alone loses about a fifth of its
skill, 0.303 to 0.248. Everything stays significant (p < 0.0001). So the signal is real, but part of the
shipped case-signal number is the shared denominator, and both are reported.

**Extra signals, tested and not adopted.** `research/PREREG_new_signals.md` fixed five candidate signals for the
risk percentage (case trend, rain over 3 months, heavy-rain days, neighbouring districts' cases, national cases), a
selection method on 2011–2017 only, and a promotion bar for 2018+ (pass calibration, AUC up at least 0.01, lower Brier)
before `research/signal_test.py` was first run. Selection picked rain over 3 months and national cases one month ahead,
and national cases two months ahead. They lowered 2016–2017 log loss (0.629 → 0.608) but not on 2018+: AUC 0.701 →
0.687 and 0.598 → 0.591. Neither cleared the bar, so the live model is unchanged. Results: `data/signal_test.json`.

**Second round, also not adopted.** `research/PREREG_accuracy_v2.md` tested yearly retraining, a per-district
starting point and Maha-season interactions, selected by rolling checks inside 2011–2017. Because 2018+ had already
been used, this is declared a second look at those years. One month ahead: frozen model AUC 0.701, yearly retraining
0.697, with the Maha term 0.700; two months ahead every version still failed calibration. With these two data
sources, AUC about 0.70 looks like the ceiling. Results: `data/accuracy_v2.json`.

**Weekly rolling outlook (what the map and district reports show).** The monthly outlook waits for a month to end and for CHIRPS,
which is published weeks later, so its "one month ahead" forecast arrives when that month is mostly over. `lw/weekly.py`
decides every Saturday with what an officer can know that day: rainy days in the last 28 days (56 since round 2
below; Open-Meteo, current to today) and cases notified in the last 28 days (the latest weekly report on or before that day, or an officer's count),
each against the district's usual for that time of year; the outlook covers the next 28 days and days 29 to 56. Rules
were fixed before the back-test (`research/PREREG_weekly.md`). The weekly history comes from 610 extra archived
reports (`scripts/backfill_weekly.py`, snapshot in `data/seed/wer_weekly_archive.csv`) and Open-Meteo daily rain
2006 onwards (`lw/openmeteo.py`, snapshot in `data/seed/openmeteo_daily_district.csv`). Held-out 2018+, all districts pooled:

| Held-out 2018+ | Next 4 weeks | Weeks 5–8 |
|---|---|---|
| Windows worse than normal anyway | 54% | 54% |
| **Warning** right when it fires | **69%** (1,162 of 1,678) | **64%** (1,076 of 1,695) |
| Rain signal alone | 59% | 58% |
| Case signal alone | 66% | 60% |

About the same skill as the monthly outlook, but available when it matters. The weekly risk percentage failed its
calibration check at both leads (AUC 0.65 and 0.55), so the weekly view shows no percentage and no High priority.
Weekly decisions overlap, so neighbouring ones are strongly correlated; significance is not claimed. A unit test
caught and fixed a look-ahead leak (interpolating to the decision day used the next, unpublished report).

**Weekly accuracy round 2 (adopted).** Explored on 2011–2017 only: case strength, case trend, the 12-month level
against a year earlier, heavy-rain days and rain over 8 weeks (`research/weekly_features.py`). A grid of simple rules
and a selection rule were written down before the held-out run (`research/PREREG_weekly_v2.md`): the highest
development precision among rules keeping at least 80% of the old rule's development recall. The chosen rule judges
rain over the **last 8 weeks** and needs cases **above 1.4 × usual** for a Warning. One held-out run
(`research/weekly_v2.py`, `data/weekly_v2.json`):

| Held-out 2018+ | Old rule | 8-week rain only | **Adopted rule** |
|---|---|---|---|
| Warning right, next 4 weeks | 69.2% (1,162 of 1,678) | 68.3% | **71.8%** (890 of 1,239) |
| Warning right, weeks 5–8 | 63.5% (1,076 of 1,695) | 63.5% | **66.3%** (831 of 1,253) |
| Bad windows caught by a Warning, next 4 weeks | 37.4% | 42.6% | 28.7% |
| Bad windows caught by a Warning, weeks 5–8 | 35.6% | 40.8% | 27.5% |

It beat the old rule at both leads, as the pre-registered adoption test required, so `lw/weekly.py` now uses it. The
trade is real: Warnings are right more often but fire about a quarter less, so they catch fewer bad periods. Built into
the engine, which skips the few decisions without a full 8 weeks of rain history, the live numbers are 71.7%
(893 of 1,245) and 66.4% (834 of 1,256); the site shows 72% and 66%. Held-out years had already been seen once for the
old rule, so this is a second look at them, with the choice made on development years only.

**Two more ideas, not adopted.** Same method each time: explore on 2011–2017, fix the choice in writing, run 2018+ once.

- *Soil moisture* (NASA POWER top-soil and root-zone wetness, 28 or 56 days, instead of, with, or as an alternative
  to 8-week rain; `research/PREREG_soil.md`, `research/soil_test.py`). No soil rule beat 8-week rain on development
  years (best 70.9% / 60.9% against 72.1% / 65.4%), so none was run on held-out years.
- *Neighbouring districts' cases* (`research/PREREG_neighbours.md`, `research/neighbour_test.py`). The chosen rule
  (own cases above 1.4 × usual, or above usual with neighbours above 2 × usual) scored 71.4% and 66.5% held-out against
  71.8% and 66.3%. It did not win at both distances, so it was not adopted.

With these sources, rain plus a clear rise in cases looks close to the ceiling.

**Case study: Jaffna, December 2024** (`research/case_jaffna_2024.md`, `research/case_study.py`). A leptospirosis
outbreak after north-east monsoon rain and Cyclone Fengal killed 5–8 people; deaths were reported from 11 December.
Replayed on the data available each Saturday, the weekly outlook put Jaffna on Warning from 2 November and every week
of November, about six weeks before cases peaked (218 in the 4 weeks to 28 December, against about 5 usual). Caveats:
it is a replay, Jaffna's usual is so low that a handful of cases passed the bar, and it dropped to Watch for one week
on 7 December.

The earlier zone-level analysis (69% vs a 48% base rate) did not hold up at district level on newer data.
`research/` contains every test, including the ones that weakened the original claim.

## Data

| Source | What | Freshness |
|---|---|---|
| Epidemiology Unit, Weekly Epidemiological Report (Table 1) | leptospirosis cases by RDHS district, year to date | published about 8–11 weeks after the week it covers |
| CHIRPS v2 via ClimateSERV | daily rainfall averaged over each district | about 2–3 weeks after month end |
| geoBoundaries ADM2 (CC BY 4.0) | district boundaries | static |

- Case history 2007 – early 2025 was rebuilt from archived WER PDFs; later reports (to Sep 2026) come from the live site.
  The 2026 reports retitled Table 1 ("Distribution of Notified Diseases"); the reader accepts both titles.
  Year totals match Kumari & Dabrera (BMC Infect Dis, 2026) within about 3%.
- Monthly counts are interpolated from weekly year-to-date totals. Months with gaps over 42 days between reports are left empty.
### Data rights

- **Weekly Epidemiological Report (WER).** Published openly by the Epidemiology Unit, Ministry of Health, at
  `epid.gov.lk`. The WER asks that its data be used with Epidemiology Unit acknowledgement and asks for approval
  before republication. We have requested that approval and it is still pending. The derived monthly district
  counts in `data/seed/wer_weekly.csv` are committed here because this competition requires an openly readable
  repository; they are aggregate, population-level counts by district with no personal or patient-level data of
  any kind. If the Epidemiology Unit asks us to withdraw them, we will remove them and keep the parser, which
  rebuilds the same table from the public PDFs.
- **CHIRPS v2** (Climate Hazards Center, UC Santa Barbara) via ClimateSERV: open data, no restriction on reuse.
- **geoBoundaries ADM2**: CC BY 4.0, credited.
- No personal data is collected, stored or processed anywhere in this system. Counts are district-month totals.
- Nothing here was obtained by deception or by circumventing access controls. The WER PDFs were downloaded from
  the Epidemiology Unit's own public archive at its published URLs, one request at a time.

### AI assistance disclosure

Claude (Anthropic) was used during this project, and what it did is listed here so the work can be judged
accurately:

- Reviewing the code and the statistical claims, which found the deviation from the pre-registered baseline rule
  and the shared-denominator issue, both now reported above.
- Writing `research/denominator_test.py`, and the two sections of this README that describe those two findings.
- Drafting and editing prose in this README and in the project documents.
- Independently re-running the full pipeline from `data/seed` to confirm every number reported here reproduces.

The system itself — the alert rule, the engine, the collectors and parser, the risk model in `lw/ml.py`, the
dashboard, the pre-registered split and the calibration gate — is our own design and implementation, written
during the competition period. We own what is submitted here.

## Known limits

- **The Warning catches under half of bad months.** Precision is 71% one month ahead, but recall is 40%
  (465 of the 1,174 above-normal months get a Warning). It is a signal to act on when it fires, not a safety net.
- **Most months carry some colour.** A Watch or Warning fires in 77% of held-out district-months
  (1,706 of 2,218), at 59% precision against a 53% base rate. The Watch is deliberately sensitive because it
  costs little — it means "look at this" — but an officer who sees amber every month will stop looking. The
  Warning, at 29% of months, is the one meant to change a decision. Raising the rain threshold from the median
  to the upper third is the obvious next step and `research/feature_test.py` already supports testing it.
- **The outcome is a near coin-flip by construction.** "Worse than normal" uses the district's own median-based
  normal, so about half of all months qualify (53% base rate). That is the right target for "is this season
  turning" but it is not an outbreak threshold, and a 71% hit rate should be read against 53%, not against zero.
- Because public case reports lag, the live outlook is usually rain-only (Watch at most).
  Officers can enter current counts on the dashboard (or via `POST /api/cases`) to get Warnings in real time.
- When recent case history is missing, the live outlook estimates "normal" from the most recent 12 months
  available (within two years) and says so. The back-test never uses this fallback.
- Leptospirosis is under-reported. Comparing each district with its own normal reduces the effect of
  steady under-reporting, but does not remove it.
- COVID-19 disrupted reporting in 2020–2022.
- **Languages.** The map, district card and district report can be switched to Sinhala or Tamil
  (`frontend/src/i18n.js`); How it works and Past seasons stay in English. Each Watch or Warning report drafts a
  farmer awareness message and a staff SMS in any of the three languages for the officer to check and send; the
  system sends nothing itself. The Sinhala and Tamil text is a draft and needs a native speaker's review.

## Layout

```
lw/          collectors (wer.py, chirps.py), store, monthly series, engine, risk model (ml.py), server
scripts/     seed, update, build_state, compare_models, export_seed, export_dataset, serve
frontend/    React dashboard source (map, district panel, past-season replay)
web/         built dashboard served by lw/server.py
tests/       parser and engine tests
research/    analysis scripts behind the numbers above, including denominator_test.py
data/seed/   committed data snapshot; data/state.json is what the dashboard reads
```
