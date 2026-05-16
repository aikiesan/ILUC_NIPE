"""
02_build_multisource_json.py
Merges pipeline diagonal + PAM + LAPIG + CONAB into multi-source JSONs per RGINT.
All sources are shown as-is for visual inspection — no outlier detection.

Output: webapp/data/rgint_full/{rgint_id}.json  (133 files)
"""

import json
import math
import numpy as np
import pandas as pd
from pathlib import Path
from utils import (
    PROCESSED, WEBAPP_DATA, load_rgint_index, load_existing_diagonal, load_quality_rules
)


YEARS = list(range(2008, 2025))   # 2008-2024 inclusive


# ── Helpers ──────────────────────────────────────────────────────────────────

def _nan_to_none(lst: list) -> list:
    return [None if (v is None or (isinstance(v, float) and math.isnan(v))) else v for v in lst]


def build_source_entry(values: list, years: list, quality: str, notes: str) -> dict:
    clean = _nan_to_none(values)
    return {
        "values": [round(v, 4) if v is not None else None for v in clean],
        "years":   years,
        "quality": quality,
        "notes":   notes,
    }


# ── Load processed sources ───────────────────────────────────────────────────

print("Loading processed sources...")
pam   = pd.read_csv(PROCESSED / "pam_rgint.csv",        dtype={"rgint_id": str})
lapig = pd.read_csv(PROCESSED / "lapig_vigor_rgint.csv", dtype={"rgint_id": str})
rules = load_quality_rules()
rgint_index = load_rgint_index()

# Optional: café UF-level (only present if PAM did not already have café)
cafe_uf_path = PROCESSED / "conab_cafe_uf.csv"
cafe_uf = pd.read_csv(cafe_uf_path, encoding="utf-8") if cafe_uf_path.exists() else None
PAM_HAS_CAFE = "cafe" in pam["crop"].str.lower().unique() or \
               any("caf" in c for c in pam["crop"].str.lower().unique())

# Milho 1a/2a split from LevantamentoGraos
milho_split_path = PROCESSED / "conab_milho_split_uf.csv"
milho_split_uf = pd.read_csv(milho_split_path, encoding="utf-8") if milho_split_path.exists() else None
if milho_split_uf is not None:
    milho_split_uf["year"] = milho_split_uf["year"].astype(int)
    print(f"  milho split loaded: {len(milho_split_uf)} rows, anos {sorted(milho_split_uf['year'].unique())}")
else:
    print("  AVISO: conab_milho_split_uf.csv nao encontrado — classes 3+4 usarao PAM total.")


# ── Series helpers ───────────────────────────────────────────────────────────

def pam_series(rgint_id: str, crop: str) -> list:
    sub = pam[(pam["rgint_id"] == rgint_id) & (pam["crop"].str.lower() == crop.lower())]
    sub = sub.set_index("year")["area_ha"].reindex(YEARS)
    return _nan_to_none(sub.tolist())


def lapig_series(rgint_id: str, classe: str) -> list:
    sub = lapig[(lapig["rgint_id"] == rgint_id) & (lapig["classe"] == classe)]
    sub = sub.set_index("year")["area_past_ha"].reindex(YEARS)
    return _nan_to_none(sub.tolist())


def pct_2a_for(uf: str, year: int) -> float | None:
    """Look up the 2a safra fraction for a given UF/year from LevantamentoGraos."""
    if milho_split_uf is None:
        return None
    row = milho_split_uf[(milho_split_uf["uf"] == uf) & (milho_split_uf["year"] == year)]
    return float(row["pct_2a"].iloc[0]) if len(row) else None


def milho_split_series(rgint_id: str, uf: str, safra: str) -> list:
    """
    PAM milho at RGINT level, weighted by the UF-level 1a/2a split from LevantamentoGraos.
    safra: '1a' or '2a'
    Falls back to total PAM milho if split not available for a given year.
    """
    pam_vals = pam_series(rgint_id, "milho")
    result = []
    for i, year in enumerate(YEARS):
        v = pam_vals[i]
        pct = pct_2a_for(uf, year)
        if v is None or pct is None:
            result.append(v)   # no split available, use total
        else:
            result.append(round(v * (pct if safra == "2a" else (1 - pct)), 4))
    return result


def cafe_rgint_series(rgint_id: str, uf: str) -> list:
    """
    Coffee area for an RGINT.
    If PAM has café: use PAM directly.
    Otherwise: allocate UF-level CONAB café using RGINT's share of UF milho as a spatial proxy.
    """
    if PAM_HAS_CAFE:
        cafe_col = next((c for c in pam["crop"].unique() if "caf" in c.lower()), None)
        if cafe_col:
            return pam_series(rgint_id, cafe_col)

    if cafe_uf is None:
        return [None] * len(YEARS)

    # Compute RGINT share of UF for each year using milho as spatial proxy
    pam_milho_rgint = pam_series(rgint_id, "milho")
    result = []
    for i, year in enumerate(YEARS):
        uf_cafe_row = cafe_uf[(cafe_uf["uf"] == uf) & (cafe_uf["year"] == year)]
        uf_cafe_val = float(uf_cafe_row["area_ha"].iloc[0]) if len(uf_cafe_row) else None

        if uf_cafe_val is None:
            result.append(None)
            continue

        # UF total milho for the same year (all RGINTs in that UF)
        uf_milho_total = pam[
            (pam["uf"] == uf) & (pam["year"] == year) & (pam["crop"].str.lower() == "milho")
        ]["area_ha"].sum()

        rgint_milho = pam_milho_rgint[i]

        if uf_milho_total and rgint_milho is not None and uf_milho_total > 0:
            share = rgint_milho / uf_milho_total
            result.append(round(uf_cafe_val * share, 2))
        else:
            # Fallback: uniform split among RGINTs in UF
            n_rgints = pam[(pam["uf"] == uf) & (pam["year"] == year)]["rgint_id"].nunique()
            result.append(round(uf_cafe_val / max(n_rgints, 1), 2) if n_rgints else None)
    return result


