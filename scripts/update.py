"""Scheduled job: fetch new rainfall and case reports, then rebuild alerts.

    python scripts/update.py            # rainfall + this year's case reports
    python scripts/update.py --no-wer   # rainfall only
Sources that fail are logged and the last good data is kept; the dashboard shows how old each source is.
"""
import datetime as dt
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from lw import chirps, engine, store, wer  # noqa: E402


def main():
    with store.connect() as con:
        try:
            n = chirps.collect(con)
            store.log_run(con, "rain", "ok", f"{n} new daily values")
            print(f"rain: {n} new daily values")
        except Exception as e:
            store.log_run(con, "rain", "failed", str(e))
            print(f"rain failed, keeping last good data: {e}")
        if "--no-wer" not in sys.argv:
            known = {r[0] for r in con.execute("SELECT DISTINCT source FROM case_reports")}
            for year in (dt.date.today().year - 1, dt.date.today().year):
                try:
                    origin, added = wer.collect(con, year, known)
                    store.log_run(con, "cases", "ok", f"{year}: {added} new reports ({origin})")
                    print(f"cases {year}: {added} new reports from {origin}")
                except Exception as e:
                    store.log_run(con, "cases", "failed", f"{year}: {e}")
                    print(f"cases {year} failed, keeping last good data: {e}")
        state = engine.build_state(con)
        state["runs"] = store.recent_runs(con)
        engine.write_state(state)
        store.log_run(con, "build_state", "ok", "")
    print("alerts rebuilt for", state["horizon"])


if __name__ == "__main__":
    main()
