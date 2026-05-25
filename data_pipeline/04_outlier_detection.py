"""
04_outlier_detection.py
Detects outliers in multi-source time-series data and enriches rgint_full JSONs.

Two detection methods:
  A) MAD (Median Absolute Deviation) — intra-source temporal anomalies
  B) Cross-source deviation — flags years where a source diverges >CROSS_THRESHOLD
     relative to the primary source

Modifies in-place: webapp/data/rgint_full/{rgint_id}.json
Adds 'outliers' field to each source entry (list of flagged years, empty if none).

Run after: 02_build_multisource_json.py
Run before (optional): 03_generate_reports.py
"""

import json
import math
import numpy as np
from pathlib import Path

WEBAPP_DATA = Path(__file__).parent.parent / "webapp" / "data"
RGINT_FULL_DIR = WEBAPP_DATA / "rgint_full"

MAD_THRESHOLD = 3.5    # modified Z-score cutoff (Iglewicz & Hoaglin)
CROSS_THRESHOLD = 0.40 # relative deviation from primary to flag cross-source outlier
MIN_VALID_POINTS = 4   # skip MAD if fewer non-null values than this


# ── Detection methods ─────────────────────────────────────────────────────────

def mad_outlier_years(values: list, years: list, threshold: float = MAD_THRESHOLD) -> list:
    """
    Identifies years whose modified Z-score exceeds threshold.
    Uses the Iglewicz & Hoaglin (1993) formula: 0.6745 * (x - median) / MAD.
    Returns empty list if not enough data or no variation exists.
    """
    vals = np.array(
        [v if v is not None and not (isinstance(v, float) and math.isnan(v)) else np.nan
         for v in values],
        dtype=float,
    )
    valid = ~np.isnan(vals)
    if valid.sum() < MIN_VALID_POINTS:
        return []

    median = np.nanmedian(vals)
    mad = np.nanmedian(np.abs(vals[valid] - median))
    if mad == 0:
        return []

    modified_z = 0.6745 * (vals - median) / mad
    return [years[i] for i, (z, ok) in enumerate(zip(modified_z, valid)) if ok and abs(z) > threshold]


def cross_source_outlier_years(sources: dict, threshold: float = CROSS_THRESHOLD) -> dict:
    """
    For each secondary source, flags years where relative deviation from the primary
    source exceeds threshold: |primary - secondary| / max(|primary|, |secondary|).

    Returns {src_key: [flagged_years]} for every source key.
    Primary source gets an empty list (it is the reference, not compared against itself).
    """
    primary_key = next(
        (k for k, v in sources.items() if v.get("quality") == "primary"), None
    )
    if primary_key is None:
        return {k: [] for k in sources}

    p_data = sources[primary_key]
    p_years = p_data.get("years", [])
    p_values = p_data.get("values", [])
    flagged = {k: [] for k in sources}

    for src_key, src_data in sources.items():
        if src_key == primary_key:
            continue
        s_years = src_data.get("years", [])
        s_values = src_data.get("values", [])

        for i, year in enumerate(p_years):
            p_val = p_values[i] if i < len(p_values) else None
            if p_val is None or (isinstance(p_val, float) and math.isnan(p_val)):
                continue

            if year not in s_years:
                continue
            j = s_years.index(year)
            s_val = s_values[j] if j < len(s_values) else None
            if s_val is None or (isinstance(s_val, float) and math.isnan(s_val)):
                continue

            denom = max(abs(p_val), abs(s_val))
            if denom == 0:
                continue
            if abs(p_val - s_val) / denom > threshold:
                flagged[src_key].append(year)

    return flagged


# ── Per-file processing ───────────────────────────────────────────────────────

def process_rgint(path: Path) -> tuple[int, bool]:
    """
    Reads one rgint_full JSON, computes outliers for each source, writes back.
    Returns (total_flags_added, was_modified).
    """
    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    classes = data.get("classes", {})
    total_flags = 0
    modified = False

    for sources in classes.values():
        mad_flags = {}
        for src_key, src_data in sources.items():
            mad_flags[src_key] = set(
                mad_outlier_years(src_data.get("values", []), src_data.get("years", []))
            )

        cross_flags = cross_source_outlier_years(sources)

        for src_key in sources:
            combined = sorted(mad_flags.get(src_key, set()) | set(cross_flags.get(src_key, [])))
            if combined != sources[src_key].get("outliers", []):
                sources[src_key]["outliers"] = combined
                modified = True
            total_flags += len(combined)

    if modified:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, separators=(",", ":"))

    return total_flags, modified


# ── Main ──────────────────────────────────────────────────────────────────────

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

    print(f"Results:")
    print(f"  Files processed  : {len(json_files)}")
    print(f"  Files modified   : {modified_count}")
    print(f"  Total flag events: {total_flags}")
    print(f"\nOutlier data written to webapp/data/rgint_full/*.json")
    print("Run 03_generate_reports.py to regenerate HTML reports with outlier data.")


if __name__ == "__main__":
    main()
