-- ILUC_NIPE — PostgreSQL schema (local/dev source of truth).
--
-- Postgres is a BUILD/DEV-time data store: raw files are ingested here, then
-- scripts/export_static.py reads FROM these tables and writes the static
-- webapp/public/data artifacts that ship to GitHub Pages. The deployed SPA
-- never talks to Postgres.
--
-- Idempotent: safe to run repeatedly (drops + recreates the tables it owns).
-- LULC classes are stored as their canonical 15-class labels
-- (e.g. '2 - Soja') so exported artifacts match byte-for-byte.

BEGIN;

DROP TABLE IF EXISTS indicators       CASCADE;
DROP TABLE IF EXISTS transitions      CASCADE;
DROP TABLE IF EXISTS lulc_timeseries  CASCADE;
DROP TABLE IF EXISTS pam              CASCADE;
DROP TABLE IF EXISTS municipios       CASCADE;
DROP TABLE IF EXISTS conab_graos      CASCADE;
DROP TABLE IF EXISTS terraclass       CASCADE;
DROP TABLE IF EXISTS lapig_vigor      CASCADE;
DROP TABLE IF EXISTS regions          CASCADE;

-- ---------------------------------------------------------------------------
-- Core tables (drive the static export)
-- ---------------------------------------------------------------------------

-- One row per Região Geográfica Intermediária (133 total).
CREATE TABLE regions (
    rgint_id      INTEGER PRIMARY KEY,
    nome          TEXT    NOT NULL,
    uf            TEXT    NOT NULL,
    bioma         TEXT    NOT NULL,
    area_ha       NUMERIC,
    n_municipios  INTEGER,
    centroid_lon  NUMERIC,
    centroid_lat  NUMERIC,
    is_golden     BOOLEAN NOT NULL DEFAULT FALSE
);

-- IBGE 2017 municipality -> RGINT composition (spatial lookup).
CREATE TABLE municipios (
    cd_mun     BIGINT PRIMARY KEY,
    nome_mun   TEXT,
    uf         TEXT,
    rgint_id   INTEGER REFERENCES regions(rgint_id)
);
CREATE INDEX idx_municipios_rgint ON municipios(rgint_id);

-- 15-class LULC area time series (the matrix diagonal: stable area per class).
CREATE TABLE lulc_timeseries (
    rgint_id  INTEGER NOT NULL REFERENCES regions(rgint_id),
    ano       INTEGER NOT NULL,
    classe    TEXT    NOT NULL,
    area_ha   NUMERIC,
    PRIMARY KEY (rgint_id, ano, classe)
);
CREATE INDEX idx_ts_rgint ON lulc_timeseries(rgint_id);

-- Full origin->destination transition flows per anchor/period.
-- Populated for every region whose 15x15 matrix JSON is available
-- (3 regions today; all 133 once the matrix xlsx are ingested — no code change).
CREATE TABLE transitions (
    rgint_id   INTEGER NOT NULL REFERENCES regions(rgint_id),
    ano_par    TEXT    NOT NULL,   -- anchor year ('2017','2024') or period ('2008_2017')
    origem_id  TEXT    NOT NULL,
    destino_id TEXT    NOT NULL,
    area_ha    NUMERIC,
    PRIMARY KEY (rgint_id, ano_par, origem_id, destino_id)
);
CREATE INDEX idx_trans_rgint ON transitions(rgint_id);

-- PAM (IBGE SIDRA 5457) planted area per region/year/culture (all 133).
CREATE TABLE pam (
    rgint_id  INTEGER NOT NULL REFERENCES regions(rgint_id),
    ano       INTEGER NOT NULL,
    cultura   TEXT    NOT NULL,
    area_ha   NUMERIC,
    PRIMARY KEY (rgint_id, ano, cultura)
);
CREATE INDEX idx_pam_rgint ON pam(rgint_id);

-- Derived per-region indicators (pressure / regeneration / balance / ranking).
CREATE TABLE indicators (
    rgint_id        INTEGER PRIMARY KEY REFERENCES regions(rgint_id),
    pressao_ha      NUMERIC,
    regeneracao_ha  NUMERIC,
    balanco_ha      NUMERIC,
    area_agro_2024  NUMERIC,
    soja_2024_ha    NUMERIC,
    ranking_pressao INTEGER
);

-- ---------------------------------------------------------------------------
-- Staging tables (raw auxiliary sources; ingested for completeness/future use)
-- ---------------------------------------------------------------------------

-- LAPIG/UFG pasture vigor per municipality/year.
CREATE TABLE lapig_vigor (
    cd_mun       BIGINT,
    ano          INTEGER,
    bioma        TEXT,
    classe_vigor TEXT,
    area_past_ha NUMERIC
);
CREATE INDEX idx_lapig_mun ON lapig_vigor(cd_mun);

-- INPE TerraClass vegetation areas (long format, harmonized).
CREATE TABLE terraclass (
    cd_mun     BIGINT,
    ano        INTEGER,
    fonte      TEXT,        -- 'AMZ' | 'CER'
    categoria  TEXT,
    area_ha    NUMERIC
);
CREATE INDEX idx_tc_mun ON terraclass(cd_mun);

-- CONAB grain/cane series per UF/year/culture (used upstream for soy/maize split).
CREATE TABLE conab_graos (
    uf       TEXT,
    ano      INTEGER,
    cultura  TEXT,
    conab_ha NUMERIC
);

COMMIT;
