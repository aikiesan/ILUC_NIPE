"""
01_load_sources.py
Reads raw data sources and produces canonical CSVs in data_pipeline/processed/.

Outputs:
  processed/pam_rgint.csv        — PAM crop areas by RGINT/year/crop
  processed/lapig_vigor_rgint.csv — LAPIG pasture vigor by RGINT/year/vigor class
"""

import glob
import pandas as pd
from pathlib import Path
from utils import ILUC, PROCESSED, load_lookup, ensure_processed_dir

ensure_processed_dir()


# ── A. PAM — Pesquisa Agrícola Municipal aggregated to RGINT ────────────────
print("Loading PAM_RGINT_COMPLETO.csv ...")
pam = pd.read_csv(
    ILUC / "05_Agro_Subdivisions" / "PAM_RGINT_COMPLETO.csv",
    dtype={"CD_RGINT": str},
)
pam.columns = pam.columns.str.strip()
pam = pam.rename(columns={
    "CD_RGINT": "rgint_id",
    "NM_RGINT": "nome_rgint",
    "SIGLA_UF": "uf",
    "ano": "year",
    "cultura": "crop",
    "area_ha": "area_ha",
})
# Keep only crops that map to our 15 classes
KEEP_CROPS = {"soja", "milho", "cana"}
pam = pam[pam["crop"].isin(KEEP_CROPS)].copy()
pam["rgint_id"] = pam["rgint_id"].astype(str).str.strip()
pam = pam[["rgint_id", "year", "crop", "area_ha"]].sort_values(["rgint_id", "year", "crop"])
pam.to_csv(PROCESSED / "pam_rgint.csv", index=False, encoding="utf-8")
print(f"  Saved {len(pam):,} rows -> processed/pam_rgint.csv")


# ── B. LAPIG — Pasture vigor aggregated from municipality to RGINT ──────────
print("Loading LAPIG vigor CSVs (2008–2023) ...")
lookup = load_lookup()

lapig_frames = []
for fpath in sorted(glob.glob(str(ILUC / "03_Pasture_Vigor_LAPIG" / "brasil_pasture_vigor_col9_s100_year=*.csv"))):
    year = int(Path(fpath).stem.split("=")[1])
    df = pd.read_csv(fpath, dtype={"geocod_mun": float})
    df.columns = df.columns.str.strip()

    # Cast geocod_mun to 7-digit string for join
    df["geocod_mun"] = df["geocod_mun"].dropna().astype("Int64").astype(str).str.zfill(7)
    df = df.rename(columns={"geocod_mun": "CD_GEOCODI"})

    # Join to lookup
    merged = df.merge(lookup[["CD_GEOCODI", "cod_rgint"]], on="CD_GEOCODI", how="left")
    merged = merged.dropna(subset=["cod_rgint"])

    # Aggregate to RGINT level
    agg = (
        merged.groupby(["cod_rgint", "classe"], as_index=False)["area_past_ha"]
        .sum()
        .rename(columns={"cod_rgint": "rgint_id"})
    )
    agg["year"] = year
    lapig_frames.append(agg)

lapig = pd.concat(lapig_frames, ignore_index=True)
lapig["rgint_id"] = lapig["rgint_id"].astype(str).str.strip()

# Compute proportions per RGINT/year
lapig_total = lapig.groupby(["rgint_id", "year"])["area_past_ha"].transform("sum")
lapig["pct"] = lapig["area_past_ha"] / lapig_total.replace(0, float("nan"))
lapig = lapig.sort_values(["rgint_id", "year", "classe"])
lapig.to_csv(PROCESSED / "lapig_vigor_rgint.csv", index=False, encoding="utf-8")
print(f"  Saved {len(lapig):,} rows -> processed/lapig_vigor_rgint.csv")

print("\nDone. Run 02_build_multisource_json.py next.")