# ── Mapping: class name → extra sources to add ───────────────────────────────

CLASS_EXTRA_SOURCES = {
    "1 - Culturas perenes":      [("conab_cafe", None)],       # cafe, handled specially
    "2 - Soja":                  [("conab_pam",  "soja")],
    "3 - Soja + Milho 2ª safra": [("conab_pam",  "milho_2a")], # uses split
    "4 - Milho 1ª safra":        [("conab_pam",  "milho_1a")], # uses split
    "5 - Cana-de-açúcar":        [("conab_pam",  "cana")],
    "7 - Pastagem deg. média":   [("lapig_vigor", "Intermediário")],
    "8 - Pastagem deg. alta":    [("lapig_vigor", "Severa")],
    "9 - Pastagem deg. baixa":   [("lapig_vigor", "Ausente")],
}


# ── Build one JSON per RGINT ─────────────────────────────────────────────────

print(f"Building multi-source JSONs for {len(rgint_index)} RGINTs...")
out_dir = WEBAPP_DATA / "rgint_full"
out_dir.mkdir(parents=True, exist_ok=True)

for meta in rgint_index:
    rgint_id = meta["rgint"]
    uf       = meta["uf"]
    diagonal = load_existing_diagonal(rgint_id)

    if not diagonal:
        print(f"  WARN: no diagonal data for {rgint_id}, skipping")
        continue

    total_area = sum(
        v for cls_data in diagonal.values()
        for v in cls_data.values()
        if v is not None and not (isinstance(v, float) and math.isnan(v))
    ) / max(len(YEARS), 1)

    result = {
        "metadata": {
            "rgint":   rgint_id,
            "nome":    meta["nome"],
            "uf":      uf,
            "biome":   meta["biome"],
            "area_ha": round(total_area, 1),
        },
        "classes": {},
    }

    for cls_name, year_dict in diagonal.items():
        diag_years = sorted(int(y) for y in year_dict.keys())
        diag_vals  = _nan_to_none([year_dict.get(str(y), year_dict.get(y)) for y in diag_years])

        rule         = rules.get(cls_name, {})
        primary_src  = rule.get("primary", "pipeline_diagonal")
        diag_quality = "primary" if primary_src == "pipeline_diagonal" else "fallback"
        diag_notes   = rule.get(
            "notes_primary" if diag_quality == "primary" else "notes_fallback",
            "Produto do pipeline MapBiomas"
        )

        sources = {
            "pipeline_diagonal": build_source_entry(diag_vals, diag_years, diag_quality, diag_notes)
        }

        for src_key, crop_param in CLASS_EXTRA_SOURCES.get(cls_name, []):
            rule_quality = lambda src: "primary" if primary_src == src else "fallback"

            if src_key == "conab_cafe":
                alt_vals = cafe_rgint_series(rgint_id, uf)
                alt_notes = rule.get(
                    "notes_primary" if rule_quality("conab_cafe") == "primary" else "notes_fallback",
                    "CONAB SerieHistorica cafe (area plantada, alocado por RGINT)"
                )
                sources["conab_cafe"] = build_source_entry(
                    alt_vals, YEARS, rule_quality("conab_cafe"), alt_notes
                )

            elif src_key == "conab_pam":
                if crop_param == "milho_2a":
                    alt_vals = milho_split_series(rgint_id, uf, "2a")
                    alt_notes = rule.get(
                        "notes_primary" if rule_quality("conab_pam") == "primary" else "notes_fallback",
                        "PAM milho x pct_2a (LevantamentoGraos CONAB)"
                    )
                elif crop_param == "milho_1a":
                    alt_vals = milho_split_series(rgint_id, uf, "1a")
                    alt_notes = rule.get(
                        "notes_primary" if rule_quality("conab_pam") == "primary" else "notes_fallback",
                        "PAM milho x (1 - pct_2a) (LevantamentoGraos CONAB)"
                    )
                else:
                    alt_vals  = pam_series(rgint_id, crop_param)
                    alt_notes = rule.get(
                        "notes_primary" if rule_quality("conab_pam") == "primary" else "notes_fallback",
                        "PAM/IBGE area plantada"
                    )
                sources["conab_pam"] = build_source_entry(
                    alt_vals, YEARS, rule_quality("conab_pam"), alt_notes
                )

            elif src_key == "lapig_vigor":
                alt_vals  = lapig_series(rgint_id, crop_param)
                alt_notes = rule.get(
                    "notes_primary" if rule_quality("lapig_vigor") == "primary" else "notes_fallback",
                    "LAPIG vigor de pastagem"
                )
                sources["lapig_vigor"] = build_source_entry(
                    alt_vals, YEARS, rule_quality("lapig_vigor"), alt_notes
                )

        result["classes"][cls_name] = sources

    out_path = out_dir / f"{rgint_id}.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, separators=(",", ":"))

print(f"  Done. {len(rgint_index)} JSONs written to webapp/data/rgint_full/")
print("\nRun 03_generate_reports.py next.")
