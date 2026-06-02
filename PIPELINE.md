# Data Pipeline — raw → Postgres → static SPA

PostgreSQL is the **local/dev source of truth** for the full 133-region dataset.
The deployed GitHub Pages SPA is **100% static**: it reads the committed
`webapp/public/data/` artifacts and never connects to Postgres. Postgres is a
build/dev-time store that the export step reads from.

```
raw files  ──ingest──▶  PostgreSQL  ──export-static──▶  webapp/public/data  ──build──▶  /docs (Pages)
```

## One-command flow

```bash
cp infra/.env.example infra/.env      # adjust credentials if you like
make db-up                            # start postgres:16 (+ Adminer) in Docker
make ingest                           # raw files  -> Postgres   (applies db/schema.sql)
make export-static                    # Postgres   -> webapp/public/data
make build                            # type-check + bundle SPA into /docs
# optional:
make dev        # Vite dev server
make test       # pytest (pipeline) + vitest (lib)
make e2e        # Playwright against the built preview
```

`make pipeline` runs `ingest` then `export-static` in one go.

## Environment

`scripts/ingest.py`, `scripts/export_static.py` and the pytest integration
tests read connection settings from the environment (or `infra/.env`):

| Var | Default | Notes |
|---|---|---|
| `POSTGRES_HOST` | `localhost` | use `/tmp` (or a socket dir) for a non-Docker local server |
| `POSTGRES_PORT` | `5432` | |
| `POSTGRES_USER` | `iluc` | |
| `POSTGRES_PASSWORD` | _(none)_ | set your own in `infra/.env`; required by docker-compose |
| `POSTGRES_DB` | `iluc_nipe` | |

Never commit `infra/.env` or the Postgres data volume — both are git-ignored.

## Schema (`db/schema.sql`)

Core tables (drive the static export):
`regions`, `municipios`, `lulc_timeseries`, `transitions`, `pam`, `indicators`.
Staging tables (raw aux sources, ingested for completeness/future use):
`lapig_vigor`, `terraclass`, `conab_graos`.

## Sources ingested

| Table | Source (committed in the repo) |
|---|---|
| `regions` | `webapp/data/rgint_index.json` + `webapp/public/data/rgint_meta.json` |
| `municipios` | `ILUC_NIPE/02_Spatial_Lookups/…xlsx` |
| `lulc_timeseries` | `webapp/data/rgint/{id}.json` (15-class diagonal) |
| `transitions` | `webapp/data/rgint_matrix/{id}.json` (full 15×15) |
| `pam` | `ILUC_NIPE/05_Agro_Subdivisions/PAM_RGINT_COMPLETO.csv` |
| `lapig_vigor` | `ILUC_NIPE/03_Pasture_Vigor_LAPIG/*.csv` |
| `terraclass` | `ILUC_NIPE/04_Vegetation_TerraClass/TC_*.csv` |
| `conab_graos` | `ILUC_NIPE/05_Agro_Subdivisions/CONAB_GRAOS_*.csv` |

## Adding the full 133-region transition matrices

Only **3 regions** (5101/5102/5103) currently have committed 15×15 matrix JSONs,
so the national/region Sankey and the matrix heatmap are populated only for
those. The full matrices (`01_Base_Matrices_RGINT/`, `07_MATRIZES_15_CLASSES_FINAL/`)
are git-ignored (too large) and live on the data maintainer's machine.

To light up **all 133** regions — no code changes needed:

1. Generate the per-region matrix JSONs into `webapp/data/rgint_matrix/{id}.json`
   (same shape as the existing 5101 file). For the ABIOVE 15-class workbooks
   (`07_MATRIZES_15_CLASSES_FINAL/ALL_RGINTS/*.xlsx`, one sheet per year pair),
   use the converter:

   ```bash
   # default src = the local ABIOVE_SOJA_2026 path; override with arg or
   # ILUC_MATRIX_SRC_DIR. Needs openpyxl (Python 3.11 locally).
   python scripts/convert_iluc_matrices.py [SRC_DIR]
   ```

   It reads the real annual transitions (key = end year of each pair; `2008` =
   base-year stock diagonal), prefers the `GOLDEN_*` workbook for 1201/5101, and
   maps classes to `common.CLASS_ORDER`.
2. `make pipeline` (re-ingest + re-export) then `make build`.

`transitions`, `rgint_transitions/*.csv`, `national_transitions.csv`, the Sankey
and the heatmap all scale automatically from whatever matrices are present.
`national_transitions.csv` sums each GTAP period's **annual** flows
(2009–2017 → `2008_2017`, 2018–2024 → `2017_2024`).

> **Status (provisional, awaiting HARVEX):** the final golden matrices are
> blocked on Joel-HARVEX delivering precise **2008 / 2017 / 2024** anchor data
> (+ milho 2013), same xlsx format. The current ALL_RGINTS workbooks are interim
> — large Amazon RGINTs (Manaus, Tefé, Lábrea) are stubs, so a direct
> native→anthropic sum gives ~20.3 Mha vs the D3 reference 38.4 Mha (~60%
> coverage). Until the anchors land, keep the D3 figures attributed (do not flip
> the parity test or switch the Overview KPIs to data-driven). When they arrive,
> drop the new workbooks in and re-run `convert_iluc_matrices.py`.

## Geometry artifacts

`rgint_meta.json` and `rgint_simplified.geojson` are produced from the IBGE
shapefile by the geopandas generators and are independent of Postgres:

```bash
pip install geopandas
python scripts/export_static.py --geometry   # also rebuilds meta + geojson
```
