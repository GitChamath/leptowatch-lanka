"""Back-test the weekly outlook, train its checked risk model, and write the live outlook to data/weekly_state.json.

    python scripts/build_weekly.py            # full back-test + live outlook
    python scripts/build_weekly.py --live     # live outlook only, reusing the stored model (fast)
"""
import datetime as dt
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from lw import config, engine, weekly  # noqa: E402

STATE = config.DATA / "weekly_state.json"


def main():
    t0 = time.time()
    cons = weekly.open_all()
    old = json.loads(STATE.read_text(encoding="utf-8")) if STATE.exists() else {}
    if "--live" in sys.argv and old.get("ml"):
        evaluation, model = old["evaluation"], old["ml"]
    else:
        recs = weekly.history(cons)
        ev = weekly.evaluate(recs)
        model = {lead: e["model"] for lead, e in ev.items()}
        evaluation = {lead: {"dev": e["dev"], "heldout": e["heldout"]} for lead, e in ev.items()}
        # the same rule when the officer enters nothing: public reports only, as late as they really appear online
        pub = weekly.history(cons, delay=weekly.PUBLIC_DELAY)
        for lead in evaluation:
            rs = [r for r in pub if str(r["lag"]) == lead]
            evaluation[lead]["heldout_public"] = engine.score([r for r in rs if r["target"] >= config.HELDOUT_FROM])
            evaluation[lead]["dev_public"] = engine.score([r for r in rs if r["target"] < config.HELDOUT_FROM])
            p = evaluation[lead]["heldout_public"]["warning"]
            print(f"lead {lead} held-out, public reports only ({weekly.PUBLIC_DELAY} days late): Warning "
                  f"{p['precision']:.0%} ({p['correct']}/{p['alerts']})")
        for lead, e in ev.items():
            h, m = e["heldout"], e["model"]
            if h:
                print(f"lead {lead} held-out: {h['months']} decisions, base {h['base_rate']:.0%}, Warning "
                      f"{h['warning']['precision']:.0%} ({h['warning']['correct']}/{h['warning']['alerts']}), "
                      f"recall {h['warning']['recall']:.0%}; rain alone {h['rain_only_rule']['precision']:.0%}, "
                      f"cases alone {h['cases_only_rule']['precision']:.0%}")
            print(f"  model: {m['method']}, AUC {m['report']['auc']}, calibration "
                  f"{'passed' if m['passed'] else 'failed'}; high priority {m['high_priority']['heldout']}")
    districts = weekly.live(cons, model)
    last_report = max(c.execute("SELECT MAX(week_end) FROM case_reports").fetchone()[0] or "" for c in cons)
    state = {"made": dt.date.today().isoformat(), "last_case_report": last_report,
             "decided": max(d["decided"] for d in districts.values()),
             "evaluation": evaluation, "ml": model, "districts": districts}
    tmp = STATE.with_suffix(".tmp")
    tmp.write_text(json.dumps(state, separators=(",", ":")), encoding="utf-8")
    tmp.replace(STATE)
    print(f"weekly state written in {time.time() - t0:.0f}s; decided {state['decided']}")


if __name__ == "__main__":
    main()
