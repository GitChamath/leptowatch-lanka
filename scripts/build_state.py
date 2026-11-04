"""Recompute every district's alerts, history and track record into data/state.json."""
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from lw import engine, store  # noqa: E402


def main():
    t0 = time.time()
    with store.connect() as con:
        state = engine.build_state(con)
        state["runs"] = store.recent_runs(con)
        engine.write_state(state)
        store.log_run(con, "build_state", "ok", f"{time.time() - t0:.1f}s")
    p = state["pooled"]
    for lag in sorted(p):
        h = p[lag].get("heldout")
        if h:
            print(f"lag {lag} held-out: base {h['base_rate']:.0%}, warning precision {h['warning']['precision']:.0%} "
                  f"({h['warning']['correct']}/{h['warning']['alerts']}), any alert {h['any_alert']['precision']:.0%}")
    print(f"state written in {time.time() - t0:.1f}s; horizon {state['horizon']}")


if __name__ == "__main__":
    main()
