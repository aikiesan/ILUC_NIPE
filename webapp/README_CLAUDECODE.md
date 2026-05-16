# ABIOVE LULC Webapp — Claude Code Handoff

## Stack
- FastAPI backend (Python 3.11)
- Leaflet.js + Plotly.js frontend (no framework, pure HTML/JS)
- Pre-generated JSON data (133 RGINTs)

## Data already generated (do not regenerate)
- `data/rgint_brasil.geojson`  — 133 RGINT polygons, simplified, WGS84
- `data/rgint_index.json`      — master lookup (rgint, nome, uf, biome)
- `data/rgint/*.json`          — diagonal time series per RGINT (15 classes × 16 years)

## Run with Docker
```bash
docker compose up --build
# → http://localhost:8000
```

## Run without Docker
```bash
cd webapp
pip install -r backend/requirements.txt
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

## Data format — `rgint/{id}.json`
```json
{
  "1 - Culturas perenes": {"2008": 1234.5, "2009": 1300.2, ...},
  "2 - Soja":             {"2008": 45000.0, ...},
  ...  (15 classes, 16 years 2008–2023)
}
```

## Biome color scheme (map polygons)
| Biome | Color |
|---|---|
| Amazônia | `#2d6a4f` |
| Cerrado | `#d4a017` |
| Mata Atlântica | `#40916c` |
| Caatinga | `#e76f51` |
| Pampa | `#a8dadc` |

## Class color scheme (time-series lines)
| # | Class | Color |
|---|---|---|
| 1 | Culturas perenes | `#f4a261` |
| 2 | Soja | `#e9c46a` |
| 3 | Soja+Milho 2ª | `#f3722c` |
| 4 | Milho 1ª | `#90be6d` |
| 5 | Cana | `#43aa8b` |
| 6 | Outra agro | `#577590` |
| 7 | Past. deg. média | `#c77dff` |
| 8 | Past. deg. alta | `#9d4edd` |
| 9 | Past. deg. baixa | `#e0aaff` |
| 10 | Silvicultura | `#606c38` |
| 11 | Veg. prim. florestal | `#1b4332` |
| 12 | Veg. sec. florestal | `#52b788` |
| 13 | Veg. prim. não-florestal | `#b7e4c7` |
| 14 | Veg. sec. não-florestal | `#74c69d` |
| 15 | Outro | `#adb5bd` |

## Golden standard RGINTs (flag on map)
- **1201** — Rio Branco / AC (Amazônia)
- **5101** — Cuiabá / MT (Cerrado)
