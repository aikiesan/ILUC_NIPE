# ILUC_NIPE — one-command data pipeline + webapp workflow.
#
#   raw files  ->  Postgres (ingest)  ->  static export  ->  SPA
#
# Postgres is the local/dev source of truth (Docker). The deployed GitHub Pages
# SPA is 100% static and never connects to it.
#
# Typical first run:
#   make db-up ingest export-static build
#
# DB targets need Docker (infra/docker-compose.yml). ingest/export-static/test
# read connection settings from infra/.env (copy infra/.env.example first).

COMPOSE := docker compose -f infra/docker-compose.yml --env-file infra/.env
PY      := python3
SCRIPTS := scripts

.PHONY: help db-up db-down db-reset ingest export-static dev build test e2e pipeline fichas

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	  awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

db-up: ## Start Postgres (+ Adminer) and wait until healthy
	$(COMPOSE) up -d
	@echo "Postgres up. Adminer: http://localhost:$${ADMINER_PORT:-8080}"

db-down: ## Stop the Postgres stack (keeps the data volume)
	$(COMPOSE) down

db-reset: ## Drop the data volume and recreate an empty schema
	$(COMPOSE) down -v
	$(COMPOSE) up -d

ingest: ## Load raw datasets into Postgres (raw -> DB)
	cd $(SCRIPTS) && $(PY) ingest.py --schema

export-static: ## Export static webapp/public/data artifacts (DB -> SPA)
	cd $(SCRIPTS) && $(PY) export_static.py

pipeline: ingest export-static ## Full data refresh: ingest then export

fichas: ## Rebuild multi-source JSONs + per-region HTML fichas (-> webapp/public/fichas)
	cd data_pipeline && $(PY) 01_load_sources.py && $(PY) 02_build_multisource_json.py && $(PY) 03_generate_reports.py

dev: ## Run the Vite dev server
	cd webapp && npm run dev

build: ## Type-check + build the SPA to /docs (GitHub Pages)
	cd webapp && npm run build

test: ## Python pipeline tests (pytest) + JS unit tests (vitest)
	pytest -q
	cd webapp && npm run test

e2e: ## Playwright end-to-end tests against the built preview
	cd webapp && npm run test:e2e
