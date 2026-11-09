"""Static copy of the dashboard for GitHub Pages: the built site plus every API answer as a JSON file.

    python scripts/export_static.py site      # writes ./site

Uses only committed files (web/, data/state.json, data/weekly_state.json, data/districts.geojson), so it needs no
database. The page looks and works the same; an officer's weekly count is applied in the browser and not saved.
"""
import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def dump(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, separators=(",", ":")), encoding="utf-8")


def main(out):
    out = Path(out)
    if out.exists():
        shutil.rmtree(out)
    shutil.copytree(ROOT / "web", out)
    html = (out / "index.html").read_text(encoding="utf-8")
    (out / "index.html").write_text(html.replace("<head>", "<head><script>window.LW_STATIC = true;</script>", 1),
                                    encoding="utf-8")
    (out / ".nojekyll").write_text("", encoding="utf-8")

    state = json.loads((ROOT / "data" / "state.json").read_text(encoding="utf-8"))
    weekly = json.loads((ROOT / "data" / "weekly_state.json").read_text(encoding="utf-8"))
    api = out / "api"
    dump(api / "summary.json", {k: v for k, v in state.items() if k != "districts"} | {
        "districts": {n: {k: v for k, v in d.items() if k != "history"} for n, d in state["districts"].items()}})
    dump(api / "weekly.json", weekly)
    dump(api / "status.json", {"data": state["data"], "runs": state.get("runs", [])})
    months = set()
    for name, d in state["districts"].items():
        dump(api / "district" / f"{name}.json", d | {"name": name})
        months |= {(h["target"], h["lag"]) for h in d["history"]}
    for month, lag in months:
        dump(api / "replay" / f"{month}-{lag}.json", {"month": month, "lag": lag, "districts": {
            n: next((h for h in d["history"] if h["target"] == month and h["lag"] == lag), None)
            for n, d in state["districts"].items()}})
    (out / "data").mkdir(exist_ok=True)
    shutil.copy(ROOT / "data" / "districts.geojson", out / "data" / "districts.geojson")
    print(f"static site in {out}: {len(state['districts'])} districts, {len(months)} replay months")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "site")
