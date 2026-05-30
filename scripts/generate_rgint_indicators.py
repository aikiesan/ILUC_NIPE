"""Generate webapp/public/data/rgint_indicators.csv and national_timeseries.csv.

Indicators are derived from each region's 15-class area time series:
  * balanco_ha   = native veg (last year) − native veg (first year)
  * pressao_ha   = gross native-veg loss (sum of year-over-year decreases)
  * regeneracao_ha = gross native-veg gain (sum of year-over-year increases)
  * area_agro_2024 = PAM total planted area (latest year)
  * soja_2024_ha   = PAM soja planted area (latest year)
  * ranking_pressao = dense rank over pressao_ha (1 = highest pressure)
"""
from __future__ import annotations

import csv

from common import (
    AGRO_CLASSES,
    NATIVE_CLASSES,
    PAM_CSV,
    ensure_out,
    load_index,
    load_series,
)


def native_total_by_year(series: dict) -> dict[int, float]:
    years: set[int] = set()
    for cls in series.values():
        years.update(int(y) for y in cls)
    totals: dict[int, float] = {}
    for y in sorted(years):
        total = 0.0
        for cls in NATIVE_CLASSES:
            val = series.get(cls, {}).get(str(y))
            if val:
                total += float(val)
        totals[y] = total
    return totals


def pressure_metrics(series: dict) -> tuple[float, float, float]:
    totals = native_total_by_year(series)
    years = sorted(totals)
    if len(years) < 2:
        return 0.0, 0.0, 0.0
    balanco = totals[years[-1]] - totals[years[0]]
    pressao = regen = 0.0
    for a, b in zip(years, years[1:]):
        delta = totals[b] - totals[a]
        if delta < 0:
            pressao += -delta
        else:
            regen += delta
    return pressao, regen, balanco


def pam_latest_by_rgint() -> tuple[dict[str, float], dict[str, float]]:
    """Return (total_agro, soja) planted area for the latest PAM year per RGINT."""
    rows: dict[str, dict[int, dict[str, float]]] = {}
    with open(PAM_CSV, encoding="utf-8-sig") as fh:
        for r in csv.DictReader(fh):
            rid = r["CD_RGINT"].strip()
            year = int(r["ano"])
            area = float(r["area_ha"] or 0)
            rows.setdefault(rid, {}).setdefault(year, {})[r["cultura"]] = area
    agro: dict[str, float] = {}
    soja: dict[str, float] = {}
    for rid, by_year in rows.items():
        latest = max(by_year)
        cultures = by_year[latest]
        agro[rid] = round(sum(cultures.values()), 2)
        soja[rid] = round(cultures.get("soja", 0.0), 2)
    return agro, soja


def main() -> None:
    index = load_index()
    agro, soja = pam_latest_by_rgint()

    records = []
    national: dict[tuple[int, str, str], float] = {}

    for item in index:
        rid = item["rgint"]
        series = load_series(rid)
        if series is None:
            continue
        pressao, regen, balanco = pressure_metrics(series)
        records.append(
            {
                "rgint_id": rid,
                "nome": item["nome"],
                "uf": item["uf"],
                "bioma": item["biome"],
                "pressao_ha": round(pressao, 2),
                "regeneracao_ha": round(regen, 2),
                "balanco_ha": round(balanco, 2),
                "area_agro_2024": agro.get(rid, 0.0),
                "soja_2024_ha": soja.get(rid, 0.0),
            }
        )
        # accumulate national time series by class & biome
        for cls, by_year in series.items():
            for y, val in by_year.items():
                if val is None:
                    continue
                key = (int(y), cls, item["biome"])
                national[key] = national.get(key, 0.0) + float(val)

    records.sort(key=lambda r: r["pressao_ha"], reverse=True)
    for rank, rec in enumerate(records, start=1):
        rec["ranking_pressao"] = rank

    out_dir = ensure_out()
    fields = [
        "rgint_id", "nome", "uf", "bioma", "pressao_ha", "regeneracao_ha",
        "balanco_ha", "area_agro_2024", "ranking_pressao", "soja_2024_ha",
    ]
    with open(out_dir / "rgint_indicators.csv", "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=fields)
        w.writeheader()
        w.writerows(records)
    print(f"wrote rgint_indicators.csv ({len(records)} regions)")

    with open(out_dir / "national_timeseries.csv", "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["ano", "classe", "area_ha", "bioma"])
        for (year, cls, biome), area in sorted(national.items()):
            w.writerow([year, cls, round(area, 2), biome])
    print(f"wrote national_timeseries.csv ({len(national)} rows)")


if __name__ == "__main__":
    _ = AGRO_CLASSES  # referenced for documentation of agro classes
    main()
