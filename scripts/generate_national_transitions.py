"""Generate webapp/public/data/national_transitions.csv FROM Postgres
(table ``transitions``).

Aggregates per-region transition flows into the three GTAP periods. Anchor
years map to periods as:
    2017 anchor  -> '2008_2017'
    2024 anchor  -> '2017_2024'
    '2008_2024'  = sum of the two above
Only off-diagonal (class-changing) flows are kept.

Output columns: periodo, origem_id, origem_nome, destino_id, destino_nome, area_ha.
This scales to all 133 regions automatically once their matrices are ingested.
"""
from __future__ import annotations

import csv
from collections import defaultdict

from common import ensure_out
from db import connect

ANCHOR_TO_PERIOD = {"2017": "2008_2017", "2024": "2017_2024"}


def main() -> None:
    # period -> (origem, destino) -> area
    agg: dict[str, dict[tuple[str, str], float]] = defaultdict(lambda: defaultdict(float))
    with connect() as conn:
        cur = conn.cursor()
        cur.execute(
            "SELECT ano_par, origem_id, destino_id, area_ha FROM transitions "
            "WHERE ano_par IN %s AND origem_id <> destino_id",
            (tuple(ANCHOR_TO_PERIOD),),
        )
        for ano_par, origem, destino, area in cur.fetchall():
            if area is None:
                continue
            agg[ANCHOR_TO_PERIOD[ano_par]][(origem, destino)] += float(area)

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
