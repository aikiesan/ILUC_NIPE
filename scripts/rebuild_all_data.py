import os
import re
import glob
import json
import csv
import pandas as pd
from pathlib import Path

# Paths
ROOT = Path(__file__).resolve().parent.parent
INDEX_JSON = ROOT / "webapp" / "public" / "data" / "rgint_index.json"
MATRIX_OUT_DIR = ROOT / "webapp" / "public" / "data" / "rgint_matrix"
TRANSITIONS_OUT_DIR = ROOT / "webapp" / "public" / "data" / "rgint_transitions"
FULL_OUT_DIR = ROOT / "webapp" / "public" / "data" / "rgint_full"
SERIES_OUT_DIR = ROOT / "webapp" / "public" / "data" / "rgint_series"
SERIES_LOCAL_DIR = ROOT / "webapp" / "data" / "rgint"

HANDOFF_DIR = Path(r"C:\Users\Lucas\Documents\ILUC_NIPE\ENTREGA_PRODUTO_ABIOVE_JULHO_2026\05_Handoff_Igor")
MATRIZES_DIR = Path(r"C:\Users\Lucas\Documents\ILUC_NIPE\ENTREGA_PRODUTO_ABIOVE_JULHO_2026\06_Matrizes_Transicao_FINAL")

CLASS_ORDER = [
  "1 - Culturas perenes",
  "2 - Soja Safra Única",
  "3 - Soja + Milho 2ª Safra",
  "4 - Milho 1ª safra",
  "5 - Cana-de-açúcar",
  "6 - Outra agropecuária",
  "7 - Pastagem de Baixo Vigor",
  "8 - Pastagem de Médio Vigor",
  "9 - Pastagem de Alto Vigor",
  "10 - Silvicultura",
  "11 - Veg. prim. florestal",
  "12 - Veg. sec. florestal",
  "13 - Veg. prim. não-florestal",
  "14 - Veg. sec. não-florestal",
  "15 - Outro",
]

NATIVE_CLASSES = [
  "11 - Veg. prim. florestal",
  "12 - Veg. sec. florestal",
  "13 - Veg. prim. não-florestal",
  "14 - Veg. sec. não-florestal",
]

AGRO_CLASSES = [
  "1 - Culturas perenes",
  "2 - Soja Safra Única",
  "3 - Soja + Milho 2ª Safra",
  "4 - Milho 1ª safra",
  "5 - Cana-de-açúcar",
  "6 - Outra agropecuária",
]

def _leading_num(val) -> int | None:
    if val is None:
        return None
    m = re.match(r"\s*(\d+)", str(val))
    return int(m.group(1)) if m else None

def get_canon_name(val) -> str:
    num = _leading_num(val)
    if num is not None and 1 <= num <= 15:
        return CLASS_ORDER[num - 1]
    return str(val).strip()

def get_source_key(row) -> str:
    fonte = str(row['fonte'])
    orig = str(row['classe_original']) if pd.notna(row['classe_original']) else ""
    if "MapBiomas col10" in fonte or "MapBiomas col10" in fonte:
        return "pipeline_diagonal"
    elif "PAM/IBGE" in fonte:
        return "conab_pam"
    elif "LAPIG vigor" in fonte:
        return "lapig_vigor"
    elif orig.startswith("tc_") or orig.startswith("lapig"):
        return orig
    else:
        return re.sub(r"\W+", "_", fonte.lower()).strip("_")

