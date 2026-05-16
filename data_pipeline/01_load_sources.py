"""
01_load_sources.py
Reads raw data sources and produces canonical CSVs in data_pipeline/processed/.

Outputs:
  processed/pam_rgint.csv             -- PAM crop areas by RGINT/year/crop (soja, milho, cana, cafe if present)
  processed/lapig_vigor_rgint.csv     -- LAPIG pasture vigor by RGINT/year/vigor class
  processed/conab_cafe_uf.csv         -- CONAB coffee area by UF/year (if cafe not in PAM)
  processed/conab_milho_split_uf.csv  -- milho 1a/2a safra split ratio by UF/year
"""

import glob
import numpy as np
import pandas as pd
from pathlib import Path
from utils import ILUC, ROOT, PROCESSED, load_lookup, ensure_processed_dir

CONAB = ROOT / "Dados_CONAB"
YEARS = list(range(2008, 2025))   # 2008-2024 inclusive

ensure_processed_dir()


# ── A. PAM — Pesquisa Agricola Municipal aggregated to RGINT ─────────────────
print("Loading PAM_RGINT_COMPLETO.csv ...")
pam_raw = pd.read_csv(
    ILUC / "05_Agro_Subdivisions" / "PAM_RGINT_COMPLETO.csv",
    dtype={"CD_RGINT": str},
)
pam_raw.columns = pam_raw.columns.str.strip()
pam_raw = pam_raw.rename(columns={
    "CD_RGINT":  "rgint_id",
    "NM_RGINT":  "nome_rgint",
    "SIGLA_UF":  "uf",
    "ano":       "year",
    "cultura":   "crop",
    "area_ha":   "area_ha",
})
pam_raw["rgint_id"] = pam_raw["rgint_id"].astype(str).str.strip()

# Check whether PAM already includes cafe
pam_crops = {c.lower() for c in pam_raw["crop"].dropna().unique()}
PAM_HAS_CAFE = any("caf" in c for c in pam_crops)
print(f"  Culturas PAM: {sorted(pam_crops)}")
print(f"  Cafe em PAM: {PAM_HAS_CAFE}")

KEEP_CROPS = {"soja", "milho", "cana"}
if PAM_HAS_CAFE:
    cafe_crop_name = next(c for c in pam_raw["crop"].unique() if "caf" in c.lower())
    KEEP_CROPS.add(cafe_crop_name.lower())
    print(f"  Incluindo '{cafe_crop_name}' do PAM no pam_rgint.csv")

pam = pam_raw[pam_raw["crop"].str.lower().isin(KEEP_CROPS)].copy()
pam["crop"] = pam["crop"].str.lower()
pam = pam[["rgint_id", "uf", "year", "crop", "area_ha"]].sort_values(["rgint_id", "year", "crop"])
pam.to_csv(PROCESSED / "pam_rgint.csv", index=False, encoding="utf-8")
print(f"  Saved {len(pam):,} rows -> processed/pam_rgint.csv")


# ── B. LAPIG — Pasture vigor aggregated from municipality to RGINT ───────────
print("Loading LAPIG vigor CSVs (2008-2023) ...")
lookup = load_lookup()

lapig_frames = []
for fpath in sorted(glob.glob(str(ILUC / "03_Pasture_Vigor_LAPIG" / "brasil_pasture_vigor_col9_s100_year=*.csv"))):
    year = int(Path(fpath).stem.split("=")[1])
    if year not in YEARS:
        continue
    df = pd.read_csv(fpath, dtype={"geocod_mun": float})
    df.columns = df.columns.str.strip()
    df["geocod_mun"] = df["geocod_mun"].dropna().astype("Int64").astype(str).str.zfill(7)
    df = df.rename(columns={"geocod_mun": "CD_GEOCODI"})
    merged = df.merge(lookup[["CD_GEOCODI", "cod_rgint"]], on="CD_GEOCODI", how="left")
    merged = merged.dropna(subset=["cod_rgint"])
    agg = (
        merged.groupby(["cod_rgint", "classe"], as_index=False)["area_past_ha"]
        .sum()
        .rename(columns={"cod_rgint": "rgint_id"})
    )
    agg["year"] = year
    lapig_frames.append(agg)

lapig = pd.concat(lapig_frames, ignore_index=True)
lapig["rgint_id"] = lapig["rgint_id"].astype(str).str.strip()
lapig_total = lapig.groupby(["rgint_id", "year"])["area_past_ha"].transform("sum")
lapig["pct"] = lapig["area_past_ha"] / lapig_total.replace(0, float("nan"))
lapig = lapig.sort_values(["rgint_id", "year", "classe"])
lapig.to_csv(PROCESSED / "lapig_vigor_rgint.csv", index=False, encoding="utf-8")
print(f"  Saved {len(lapig):,} rows -> processed/lapig_vigor_rgint.csv")


