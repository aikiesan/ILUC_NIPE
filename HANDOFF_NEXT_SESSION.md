# Handoff — Next Session (Local Desktop + VM via SSH)

> Pick-up prompt for continuing ILUC_NIPE tomorrow on the **local desktop**
> (all raw data sources present locally), connecting to the **VM over SSH** to
> verify the deployment, and bringing up the **Docker Desktop** Postgres
> container. Paste the "Prompt to start tomorrow" section into a fresh Claude
> Code session, or just follow the checklist.

## Where we left off (state as of this session)

- **PR #11** — `claude/iluc-nipe-postgres-pipeline-cJSHT` → `master`, **open**.
  Adds the local Postgres pipeline (`raw → Postgres → static export → SPA`),
  a shared color system, and a full pytest + vitest + Playwright suite with CI.
- CI: `test`, `build-test`, `e2e` green. **GitGuardian** was resolved by
  removing the hardcoded DB password entirely (it had flagged the throwaway
  local/CI Postgres password). There is now **no password literal** anywhere:
  local dev sets its own in `infra/.env` (compose requires it via
  `${POSTGRES_PASSWORD:?…}`), and CI uses Postgres `trust` auth. The whole branch
  was squashed into one clean commit so no commit in the PR carries a flagged
  value. No real secrets were ever present.
- **Data gap:** only 3 regions (5101/5102/5103) have committed 15×15 transition
  matrices, so the Sankey + heatmap are populated for those 3. The full 133
  matrices are git-ignored and live on the **local desktop** — tomorrow's main
  task is to drop them in and light up all 133.

## Tomorrow's objectives

1. Bring up the Docker Desktop Postgres container and load **all** local raw data.
2. Drop the full per-region transition matrices in → light up **all 133 regions**.
3. Run the full pipeline + build + tests; confirm the SPA renders all 133.
4. SSH to the VM, pull the branch, and verify the project runs fine there.
5. With CI green and the 133-region data committed, merge PR #11.

---

## Checklist

### 0. Prerequisites (local desktop)
- Docker Desktop running.
- `python3` with the ingest deps (psycopg2, openpyxl, pandas as used by
  `scripts/ingest.py`); Node 20+ for the webapp.
- All raw data folders present at repo root under `ILUC_NIPE/`:
  - `02_Spatial_Lookups/…xlsx` (municipios)
  - `03_Pasture_Vigor_LAPIG/*.csv`
  - `04_Vegetation_TerraClass/TC_*.csv`
  - `05_Agro_Subdivisions/PAM_RGINT_COMPLETO.csv`, `CONAB_GRAOS_*_2008_2024.csv`
  - the full transition matrices in `01_Base_Matrices_RGINT/` /
    `07_MATRIZES_15_CLASSES_FINAL/` (used to generate the per-region JSONs).

### 1. Get the branch
```bash
git fetch origin claude/iluc-nipe-postgres-pipeline-cJSHT
git checkout claude/iluc-nipe-postgres-pipeline-cJSHT
git pull --ff-only
```

### 2. Bring up Docker Desktop Postgres
```bash
cp infra/.env.example infra/.env     # then set POSTGRES_PASSWORD to any local value
make db-up                           # postgres:16 + Adminer (http://localhost:8080)
```
Verify health: `docker ps` shows `iluc_postgres` healthy; Adminer connects with
the `infra/.env` creds.

### 3. Add the full 133-region matrices, then run the pipeline
Generate one JSON per region into `webapp/data/rgint_matrix/{id}.json` (same shape
as the existing `5101.json`), then:
```bash
make pipeline      # ingest (raw -> Postgres) + export-static (Postgres -> webapp/public/data)
make build         # type-check + bundle SPA into /docs
make test          # pytest (pipeline) + vitest (lib)
make e2e           # Playwright against the built preview
```
Expected ingest scale was 133 regions / 31,920 timeseries / 5,570 municipios
with only 3 matrices; transitions count should jump once all matrices are present.
`transitions`, `rgint_transitions/*.csv`, `national_transitions.csv`, the Sankey
and heatmap all scale automatically — **no code changes needed** (see PIPELINE.md
"Adding the full 133-region transition matrices").

Sanity check the export touched all 133:
```bash
ls webapp/public/data/rgint_transitions | wc -l      # should reflect all regions w/ matrices
make dev                                             # eyeball Sankey/heatmap across regions
```

### 4. Verify on the VM (over SSH)
```bash
ssh <user>@<vm-host>
cd <repo-path-on-vm>
git fetch origin claude/iluc-nipe-postgres-pipeline-cJSHT && git checkout claude/iluc-nipe-postgres-pipeline-cJSHT && git pull --ff-only
# If the VM also serves/builds: replicate infra/.env, then:
make db-up ingest export-static build
# Confirm the served SPA loads /data and renders without console errors.
```
> Note: the deployed **GitHub Pages SPA is 100% static** — it reads committed
> `webapp/public/data/` and never connects to Postgres. The VM Postgres is only
> needed if the VM is used as a build/refresh host.

### 5. Merge PR #11
- GitGuardian is already resolved (no password literal anywhere; CI uses `trust`
  auth; branch history squashed clean). Just confirm all checks are green.
- Once the 133-region data is committed and CI is green, **merge PR #11 into
  `master`**.

### 6. Commit the new data
The per-region matrix JSONs and regenerated `webapp/public/data/` artifacts must
be **committed** (the static SPA ships them). Push to the branch before merging.
Confirm `infra/.env` and the Postgres volume stay git-ignored.

---

## Prompt to start tomorrow (paste into a fresh session)

> I'm continuing ILUC_NIPE on my **local desktop**, which has all the raw data
> sources, and I'll SSH into the VM to verify the deployment. Read
> `HANDOFF_NEXT_SESSION.md` and `PIPELINE.md`. Today's goals:
> 1. Check out branch `claude/iluc-nipe-postgres-pipeline-cJSHT` and bring up the
>    Docker Desktop Postgres container (`cp infra/.env.example infra/.env && make db-up`).
> 2. I'll place the full per-region 15×15 transition matrices in
>    `webapp/data/rgint_matrix/{id}.json` — then run `make pipeline && make build`
>    and confirm **all 133 regions** light up in the Sankey + heatmap.
> 3. Run `make test` and `make e2e`; fix anything that breaks.
> 4. SSH into my VM (I'll give you the host), pull the branch, and verify the
>    project runs fine there.
> 5. Once CI is green and the 133-region data is committed, merge **PR #11** into
>    `master`.
> Start by checking the current PR #11 / CI status and confirming the local
> Postgres container and data folders are in place.

## Key references
- `PIPELINE.md` — full raw→Postgres→SPA flow, env vars, source-table mapping.
- `Makefile` — `db-up`, `ingest`, `export-static`, `pipeline`, `build`, `test`, `e2e`.
- `scripts/ingest.py` — expects raw folders under `ILUC_NIPE/…`; matrices under
  `webapp/data/rgint_matrix/`.
- `infra/docker-compose.yml` / `infra/.env.example` — Postgres + Adminer.
