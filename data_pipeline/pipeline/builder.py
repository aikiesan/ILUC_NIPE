"""Pipeline builder — replaces elif chain with registry-driven dispatch (OCP)."""

import json
import math
from pathlib import Path

from utils import YEARS, _nan_to_none, load_existing_diagonal


def build_source_entry(values: list, years: list, quality: str, notes: str) -> dict:
    clean = _nan_to_none(values)
    return {
        "values": [round(v, 4) if v is not None else None for v in clean],
        "years":  years,
        "quality": quality,
        "notes":  notes,
    }


def build_class_sources(rgint_id: str, class_name: str, registry, rules=None) -> dict:
    """Return {source_key: source_entry} for one class and one RGINT."""
    sources = {}
    for adapter in registry.adapters_for(class_name):
        values = adapter.get_series(rgint_id, class_name)
        sources[adapter.source_key] = build_source_entry(
            values, YEARS,
            adapter.get_quality(class_name),
            adapter.get_notes(class_name),
        )
    return sources


def build_all_rgint_jsons(rgint_index: list, registry, out_dir) -> int:
    """Generate rgint_full/*.json for all RGINTs. Returns count written."""
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    written = 0
    for meta in rgint_index:
        rgint_id = meta["rgint"]
        diagonal = load_existing_diagonal(rgint_id)
        if not diagonal:
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
                "uf":      meta["uf"],
                "biome":   meta["biome"],
                "area_ha": round(total_area, 1),
            },
            "classes": {},
        }

        for cls_name in diagonal:
            result["classes"][cls_name] = build_class_sources(rgint_id, cls_name, registry)

        out_path = out_dir / f"{rgint_id}.json"
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, separators=(",", ":"))
        written += 1

    return written
