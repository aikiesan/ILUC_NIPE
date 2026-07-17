import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SERIES_DIR = ROOT / "webapp" / "data" / "rgint"
MATRIX_DIR = ROOT / "webapp" / "data" / "rgint_matrix"

def main():
    series_files = sorted(SERIES_DIR.glob("*.json"))
    print(f"Extending {len(series_files)} series to 2024...")
    
    updated = 0
    for sf in series_files:
        rid = sf.stem
        mf = MATRIX_DIR / f"{rid}.json"
        if not mf.exists():
            continue
            
        with open(sf, encoding="utf-8") as f:
            series = json.load(f)
            
        with open(mf, encoding="utf-8") as f:
            matrix = json.load(f)
            
        # Get 2023_2024 transitions
        mat_2024 = matrix.get("matrices", {}).get("2024", {})
        row_sums = {}
        col_sums = {}
        for src, dests in mat_2024.items():
            row_sums[src] = sum(dests.values())
            for dest, area in dests.items():
                col_sums[dest] = col_sums.get(dest, 0.0) + area
                
        for c in series:
            # Get 2023 stock
            val_2023 = series[c].get("2023")
            if val_2023 is None or str(val_2023) == 'NaN' or str(val_2023) == 'nan':
                series[c]["2024"] = None
                continue
                
            prev = float(val_2023)
            col_val = col_sums.get(c, 0.0)
            row_val = row_sums.get(c, 0.0)
            
            # If transitions are reported, apply them, otherwise keep 2023 stock constant
            if col_val > 0 or row_val > 0:
                val_2024 = prev + col_val - row_val
            else:
                val_2024 = prev
                
            series[c]["2024"] = round(val_2024, 4)
            
        # Write back updated series
        with open(sf, "w", encoding="utf-8") as f:
            json.dump(series, f, ensure_ascii=False, separators=(",", ":"))
        updated += 1
        
    print(f"Successfully extended {updated} series to 2024.")

if __name__ == "__main__":
    main()
