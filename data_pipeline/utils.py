"""Shared helpers for the ABIOVE LULC data pipeline."""

import math
from pathlib import Path
import json
import yaml
import pandas as pd

YEARS = list(range(2008, 2025))


def _nan_to_none(lst: list) -> list:
    return [
        None if (v is None or (isinstance(v, float) and math.isnan(v))) else v
        for v in lst
    ]

ROOT = Path(__file__).parent.parent
ILUC = ROOT / "ILUC_NIPE"
WEBAPP_DATA = ROOT / "webapp" / "data"
PROCESSED = Path(__file__).parent / "processed"

LOOKUP_FILE = ILUC / "02_Spatial_Lookups" / "regioes_geograficas_composicao_por_municipios_2017_20180911.xlsx"
QUALITY_RULES_FILE = Path(__file__).parent / "quality_rules.yaml"


def load_lookup() -> pd.DataFrame:
    """Municipality → RGINT lookup. Returns DataFrame with CD_GEOCODI and cod_rgint."""
    df = pd.read_excel(LOOKUP_FILE, dtype=str)
    df.columns = df.columns.str.strip()
    # Normalize geocode: strip decimals if any, zero-pad to 7 digits
    df["CD_GEOCODI"] = df["CD_GEOCODI"].str.strip().str.split(".").str[0].str.zfill(7)
    df["cod_rgint"] = df["cod_rgint"].str.strip().str.split(".").str[0]
    return df[["CD_GEOCODI", "cod_rgint", "nome_rgint"]].drop_duplicates()


def load_rgint_index() -> list[dict]:
    with open(WEBAPP_DATA / "rgint_index.json", encoding="utf-8") as f:
        return json.load(f)


def load_existing_diagonal(rgint_id: str) -> dict:
    path = WEBAPP_DATA / "rgint" / f"{rgint_id}.json"
    if not path.exists():
        return {}
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def load_quality_rules() -> dict:
    with open(QUALITY_RULES_FILE, encoding="utf-8") as f:
        return yaml.safe_load(f)


def ensure_processed_dir():
    PROCESSED.mkdir(parents=True, exist_ok=True)
    (WEBAPP_DATA / "rgint_full").mkdir(parents=True, exist_ok=True)
    (WEBAPP_DATA / "html_reports").mkdir(parents=True, exist_ok=True)
