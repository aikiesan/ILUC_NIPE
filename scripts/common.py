"""Shared constants and helpers for the ILUC_NIPE data-generation scripts.

All scripts read raw sources from the repository root and emit web-ready
CSV/JSON artifacts into ``webapp/public/data`` so they ship with the static
SPA build (Vite copies ``public/`` into the ``/docs`` output).
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT
WEBAPP_DATA_LEGACY = ROOT / "webapp" / "data"
OUT = ROOT / "webapp" / "public" / "data"

SHAPEFILE = ROOT / "RG2017_rgint_20180911" / "RG2017_rgint.shp"
MUNICIPIOS_XLSX = (
    ROOT / "ILUC_NIPE" / "02_Spatial_Lookups"
    / "regioes_geograficas_composicao_por_municipios_2017_20180911.xlsx"
)
PAM_CSV = ROOT / "ILUC_NIPE" / "05_Agro_Subdivisions" / "PAM_RGINT_COMPLETO.csv"
INDEX_JSON = WEBAPP_DATA_LEGACY / "rgint_index.json"
RGINT_SERIES_DIR = WEBAPP_DATA_LEGACY / "rgint"
RGINT_MATRIX_DIR = WEBAPP_DATA_LEGACY / "rgint_matrix"

# 15-class LULC system. Native vegetation classes drive pressure/balance.
CLASS_ORDER = [
    "1 - Culturas perenes",
    "2 - Soja",
    "3 - Soja + Milho 2ª safra",
    "4 - Milho 1ª safra",
    "5 - Cana-de-açúcar",
    "6 - Outra agropecuária",
    "7 - Pastagem deg. média",
    "8 - Pastagem deg. alta",
    "9 - Pastagem deg. baixa",
    "10 - Silvicultura",
    "11 - Veg. prim. florestal",
    "12 - Veg. sec. florestal",
    "13 - Veg. prim. não-florestal",
    "14 - Veg. sec. não-florestal",
    "15 - Outro",
]
NATIVE_CLASSES = CLASS_ORDER[10:14]  # classes 11–14
AGRO_CLASSES = CLASS_ORDER[0:10]      # classes 1–10


def ensure_out(*subdirs: str) -> Path:
    """Create and return an output directory under webapp/public/data."""
    target = OUT.joinpath(*subdirs) if subdirs else OUT
    target.mkdir(parents=True, exist_ok=True)
    return target


def load_index() -> list[dict]:
    with open(INDEX_JSON, encoding="utf-8") as fh:
        return json.load(fh)


def load_series(rgint_id: str) -> dict | None:
    """Load a region's 15-class area time series, tolerating NaN tokens."""
    path = RGINT_SERIES_DIR / f"{rgint_id}.json"
    if not path.exists():
        return None
    text = path.read_text(encoding="utf-8").replace("NaN", "null")
    return json.loads(text)
