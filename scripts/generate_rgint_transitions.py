"""Generate webapp/public/data/rgint_transitions/{ID}.csv FROM Postgres
(table ``transitions``).

Each row is a per-year origin->destination area flow over the 15 classes.
Output columns: ano_par, origem_id, destino_id, area_ha.

Only regions that have rows in ``transitions`` are emitted (3 today; all 133
once the full 15x15 matrices are ingested — no code change needed here).
"""
from __future__ import annotations

import csv
from collections import defaultdict

from common import CLASS_ORDER, ensure_out
from db import connect

CLASS_IDX = {c: i for i, c in enumerate(CLASS_ORDER)}


def main() -> None:
    out_dir = ensure_out("rgint_transitions")
    # rgint -> list of (ano_par, origem, destino, area)
    by_region: dict[str, list[tuple]] = defaultdict(list)
    with connect() as conn:
        cur = conn.cursor()
        cur.execute("SELECT rgint_id, ano_par, origem_id, destino_id, area_ha "
                    "FROM transitions")
        for rid, ano_par, origem, destino, area in cur.fetchall():
            if area is None:
                continue
            by_region[str(rid)].append((ano_par, origem, destino, round(float(area), 2)))

    written = 0
    for rid, rows in by_region.items():
        rows.sort(key=lambda r: (int(r[0]), CLASS_IDX.get(r[1], 99), CLASS_IDX.get(r[2], 99)))
        with open(out_dir / f"{rid}.csv", "w", newline="", encoding="utf-8") as fh:
            w = csv.writer(fh)
            w.writerow(["ano_par", "origem_id", "destino_id", "area_ha"])
            w.writerows(rows)
        written += 1
    print(f"wrote {written} transition files into {out_dir}")


if __name__ == "__main__":
    main()
