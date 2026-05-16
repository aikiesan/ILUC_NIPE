from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pathlib import Path
import json

app = FastAPI(title="ABIOVE LULC Webapp")

BASE = Path(__file__).parent.parent
DATA = BASE / "data"

app.mount("/static", StaticFiles(directory=BASE / "frontend" / "static"), name="static")

@app.get("/")
def index():
    return FileResponse(BASE / "frontend" / "templates" / "index.html")

@app.get("/api/index")
def get_index():
    with open(DATA / "rgint_index.json", encoding="utf-8") as f:
        return JSONResponse(json.load(f))

@app.get("/api/rgint/{rgint_id}")
def get_rgint(rgint_id: str):
    path = DATA / "rgint" / f"{rgint_id}.json"
    if not path.exists():
        return JSONResponse({"error": "RGINT not found"}, status_code=404)
    with open(path, encoding="utf-8") as f:
        return JSONResponse(json.load(f))

@app.get("/api/geojson")
def get_geojson():
    return FileResponse(DATA / "rgint_brasil.geojson", media_type="application/json")