# ── C. CONAB SerieHistoricaCafe — UF-level coffee area ──────────────────────
if not PAM_HAS_CAFE:
    print("Loading SerieHistoricaCafe.txt (cafe not in PAM - will allocate UF->RGINT) ...")
    cafe_path = CONAB / "SerieHistoricaCafe.txt"
    if cafe_path.exists():
        cafe_raw = pd.read_csv(cafe_path, sep=";", decimal=",", encoding="utf-8")
        cafe_raw.columns = cafe_raw.columns.str.strip()
        cafe_raw["year"] = pd.to_numeric(cafe_raw["ano_agricola"], errors="coerce").astype("Int64")
        cafe_raw["area_ha"] = (
            pd.to_numeric(
                cafe_raw["area_plantada_mil_ha"].astype(str).str.replace(",", "."),
                errors="coerce"
            ) * 1000
        )
        cafe_uf = (
            cafe_raw[(cafe_raw["year"] >= 2008) & (cafe_raw["year"] <= 2024)]
            .groupby(["year", "uf"], as_index=False)["area_ha"]
            .sum()
        )
        cafe_uf.to_csv(PROCESSED / "conab_cafe_uf.csv", index=False, encoding="utf-8")
        print(f"  Saved {len(cafe_uf):,} rows -> processed/conab_cafe_uf.csv")
        print(f"  Anos cobertos: {sorted(cafe_uf['year'].dropna().unique())}")
    else:
        print(f"  AVISO: {cafe_path} nao encontrado, pulando cafe UF.")
else:
    print("Cafe ja esta no PAM (RGINT level) - pulando SerieHistoricaCafe.")


# ── D. CONAB LevantamentoGraos — milho 1a/2a safra split by UF ──────────────
print("Loading LevantamentoGraos.txt (milho 1a/2a split) ...")
lev_path = CONAB / "LevantamentoGraos.txt"
if lev_path.exists():
    lev = pd.read_csv(lev_path, sep=";", decimal=",", encoding="latin-1")
    lev.columns = lev.columns.str.strip()

    milho = lev[lev["produto"].str.upper().str.contains("MILHO", na=False)].copy()
    milho["id_lev_num"] = pd.to_numeric(milho["id_levantamento"], errors="coerce")
    # Use last levantamento (highest id) per ano/UF/safra as the final estimate
    milho_final = (
        milho.sort_values("id_lev_num")
        .groupby(["ano_agricola", "uf", "safra"], as_index=False)
        .last()
    )
    # Parse year from "2017/18" -> 2017
    milho_final["year"] = (
        milho_final["ano_agricola"].astype(str).str[:4]
        .apply(pd.to_numeric, errors="coerce")
        .astype("Int64")
    )
    milho_final = milho_final[milho_final["year"].between(2008, 2024)].copy()
    milho_final["area"] = pd.to_numeric(
        milho_final["area_plantada_mil_ha"].astype(str).str.replace(",", "."),
        errors="coerce"
    )

    # Identify 1a and 2a safra columns by looking at safra values
    safras = milho_final["safra"].dropna().unique()
    print(f"  Safras de milho encontradas: {sorted(safras)}")
    col_1a = next((s for s in safras if "1" in str(s) and "SAFRA" in str(s).upper()), None)
    col_2a = next((s for s in safras if "2" in str(s) and "SAFRA" in str(s).upper()), None)
    print(f"  Mapeado: 1a='{col_1a}'  2a='{col_2a}'")

    if col_1a and col_2a:
        pivot = milho_final.pivot_table(
            index=["year", "uf"], columns="safra", values="area", aggfunc="sum"
        ).reset_index()
        pivot.columns.name = None
        pivot = pivot.rename(columns={col_1a: "area_1a", col_2a: "area_2a"})
        pivot["area_1a"] = pd.to_numeric(pivot.get("area_1a"), errors="coerce").fillna(0)
        pivot["area_2a"] = pd.to_numeric(pivot.get("area_2a"), errors="coerce").fillna(0)
        pivot["total"]   = pivot["area_1a"] + pivot["area_2a"]
        pivot["pct_2a"]  = np.where(pivot["total"] > 0, pivot["area_2a"] / pivot["total"], np.nan)
        milho_split = pivot[["year", "uf", "pct_2a"]].dropna(subset=["pct_2a"])
        milho_split.to_csv(PROCESSED / "conab_milho_split_uf.csv", index=False, encoding="utf-8")
        print(f"  Saved {len(milho_split):,} rows -> processed/conab_milho_split_uf.csv")
        print(f"  Anos cobertos: {sorted(milho_split['year'].unique())}")
    else:
        print("  AVISO: nao foi possivel identificar safras 1a/2a. Verifique os valores acima.")
else:
    print(f"  AVISO: {lev_path} nao encontrado, pulando split de milho.")

print("\nDone. Run 02_build_multisource_json.py next.")
