"""
04_outlier_detection.py  — thin orchestrator
Enriches rgint_full/*.json with outlier annotations.

Delegates all logic to pipeline.outlier.
Run after: 02_build_multisource_json.py
Run before (optional): 03_generate_reports.py
"""

from pathlib import Path

from pipeline.outlier import (
    mad_outlier_years,
    cross_source_outlier_years,
    process_rgint,
    MAD_THRESHOLD,
    CROSS_THRESHOLD,
    MIN_VALID_POINTS,
)

WEBAPP_DATA    = Path(__file__).parent.parent / "webapp" / "data"
RGINT_FULL_DIR = WEBAPP_DATA / "rgint_full"


def main():
    json_files = sorted(RGINT_FULL_DIR.glob("*.json"))
    if not json_files:
        print("No rgint_full/*.json files found. Run 02_build_multisource_json.py first.")
        return

    print(f"Running outlier detection on {len(json_files)} RGINT files...")
    print(f"  MAD threshold   : {MAD_THRESHOLD} (modified Z-score)")
    print(f"  Cross-source    : {CROSS_THRESHOLD * 100:.0f}% relative deviation\n")

    total_flags = 0
    modified_count = 0

    for path in json_files:
        flags, was_modified = process_rgint(path)
        total_flags += flags
        if was_modified:
            modified_count += 1

    print("Results:")
    print(f"  Files processed  : {len(json_files)}")
    print(f"  Files modified   : {modified_count}")
    print(f"  Total flag events: {total_flags}")
    print(f"\nOutlier data written to {RGINT_FULL_DIR}")
    print("Run 03_generate_reports.py to regenerate HTML reports with outlier data.")


if __name__ == "__main__":
    main()
