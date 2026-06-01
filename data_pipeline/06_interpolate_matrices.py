"""
06_interpolate_matrices.py  — thin orchestrator
Reads 3 anchor matrix CSVs, interpolates annual matrices, writes per-RGINT JSONs.

Output: webapp/data/rgint_matrix/{rgint_id}.json  (133 files)

JSON schema:
  {
    "metadata":     {"rgint": "5101", "nome": "...", ...},
    "anchor_years": [2008, 2017, 2024],
    "years":        [2008, 2009, ..., 2024],
    "classes":      ["1 - Culturas perenes", ...],
    "matrices":     {"2008": {from_cls: {to_cls: area_ha}}, ...}
  }

Run after: 05_load_iluc_matrices.py
"""

import json
import pandas as pd
from pathlib import Path
from utils import YEARS, load_rgint_index
from pipeline.interpolator import build_annual_matrices

WEBAPP_DATA = Path(__file__).parent.parent / "webapp" / "data"
PROCESSED   = Path(__file__).parent / "processed"
OUT_DIR     = WEBAPP_DATA / "rgint_matrix"


def _csv_to_anchor_matrix(df: pd.DataFrame, rgint_id: str) -> dict:
    """Convert a filtered DataFrame (one RGINT, one anchor year) to matrix dict."""
    sub = df[df["rgint_id"] == rgint_id]
    matrix = {}
    for _, row in sub.iterrows():
        fc = str(row["from_class"])
        tc = str(row["to_class"])
        matrix.setdefault(fc, {})[tc] = float(row["area_ha"])
    return matrix


def run(anchor_csv_map: dict, out_dir, rgint_index=None) -> int:
    """
    Build annual matrices and write per-RGINT JSONs.

    anchor_csv_map: {year: csv_path_or_DataFrame}
    Returns number of files written.
    """
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    if rgint_index is None:
        rgint_index = load_rgint_index()

    # Load each anchor year's DataFrame
    anchor_dfs: dict[int, pd.DataFrame] = {}
    for year, src in anchor_csv_map.items():
        if isinstance(src, pd.DataFrame):
            anchor_dfs[year] = src
        else:
            anchor_dfs[year] = pd.read_csv(src, dtype={"rgint_id": str})

    # Collect all class names across all anchor years
    all_classes = sorted(
        {str(r["from_class"]) for df in anchor_dfs.values() for _, r in df.iterrows()} |
        {str(r["to_class"])   for df in anchor_dfs.values() for _, r in df.iterrows()}
    )

    anchor_years = sorted(anchor_dfs)
    written = 0

    # Determine which rgint_ids appear in the data
    data_rgints = set()
    for df in anchor_dfs.values():
        data_rgints.update(df["rgint_id"].unique())

    meta_map = {m["rgint"]: m for m in rgint_index}

    for rgint_id in sorted(data_rgints):
        anchor_map = {
            year: _csv_to_anchor_matrix(df, rgint_id)
            for year, df in anchor_dfs.items()
        }
        annual = build_annual_matrices(anchor_map)

        meta = meta_map.get(rgint_id, {"rgint": rgint_id, "nome": rgint_id, "uf": "", "biome": ""})
        payload = {
            "metadata":     {"rgint": rgint_id, "nome": meta.get("nome",""), "uf": meta.get("uf",""), "biome": meta.get("biome","")},
            "anchor_years": anchor_years,
            "years":        YEARS,
            "classes":      all_classes,
            "matrices":     {str(yr): annual[yr] for yr in YEARS},
        }

        out_path = out_dir / f"{rgint_id}.json"
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
        written += 1

    return written


def main():
    paths = {
        2008: PROCESSED / "iluc_matrix_2008.csv",
        2017: PROCESSED / "iluc_matrix_2017.csv",
        2024: PROCESSED / "iluc_matrix_2024.csv",
    }
    missing = [str(p) for p in paths.values() if not Path(p).exists()]
    if missing:
        print(f"Missing anchor CSVs: {missing}")
        print("Run 05_load_iluc_matrices.py first.")
        return

    print("Interpolating annual matrices...")
    n = run(paths, OUT_DIR)
    print(f"  Done. {n} JSONs written to {OUT_DIR}")
    print("\nNew API endpoints now active:")
    print("  GET /api/rgint_matrix/{rgint_id}")
    print("  GET /api/rgint_transition/{rgint_id}/{year_from}/{year_to}")


if __name__ == "__main__":
    main()
