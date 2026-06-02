"""Generate webapp/public/data/rgint_indicators.csv and national_timeseries.csv
FROM Postgres (tables ``regions``, ``lulc_timeseries``, ``pam``).

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
from collections import defaultdict

from common import NATIVE_CLASSES, ensure_out
from db import connect


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


def load_from_db():
    """Return (regions, series_by_rgint, pam_by_rgint) from Postgres."""
    with connect() as conn:
        cur = conn.cursor()
        cur.execute("SELECT rgint_id, nome, uf, bioma FROM regions ORDER BY rgint_id")
        regions = [
            {"rgint": str(r[0]), "nome": r[1], "uf": r[2], "biome": r[3]}
            for r in cur.fetchall()
        ]
        # series: rgint -> {classe -> {year(str) -> area}}
        series: dict[str, dict[str, dict[str, float]]] = defaultdict(
            lambda: defaultdict(dict))
        cur.execute("SELECT rgint_id, ano, classe, area_ha FROM lulc_timeseries")
        for rid, ano, classe, area in cur.fetchall():
            series[str(rid)][classe][str(ano)] = None if area is None else float(area)
        # pam: rgint -> {year -> {cultura -> area}}
        pam: dict[str, dict[int, dict[str, float]]] = defaultdict(
            lambda: defaultdict(dict))
        cur.execute("SELECT rgint_id, ano, cultura, area_ha FROM pam")
        for rid, ano, cultura, area in cur.fetchall():
            pam[str(rid)][int(ano)][cultura] = float(area or 0)
    return regions, series, pam


def pam_latest(pam: dict) -> tuple[dict[str, float], dict[str, float]]:
    agro: dict[str, float] = {}
    soja: dict[str, float] = {}
    for rid, by_year in pam.items():
        latest = max(by_year)
        cultures = by_year[latest]
        agro[rid] = round(sum(cultures.values()), 2)
        soja[rid] = round(cultures.get("soja", 0.0), 2)
    return agro, soja


def main() -> None:
    regions, series_all, pam = load_from_db()
    agro, soja = pam_latest(pam)

    records = []
    national: dict[tuple[int, str, str], float] = {}

    for item in regions:
        rid = item["rgint"]
        series = series_all.get(rid)
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
    main()
