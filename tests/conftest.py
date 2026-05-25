"""
Shared pytest fixtures and path setup for the ILUC_NIPE test suite.

Path strategy:
  - data_pipeline/ modules are imported via importlib (filenames start with digits).
  - webapp/backend/main.py is imported by adding its parent to sys.path.
  - Fixture JSON files live in tests/fixtures/.
"""

import importlib.util
import json
import sys
import threading
from pathlib import Path

import pytest

# ── Path constants ────────────────────────────────────────────────────────────

ROOT          = Path(__file__).parent.parent
DATA_PIPELINE = ROOT / "data_pipeline"
WEBAPP_DIR    = ROOT / "webapp"
FIXTURES      = Path(__file__).parent / "fixtures"

# Make webapp/backend importable as a package root
if str(WEBAPP_DIR / "backend") not in sys.path:
    sys.path.insert(0, str(WEBAPP_DIR / "backend"))

# Make data_pipeline importable for named modules (sources/, pipeline/)
if str(DATA_PIPELINE) not in sys.path:
    sys.path.insert(0, str(DATA_PIPELINE))


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


# ── FastAPI app fixture ───────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def fastapi_app():
    """Import and return the FastAPI app instance (uses real webapp/data/)."""
    import main as backend_main
    return backend_main.app


# ── Live server fixture for Playwright (session-scoped) ───────────────────────

@pytest.fixture(scope="session")
def live_server_url(fastapi_app):
    """Start uvicorn in a background thread; yield base URL; shut down after session."""
    import uvicorn

    config = uvicorn.Config(fastapi_app, host="127.0.0.1", port=8765, log_level="error")
    server = uvicorn.Server(config)

    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()

    # Wait until server is ready
    import time
    import urllib.request
    for _ in range(30):
        try:
            urllib.request.urlopen("http://127.0.0.1:8765/api/index", timeout=1)
            break
        except Exception:
            time.sleep(0.2)

    yield "http://127.0.0.1:8765"

    server.should_exit = True
    thread.join(timeout=5)
