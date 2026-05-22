from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, HTMLResponse
from pathlib import Path
import json
import os
import re

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
