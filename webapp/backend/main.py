from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, HTMLResponse
from pathlib import Path
import json
import os
import re
import sys

_PIPELINE_DIR = Path(__file__).parent.parent.parent / "data_pipeline"
if str(_PIPELINE_DIR) not in sys.path:
    sys.path.insert(0, str(_PIPELINE_DIR))
from pipeline.validator import MatrixValidator

def _load_json(path: Path):
    text = path.read_text(encoding="utf-8")
    text = re.sub(r'\bNaN\b', 'null', text)
    return json.loads(text)

ROOT_PATH = os.environ.get("ROOT_PATH", "")

app = FastAPI(title="ABIOVE LULC Webapp")

BASE = Path(__file__).parent.parent
DATA = BASE / "data"

app.mount("/static", StaticFiles(directory=BASE / "frontend" / "static"), name="static")

@app.get("/")
def index():
    html = (BASE / "frontend" / "templates" / "index.html").read_text(encoding="utf-8")
    if ROOT_PATH:
        html = html.replace('href="/static/', f'href="{ROOT_PATH}/static/')
        html = html.replace('src="/static/', f'src="{ROOT_PATH}/static/')
    inject = f'<script>window.API_BASE="{ROOT_PATH}";</script>'
    html = html.replace('</head>', inject + '\n</head>', 1)
    return HTMLResponse(html)

@app.get("/api/index")
def get_index():
    with open(DATA / "rgint_index.json", encoding="utf-8") as f:
        return JSONResponse(json.load(f))

@app.get("/api/rgint/{rgint_id}")
def get_rgint(rgint_id: str):
    path = DATA / "rgint" / f"{rgint_id}.json"
    if not path.exists():
        return JSONResponse({"error": "RGINT not found"}, status_code=404)
    return JSONResponse(_load_json(path))

@app.get("/api/rgint_full/{rgint_id}")
def get_rgint_full(rgint_id: str):
    path = DATA / "rgint_full" / f"{rgint_id}.json"
    if not path.exists():
        return JSONResponse({"error": "Full data not generated yet — run pipeline 02_build_multisource_json.py"}, status_code=404)
    return JSONResponse(_load_json(path))

@app.get("/api/geojson")
def get_geojson():
    return FileResponse(DATA / "rgint_brasil.geojson", media_type="application/json")

@app.get("/report/{rgint_id}")
def get_report(rgint_id: str):
    path = DATA / "html_reports" / f"{rgint_id}.html"
    if not path.exists():
        return HTMLResponse(
            f"<h2>Relatório {rgint_id} não gerado.</h2><p>Execute <code>python 03_generate_reports.py</code> no diretório data_pipeline/.</p>",
            status_code=404,
        )
    return HTMLResponse(path.read_text(encoding="utf-8"))

@app.get("/api/pipeline_status")
def pipeline_status():
    full_dir     = DATA / "rgint_full"
    reports_dir  = DATA / "html_reports"
    return JSONResponse({
        "rgint_full_count":     len(list(full_dir.glob("*.json")))    if full_dir.exists()    else 0,
        "html_reports_count":   len(list(reports_dir.glob("*.html"))) if reports_dir.exists() else 0,
    })


@app.get("/api/rgint_matrix/{rgint_id}/diagnostics")
def get_rgint_matrix_diagnostics(rgint_id: str):
    matrix_dir = DATA / "rgint_matrix"
    index_path = DATA / "rgint_index.json"
    rgint_index = json.loads(index_path.read_text(encoding="utf-8")) if index_path.exists() else []

    validator = MatrixValidator()
    coverage = validator.validate_coverage(matrix_dir, rgint_index)

    path = matrix_dir / f"{rgint_id}.json"
    if not path.exists():
        return JSONResponse({
            "rgint_id": rgint_id,
            "has_matrix": False,
            "is_synthetic": None,
            "anchor_years": None,
            "years": None,
            "classes": None,
            "matrix_years_count": 0,
            "has_negatives": None,
            "has_nulls": None,
            "mass_balance_errors": [],
            "error_count": 0,
            "coverage_pct": coverage.coverage_pct,
        })

    matrix_data = _load_json(path)
    diag_path = DATA / "rgint" / f"{rgint_id}.json"
    diagonal = _load_json(diag_path) if diag_path.exists() else None

    result = validator.validate_mass_balance(matrix_data, diagonal=diagonal)
    return JSONResponse({
        "rgint_id": rgint_id,
        "has_matrix": True,
        "is_synthetic": matrix_data.get("_synthetic", False),
        "anchor_years": matrix_data.get("anchor_years"),
        "years": matrix_data.get("years"),
        "classes": matrix_data.get("classes"),
        "matrix_years_count": len(matrix_data.get("matrices", {})),
        "has_negatives": result.has_negatives,
        "has_nulls": result.has_nulls,
        "mass_balance_errors": [
            {
                "year": e.year,
                "from_class": e.from_class,
                "row_sum": e.row_sum,
                "reference_area": e.reference_area,
                "error_pct": e.error_pct,
            }
            for e in result.mass_balance_errors
        ],
        "error_count": result.error_count,
        "coverage_pct": coverage.coverage_pct,
    })


@app.get("/api/rgint_matrix/{rgint_id}")
def get_rgint_matrix(rgint_id: str):
    path = DATA / "rgint_matrix" / f"{rgint_id}.json"
    if not path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Matrix not generated for {rgint_id} — run pipeline 06_interpolate_matrices.py",
        )
    return JSONResponse(_load_json(path))


@app.get("/api/rgint_transition/{rgint_id}/{year_from}/{year_to}")
def get_rgint_transition(rgint_id: str, year_from: int, year_to: int):
    if year_from >= year_to:
        raise HTTPException(status_code=400, detail="year_from must be less than year_to")
    path = DATA / "rgint_matrix" / f"{rgint_id}.json"
    if not path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Matrix not generated for {rgint_id} — run pipeline 06_interpolate_matrices.py",
        )
    data = _load_json(path)
    matrices = data.get("matrices", {})
    matrix = matrices.get(str(year_to))
    if matrix is None:
        raise HTTPException(status_code=404, detail=f"Year {year_to} not found in matrix data")
    return JSONResponse(matrix)