def main():
    print("Creating directories...")
    os.makedirs(MATRIX_OUT_DIR, exist_ok=True)
    os.makedirs(TRANSITIONS_OUT_DIR, exist_ok=True)
    os.makedirs(FULL_OUT_DIR, exist_ok=True)
    os.makedirs(SERIES_OUT_DIR, exist_ok=True)
    os.makedirs(SERIES_LOCAL_DIR, exist_ok=True)

    print("Loading region index...")
    with open(INDEX_JSON, encoding="utf-8") as f:
        index = json.load(f)

    # Accumulators for global files
    all_stocks = {} # id -> stocks dict
    indicators_rows = []
    national_stocks = {} # (year, class, biome) -> area
    national_trans = {} # (period, orig, dest) -> area

    # Define ranges for national periods
    PERIOD_RANGES = {
        "2008_2017": range(2009, 2018),
        "2017_2024": range(2018, 2025),
    }
    YEAR_TO_PERIOD = {
        y: p for p, yrs in PERIOD_RANGES.items() for y in yrs
    }

    print(f"Processing {len(index)} regions...")
    for idx_item in index:
        rid = str(idx_item["rgint"])
        name = idx_item["nome"]
        uf = idx_item["uf"]
        biome = idx_item["biome"]
        meta_dict = {"rgint": rid, "nome": name, "uf": uf, "biome": biome}

        # ── 1. TRANSITION MATRIX FILE ──
        matrix_files = glob.glob(str(MATRIZES_DIR / f"FINAL_ILUC_15_Classes_RGINT_{rid}_*.xlsx"))
        if not matrix_files:
            print(f"  [MISSING MATRIX] Region {rid} - {name}")
            continue
        matrix_file = matrix_files[0]

        print(f"  Region {rid}: Processing transition matrix...")
        df_mat = pd.read_excel(matrix_file, sheet_name="4_Dados")

        # Normalize Origem and Destino to canonical classes
        df_mat["ORIGEM_CANON"] = df_mat["ORIGEM"].map(get_canon_name)
        df_mat["DESTINO_CANON"] = df_mat["DESTINO"].map(get_canon_name)

        # Initialize stocks dict for all classes and years 2008-2024
        stocks = {c: {str(y): 0.0 for y in range(2008, 2025)} for c in CLASS_ORDER}
        
        # Row sums of 2008→2009 matrix give 2008 stocks
        df_first = df_mat[df_mat["ANO_PAR"] == "2008→2009"]
        for c in CLASS_ORDER:
            stocks[c]["2008"] = float(df_first[df_first["ORIGEM_CANON"] == c]["VALOR_HA"].sum())

        # Column sums of each year pair give that end year's stocks
        year_pairs = sorted(df_mat["ANO_PAR"].dropna().unique())
        for pair in year_pairs:
            m = re.match(r"(\d{4})→(\d{4})", pair)
            if not m:
                continue
            end_year = m.group(2)
            df_pair = df_mat[df_mat["ANO_PAR"] == pair]
            for c in CLASS_ORDER:
                stocks[c][end_year] = float(df_pair[df_pair["DESTINO_CANON"] == c]["VALOR_HA"].sum())

        all_stocks[rid] = stocks

        # Build matrices JSON structures
        matrices = {str(y): {} for y in range(2008, 2025)}
        for pair in year_pairs:
            m = re.match(r"(\d{4})→(\d{4})", pair)
            if not m:
                continue
            end_year = m.group(2)
            df_pair = df_mat[df_mat["ANO_PAR"] == pair]
            for _, r in df_pair.iterrows():
                orig = r["ORIGEM_CANON"]
                dest = r["DESTINO_CANON"]
                val = float(r["VALOR_HA"])
                if val > 0.0:
                    matrices[end_year].setdefault(orig, {})[dest] = round(val, 4)

        # Base year 2008 stock as diagonal
        for c in CLASS_ORDER:
            val = stocks[c]["2008"]
            if val > 0.0:
                matrices["2008"][c] = {c: round(val, 4)}

        # Write matrix json
        matrix_payload = {
            "metadata": meta_dict,
            "anchor_years": [2008, 2017, 2024],
            "years": list(range(2008, 2025)),
            "classes": CLASS_ORDER,
            "matrices": matrices
        }
        with open(MATRIX_OUT_DIR / f"{rid}.json", "w", encoding="utf-8") as f:
            json.dump(matrix_payload, f, ensure_ascii=False, separators=(",", ":"))

        # Write transitions net-flow CSV
        csv_rows = []
        for pair in year_pairs:
            m = re.match(r"(\d{4})→(\d{4})", pair)
            if not m:
                continue
            start_year = int(m.group(1))
            df_pair = df_mat[df_mat["ANO_PAR"] == pair]
            for _, r in df_pair.iterrows():
                orig = r["ORIGEM_CANON"]
                dest = r["DESTINO_CANON"]
                val = float(r["VALOR_HA"])
                if val > 0.0:
                    csv_rows.append([start_year, orig, dest, round(val, 2)])

        with open(TRANSITIONS_OUT_DIR / f"{rid}.csv", "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(["ano_par", "origem_id", "destino_id", "area_ha"])
            w.writerows(csv_rows)

        # Write primary stock json (both to webapp/data/rg and public/data/rgint_series)
        series_payload = {c: {str(y): round(stocks[c][str(y)], 4) for y in range(2008, 2025)} for c in CLASS_ORDER}
        for path_out in (SERIES_OUT_DIR / f"{rid}.json", SERIES_LOCAL_DIR / f"{rid}.json"):
            with open(path_out, "w", encoding="utf-8") as f:
                json.dump(series_payload, f, ensure_ascii=False, separators=(",", ":"))

        # ── 2. MULTI-SOURCE HANDOFF FILE ──
        handoff_files = glob.glob(str(HANDOFF_DIR / f"*_{rid}_classes_multifonte.xlsx"))
        if not handoff_files:
            print(f"  [MISSING HANDOFF] Region {rid} - {name}")
            continue
        handoff_file = handoff_files[0]

        print(f"  Region {rid}: Processing multi-source handoff...")
        df_comp = pd.read_excel(handoff_file, sheet_name="completo_todas_fontes")
        df_comp["source_key"] = df_comp.apply(get_source_key, axis=1)

        # Group and aggregate areas for identical sources
        df_grouped = df_comp.groupby(['classe_principal', 'source_key', 'ano'])['area_ha'].sum().reset_index()

        classes_data = {}
        for c_code in range(1, 16):
            c_name = CLASS_ORDER[c_code - 1]
            classes_data[c_name] = {}
            df_cls = df_grouped[df_grouped['classe_principal'] == c_code]
            for src_key in df_cls['source_key'].unique():
                df_src = df_cls[df_cls['source_key'] == src_key]
                values = [None] * 17
                for _, row in df_src.iterrows():
                    y = int(row['ano'])
                    if 2008 <= y <= 2024:
                        values[y - 2008] = round(float(row['area_ha']), 4)
                classes_data[c_name][src_key] = {
                    "values": values,
                    "years": list(range(2008, 2025))
                }

        full_payload = {
            "metadata": {
                "rgint": rid,
                "nome": name,
                "uf": uf,
                "biome": biome,
                "area_ha": sum(stocks[c]["2024"] for c in CLASS_ORDER)
            },
            "classes": classes_data
        }
        with open(FULL_OUT_DIR / f"{rid}.json", "w", encoding="utf-8") as f:
            json.dump(full_payload, f, ensure_ascii=False, separators=(",", ":"))

        # ── 3. ACCUMULATE INDICATORS ──
        native_totals = [sum(stocks[c][str(y)] for c in NATIVE_CLASSES) for y in range(2008, 2025)]
        pressao = sum(max(0.0, native_totals[i] - native_totals[i+1]) for i in range(len(native_totals)-1))
        regen = sum(max(0.0, native_totals[i+1] - native_totals[i]) for i in range(len(native_totals)-1))
        balanco = native_totals[-1] - native_totals[0]
        area_agro = sum(stocks[c]["2024"] for c in AGRO_CLASSES)
        soja_2024 = stocks["2 - Soja Safra Única"]["2024"] + stocks["3 - Soja + Milho 2ª Safra"]["2024"]

        indicators_rows.append({
            "rgint_id": rid,
            "nome": name,
            "uf": uf,
            "bioma": biome,
            "pressao_ha": round(pressao, 2),
            "regeneracao_ha": round(regen, 2),
            "balanco_ha": round(balanco, 2),
            "area_agro_2024": round(area_agro, 2),
            "soja_2024_ha": round(soja_2024, 2)
        })

        # ── 4. ACCUMULATE NATIONAL STOCK ──
        for c in CLASS_ORDER:
            for y in range(2008, 2025):
                key = (y, c, biome)
                national_stocks[key] = national_stocks.get(key, 0.0) + stocks[c][str(y)]

        # ── 5. ACCUMULATE NATIONAL TRANSITIONS ──
        for csv_row in csv_rows:
            start_y, orig, dest, val = csv_row
            if orig == dest:
                continue
            period = YEAR_TO_PERIOD.get(start_y)
            if period:
                key = (period, orig, dest)
                national_trans[key] = national_trans.get(key, 0.0) + val

    # ── 6. WRITE GLOBAL INDICATORS CSV ──
    # Sort regions by pressao_ha descending to rank them
    indicators_rows.sort(key=lambda r: r["pressao_ha"], reverse=True)
    for rank_idx, r in enumerate(indicators_rows, 1):
        r["ranking_pressao"] = rank_idx

    indicators_csv = ROOT / "webapp" / "public" / "data" / "rgint_indicators.csv"
    with open(indicators_csv, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["rgint_id", "nome", "uf", "bioma", "pressao_ha", "regeneracao_ha", "balanco_ha", "area_agro_2024", "ranking_pressao", "soja_2024_ha"])
        w.writeheader()
        w.writerows(indicators_rows)
    print(f"Wrote indicators to {indicators_csv}")

    # ── 7. WRITE CONSOLIDATED TIMESERIES ──
    timeseries_all_json = ROOT / "webapp" / "public" / "data" / "rgint_timeseries_all.json"
    timeseries_all = {}
    for rid, stocks in all_stocks.items():
        timeseries_all[rid] = {c: {str(y): round(stocks[c][str(y)], 4) for y in range(2008, 2025)} for c in CLASS_ORDER}
    with open(timeseries_all_json, "w", encoding="utf-8") as f:
        json.dump(timeseries_all, f, ensure_ascii=False, separators=(",", ":"))
    print(f"Wrote consolidated timeseries to {timeseries_all_json}")

    # ── 8. WRITE NATIONAL TIMESERIES CSV ──
    national_timeseries_csv = ROOT / "webapp" / "public" / "data" / "national_timeseries.csv"
    with open(national_timeseries_csv, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["ano", "classe", "area_ha", "bioma"])
        for (y, c, b), val in sorted(national_stocks.items()):
            w.writerow([y, c, round(val, 2), b])
    print(f"Wrote national timeseries to {national_timeseries_csv}")

    # ── 9. WRITE NATIONAL TRANSITIONS CSV ──
    # Sum gross periods to build 2008_2024 period
    cum_trans = {}
    for (period, orig, dest), val in national_trans.items():
        cum_key = ("2008_2024", orig, dest)
        cum_trans[cum_key] = cum_trans.get(cum_key, 0.0) + val
        
    national_transitions_csv = ROOT / "webapp" / "public" / "data" / "national_transitions.csv"
    with open(national_transitions_csv, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["periodo", "origem_id", "origem_nome", "destino_id", "destino_nome", "area_ha"])
        
        # Sort and write
        all_trans_list = []
        for (period, orig, dest), val in list(national_trans.items()) + list(cum_trans.items()):
            all_trans_list.append((period, orig, dest, val))
            
        all_trans_list.sort(key=lambda x: (x[0], -x[3]))
        for period, orig, dest, val in all_trans_list:
            w.writerow([period, orig, orig, dest, dest, round(val, 2)])
    print(f"Wrote national transitions to {national_transitions_csv}")

    print("\n--- ALL DATA REBUILT SUCCESSFULLY! ---")

if __name__ == "__main__":
    main()
