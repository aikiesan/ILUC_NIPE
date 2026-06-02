"""Export the static webapp/public/data artifacts FROM Postgres.

    raw files  ->  Postgres (ingest)  ->  static export (this script)  ->  SPA

Runs every Postgres-backed generator in order. The geometry artifacts
(rgint_meta.json, rgint_simplified.geojson) are produced separately by the
geopandas generators (generate_rgint_meta.py / generate_geojson.py) from the
IBGE shapefile — pass --geometry to include them (requires geopandas).
"""
from __future__ import annotations

import argparse
import importlib

# DB-backed generators, in dependency order (indicators feeds nothing else but
# is grouped with the national series it co-writes).
DB_GENERATORS = [
    "generate_pam_by_rgint",
    "generate_rgint_transitions",
    "generate_national_transitions",
    "generate_rgint_indicators",
]
GEOMETRY_GENERATORS = ["generate_rgint_meta", "generate_geojson"]


def run(module_names: list[str]) -> None:
    for name in module_names:
        print(f"== {name} ==")
        importlib.import_module(name).main()


def main() -> None:
    ap = argparse.ArgumentParser(description="Export static artifacts from Postgres.")
    ap.add_argument("--geometry", action="store_true",
                    help="Also rebuild geometry artifacts (needs geopandas).")
    args = ap.parse_args()
    run(DB_GENERATORS)
    if args.geometry:
        run(GEOMETRY_GENERATORS)
    print("export complete.")


if __name__ == "__main__":
    main()
