"""
03_generate_reports.py
Generates one standalone HTML report per RGINT using Jinja2 + Plotly.

Output: webapp/data/html_reports/{rgint_id}.html  (133 files)
"""

import json
from pathlib import Path
from jinja2 import Environment, FileSystemLoader
from utils import WEBAPP_DATA, ensure_processed_dir

ensure_processed_dir()

FULL_DIR    = WEBAPP_DATA / "rgint_full"
REPORTS_DIR = WEBAPP_DATA / "html_reports"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

BIOME_COLORS = {
    "Amazônia":       "#2d6a4f",
    "Cerrado":        "#d4a017",
    "Mata Atlântica": "#40916c",
    "Caatinga":       "#e76f51",
    "Pampa":          "#a8dadc",
}

CLASS_COLORS = {
    "1 - Culturas perenes":          "#f4a261",
    "2 - Soja":                      "#e9c46a",
    "3 - Soja + Milho 2ª safra":     "#f3722c",
    "4 - Milho 1ª safra":            "#90be6d",
    "5 - Cana-de-açúcar":            "#43aa8b",
    "6 - Outra agropecuária":        "#577590",
    "7 - Pastagem deg. média":       "#c77dff",
    "8 - Pastagem deg. alta":        "#9d4edd",
    "9 - Pastagem deg. baixa":       "#e0aaff",
    "10 - Silvicultura":             "#606c38",
    "11 - Veg. prim. florestal":     "#1b4332",
    "12 - Veg. sec. florestal":      "#52b788",
    "13 - Veg. prim. não-florestal": "#b7e4c7",
    "14 - Veg. sec. não-florestal":  "#74c69d",
    "15 - Outro":                    "#adb5bd",
}

env = Environment(
    loader=FileSystemLoader(Path(__file__).parent / "templates"),
    autoescape=False,
)
template = env.get_template("report.html")

json_files = sorted(FULL_DIR.glob("*.json"))
print(f"Generating {len(json_files)} HTML reports...")

for jf in json_files:
    with open(jf, encoding="utf-8") as f:
        data = json.load(f)

    html = template.render(
        metadata=data["metadata"],
        classes=data["classes"],
        biome_color=BIOME_COLORS.get(data["metadata"].get("biome", ""), "#888"),
        class_colors=CLASS_COLORS,
    )

    out = REPORTS_DIR / f"{data['metadata']['rgint']}.html"
    out.write_text(html, encoding="utf-8")

print(f"  Done. {len(json_files)} reports -> webapp/data/html_reports/")
