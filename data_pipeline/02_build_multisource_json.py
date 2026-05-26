"""
02_build_multisource_json.py  — thin orchestrator
Loads processed CSVs, builds a SourceRegistry, generates rgint_full/*.json.

Delegates all logic to pipeline.builder and pipeline.registry.
Run after: 01_load_sources.py
Run before: 04_outlier_detection.py
"""

import pandas as pd
from utils import PROCESSED, WEBAPP_DATA, load_rgint_index
from pipeline.registry import SourceRegistry
from pipeline.builder import build_all_rgint_jsons


def main():
    print("Loading processed sources...")
    pam        = pd.read_csv(PROCESSED / "pam_rgint.csv",         dtype={"rgint_id": str})
    lapig      = pd.read_csv(PROCESSED / "lapig_vigor_rgint.csv", dtype={"rgint_id": str})
    rgint_index = load_rgint_index()

    cafe_uf_path = PROCESSED / "conab_cafe_uf.csv"
    cafe_uf = pd.read_csv(cafe_uf_path, encoding="utf-8") if cafe_uf_path.exists() else None

    milho_split_path = PROCESSED / "conab_milho_split_uf.csv"
    milho_split_uf = pd.read_csv(milho_split_path, encoding="utf-8") if milho_split_path.exists() else None
    if milho_split_uf is not None:
        milho_split_uf["year"] = milho_split_uf["year"].astype(int)
        print(f"  milho split loaded: {len(milho_split_uf)} rows")

    cruzamento_path = PROCESSED / "cruzamento_rgint.csv"
    cruzamento = pd.read_csv(cruzamento_path, dtype={"rgint_id": str}) if cruzamento_path.exists() else None
    if cruzamento is not None:
        cruzamento["year"] = cruzamento["year"].astype(int)
        print(f"  cruzamento MB/TC loaded: {len(cruzamento)} rows")

    registry = SourceRegistry.from_quality_rules(
        pam=pam,
        lapig=lapig,
        cafe_uf=cafe_uf,
        milho_split_uf=milho_split_uf,
        cruzamento=cruzamento,
        rgint_index=rgint_index,
    )

    out_dir = WEBAPP_DATA / "rgint_full"
    print(f"Building multi-source JSONs for {len(rgint_index)} RGINTs...")
    written = build_all_rgint_jsons(rgint_index, registry, out_dir)
    print(f"  Done. {written} JSONs written to {out_dir}")
    print("\nRun 04_outlier_detection.py next.")


if __name__ == "__main__":
    main()
