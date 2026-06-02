"""
Shared pytest fixtures and path setup for the ILUC_NIPE test suite.

Path strategy:
  - data_pipeline/ modules are imported via importlib (filenames start with digits).
  - Fixture JSON files live in tests/fixtures/.
"""

import importlib.util
import json
import sys
from pathlib import Path

import pytest

# ── Path constants ────────────────────────────────────────────────────────────

ROOT          = Path(__file__).parent.parent
DATA_PIPELINE = ROOT / "data_pipeline"
SCRIPTS       = ROOT / "scripts"
FIXTURES      = Path(__file__).parent / "fixtures"

# Make data_pipeline importable for named modules (sources/, pipeline/)
if str(DATA_PIPELINE) not in sys.path:
    sys.path.insert(0, str(DATA_PIPELINE))
# Make the Postgres ingest/export scripts importable.
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))


# ── Postgres fixture (skips cleanly when no test DB is reachable) ─────────────

@pytest.fixture(scope="session")
def pg_conn():
    """A psycopg2 connection to a fresh test schema, or skip if unreachable.

    Connection settings come from POSTGRES_* env vars (see infra/.env.example).
    The schema is (re)applied once per session so tests start from a clean DB.
    """
    import db as db_mod

    try:
        conn = __import__("psycopg2").connect(**db_mod.dsn())
    except Exception as exc:  # pragma: no cover - depends on environment
        pytest.skip(f"Postgres not available: {exc}")
    conn.autocommit = True
    with conn.cursor() as cur:
        cur.execute((ROOT / "db" / "schema.sql").read_text(encoding="utf-8"))
    yield conn
    conn.close()


# ── Importlib helper for digit-prefixed scripts ───────────────────────────────

def load_pipeline_script(stem: str):
    """Import a data_pipeline script whose filename starts with a digit."""
    path = DATA_PIPELINE / f"{stem}.py"
    spec = importlib.util.spec_from_file_location(stem.replace("-", "_"), path)
    mod  = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


# ── Session-scoped module fixtures ───────────────────────────────────────────

@pytest.fixture(scope="session")
def outlier_mod():
    """Importable handle for 04_outlier_detection.py functions."""
    return load_pipeline_script("04_outlier_detection")


# ── Data fixtures ─────────────────────────────────────────────────────────────

@pytest.fixture
def rgint_simple():
    with open(FIXTURES / "rgint_5101_simple.json", encoding="utf-8") as f:
        return json.load(f)


@pytest.fixture
def rgint_full():
    with open(FIXTURES / "rgint_5101_full.json", encoding="utf-8") as f:
        return json.load(f)


@pytest.fixture
def iluc_matrix_csv_path():
    return FIXTURES / "iluc_matrix_fixture.csv"


@pytest.fixture
def geojson_fixture():
    with open(FIXTURES / "geojson_fixture.json", encoding="utf-8") as f:
        return json.load(f)
