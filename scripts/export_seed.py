"""Write the database back to the CSV snapshot in data/seed, so each scheduled run leaves a reviewable diff."""
import csv
import sqlite3
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from lw import config, openmeteo, store  # noqa: E402

WEEKLY_REPORTS = config.SEED / "wer_weekly_archive.csv"
OPENMETEO = config.SEED / "openmeteo_daily_district.csv"


def write_reports(con, path):
    """One row per weekly report: year-to-date cases for each district."""
    weeks = defaultdict(dict)
    meta = {}
    for r in con.execute("SELECT week_end, week, district, ytd, national_ytd FROM case_reports"):
        weeks[r["week_end"]][r["district"]] = r["ytd"]
        meta[r["week_end"]] = (r["week"], r["national_ytd"])
    with open(path, "w", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["week_end", "week", "national_ytd"] + config.DISTRICTS)
        for week_end in sorted(weeks):
            wk, nat = meta[week_end]
            w.writerow([week_end, wk or "", nat if nat is not None else ""]
                       + [weeks[week_end].get(d, "") for d in config.DISTRICTS])


def export_weekly():
    """The weekly outlook's extra data (archived reports and Open-Meteo rain) from data/weekly.sqlite."""
    if not openmeteo.WEEKLY_DB.exists():
        return
    con = sqlite3.connect(openmeteo.WEEKLY_DB)
    con.row_factory = sqlite3.Row
    write_reports(con, WEEKLY_REPORTS)
    days = defaultdict(dict)
    for r in con.execute("SELECT date, district, mm FROM rain_om"):
        days[r["date"]][r["district"]] = r["mm"]
    with open(OPENMETEO, "w", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["date"] + config.DISTRICTS)
        for d in sorted(days):
            w.writerow([d] + ["" if days[d].get(x) is None else round(days[d][x], 2) for x in config.DISTRICTS])
    con.close()


def main():
    export_weekly()
    with store.connect() as con:
        weeks = defaultdict(dict)
        meta = {}
        for r in con.execute("SELECT week_end, week, district, ytd, national_ytd FROM case_reports"):
            weeks[r["week_end"]][r["district"]] = r["ytd"]
            meta[r["week_end"]] = (r["week"], r["national_ytd"])
        with open(config.SEED / "wer_weekly.csv", "w", newline="") as fh:
            w = csv.writer(fh)
            w.writerow(["week_end", "week", "national_ytd"] + config.DISTRICTS)
            for week_end in sorted(weeks):
                wk, nat = meta[week_end]
                w.writerow([week_end, wk or "", nat if nat is not None else ""]
                           + [weeks[week_end].get(d, "") for d in config.DISTRICTS])
        with open(config.SEED / "chirps_daily_district.csv", "w", newline="") as fh:
            w = csv.writer(fh)
            w.writerow(["date", "district", "rain_mm"])
            for r in con.execute("SELECT date, district, mm FROM rain_daily ORDER BY district, date"):
                w.writerow([r["date"], r["district"], round(r["mm"], 2)])
    print("seed CSVs updated")


if __name__ == "__main__":
    main()
