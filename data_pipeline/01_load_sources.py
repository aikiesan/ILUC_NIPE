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
import re
import numpy as np
import pandas as pd
from pathlib import Path
from utils import ILUC, ROOT, PROCESSED, load_lookup, ensure_processed_dir

CONAB = ROOT  # SerieHistoricaCafe.txt, LevantamentoGraos.txt live directly in ILUC_NIPE/
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


# ── E. CRUZAMENTO TC+MB — aggregate municipality -> RGINT ────────────────────
print("Loading CRUZAMENTO_TC_MB_CORRETO_v3.csv ...")
cruzamento_path = ILUC / "06_Reconciliation_Logic" / "CRUZAMENTO_TC_MB_CORRETO_v3.csv"
if cruzamento_path.exists():
    cruz = pd.read_csv(cruzamento_path, dtype={"CD_MUN": str})
    cruz.columns = cruz.columns.str.strip()
    cruz["CD_MUN"] = cruz["CD_MUN"].astype(str).str.zfill(7)
    cruz = cruz.rename(columns={"CD_MUN": "CD_GEOCODI", "ANO": "year"})

    lookup = load_lookup()
    merged_c = cruz.merge(lookup[["CD_GEOCODI", "cod_rgint"]], on="CD_GEOCODI", how="left")
    merged_c = merged_c.dropna(subset=["cod_rgint"])
    merged_c["rgint_id"] = merged_c["cod_rgint"].astype(str).str.strip()

    KEEP_COLS = [
        "MB_Floresta_ha", "MB_Pastagem_ha", "MB_Savana_ha",
        "Veg_Florestal_Primaria", "Veg_Florestal_Secundaria",
        "Natural_Nao_Florestal", "Pastagem_Herbacea", "Pastagem_Arbustiva_Arborea",
    ]
    agg_cols = [c for c in KEEP_COLS if c in merged_c.columns]
    cruzamento_rgint = (
        merged_c.groupby(["rgint_id", "year"])[agg_cols]
        .sum()
        .reset_index()
        .sort_values(["rgint_id", "year"])
    )
    cruzamento_rgint.to_csv(PROCESSED / "cruzamento_rgint.csv", index=False, encoding="utf-8")
    print(f"  Columns: {agg_cols}")
    print(f"  Saved {len(cruzamento_rgint):,} rows -> processed/cruzamento_rgint.csv")
    print(f"  Anos: {sorted(cruzamento_rgint['year'].unique())}")
else:
    print(f"  AVISO: {cruzamento_path} nao encontrado, pulando cruzamento MB/TC.")


# ── F. TerraClass AMZ + CER — aggregate municipality to RGINT ───────────────
print("Loading TerraClass AMZ + CER files ...")

TC_AMZ_FILE = Path(r"C:\Users\Lucas\Documents\ABIOVE_SOJA_2026\01_START_Data_Sources\BDC_ABIOVE_Dictionary\04_TerraClass\AMAZONIA") / "TC_AMZ_AMAZONIA_LEGAL_harmonizado.csv"
TC_CER_DIR  = Path(r"C:\Users\Lucas\Documents\ABIOVE_SOJA_2026\01_START_Data_Sources\BDC_ABIOVE_Dictionary\04_TerraClass\CERRADO")

TC_COLS_WANT = [
    "Veg_Florestal_Primaria", "Veg_Florestal_Secundaria",
    "Natural_Nao_Florestal", "Silvicultura",
    "Pastagem_Arbustiva_Arborea", "Pastagem_Herbacea",
    "Cultura_Perene", "Cultura_Temporaria_Total", "Desflorestamento_Ano",
]

tc_frames = []

if TC_AMZ_FILE.exists():
    df_amz = pd.read_csv(TC_AMZ_FILE, dtype={"CD_MUN": str})
    df_amz.columns = df_amz.columns.str.strip()
    df_amz["CD_MUN"] = df_amz["CD_MUN"].astype(str).str.zfill(7)
    tc_frames.append(df_amz)
    print(f"  AMZ: {len(df_amz):,} rows, anos {sorted(df_amz['ANO'].unique())}")
else:
    print(f"  AVISO: TC AMZ nao encontrado em {TC_AMZ_FILE}")

