# LeptoWatch Lanka

A district-level leptospirosis early warning for Sri Lanka. Each month it combines rainfall that has
already fallen with the latest case counts, and tells a district health officer whether the coming
month is likely to be **worse than a normal season** for that district.

Population-level risk for planning prevention only. It does not diagnose, treat or advise individuals.

## Quick start

```
pip install -r requirements.txt
python scripts/seed.py          # load the snapshot in data/seed into data/leptowatch.sqlite
python scripts/compare_models.py  # optional: method and baseline comparison shown on "How it works"
python scripts/build_state.py   # compute alerts, risk model, history and track record
python scripts/serve.py         # dashboard at http://127.0.0.1:8000
```

`python scripts/update.py` fetches new rainfall and case reports, then rebuilds alerts.
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
| Months worse than normal anyway | 55% | 56% |
| **Warning** right when it fires | **73%** (417 of 571) | **68%** (380 of 563) |
| Rain signal alone | 60% | 60% |
| Case signal alone | 69% | 64% |

What this means:

- The Warning (rain and cases together) is the useful signal: 1.33× the base rate one month ahead, 1.21× two months ahead.
- Rain alone is only a few points better than chance, so it is shown as a Watch.
- The rain signal was stronger in 2011–2017 (lift 1.28 at two months) than since 2018 (1.07).
  The one-month Warning held up (69% → 73%); the two-month Warning weakened (71% → 68%). Both periods are reported.

**Risk percentage.** One month ahead it passed its calibration check (Brier 0.220 vs 0.251 for the base rate,
AUC 0.70). Two months ahead it failed, also after recalibration, so no percentage is shown there. Months without
a case count were not well calibrated (predicted 64%, observed 52%), so the percentage is shown only when the
month's count is known.

**Method comparison** (`scripts/compare_models.py`, trained on 2011–2017, tested on 2018+, each method given
as many alerts as the rule's Warnings):

| 1-month lead | AUC | Right, same number of alerts |
|---|---|---|
| Seasonal calendar | 0.51 | 56% |
| Rain alone | 0.58 | 59% |
| The rule | 0.65 | 73% |
| Last month's cases alone | 0.70 | 75% |
| Logistic regression | 0.70 | 75% |
| Gradient-boosted trees (comparison only) | 0.69 | 74% |

Most of the one-month skill comes from case counts carrying on; rain adds little on top. Two months ahead every
method is weaker (AUC 0.55–0.61). The same script tests the proposal's simpler normal (median of the same month
over three years). It was steadier but fitted months worse and, on 2018+, called 61% of months above normal with
a lower lift (1.30 vs 1.33), so the current normal is kept. Results are in `data/model_comparison.json` and
`data/baseline_comparison.json`.

The earlier zone-level analysis (69% vs a 48% base rate) did not hold up at district level on newer data.
`research/` contains every test, including the ones that weakened the original claim.

## Data

| Source | What | Freshness |
|---|---|---|
| Epidemiology Unit, Weekly Epidemiological Report (Table 1) | leptospirosis cases by RDHS district, year to date | published about 8–11 weeks after the week it covers |
| CHIRPS v2 via ClimateSERV | daily rainfall averaged over each district | about 2–3 weeks after month end |
| geoBoundaries ADM2 (CC BY 4.0) | district boundaries | static |

- Case history 2007–2025 was rebuilt from archived WER PDFs.
  Year totals match Kumari & Dabrera (BMC Infect Dis, 2026) within about 3%.
- Monthly counts are interpolated from weekly year-to-date totals. Months with gaps over 42 days between reports are left empty.
- The WER asks for Epidemiology Unit approval before its data is published. That approval must be obtained
  before any public release; until then, WER-derived figures stay in this private prototype.

## Known limits

- Because public case reports lag, the live outlook is usually rain-only (Watch at most).
  Officers can enter current counts on the dashboard (or via `POST /api/cases`) to get Warnings in real time.
- When recent case history is missing, the live outlook estimates "normal" from the most recent 12 months
  available (within two years) and says so. The back-test never uses this fallback.
- Leptospirosis is under-reported. Comparing each district with its own normal reduces the effect of
  steady under-reporting, but does not remove it.
- COVID-19 disrupted reporting in 2020–2022.

## Layout

```
lw/          collectors (wer.py, chirps.py), store, monthly series, engine, risk model (ml.py), server
scripts/     seed, update, build_state, compare_models, export_seed, export_dataset, serve
frontend/    React dashboard source (map, district panel, past-season replay)
web/         built dashboard served by lw/server.py
tests/       parser and engine tests
research/    analysis scripts behind the numbers above
data/seed/   committed data snapshot; data/state.json is what the dashboard reads
```
