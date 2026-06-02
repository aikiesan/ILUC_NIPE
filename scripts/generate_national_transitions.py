"""Generate webapp/public/data/national_transitions.csv FROM Postgres
(table ``transitions``).

Aggregates per-region transition flows into the three GTAP periods. Each
``ano_par`` is the END year of one annual transition (2008_2009 -> "2009"), so
a GTAP period is the **sum of its annual flows** (gross class-changing area):
    '2008_2017'  = sum of ano_par 2009..2017
    '2017_2024'  = sum of ano_par 2018..2024
    '2008_2024'  = sum of the two above
Only off-diagonal (class-changing) flows are kept.

Output columns: periodo, origem_id, origem_nome, destino_id, destino_nome, area_ha.
This scales to all 133 regions automatically once their matrices are ingested.
"""
from __future__ import annotations

import csv
from collections import defaultdict

from common import collapse_class, ensure_out
from db import connect

# Annual end-year -> GTAP period. 2008 is the base-year stock (no transitions).
PERIOD_RANGES = {
    "2008_2017": range(2009, 2018),
    "2017_2024": range(2018, 2025),
}
YEAR_TO_PERIOD = {
    str(y): period for period, yrs in PERIOD_RANGES.items() for y in yrs
}


def main() -> None:
    # period -> (origem, destino) -> area
    agg: dict[str, dict[tuple[str, str], float]] = defaultdict(lambda: defaultdict(float))
    with connect() as conn:
        cur = conn.cursor()
        cur.execute(
            "SELECT ano_par, origem_id, destino_id, area_ha FROM transitions"
        )
        for ano_par, origem, destino, area in cur.fetchall():
            if area is None:
                continue
            period = YEAR_TO_PERIOD.get(str(ano_par))
            if period is None:
                continue
            # Collapse pasture vigor (7/8/9 -> "Pastagem") and drop the resulting
            # self-transitions so intra-pasture churn doesn't dominate the flows.
            o, d = collapse_class(origem), collapse_class(destino)
            if o == d:
                continue
            agg[period][(o, d)] += float(area)

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
