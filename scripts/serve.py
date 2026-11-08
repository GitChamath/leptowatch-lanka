"""Start the dashboard:  python scripts/serve.py [port]"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from lw import config, server  # noqa: E402

if __name__ == "__main__":
    if not config.STATE_PATH.exists():
        sys.exit("No data/state.json yet: run scripts/seed.py then scripts/build_state.py")
    server.serve(int(sys.argv[1]) if len(sys.argv) > 1 else 8000)
