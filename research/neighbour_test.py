"""Neighbouring-district cases test for the weekly outlook (research/PREREG_neighbours.md).

    python research/neighbour_test.py --explore   # development decisions only (targets before 2018)
    python research/neighbour_test.py             # the one held-out run of the pre-registered rule -> data/neighbour_test.json

On each Saturday, the neighbours' case ratio is the cases notified in the last 4 weeks in the districts sharing a
border, divided by the sum of their usual numbers, using the same data as each district's own decision that day.
"""
import json
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from lw import config, engine, weekly  # noqa: E402

NEIGHBOURS = {   # districts sharing a border (geoBoundaries outlines in data/districts.geojson)
    "Ampara": ["Badulla", "Batticaloa", "Hambantota", "Matale", "Monaragala", "Polonnaruwa"],
    "Anuradhapura": ["Kurunegala", "Mannar", "Matale", "Polonnaruwa", "Puttalam", "Trincomalee", "Vavuniya"],
    "Badulla": ["Ampara", "Kandy", "Matale", "Monaragala", "Nuwara Eliya", "Ratnapura"],
    "Batticaloa": ["Ampara", "Polonnaruwa", "Trincomalee"],
    "Colombo": ["Gampaha", "Kalutara", "Kegalle", "Ratnapura"],
    "Galle": ["Kalutara", "Matara", "Ratnapura"],
    "Gampaha": ["Colombo", "Kegalle", "Kurunegala", "Puttalam"],
    "Hambantota": ["Ampara", "Matara", "Monaragala", "Ratnapura"],
    "Jaffna": ["Kilinochchi", "Mullaitivu"],
    "Kalutara": ["Colombo", "Galle", "Ratnapura"],
    "Kandy": ["Badulla", "Kegalle", "Kurunegala", "Matale", "Nuwara Eliya"],
    "Kegalle": ["Colombo", "Gampaha", "Kandy", "Kurunegala", "Nuwara Eliya", "Ratnapura"],
    "Kilinochchi": ["Jaffna", "Mannar", "Mullaitivu"],
    "Kurunegala": ["Anuradhapura", "Gampaha", "Kandy", "Kegalle", "Matale", "Puttalam"],
    "Mannar": ["Anuradhapura", "Kilinochchi", "Mullaitivu", "Puttalam", "Vavuniya"],
    "Matale": ["Ampara", "Anuradhapura", "Badulla", "Kandy", "Kurunegala", "Polonnaruwa"],
    "Matara": ["Galle", "Hambantota", "Ratnapura"],
    "Monaragala": ["Ampara", "Badulla", "Hambantota", "Ratnapura"],
    "Mullaitivu": ["Jaffna", "Kilinochchi", "Mannar", "Trincomalee", "Vavuniya"],
    "Nuwara Eliya": ["Badulla", "Kandy", "Kegalle", "Ratnapura"],
    "Polonnaruwa": ["Ampara", "Anuradhapura", "Batticaloa", "Matale", "Trincomalee"],
    "Puttalam": ["Anuradhapura", "Gampaha", "Kurunegala", "Mannar"],
    "Ratnapura": ["Badulla", "Colombo", "Galle", "Hambantota", "Kalutara", "Kegalle", "Matara", "Monaragala", "Nuwara Eliya"],
    "Trincomalee": ["Anuradhapura", "Batticaloa", "Mullaitivu", "Polonnaruwa", "Vavuniya"],
    "Vavuniya": ["Anuradhapura", "Mannar", "Mullaitivu", "Trincomalee"],
}
K = weekly.WARNING_CASE_RATIO


def history():
    recs = weekly.history(weekly.open_all())
    by = {(r["district"], r["decided"], r["lag"]): r for r in recs}
    for r in recs:
        c, n = r["cases_data_month"], r["cases_normal"]
        r["case_ratio"] = c / n if c is not None and n else None
        nb = [by.get((d, r["decided"], r["lag"])) for d in NEIGHBOURS[r["district"]]]
        nb = [x for x in nb if x and x["cases_data_month"] is not None and x["cases_normal"]]
        tot_n = sum(x["cases_normal"] for x in nb)
        r["nb_ratio"] = sum(x["cases_data_month"] for x in nb) / tot_n if nb and tot_n else None
    return recs


def rule(warn):
    def f(r):
        cr, nb = r["case_ratio"], r["nb_ratio"] or 0
        case_up = bool(r["case_signal"])
        w = r["rain_signal"] and cr is not None and warn(cr, nb)
        return r | {"level": "warning" if w else "watch" if r["rain_signal"] or case_up else "normal"}
    return f


CANDIDATES = {
    "current": rule(lambda cr, nb: cr > K),
    "own > 1.4, or own > 1 and neighbours > 1.4": rule(lambda cr, nb: cr > K or (cr > 1 and nb > 1.4)),
    "own > 1.4, or own > 1 and neighbours > 2": rule(lambda cr, nb: cr > K or (cr > 1 and nb > 2)),
    "own > 1.4 and neighbours > 1": rule(lambda cr, nb: cr > K and nb > 1),
    "own > 1.2 and neighbours > 1.2": rule(lambda cr, nb: cr > 1.2 and nb > 1.2),
}


def scores(recs, f, period):
    out = {}
    for lead in weekly.LEADS:
        rs = [f(r) for r in recs if r["lag"] == lead and (r["target"] < config.HELDOUT_FROM) == (period == "dev")]
        out[str(lead)] = engine.score(rs)
    return out


def explore(recs):
    cur = scores(recs, CANDIDATES["current"], "dev")
    for name, f in CANDIDATES.items():
        s = scores(recs, f, "dev")
        ok = all(s[l]["warning"]["recall"] >= 0.8 * cur[l]["warning"]["recall"] for l in ("1", "2"))
        avg = (s["1"]["warning"]["precision"] + s["2"]["warning"]["precision"]) / 2
        print(f"{'OK ' if ok else '   '} avgP={avg:.3f}  {name:45} " + "  ".join(
            f"L{l} P={s[l]['warning']['precision']:.3f} R={s[l]['warning']['recall']:.3f} n={s[l]['warning']['alerts']}"
            for l in ("1", "2")))


CHOSEN = "own > 1.4, or own > 1 and neighbours > 2"   # research/PREREG_neighbours.md


def heldout(recs):
    out = {"chosen": CHOSEN, "results": {n: {p: scores(recs, CANDIDATES[n], p) for p in ("dev", "heldout")}
                                         for n in ("current", CHOSEN)}}
    cur, ch = out["results"]["current"]["heldout"], out["results"][CHOSEN]["heldout"]
    out["adopted"] = all(ch[l]["warning"]["precision"] > cur[l]["warning"]["precision"] for l in ("1", "2"))
    (config.DATA / "neighbour_test.json").write_text(json.dumps(out, indent=1), encoding="utf-8")
    for n, res in out["results"].items():
        for l in ("1", "2"):
            h = res["heldout"][l]["warning"]
            print(f"{n:45} lead {l}: held-out Warning {h['precision']:.1%} ({h['correct']}/{h['alerts']}), recall {h['recall']:.1%}")
    print("adopted:", out["adopted"])


if __name__ == "__main__":
    recs = history()
    if "--explore" in sys.argv:
        explore([r for r in recs if r["target"] < config.HELDOUT_FROM])     # held-out records dropped up front
    else:
        assert CHOSEN, "write research/PREREG_neighbours.md and set CHOSEN first"
        heldout(recs)
