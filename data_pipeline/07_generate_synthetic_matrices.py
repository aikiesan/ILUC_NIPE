"""
07_generate_synthetic_matrices.py
Generates plausible synthetic ILUC transition matrices from existing diagonal data.

Used to populate webapp/data/rgint_matrix/ for development/demo before real
anchor datasets (05+06) are available. Derives transitions from year-to-year
area changes in the diagonal: classes that lose area "transition to" classes
that gain area, proportionally.

Run after: 01_load_sources.py (diagonal must exist in webapp/data/rgint/)
Output:    webapp/data/rgint_matrix/{rgint_id}.json
"""

import json
from pathlib import Path
from utils import YEARS, load_rgint_index, load_existing_diagonal
from pipeline.interpolator import ANCHOR_YEARS

WEBAPP_DATA = Path(__file__).parent.parent / "webapp" / "data"
OUT_DIR     = WEBAPP_DATA / "rgint_matrix"

ANCHOR_PAIRS = list(zip(ANCHOR_YEARS, ANCHOR_YEARS[1:]))  # (2008,2017), (2017,2024)


def _anchor_matrix_from_diagonal(diagonal: dict, year_start: int, year_end: int) -> dict:
    """
    Derive a plausible 15×15 matrix for the period year_start→year_end from diagonal areas.
    Approach: classes that lost area transfer to classes that gained area, proportionally.
    Diagonal = area that STAYED in the same class (min of start and end area).
    """
    classes = list(diagonal.keys())

    def _area(cls, year):
        year_dict = diagonal.get(cls, {})
        return year_dict.get(str(year), year_dict.get(year, 0.0)) or 0.0

    gains, losses = {}, {}
    for cls in classes:
        a_start = _area(cls, year_start)
        a_end   = _area(cls, year_end)
        delta   = a_end - a_start
        if delta > 0:
            gains[cls]  = delta
        elif delta < 0:
            losses[cls] = abs(delta)

    total_gain  = sum(gains.values())  or 1.0
    total_loss  = sum(losses.values()) or 1.0

    matrix = {fc: {} for fc in classes}

    # Diagonal: stable area = min(start, end)
    for cls in classes:
        matrix[cls][cls] = min(_area(cls, year_start), _area(cls, year_end))

    # Off-diagonal: loss classes → gain classes (proportional)
    for from_cls, loss_ha in losses.items():
        for to_cls, gain_ha in gains.items():
            if from_cls == to_cls:
                continue
            flow = loss_ha * (gain_ha / total_gain)
            matrix[from_cls][to_cls] = round(flow, 2)

    return matrix


def run(rgint_ids=None, out_dir=OUT_DIR) -> int:
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    rgint_index = load_rgint_index()
    meta_map = {m["rgint"]: m for m in rgint_index}

    targets = rgint_ids or [m["rgint"] for m in rgint_index]
    written = 0

    for rgint_id in targets:
        diagonal = load_existing_diagonal(rgint_id)
        if not diagonal:
            continue

        classes = list(diagonal.keys())
        anchor_map = {
            2008: _anchor_matrix_from_diagonal(diagonal, 2008, 2008),
            2017: _anchor_matrix_from_diagonal(diagonal, 2008, 2017),
            2024: _anchor_matrix_from_diagonal(diagonal, 2017, 2024),
        }

        from pipeline.interpolator import build_annual_matrices
        annual = build_annual_matrices(anchor_map)

        meta = meta_map.get(rgint_id, {"nome": rgint_id, "uf": "", "biome": ""})
        payload = {
            "metadata":     {"rgint": rgint_id, "nome": meta.get("nome",""), "uf": meta.get("uf",""), "biome": meta.get("biome","")},
            "anchor_years": ANCHOR_YEARS,
            "years":        YEARS,
            "classes":      classes,
            "matrices":     {str(yr): annual[yr] for yr in YEARS},
            "_synthetic":   True,
        }

        out_path = out_dir / f"{rgint_id}.json"
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
        written += 1

    return written


def main():
    import sys
    ids = sys.argv[1:] if len(sys.argv) > 1 else None
    label = ", ".join(ids) if ids else "all RGINTs"
    print(f"Generating synthetic matrices for {label}...")
    n = run(ids)
    print(f"  Done. {n} JSONs written to {OUT_DIR}")
    print("  (These are synthetic — replace with real data from 05+06 when available.)")


if __name__ == "__main__":
    main()
