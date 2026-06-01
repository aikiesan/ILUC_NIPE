"""Generate webapp/public/data/rgint_pam/{ID}.csv (one file per RGINT).

Splits PAM_RGINT_COMPLETO.csv by region and consolidates the two cotton
sub-classes (algodao_arboreo + algodao_herbaceo) into a single "algodao".
Output columns: ano, cultura, area_ha.
"""
from __future__ import annotations

import csv
from collections import defaultdict

from common import PAM_CSV, ensure_out

CULTURE_MAP = {
    "algodao_arboreo": "algodao",
    "algodao_herbaceo": "algodao",
    "soja": "soja",
    "milho": "milho",
    "cana": "cana",
}
CULTURE_ORDER = ["soja", "milho", "cana", "algodao"]


def main() -> None:
    # region -> (ano, cultura) -> area
    data: dict[str, dict[tuple[int, str], float]] = defaultdict(lambda: defaultdict(float))
    with open(PAM_CSV, encoding="utf-8-sig") as fh:
        for r in csv.DictReader(fh):
            rid = r["CD_RGINT"].strip()
            cultura = CULTURE_MAP.get(r["cultura"], r["cultura"])
            year = int(r["ano"])
            data[rid][(year, cultura)] += float(r["area_ha"] or 0)

    out_dir = ensure_out("rgint_pam")
    for rid, by_key in data.items():
        years = sorted({y for y, _ in by_key})
        with open(out_dir / f"{rid}.csv", "w", newline="", encoding="utf-8") as fh:
            w = csv.writer(fh)
            w.writerow(["ano", "cultura", "area_ha"])
            for year in years:
                for cultura in CULTURE_ORDER:
                    area = by_key.get((year, cultura), 0.0)
                    w.writerow([year, cultura, round(area, 2)])
    print(f"wrote {len(data)} files into {out_dir}")


if __name__ == "__main__":
    main()
