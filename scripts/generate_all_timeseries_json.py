import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SERIES_DIR = ROOT / "webapp" / "data" / "rgint"
OUT_FILE = ROOT / "webapp" / "public" / "data" / "rgint_timeseries_all.json"

def main():
    series_files = sorted(SERIES_DIR.glob("*.json"))
    print(f"Consolidating {len(series_files)} series into a single file...")
    
    consolidated = {}
    for sf in series_files:
        rid = sf.stem
        with open(sf, encoding="utf-8") as f:
            data = json.load(f)
        
        # Keep only valid numeric values for JSON cleanliness
        cleaned = {}
        for cls_name, by_year in data.items():
            cleaned[cls_name] = {}
            for year, val in by_year.items():
                if val is None or str(val) == 'NaN' or str(val) == 'nan':
                    cleaned[cls_name][year] = None
                else:
                    cleaned[cls_name][year] = float(val)
                    
        consolidated[rid] = cleaned
        
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(consolidated, f, ensure_ascii=False, separators=(",", ":"))
        
    print(f"Successfully wrote consolidated timeseries to {OUT_FILE}")

if __name__ == "__main__":
    main()
