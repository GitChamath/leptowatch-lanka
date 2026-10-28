"""Shared settings. Every rule here was fixed before the held-out test (see research/)."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
DB_PATH = DATA / "leptowatch.sqlite"
STATE_PATH = DATA / "state.json"
GEO_PATH = DATA / "districts.geojson"
SEED = DATA / "seed"
PDF_CACHE = DATA / "cache" / "wer"

DISTRICTS = [
    "Ampara", "Anuradhapura", "Badulla", "Batticaloa", "Colombo", "Galle", "Gampaha", "Hambantota",
    "Jaffna", "Kalutara", "Kandy", "Kegalle", "Kilinochchi", "Kurunegala", "Mannar", "Matale", "Matara",
    "Monaragala", "Mullaitivu", "Nuwara Eliya", "Polonnaruwa", "Puttalam", "Ratnapura", "Trincomalee", "Vavuniya",
]

FIRST_MONTH = "2007-01"
RAINY_DAY_MM = 1.0          # a day counts as rainy at >= 1 mm (district average)
WARMUP_MONTHS = 48          # first 4 years only build the seasonal baselines
HISTORY_MIN = 3             # same-calendar-month history needed before judging a month's rainfall
SEASONAL_MIN_YEARS = 5      # past years needed for a month's seasonal case factor (as in the proposal)
LEVEL_MIN_MONTHS = 6        # complete months out of the last 12 needed for a recent case level at all
BASELINE = "current"        # "current": 12-month level x seasonal factor; "three_year": median of the same month over 3 years
LEVEL_FULL_MONTHS = 9       # fewer complete months than this and the case normal is marked low confidence
HELDOUT_FROM = "2018-01"    # development 2011-2017, held-out 2018 onwards
LAGS = (1, 2)               # months between the data used and the month warned about
MAX_REPORT_GAP_DAYS = 42    # max gap between case reports when interpolating month ends

# Confidence badge from each district's own track record (lift of any alert over its base rate)
BADGE_HIGH, BADGE_MEDIUM, BADGE_MIN_MONTHS = 1.20, 1.08, 40

CLIMATESERV = "https://climateserv.servirglobal.net/api/"
WER_PAGE = "https://www.epid.gov.lk/weekly-epidemiological-report"
WAYBACK_CDX = "https://web.archive.org/cdx/search/cdx"
USER_AGENT = "LeptoWatch-Lanka/0.1 (research prototype)"
