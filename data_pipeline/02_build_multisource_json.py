"""
02_build_multisource_json.py
Merges pipeline diagonal + PAM + LAPIG into multi-source JSONs per RGINT.
Also runs outlier detection (rolling MAD + cross-source deviation).

Output: webapp/data/rgint_full/{rgint_id}.json  (133 files)
"""

import json
import numpy as np
import pandas as pd
from pathlib import Path
from utils import (
    PROCESSED, WEBAPP_DATA, load_rgint_index, load_existing_diagonal, load_quality_rules
)


YEARS = list(range(2008, 2024))   # 16 years from existing diagonal


# ── Helpers ──────────────────────────────────────────────────────────────────

def _nan_to_none(lst: list) -> list:
    return [None if (v is None or (isinstance(v, float) and np.isnan(v))) else v for v in lst]


# ── Outlier detection ────────────────────────────────────────────────────────

def rolling_mad_outliers(values: list, years: list, window: int = 5, threshold: float = 3.0) -> list[int]:
    """Return years where value deviates > threshold × MAD from local rolling median."""
    flagged = []
    arr = np.array(values, dtype=float)
    n = len(arr)
    for i in range(n):
        lo = max(0, i - window // 2)
        hi = min(n, i + window // 2 + 1)
        seg = arr[lo:hi]
        seg = seg[~np.isnan(seg)]
        if len(seg) < 3:
            continue
        med = np.median(seg)
        mad = np.median(np.abs(seg - med))
        if mad == 0:
            continue
        if abs(arr[i] - med) / mad > threshold:
            flagged.append(years[i])
    return flagged


def cross_source_outliers(src_a_vals: list, src_b_vals: list, years: list, threshold: float = 0.3) -> tuple[list, list]:
    """Flag years where two sources diverge > threshold (relative). Returns (flagged_a, flagged_b)."""
    fa, fb = [], []
    for y, a, b in zip(years, src_a_vals, src_b_vals):
        if a is None or b is None or (a == 0 and b == 0):
            continue
        denom = max(abs(a), abs(b))
        if denom == 0:
            continue
        if abs(a - b) / denom > threshold:
            fa.append(y)
            fb.append(y)
    return fa, fb


def build_source_entry(values: list, years: list, quality: str, notes: str) -> dict:
    clean = _nan_to_none(values)
    out_years = rolling_mad_outliers(clean, years)
    return {
        "values": [round(v, 4) if v is not None else None for v in clean],
        "years": years,
        "quality": quality,
        "notes": notes,
        "outliers": out_years,
    }


# ── Load processed sources ───────────────────────────────────────────────────

print("Loading processed sources...")
pam = pd.read_csv(PROCESSED / "pam_rgint.csv", dtype={"rgint_id": str})
lapig = pd.read_csv(PROCESSED / "lapig_vigor_rgint.csv", dtype={"rgint_id": str})
rules = load_quality_rules()
rgint_index = load_rgint_index()


def pam_series(rgint_id: str, crop: str) -> list:
    sub = pam[(pam["rgint_id"] == rgint_id) & (pam["crop"] == crop)]
    sub = sub.set_index("year")["area_ha"].reindex(YEARS)
    return _nan_to_none(sub.tolist())


def lapig_series(rgint_id: str, classe: str) -> list:
    sub = lapig[(lapig["rgint_id"] == rgint_id) & (lapig["classe"] == classe)]
    sub = sub.set_index("year")["area_past_ha"].reindex(YEARS)
    return _nan_to_none(sub.tolist())


# ── Mapping: class name → sources to add ────────────────────────────────────

CLASS_EXTRA_SOURCES = {
    "2 - Soja":                  [("conab_pam", "soja")],
    "3 - Soja + Milho 2ª safra": [("conab_pam", "milho")],  # total milho — no UF-level split available pre-2022
    "4 - Milho 1ª safra":        [("conab_pam", "milho")],
    "5 - Cana-de-açúcar":        [("conab_pam", "cana")],
    "7 - Pastagem deg. média":   [("lapig_vigor", "Intermediário")],
    "8 - Pastagem deg. alta":    [("lapig_vigor", "Severa")],
    "9 - Pastagem deg. baixa":   [("lapig_vigor", "Ausente")],
}


# ── Build one JSON per RGINT ────────────────────────────────────────────────

print(f"Building multi-source JSONs for {len(rgint_index)} RGINTs...")
out_dir = WEBAPP_DATA / "rgint_full"
out_dir.mkdir(parents=True, exist_ok=True)

for meta in rgint_index:
    rgint_id = meta["rgint"]
    diagonal = load_existing_diagonal(rgint_id)

    if not diagonal:
        print(f"  WARN: no diagonal data for {rgint_id}, skipping")
        continue

    import math as _math
    total_area = sum(
        v for cls_data in diagonal.values()
        for v in cls_data.values()
        if v is not None and not (isinstance(v, float) and _math.isnan(v))
    ) / len(YEARS)   # rough average area per year

    result = {
        "metadata": {
            "rgint": rgint_id,
            "nome": meta["nome"],
            "uf": meta["uf"],
            "biome": meta["biome"],
            "area_ha": round(total_area, 1),
        },
        "classes": {},
    }

    for cls_name, year_dict in diagonal.items():
        diag_years = sorted(int(y) for y in year_dict.keys())
        diag_vals = _nan_to_none([year_dict.get(str(y), year_dict.get(y)) for y in diag_years])

        rule = rules.get(cls_name, {})
        primary_src = rule.get("primary", "pipeline_diagonal")
        fallback_src = rule.get("fallback")

        diag_quality = "primary" if primary_src == "pipeline_diagonal" else "fallback"
        diag_notes = rule.get("notes_primary" if diag_quality == "primary" else "notes_fallback", "")

        sources = {
            "pipeline_diagonal": build_source_entry(diag_vals, diag_years, diag_quality, diag_notes or "Produto do pipeline MapBiomas")
        }

        # Add extra sources for this class
        for src_key, crop_or_classe in CLASS_EXTRA_SOURCES.get(cls_name, []):
            if src_key == "conab_pam":
                alt_vals = pam_series(rgint_id, crop_or_classe)
                alt_quality = "primary" if primary_src == "conab_pam" else "fallback"
                alt_notes = rule.get("notes_primary" if alt_quality == "primary" else "notes_fallback", "PAM fonte alternativa")
                entry = build_source_entry(alt_vals, YEARS, alt_quality, alt_notes)

                # Cross-source outlier check (align years)
                if all(y in diag_years for y in YEARS):
                    diag_aligned = [year_dict.get(str(y), year_dict.get(y)) for y in YEARS]
                    alt_clean = [v if v is not None else 0.0 for v in alt_vals]
                    diag_clean = [v if v is not None else 0.0 for v in diag_aligned]
                    fa, fb = cross_source_outliers(diag_clean, alt_clean, YEARS)
                    sources["pipeline_diagonal"]["outliers"] = sorted(set(sources["pipeline_diagonal"]["outliers"] + fa))
                    entry["outliers"] = sorted(set(entry["outliers"] + fb))

                sources[src_key] = entry

            elif src_key == "lapig_vigor":
                alt_vals = lapig_series(rgint_id, crop_or_classe)
                alt_quality = "primary" if primary_src == "lapig_vigor" else "fallback"
                alt_notes = rule.get("notes_primary" if alt_quality == "primary" else "notes_fallback", "LAPIG vigor bruto")
                sources[src_key] = build_source_entry(alt_vals, YEARS, alt_quality, alt_notes)

        result["classes"][cls_name] = sources

    out_path = out_dir / f"{rgint_id}.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, separators=(",", ":"))

print(f"  Done. {len(rgint_index)} JSONs written to webapp/data/rgint_full/")
print("\nRun 03_generate_reports.py next.")
