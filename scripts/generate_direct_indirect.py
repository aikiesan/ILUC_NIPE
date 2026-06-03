"""Generate webapp/public/data/direct_indirect_soy.json FROM Postgres.

For each GTAP period and each regional cut (Nacional, 6 biomas, MATOPIBA),
split soy-bound transitions into:
  * DIRETA   : origem in NATIVE_CLASSES (11-14)  -> destino in SOJA_CLASSES
  * INDIRETA : origem in AGRO_CLASSES  (1-10)    -> destino in SOJA_CLASSES

MATOPIBA is a UF-based cut (MA/TO/PI/BA), overlapping Cerrado/Caatinga — it is
reported alongside biomes, not as a substitute.

Validation: nacional pct_direta is expected near 0.21 (the audit's "79%
indireta"); MATOPIBA near 0.40. The script asserts these within ±5pp to catch
silent regressions.
"""
from __future__ import annotations

import json
from collections import defaultdict

from common import AGRO_CLASSES, CLASS_ORDER, NATIVE_CLASSES, ensure_out
from db import connect

SOJA_CLASSES = {CLASS_ORDER[1], CLASS_ORDER[2]}  # "2 - Soja", "3 - Soja + Milho 2ª safra"
NATIVE_SET = set(NATIVE_CLASSES)
AGRO_SET = set(AGRO_CLASSES)

MATOPIBA_UFS = {"MA", "TO", "PI", "BA"}

PERIOD_RANGES = {
    "2008_2017": range(2009, 2018),
    "2017_2024": range(2018, 2025),
}
YEAR_TO_PERIOD = {str(y): p for p, yrs in PERIOD_RANGES.items() for y in yrs}

# Regression guards anchored on the DB's true 2008_2024 values *after* removing
# intra-soja rotation noise (see filter below). The audit's earlier ~0.21
# national figure was a pre-cleaning estimate; the defensible value is ~0.137.
EXPECTED = {  # tolerance ±5pp on 2008_2024 cumulative
    "Nacional": 0.137,
    "MATOPIBA": 0.414,
}
TOLERANCE = 0.05

# Cuts below this total transition volume are statistically negligible (e.g.
# Caatinga ~0 Mha, Pampa 0.065 Mha): their pct_direta is divide-by-noise and is
# flagged in the JSON so the webapp can suppress or caveat them.
MIN_RELIABLE_TOTAL_HA = 100_000.0


def cut_for(uf: str, bioma: str) -> list[str]:
    """Return the list of regional cuts a region contributes to."""
    cuts = ["Nacional"]
    if bioma:
        cuts.append(bioma)
    if uf in MATOPIBA_UFS:
        cuts.append("MATOPIBA")
    return cuts


def main() -> None:
    # cut -> period -> {"direta": ha, "indireta": ha}
    agg: dict[str, dict[str, dict[str, float]]] = defaultdict(
        lambda: defaultdict(lambda: {"direta": 0.0, "indireta": 0.0})
    )

    with connect() as conn:
        cur = conn.cursor()
        cur.execute("SELECT rgint_id, uf, bioma FROM regions")
        region_meta = {str(r[0]): (r[1] or "", r[2] or "") for r in cur.fetchall()}

        cur.execute(
            "SELECT rgint_id, ano_par, origem_id, destino_id, area_ha "
            "FROM transitions WHERE origem_id <> destino_id"
        )
        for rid, ano_par, origem, destino, area in cur.fetchall():
            if area is None or destino not in SOJA_CLASSES:
                continue
            # Exclude intra-soja rotations (e.g. "Soja+Milho 2ª safra" <-> "Soja"):
            # these are crop-management churn within existing soy area, not net
            # land entering the soy system, so they must not inflate the denominator.
            if origem in SOJA_CLASSES:
                continue
            period = YEAR_TO_PERIOD.get(str(ano_par))
            if period is None:
                continue
            if origem in NATIVE_SET:
                kind = "direta"
            elif origem in AGRO_SET:
                kind = "indireta"
            else:
                continue
            uf, bioma = region_meta.get(str(rid), ("", ""))
            for cut in cut_for(uf, bioma):
                agg[cut][period][kind] += float(area)

    # derive cumulative 2008_2024
    for cut, by_period in agg.items():
        for kind in ("direta", "indireta"):
            by_period["2008_2024"][kind] = (
                by_period["2008_2017"][kind] + by_period["2017_2024"][kind]
            )

    # build output structure
    out_obj: dict[str, dict] = {"periodos": {}}
    for period in ("2008_2017", "2017_2024", "2008_2024"):
        recortes: dict[str, dict] = {}
        for cut in sorted(agg):
            d = agg[cut][period]["direta"]
            i = agg[cut][period]["indireta"]
            total = d + i
            recortes[cut] = {
                "direta_ha": round(d, 2),
                "indireta_ha": round(i, 2),
                "total_ha": round(total, 2),
                "pct_direta": round(d / total, 4) if total > 0 else None,
                "reliable": total >= MIN_RELIABLE_TOTAL_HA,
            }
        out_obj["periodos"][period] = {"recortes": recortes}

    # sanity checks on cumulative period
    cum = out_obj["periodos"]["2008_2024"]["recortes"]
    issues = []
    for cut, expected in EXPECTED.items():
        rec = cum.get(cut)
        if rec is None or rec["pct_direta"] is None:
            issues.append(f"{cut}: missing")
            continue
        delta = abs(rec["pct_direta"] - expected)
        status = "OK" if delta <= TOLERANCE else "FAIL"
        print(f"  {cut:10s} pct_direta={rec['pct_direta']:.3f} (expected~{expected:.2f}) [{status}]")
        if delta > TOLERANCE:
            issues.append(f"{cut}: pct_direta {rec['pct_direta']:.3f} vs expected {expected:.2f}")

    out_path = ensure_out() / "direct_indirect_soy.json"
    out_path.write_text(json.dumps(out_obj, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {out_path}")

    if issues:
        raise SystemExit("validation failed:\n  " + "\n  ".join(issues))


if __name__ == "__main__":
    main()