if TC_CER_DIR.exists():
    # Use the full Cerrado file if available; otherwise concatenate state files
    cerrado_full = TC_CER_DIR / "TC_CER_CERRADO_harmonizado.csv"
    cer_files = [cerrado_full] if cerrado_full.exists() else sorted(
        f for f in TC_CER_DIR.glob("TC_CER_*_harmonizado.csv")
        if f.name != "TC_CER_CERRADO_harmonizado.csv"
    )
    # TC CER uses different column names — normalize to match AMZ before concat
    CER_RENAME = {
        "Veg_Natural_Primaria":   "Veg_Florestal_Primaria",
        "Veg_Natural_Secundaria":  "Veg_Florestal_Secundaria",
        # CER has a single Pastagem column (no herbácea/arbórea split)
        # Map to Pastagem_Herbacea; Pastagem_Arbustiva_Arborea stays 0 for CER RGINTs
        "Pastagem":               "Pastagem_Herbacea",
    }
    for f in cer_files:
        df_cer = pd.read_csv(f, dtype={"CD_MUN": str})
        df_cer.columns = df_cer.columns.str.strip()
        df_cer["CD_MUN"] = df_cer["CD_MUN"].astype(str).str.zfill(7)
        df_cer = df_cer.rename(columns=CER_RENAME)
        tc_frames.append(df_cer)
        print(f"  CER {f.name}: {len(df_cer):,} rows")
else:
    print(f"  AVISO: TC CER dir nao encontrado: {TC_CER_DIR}")

if tc_frames:
    tc_all = pd.concat(tc_frames, ignore_index=True)
    tc_all = tc_all.rename(columns={"CD_MUN": "CD_GEOCODI", "ANO": "year"})
    lookup = load_lookup()
    tc_all = tc_all.merge(lookup[["CD_GEOCODI", "cod_rgint"]], on="CD_GEOCODI", how="left")
    tc_all = tc_all.dropna(subset=["cod_rgint"])
    tc_all["rgint_id"] = tc_all["cod_rgint"].astype(str).str.strip()
    tc_all["year"] = tc_all["year"].astype(int)

    valid_cols = [c for c in TC_COLS_WANT if c in tc_all.columns]
    # min_count=1 ensures that groups where ALL values are NaN stay NaN (not 0)
    # This prevents CER RGINTs showing a flat zero line for AMZ-only columns
    tc_rgint = (
        tc_all.groupby(["rgint_id", "year"])[valid_cols]
        .sum(min_count=1)
        .reset_index()
        .sort_values(["rgint_id", "year"])
    )
    tc_rgint.to_csv(PROCESSED / "tc_direct_rgint.csv", index=False, encoding="utf-8")
    print(f"  Colunas extraidas: {valid_cols}")
    print(f"  Saved {len(tc_rgint):,} rows -> processed/tc_direct_rgint.csv")
    print(f"  Anos TC: {sorted(tc_rgint['year'].unique())}")
else:
    print("  AVISO: nenhum arquivo TC carregado — tc_direct_rgint.csv nao gerado.")


# ── G. ILUC Matrices (ALL_RGINTS) → time series per RGINT × class ───────────
print("Loading ILUC_15Classes matrices (133 RGINTs × 16 periods) ...")
ILUC_DIR = Path(r"C:\Users\Lucas\Documents\ABIOVE_SOJA_2026\05_FINAL_INTEGRATION_DATA\07_MATRIZES_15_CLASSES_FINAL\ALL_RGINTS")

CLASS_NAMES_15 = [
    "1 - Culturas perenes", "2 - Soja", "3 - Soja + Milho 2ª safra",
    "4 - Milho 1ª safra", "5 - Cana-de-açúcar", "6 - Outra agropecuária",
    "7 - Pastagem deg. média", "8 - Pastagem deg. alta", "9 - Pastagem deg. baixa",
    "10 - Silvicultura", "11 - Veg. prim. florestal", "12 - Veg. sec. florestal",
    "13 - Veg. prim. não-florestal", "14 - Veg. sec. não-florestal", "15 - Outro",
]

