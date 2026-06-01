"""Generate webapp/public/data/rgint_transitions/{ID}.csv from available
per-region transition matrices (webapp/data/rgint_matrix/*.json).

Each matrix JSON stores, per anchor year, a sparse origin->destination area
matrix over the 15 classes. We flatten every anchor year into long format.
Output columns: ano_par, origem_id, destino_id, area_ha.

Note: only the regions for which a matrix JSON exists are emitted. The full
FINAL_ILUC_15_Classes matrices are not committed to the repository.
"""
from __future__ import annotations

import csv
import json

from common import RGINT_MATRIX_DIR, ensure_out


def load_matrix(path) -> dict:
    text = path.read_text(encoding="utf-8").replace("NaN", "null")
    return json.loads(text)


def main() -> None:
    out_dir = ensure_out("rgint_transitions")
    files = sorted(RGINT_MATRIX_DIR.glob("*.json")) if RGINT_MATRIX_DIR.exists() else []
    written = 0
    for path in files:
        data = load_matrix(path)
        rid = path.stem
        matrices = data.get("matrices", {})
        rows = []
        for year, by_src in matrices.items():
            for origem, dests in by_src.items():
                for destino, area in dests.items():
                    if area is None:
                        continue
                    rows.append((year, origem, destino, round(float(area), 2)))
        if not rows:
            continue
        with open(out_dir / f"{rid}.csv", "w", newline="", encoding="utf-8") as fh:
            w = csv.writer(fh)
            w.writerow(["ano_par", "origem_id", "destino_id", "area_ha"])
            w.writerows(rows)
        written += 1
    print(f"wrote {written} transition files into {out_dir}")


if __name__ == "__main__":
    main()
