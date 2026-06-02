"""Generate webapp/public/data/rgint_transitions/{ID}.csv FROM Postgres
(table ``transitions``).

Each row is a per-year origin->destination area flow. Pasture vigor (classes
7/8/9) is collapsed to a single "Pastagem" and self-transitions are dropped, so
the intra-pasture vigor churn no longer swamps the Sankey. The 15×15 matrix
heatmap is unaffected (it reads the matrix JSON, not this file).
Output columns: ano_par, origem_id, destino_id, area_ha.

Only regions that have rows in ``transitions`` are emitted (all 133 once the
full 15x15 matrices are ingested — no code change needed here).
"""
from __future__ import annotations

import csv
from collections import defaultdict

from common import CLASS_ORDER, PASTURE_LABEL, collapse_class, ensure_out
from db import connect

# Sort order for the collapsed class set (pasture vigor merged into one).
_COLLAPSED_ORDER = [c for c in CLASS_ORDER if collapse_class(c) == c] + [PASTURE_LABEL]
CLASS_IDX = {c: i for i, c in enumerate(_COLLAPSED_ORDER)}


def main() -> None:
    out_dir = ensure_out("rgint_transitions")
    # rgint -> {(ano_par, origem, destino): area}; pasture vigor collapsed and
    # self-transitions (incl. intra-pasture churn) dropped.
    by_region: dict[str, dict[tuple, float]] = defaultdict(lambda: defaultdict(float))
    with connect() as conn:
        cur = conn.cursor()
        cur.execute("SELECT rgint_id, ano_par, origem_id, destino_id, area_ha "
                    "FROM transitions")
        for rid, ano_par, origem, destino, area in cur.fetchall():
            if area is None:
                continue
            o, d = collapse_class(origem), collapse_class(destino)
            if o == d:
                continue
            by_region[str(rid)][(ano_par, o, d)] += float(area)

    written = 0
    for rid, agg in by_region.items():
        rows = [(ap, o, d, round(a, 2)) for (ap, o, d), a in agg.items()]
        rows.sort(key=lambda r: (int(r[0]), CLASS_IDX.get(r[1], 99), CLASS_IDX.get(r[2], 99)))
        with open(out_dir / f"{rid}.csv", "w", newline="", encoding="utf-8") as fh:
            w = csv.writer(fh)
            w.writerow(["ano_par", "origem_id", "destino_id", "area_ha"])
            w.writerows(rows)
        written += 1
    print(f"wrote {written} transition files into {out_dir}")


if __name__ == "__main__":
    main()