if ILUC_DIR.exists():
    iluc_files = sorted(ILUC_DIR.glob("ILUC_15Classes_RGINT*.xlsx"))
    iluc_records = []
    for i, f in enumerate(iluc_files):
        m = re.search(r"RGINT(\d{4})", f.name)
        if not m:
            continue
        rgint_id = m.group(1)
        xl = pd.ExcelFile(f)
        period_dfs = {}
        for sheet in xl.sheet_names:
            year_start = int(sheet.split("_")[0])
            df = pd.read_excel(f, sheet_name=sheet, index_col=0)
            df.index = df.index.astype(str).str.strip()
            period_dfs[year_start] = df
        # Row sums per period = area of each class at start year
        for year, df in period_dfs.items():
            row_sums = df.sum(axis=1)
            rec = {"rgint_id": rgint_id, "year": year}
            for cls in CLASS_NAMES_15:
                rec[cls] = row_sums.get(cls, None)
            iluc_records.append(rec)
        # Column sums of last period = area in 2024
        last_df = period_dfs[max(period_dfs)]
        last_df.columns = last_df.columns.astype(str).str.strip()
        col_sums = last_df.sum(axis=0)
        rec = {"rgint_id": rgint_id, "year": 2024}
        for cls in CLASS_NAMES_15:
            rec[cls] = col_sums.get(cls, None)
        iluc_records.append(rec)
        if (i + 1) % 25 == 0:
            print(f"  {i+1}/{len(iluc_files)} RGINTs processados...")

    iluc_ts = pd.DataFrame(iluc_records).sort_values(["rgint_id", "year"])
    iluc_ts.to_csv(PROCESSED / "iluc_matrix_rgint.csv", index=False, encoding="utf-8")
    print(f"  Saved {len(iluc_ts):,} rows -> processed/iluc_matrix_rgint.csv")
    print(f"  RGINTs: {iluc_ts['rgint_id'].nunique()} | anos: {sorted(iluc_ts['year'].unique())}")
else:
    print(f"  AVISO: ILUC_DIR nao encontrado: {ILUC_DIR}")


# ── H. CONAB UF Soja/Milho/Cana → allocate to RGINT via PAM proxy ───────────
print("Loading CONAB_GRAOS_CANA_UF_2008_2024.csv ...")
CONAB_CSV = Path(r"C:\Users\Lucas\Documents\ABIOVE_SOJA_2026\05_FINAL_INTEGRATION_DATA\05_Agro_Subdivisions\CONAB_GRAOS_CANA_UF_2008_2024.csv")

CULTURA_MAP = {
    "Soja (em grão)":  "soja",
    "Milho (em grão)": "milho",
    "Cana-de-açúcar":  "cana",
}

if CONAB_CSV.exists():
    pam_base = pd.read_csv(PROCESSED / "pam_rgint.csv", dtype={"rgint_id": str})
    uf_lookup = pam_base[["rgint_id", "uf"]].drop_duplicates()

    conab_uf_df = pd.read_csv(CONAB_CSV)
    conab_uf_df = conab_uf_df[conab_uf_df["cultura"].isin(CULTURA_MAP)].copy()
    conab_uf_df["cultura_key"] = conab_uf_df["cultura"].map(CULTURA_MAP)
    # Deduplicate (file has some duplicate rows)
    conab_uf_df = conab_uf_df.groupby(["ano", "uf", "cultura_key"], as_index=False)["conab_ha"].mean()

    rows = []
    for (ano, uf, cultura_key), grp in conab_uf_df.groupby(["ano", "uf", "cultura_key"]):
        uf_ha = grp["conab_ha"].sum()
        pam_sub = pam_base[
            (pam_base["uf"] == uf) &
            (pam_base["year"] == ano) &
            (pam_base["crop"] == cultura_key)
        ]
        uf_pam_total = pam_sub["area_ha"].sum()
        if uf_pam_total > 0:
            for _, r in pam_sub.iterrows():
                rows.append({"rgint_id": r["rgint_id"], "year": ano,
                              "cultura": cultura_key,
                              "conab_ha": round(uf_ha * r["area_ha"] / uf_pam_total, 2)})
        else:
            rgints = uf_lookup[uf_lookup["uf"] == uf]["rgint_id"].unique()
            if len(rgints):
                for rid in rgints:
                    rows.append({"rgint_id": rid, "year": ano,
                                 "cultura": cultura_key,
                                 "conab_ha": round(uf_ha / len(rgints), 2)})

    conab_rgint = pd.DataFrame(rows).sort_values(["rgint_id", "year", "cultura"])
    conab_rgint.to_csv(PROCESSED / "conab_graos_cana_rgint.csv", index=False, encoding="utf-8")
    print(f"  Saved {len(conab_rgint):,} rows -> processed/conab_graos_cana_rgint.csv")
    print(f"  Culturas: {sorted(conab_rgint['cultura'].unique())} | anos: {sorted(conab_rgint['year'].unique())}")
else:
    print(f"  AVISO: {CONAB_CSV} nao encontrado")

print("\nDone. Run 02_build_multisource_json.py next.")
