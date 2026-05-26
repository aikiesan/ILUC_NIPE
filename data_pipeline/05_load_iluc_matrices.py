"""
05_load_iluc_matrices.py  — thin orchestrator
Loads 3 anchor ILUC matrix CSVs and writes normalized outputs to processed/.

Expected input CSV format (one file per anchor year):
    rgint_id,from_class,to_class,area_ha

Output: processed/iluc_matrix_{year}.csv  (same schema, validated + cleaned)

Run after: raw anchor CSVs placed in ILUC_NIPE/{folder}/
Run before: 06_interpolate_matrices.py
"""

import pandas as pd
from pathlib import Path

PROCESSED = Path(__file__).parent / "processed"

REQUIRED_COLS = {"rgint_id", "from_class", "to_class", "area_ha"}


def load_anchor_matrix(csv_path, year: int, out_path) -> pd.DataFrame:
    """
    Read one anchor matrix CSV, validate schema, write to out_path.
    Returns the loaded DataFrame.
    """
    csv_path = Path(csv_path)
    out_path = Path(out_path)

    df = pd.read_csv(csv_path, dtype={"rgint_id": str})
    missing = REQUIRED_COLS - set(df.columns)
    if missing:
        raise ValueError(f"Anchor CSV missing columns: {missing}")

    df = df[list(REQUIRED_COLS)].copy()
    df["area_ha"] = pd.to_numeric(df["area_ha"], errors="coerce").fillna(0.0)
    df["year"] = year

    df.to_csv(out_path, index=False)
    return df


def main():
    import sys
    if len(sys.argv) < 4:
        print("Usage: python 05_load_iluc_matrices.py <csv_2008> <csv_2017> <csv_2024>")
        return

    PROCESSED.mkdir(parents=True, exist_ok=True)
    paths = {2008: sys.argv[1], 2017: sys.argv[2], 2024: sys.argv[3]}

    for year, csv_path in paths.items():
        out = PROCESSED / f"iluc_matrix_{year}.csv"
        df = load_anchor_matrix(csv_path, year, out)
        print(f"  {year}: {len(df)} rows, {df['rgint_id'].nunique()} RGINTs → {out.name}")

    print("\nRun 06_interpolate_matrices.py next.")


if __name__ == "__main__":
    main()
