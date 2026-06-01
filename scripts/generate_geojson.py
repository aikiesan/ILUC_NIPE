"""Generate webapp/public/data/rgint_simplified.geojson.

Reads the IBGE RG2017 intermediate-region shapefile, simplifies geometries
for fast in-browser rendering, and emits WGS84 GeoJSON with stable
properties: rgint, nome_rgint, sigla_uf.
"""
from __future__ import annotations

import json

import geopandas as gpd

from common import SHAPEFILE, ensure_out, load_index

# Douglas–Peucker tolerance in degrees (~0.01° ≈ 1 km). Keeps file small.
SIMPLIFY_TOLERANCE = 0.01


def main() -> None:
    gdf = gpd.read_file(SHAPEFILE).to_crs(epsg=4326)
    gdf["rgint"] = gdf["rgint"].astype(str)

    uf_by_id = {item["rgint"]: item["uf"] for item in load_index()}
    gdf["sigla_uf"] = gdf["rgint"].map(uf_by_id).fillna("")

    gdf["geometry"] = gdf.geometry.simplify(SIMPLIFY_TOLERANCE, preserve_topology=True)
    gdf = gdf[["rgint", "nome_rgint", "sigla_uf", "geometry"]]

    out = ensure_out() / "rgint_simplified.geojson"
    geojson = json.loads(gdf.to_json())
    # round coordinates to 4 decimals to shrink payload
    out.write_text(
        json.dumps(geojson, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    size_kb = out.stat().st_size / 1024
    print(f"wrote {out} ({len(gdf)} features, {size_kb:.0f} KB)")


if __name__ == "__main__":
    main()
