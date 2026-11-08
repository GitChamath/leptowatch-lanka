"""Weekly accuracy round 2: the one held-out run of the rule fixed in research/PREREG_weekly_v2.md.

    python research/weekly_v2.py      # writes data/weekly_v2.json
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent))
import weekly_features as wf  # noqa: E402
from lw import config, engine, weekly  # noqa: E402

CASE_K = 1.4


def relabel(r, rain8, k):
    """The record under a different rule: rain over 8 weeks, and a Warning needing cases above k x usual."""
    rain = (r["rain56_excess"] or 0) > 0 if rain8 else r["rain_signal"]
    cr = r["case_ratio"]
    case_up = bool(r["case_signal"])
    strong = cr is not None and cr > k
    n = int(rain) + int(case_up)
    level = "warning" if rain and strong else "watch" if n >= 1 else "normal"
    return r | {"level": level, "rain_signal": rain}


RULES = {
    "current": lambda r: r,
    "rain_8_weeks": lambda r: relabel(r, True, 1.0),
    "chosen": lambda r: relabel(r, True, CASE_K),
}


def main():
    recs = wf.history(weekly.open_all())
    out = {"rule": "Warning = rainy days in the last 8 weeks above usual AND cases in the last 4 weeks above "
                   f"{CASE_K} x usual; Watch = one signal up", "results": {}}
    for name, f in RULES.items():
        out["results"][name] = {}
        for lead in weekly.LEADS:
            rs = [f(r) for r in recs if r["lag"] == lead]
            out["results"][name][str(lead)] = {
                "dev": engine.score([r for r in rs if r["target"] < config.HELDOUT_FROM]),
                "heldout": engine.score([r for r in rs if r["target"] >= config.HELDOUT_FROM]),
            }
    cur, ch = out["results"]["current"], out["results"]["chosen"]
    out["adopted"] = all(ch[l]["heldout"]["warning"]["precision"] > cur[l]["heldout"]["warning"]["precision"] for l in ("1", "2"))
    (config.DATA / "weekly_v2.json").write_text(json.dumps(out, indent=1), encoding="utf-8")
    for name, res in out["results"].items():
        for lead, r in res.items():
            h, d = r["heldout"], r["dev"]
            print(f"{name:13} lead {lead}: dev {d['warning']['precision']:.1%} ({d['warning']['alerts']}), "
                  f"held-out Warning {h['warning']['precision']:.1%} ({h['warning']['correct']}/{h['warning']['alerts']}), "
                  f"recall {h['warning']['recall']:.1%}, rain alone {h['rain_only_rule']['precision']:.1%}, "
                  f"any alert {h['any_alert']['precision']:.1%}, base {h['base_rate']:.1%}")
    print("adopted:", out["adopted"])


if __name__ == "__main__":
    main()
