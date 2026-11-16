"""Run the full pipeline in the order listed in the README.

Usage (from anywhere):
    python run_all.py

Each script runs to completion before the next one starts. If a script
fails, the run stops so later steps don't use missing or stale data.
"""
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
RAW = ROOT / "data" / "raw"

# (script, files it needs that must be downloaded by hand, or None)
STEPS = [
    ("pull_acs.py", None),
    ("pull_rent_ranges.py", None),
    ("pull_recent_arrivals.py", None),
    ("build_crosswalk.py", None),
    ("build_ca_tables.py", None),
    ("inflation_factor.py", None),
    ("build_combined.py", None),
    # Check only. Skipped when the CMAP files have not been downloaded.
    ("cross_check_cmap.py", [RAW / "cmap_cds_2026_cca.csv", RAW / "cmap_cds_2017_cca.csv"]),
    ("make_map.py", None),
    ("make_scatter.py", None),
]


def main():
    start = time.time()
    total = len(STEPS)
    skipped = []

    for i, (script, needs) in enumerate(STEPS, start=1):
        label = f"[{i}/{total}] {script}"

        if needs:
            missing = [p.name for p in needs if not p.exists()]
            if missing:
                print(f"{label}: skipped, missing {', '.join(missing)}")
                skipped.append(script)
                continue

        print(f"{label}: running...", flush=True)
        step_start = time.time()
        # cwd=ROOT because the scripts use paths relative to the project root.
        result = subprocess.run([sys.executable, str(ROOT / "scripts" / script)], cwd=ROOT)
        if result.returncode != 0:
            print(f"\n{label}: FAILED (exit code {result.returncode}). Stopping.")
            sys.exit(result.returncode)
        print(f"{label}: done in {time.time() - step_start:.1f}s\n", flush=True)

    print(f"All steps finished in {time.time() - start:.1f}s.")
    if skipped:
        print(f"Skipped: {', '.join(skipped)} (see README).")


if __name__ == "__main__":
    main()
