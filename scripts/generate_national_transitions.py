"""Generate webapp/public/data/national_transitions.csv.

Aggregates per-region transition matrices into the three GTAP periods used
across the app. Anchor matrices map to periods as:
    2017 anchor  -> '2008_2017'
    2024 anchor  -> '2017_2024'
    '2008_2024'  = sum of the two above
Only off-diagonal (class-changing) flows are kept.

Output columns: periodo, origem_id, origem_nome, destino_id, destino_nome, area_ha.
This scales to all 133 regions automatically once their matrices are present.
"""
from __future__ import annotations

import csv
import json
from collections import defaultdict

from common import RGINT_MATRIX_DIR, ensure_out

ANCHOR_TO_PERIOD = {"2017": "2008_2017", "2024": "2017_2024"}


def load_matrix(path) -> dict:
    text = path.read_text(encoding="utf-8").replace("NaN", "null")
    return json.loads(text)


def main() -> None:
    # period -> (origem, destino) -> area
    agg: dict[str, dict[tuple[str, str], float]] = defaultdict(lambda: defaultdict(float))
    files = sorted(RGINT_MATRIX_DIR.glob("*.json")) if RGINT_MATRIX_DIR.exists() else []

    for path in files:
        data = load_matrix(path)
        for year, by_src in data.get("matrices", {}).items():
            period = ANCHOR_TO_PERIOD.get(str(year))
            if period is None:
                continue
            for origem, dests in by_src.items():
                for destino, area in dests.items():
                    if area is None or origem == destino:
                        continue
                    agg[period][(origem, destino)] += float(area)

    # derive cumulative period
    for key, area in agg.get("2008_2017", {}).items():
        agg["2008_2024"][key] += area
    for key, area in agg.get("2017_2024", {}).items():
        agg["2008_2024"][key] += area

    out = ensure_out() / "national_transitions.csv"
    with open(out, "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["periodo", "origem_id", "origem_nome", "destino_id", "destino_nome", "area_ha"])
        for period in ("2008_2017", "2017_2024", "2008_2024"):
            for (origem, destino), area in sorted(agg[period].items(), key=lambda x: -x[1]):
                w.writerow([period, origem, origem, destino, destino, round(area, 2)])
    print(f"wrote {out} ({sum(len(v) for v in agg.values())} flows across periods)")


if __name__ == "__main__":
    main()
