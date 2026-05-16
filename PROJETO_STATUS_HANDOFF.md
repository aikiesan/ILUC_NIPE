# ABIOVE LULC 2026 — Project Status & Handoff Document

**Responsável:** Lucas Nakamura Cerejo — NIPE/CP2b UNICAMP  
**Data:** Maio 2026  
**Repositório:** https://github.com/aikiesan/ILUC_NIPE  
**Webapp local:** http://localhost:8000 (Docker)

---

## 1. O Que Este Projeto É

O projeto constrói **matrizes de transição de uso e cobertura do solo (LULC) em 15 classes** para as **133 Regiões Geográficas Intermediárias (RGINTs) do Brasil**, cobrindo os anos de **2008 a 2023** (16 pares de anos).

O produto final são insumos para o **modelo GTAP** (Global Trade Analysis Project) usado pela ABIOVE para estimar **ILUC — Mudança Indireta de Uso da Terra** associada à expansão da soja e outros agrocommodities brasileiros.

Cada RGINT recebe uma matriz 15×15 por par de anos: as linhas são a classe de origem, as colunas são a classe de destino, os valores são áreas em hectares. A **diagonal** da matriz é a área que *permaneceu* na mesma classe (uso do solo estável), que é o dado atualmente servido pelo webapp.

---

## 2. Estado Atual — O Que Está Funcionando

### 2.1 Pipeline de Dados (completo)

| Etapa | Status | Produto |
|---|---|---|
| Matrizes base 12 classes (MapBiomas Col.10) | ✅ 133/133 | `01_Base_Matrices_RGINT/*.xlsx` |
| Expansão para 15 classes via fontes auxiliares | ✅ 133/133 | `07_MATRIZES_15_CLASSES_FINAL/ALL_RGINTS/*.xlsx` |
| Extração da diagonal → JSON por RGINT | ✅ 133/133 | `webapp/data/rgint/*.json` |
| GeoJSON simplificado das fronteiras | ✅ | `webapp/data/rgint_brasil.geojson` (local, não no git) |
| Índice de metadados | ✅ | `webapp/data/rgint_index.json` |
| Validação conservação de área | ✅ | 2.128 verificações OK (|diff| < 0.01 ha) |

### 2.2 Webapp (em produção local via Docker)

| Componente | Status | Descrição |
|---|---|---|
| Backend FastAPI | ✅ rodando | Serve JSON + GeoJSON via 4 endpoints |
| Mapa Leaflet | ✅ | 133 polígonos RGINT coloridos por bioma, clicáveis |
| Gráfico Plotly | ✅ | Série temporal por classe (2008–2023) |
| Tab bar 15 classes | ✅ | Seleção de classe atualiza o gráfico |
| Marcadores padrão-ouro | ✅ | ★ em RGINT 1201 (Rio Branco) e 5101 (Cuiabá) |
| Docker / docker-compose | ✅ | `docker compose up --build` na pasta `webapp/` |
| Git + GitHub | ✅ | Remote: https://github.com/aikiesan/ILUC_NIPE |

### 2.3 Distribuição das 133 RGINTs

| Bioma | RGINTs | Roteamento TerraClass |
|---|---|---|
| Amazônia | 19 | TC AMZ 2008–2022, interpolação linear anos ímpares |
| Cerrado | 52 | TC CER 2018–2024, extrapolação retroativa 2008–2017 |
| Mata Atlântica | 33 | Sem TC — fallback MB classes 3+4+6 vs 11 |
| Caatinga | 21 | Sem TC — fallback MB classes 3+4+6 vs 11 |
| Pampa | 8 | Sem TC — fallback MB classes 3+4+6 vs 11 |
| **Total** | **133** | |

---

## 3. As Fontes de Dados — Inventário Completo

### 3.1 MapBiomas Coleção 10 (fonte primária — base de tudo)

| Atributo | Valor |
|---|---|
| Versão | Coleção 10 |
| Resolução | 30 m (raster) |
| Cobertura temporal | 1985–2023 (usamos 2008–2023) |
| Cobertura espacial | Brasil completo |
| Classes originais | ~70 classes hierárquicas |
| Produto usado | Matrizes de transição 12×12 por RGINT |
| Arquivo | `01_Base_Matrices_RGINT/ILUC_matrix_RGINT{ID}_{Nome}.xlsx` |
| DOI | 10.58053/MapBiomas/JNJGVT |
| URL | https://mapbiomas.org |

**O que fornece para cada classe:**

| Classe alvo | IDs MapBiomas | Método |
|---|---|---|
| 1 — Culturas perenes | 46, 47, 48 | Cobertura (diagonal only) |
| 2 — Soja | 39 × (1 − pct_2a) | Matriz completa × proporção CONAB |
| 3 — Soja + Milho 2ª safra | 39 × pct_2a | Matriz completa × proporção CONAB |
| 5 — Cana-de-açúcar | 20 | Cobertura (diagonal only) |
| 6 — Outra agropecuária | 40, 41, 62, 21 | Cobertura (diagonal only) |
| 7/8/9 — Pastagem (3 graus) | 15 | Proporcional via LAPIG (ver abaixo) |
| 10 — Silvicultura | 9 | Cobertura (diagonal only) |
| 11/12/13/14 — Vegetação (4 tipos) | 3,4,6,11,12,29 | Proporcional via TerraClass (ver abaixo) |
| 15 — Outro | 24,25,30,31,33,23 | Cobertura (diagonal only) |

**Limitação:** MapBiomas não distingue Milho 1ª safra (classe 4 é PAM exclusivo) e não separa graus de degradação de pastagem (isso é LAPIG).

---

### 3.2 TerraClass / PRODES — INPE (fonte auxiliar vegetação)

| Atributo | Valor |
|---|---|
| Fonte | INPE TerraClass + PRODES |
| Cobertura espacial | Amazônia Legal + Cerrado |
| Cobertura temporal | AMZ: 2008, 2010, 2012, 2014, 2016, 2018, 2020, 2022 (bienal) |
| | CER: 2018, 2020, 2022, 2024 |
| Chave de join | CD_MUN (código IBGE município, int64) |
| Arquivos | `04_Vegetation_TerraClass/TC_AMZ_*.csv` e `TC_CER_*.csv` |
| URL | http://www.inpe.br/terraclass |

**Colunas principais (AMZ):**

| Coluna | Significado |
|---|---|
| `Veg_Florestal_Primaria` | Área (ha) floresta primária no município |
| `Veg_Florestal_Secundaria` | Área (ha) floresta secundária |
| `Natural_Nao_Florestal` | Área (ha) savana/campo natural |
| `MB_Floresta_ha` | Área MapBiomas classe floresta (para normalização) |
| `MB_Pastagem_ha` | Área MapBiomas classe pastagem |
| `MB_Savana_ha` | Área MapBiomas savana |

**Colunas principais (CER):**

| Coluna | Significado |
|---|---|
| `Veg_Natural_Primaria` | Vegetação nativa primária Cerrado |
| `Veg_Natural_Secundaria` | Vegetação nativa secundária Cerrado |

**O que fornece para cada classe:**

| Classe alvo | Fórmula |
|---|---|
| 11 — Veg. prim. florestal | `pct_prim_TC × MB_floresta_RGINT` |
| 12 — Veg. sec. florestal | `pct_sec_TC × MB_floresta_RGINT` |
| 13 — Veg. prim. não-florestal | `pct_prim_TC × MB_savana_RGINT` |
| 14 — Veg. sec. não-florestal | `pct_sec_TC × MB_savana_RGINT` |

**Limitação:** Anos ímpares são interpolados linearmente. Cerrado sem dados antes de 2018 → extrapolação com valor de 2018. Biomas sem TC (MA, Caatinga, Pampa) usam proxy MapBiomas puro.

---

### 3.3 LAPIG/UFG — Atlas de Pastagens (fonte auxiliar pastagem)

| Atributo | Valor |
|---|---|
| Fonte | LAPIG/UFG — Atlas de Pastagens do Brasil |
| Versão | Coleção 9, s100 |
| Cobertura temporal | 2008–2023 (anual) |
| Cobertura espacial | Brasil completo |
| Chave de join | `geocod_mun` (float64 → converter para Int64 antes do join!) |
| Arquivos | `03_Pasture_Vigor_LAPIG/brasil_pasture_vigor_col9_s100_year=YYYY.csv` |
| URL | https://pastagem.org |

**Colunas:**

| Coluna | Tipo | Significado |
|---|---|---|
| `geocod_mun` | float64 | Código IBGE município (converter para Int64) |
| `bioma` | str | Bioma do município |
| `classe` | str | `Ausente` / `Intermediário` / `Severa` |
| `area_past_ha` | float | Área de pastagem nessa classe de vigor (ha) |

**Mapeamento para classes alvo:**

| Classe vigor | Classe alvo |
|---|---|
| `Ausente` | 9 — Pastagem degradação baixa |
| `Intermediário` | 7 — Pastagem degradação média |
| `Severa` | 8 — Pastagem degradação alta |

**Lógica:** A área total de pastagem do MapBiomas (classe 15) por RGINT é repartida proporcionalmente às áreas vigor LAPIG por município → RGINT (via lookup espacial `02_Spatial_Lookups`).

**Limitação:** LAPIG vai até 2023, não há 2024 ainda.

---

### 3.4 PAM — Pesquisa Agrícola Municipal / IBGE (fonte auxiliar agricultura)

| Atributo | Valor |
|---|---|
| Fonte | IBGE SIDRA Tabela 5457 — PAM (Pesquisa Agrícola Municipal) |
| Cobertura temporal | 2008–2024 (anual) |
| Cobertura espacial | Brasil — nível municipal |
| Chave de join | `CD_RGINT` (código RGINT IBGE) |
| Arquivo principal | `05_Agro_Subdivisions/PAM_RGINT_COMPLETO.csv` |
| Arquivo SIDRA bruto | `tabela5457.csv` (2008–2014) e `tabela5457 (1).csv` (2015–2024) |
| URL | https://sidra.ibge.gov.br/tabela/5457 |

**Colunas do PAM_RGINT_COMPLETO.csv:**

| Coluna | Tipo | Significado |
|---|---|---|
| `CD_RGINT` | int | Código da RGINT |
| `NM_RGINT` | str | Nome da RGINT |
| `SIGLA_UF` | str | UF principal |
| `ano` | int | Ano de referência |
| `cultura` | str | `soja`, `milho`, `cana`, `algodao_herbaceo`, etc. |
| `area_ha` | float | Área plantada (ha) por RGINT/ano/cultura |

**O que fornece para cada classe:**

| Classe alvo | Fonte PAM | Observação |
|---|---|---|
| 4 — Milho 1ª safra | `PAM_milho × (1 − pct_2a_CONAB)` | Diagonal only — sem matriz MapBiomas |
| 3 — Soja + Milho 2ª safra | Partição de MB classe 39 via pct_CONAB | |
| 2 — Soja | Partição de MB classe 39 via pct_CONAB | |

**Limitação:** PAM é área *plantada*, não mapeada por satélite. Para RGINTs multi-UF, a proporção CONAB é aplicada pela UF dominante — há imprecisão potencial em regiões de fronteira estadual.

---

### 3.5 CONAB — Série Histórica de Grãos (fonte auxiliar split milho/soja)

| Atributo | Valor |
|---|---|
| Fonte | CONAB — Série Histórica de Safras |
| Cobertura temporal | 2008–2024 (por safra) |
| Cobertura espacial | Brasil — nível UF |
| Arquivos | `05_Agro_Subdivisions/CONAB_GRAOS_UF_2008_2024.csv` |
| | `05_Agro_Subdivisions/CONAB_GRAOS_CANA_UF_2008_2024.csv` |
| | `05_Agro_Subdivisions/Dados_CONAB.xlsx` |
| URL | https://www.conab.gov.br/info-agro/safras/serie-historica |

**Colunas:**

| Coluna | Tipo | Significado |
|---|---|---|
| `ano` | int | Ano da safra |
| `uf` | str | Sigla da UF |
| `cultura` | str | `Soja (em grão)`, `Milho (1ª safra)`, `Milho (2ª safra)`, `Cana-de-açúcar` |
| `conab_ha` | float | Área por UF/cultura/ano (ha) |

**Uso principal:**  
Calcular o percentual `pct_2a(UF, ano) = milho_2a_CONAB / total_milho_CONAB` para particionar a área total de milho do PAM entre 1ª e 2ª safra. Validado: ratio SIDRA/PAM = 1.0 para milho total.

---

### 3.6 CRUZAMENTO TC × MapBiomas (tabela de reconciliação)

| Atributo | Valor |
|---|---|
| Arquivo | `06_Reconciliation_Logic/CRUZAMENTO_TC_MB_CORRETO_v3.csv` |
| Conteúdo | Crosswalk por município/ano entre categorias TC e classes MB |
| Colunas-chave | `CD_MUN`, `SIGLA_UF`, `ANO`, + totais MB e TC por categoria |

Usado para validar que as proporções TerraClass aplicadas à área MapBiomas resultam em totais consistentes. Inclui colunas pré-calculadas `MB_Floresta_ha`, `MB_Pastagem_ha`, `MB_Savana_ha`, `TC_Floresta`, `TC_Pastagem`, `TC_Agri`.

---

### 3.7 Lookup Espacial IBGE (tabela de composição RGINT → município)

| Atributo | Valor |
|---|---|
| Arquivo | `02_Spatial_Lookups/regioes_geograficas_composicao_por_municipios_2017_20180911.xlsx` |
| Colunas-chave | `nome_mun`, `CD_GEOCODI`, `cod_rgint`, `nome_rgint` |
| Versão | IBGE 2017 |
| Uso | Join de dados municipais (LAPIG, TerraClass, PAM/SIDRA) para nível RGINT |

---

## 4. Mapeamento Completo: 15 Classes × Fontes

| # | Classe | Fonte primária | Fonte auxiliar | Disponibilidade temporal | Método |
|---|---|---|---|---|---|
| 1 | Culturas perenes | MapBiomas Col.10 | — | 2008–2023 anual | Diagonal (classes MB 46,47,48) |
| 2 | Soja | MapBiomas Col.10 | CONAB (split %) | 2008–2023 anual | Matriz × (1−pct_2a) via classe MB 39 |
| 3 | Soja + Milho 2ª safra | MapBiomas Col.10 | CONAB + PAM | 2008–2023 anual | Matriz × pct_2a via classe MB 39 |
| 4 | Milho 1ª safra | PAM/IBGE | CONAB (split %) | 2008–2024 anual | Diagonal only — sem matriz MB |
| 5 | Cana-de-açúcar | MapBiomas Col.10 | — | 2008–2023 anual | Diagonal (classe MB 20) |
| 6 | Outra agropecuária | MapBiomas Col.10 | — | 2008–2023 anual | Diagonal (MB 40,41,62,21) |
| 7 | Pastagem deg. média | MapBiomas Col.10 | LAPIG Vigor | 2008–2023 anual | Proporcional (LAPIG "Intermediário") |
| 8 | Pastagem deg. alta | MapBiomas Col.10 | LAPIG Vigor | 2008–2023 anual | Proporcional (LAPIG "Severa") |
| 9 | Pastagem deg. baixa | MapBiomas Col.10 | LAPIG Vigor | 2008–2023 anual | Proporcional (LAPIG "Ausente") |
| 10 | Silvicultura | MapBiomas Col.10 | — | 2008–2023 anual | Diagonal (classe MB 9) |
| 11 | Veg. prim. florestal | MapBiomas Col.10 | TerraClass (AMZ/CER) | 2008–2023* | pct_prim_TC × MB_floresta |
| 12 | Veg. sec. florestal | MapBiomas Col.10 | TerraClass (AMZ/CER) | 2008–2023* | pct_sec_TC × MB_floresta |
| 13 | Veg. prim. não-florestal | MapBiomas Col.10 | TerraClass (AMZ/CER) | 2008–2023* | pct_prim_TC × MB_savana |
| 14 | Veg. sec. não-florestal | MapBiomas Col.10 | TerraClass (AMZ/CER) | 2008–2023* | pct_sec_TC × MB_savana |
| 15 | Outro (urbano, água, etc.) | MapBiomas Col.10 | — | 2008–2023 anual | Diagonal (MB 24,25,30,31,33,23) |

*TC: AMZ bienal 2008–2022 (ímpares interpolados), CER apenas 2018–2024 (2008–2017 extrapolados). MA/Caatinga/Pampa usam proxy MB puro.

---

## 5. Estrutura de Arquivos — Mapa Completo

```
Dados_Projeto_ABIOVE_2026/
│
├── .gitignore                          ← Exclui xlsx grandes e *.geojson
├── README_DICIONARIO_PIPELINE.md       ← Dicionário técnico detalhado do pipeline
├── PROJETO_STATUS_HANDOFF.md           ← Este arquivo
│
├── ILUC_NIPE/                          ← Dados de entrada do pipeline
│   ├── 01_Base_Matrices_RGINT/         ← 133 xlsx (matrizes 12×12) [GITIGNORED]
│   ├── 02_Spatial_Lookups/             ← Lookup RGINT → município (IBGE 2017)
│   ├── 03_Pasture_Vigor_LAPIG/         ← 16 CSV vigor pastagem 2008–2023
│   ├── 04_Vegetation_TerraClass/       ← 12 CSV TerraClass (AMZ + CER)
│   ├── 05_Agro_Subdivisions/           ← PAM, CONAB, SIDRA
│   └── 06_Reconciliation_Logic/        ← Crosswalk TC × MB
│
├── 07_MATRIZES_15_CLASSES_FINAL/       ← Produto final [GITIGNORED - muitos xlsx]
│   ├── GOLDEN_ILUC_15_Classes_RGINT_1201.xlsx   ← Padrão-ouro Rio Branco/AC
│   ├── GOLDEN_ILUC_15_Classes_RGINT_5101.xlsx   ← Padrão-ouro Cuiabá/MT
│   ├── TEMPLATE_ILUC_15Classes_ABIOVE2026_RGINT5101.xlsx
│   └── ALL_RGINTS/ILUC_15Classes_RGINT*.xlsx    ← 133 matrizes finais
│
├── RG2017_rgint_20180911/              ← Shapefile IBGE fronteiras RGINT
│   └── RG2017_rgint.{shp,dbf,prj...}
│
├── Documentação/                       ← Metodologia, relatórios
│   ├── metodologia_ABIOVE_SOJA_2026.docx
│   ├── Registro Metodológico — Pipeline de Fichas Regionais.docx
│   └── [outros .docx e .csv comparativos]
│
└── webapp/                             ← Aplicação web completa
    ├── Dockerfile
    ├── docker-compose.yml              ← Monta ./data como volume read-only
    ├── README_CLAUDECODE.md
    ├── backend/
    │   ├── main.py                     ← FastAPI: 4 endpoints
    │   └── requirements.txt
    ├── frontend/
    │   ├── templates/index.html        ← Shell HTML (Leaflet + Plotly via CDN)
    │   └── static/
    │       ├── css/style.css           ← Layout 35/65, header escuro
    │       ├── js/map.js               ← Leaflet, polígonos por bioma, click handler
    │       └── js/dashboard.js         ← Plotly série temporal, tab bar 15 classes
    └── data/
        ├── rgint_index.json            ← Metadados dos 133 RGINTs
        ├── rgint_brasil.geojson        ← Polígonos [LOCAL ONLY — não no git]
        └── rgint/                      ← 133 JSON (diagonal por classe por ano)
            └── {rgint_id}.json
```

---

## 6. Formato JSON Atual (webapp/data/rgint/{id}.json)

```json
{
  "1 - Culturas perenes": {
    "2008": 0.0,
    "2009": 0.0,
    "...": "...",
    "2023": 0.0
  },
  "2 - Soja": {
    "2008": 155249.38,
    "2009": 129122.01,
    "...": "...",
    "2023": 180334.72
  },
  "...": "14 outras classes"
}
```

**Limitação atual:** Armazena apenas a **diagonal** (área estável). A matriz completa 15×15 fica nos xlsx. A fonte de cada valor não está identificada no JSON — tudo aparece como uma série única.

---

## 7. O Que Falta — Próximas Etapas

### 7.1 Formato JSON Multi-Fonte (prioridade alta)

O JSON atual não distingue qual fonte gerou cada valor. Para comparação de fontes e detecção de outliers, o formato precisa evoluir para:

```json
{
  "metadata": {
    "nome": "Cuiabá", "uf": "MT", "biome": "Cerrado",
    "area_total_ha": 9876543.0,
    "sources_available": ["mapbiomas", "terraclass", "conab_pam", "lapig"]
  },
  "classes": {
    "2 - Soja": {
      "mapbiomas": {
        "values": [155249, 129122, ...],
        "years": [2008, 2009, ..., 2023],
        "quality": "primary",
        "notes": "MB Col.10 classe 39, sem split safra"
      },
      "conab_pam": {
        "values": [162000, 135000, ...],
        "quality": "primary",
        "notes": "PAM área plantada × proporção CONAB, alocado ao RGINT"
      }
    },
    "7 - Pastagem deg. média": {
      "mapbiomas_lapig": {
        "values": [...],
        "quality": "primary",
        "notes": "MB classe 15 × pct vigor LAPIG Intermediário"
      }
    }
  }
}
```

### 7.2 Pipeline de Geração Multi-Fonte (a construir)

```
data_pipeline/
├── 01_harmonize_classes.py    ← Mapeia cada fonte para as 15 classes
├── 02_aggregate_to_rgint.py   ← Agrega dados municipais → RGINT via lookup espacial
├── 03_build_json_index.py     ← Gera rgint_full/{id}.json com todas as fontes
├── 04_outlier_detection.py    ← MAD rolling + desvio entre fontes
├── 05_generate_reports.py     ← HTMLs estáticos por RGINT (Jinja2 + Plotly)
├── quality_rules.yaml         ← Define fonte primária/fallback por classe
└── utils.py
```

**quality_rules.yaml (esboço):**

```yaml
"1 - Culturas perenes":
  primary: mapbiomas
  fallback: ~
  notes: "MB exclusivo — sem fonte alternativa disponível"

"2 - Soja":
  primary: conab_pam
  fallback: mapbiomas
  notes: "PAM tem dado municipal oficial; MB é proxy satélite"

"4 - Milho 1ª safra":
  primary: conab_pam
  fallback: ~
  notes: "MB não distingue milho 1ª — PAM é fonte única"

"7 - Pastagem deg. média":
  primary: mapbiomas_lapig
  fallback: mapbiomas
  notes: "LAPIG vigor disponível 2008–2023; sem vigor usar MB puro"

"11 - Veg. prim. florestal":
  primary: terraclass
  fallback: mapbiomas
  notes: "TC disponível só AMZ e CER; MA/Caatinga/Pampa usam MB"
```

### 7.3 Extensão do Webapp (a construir)

- Novo endpoint `GET /api/rgint_full/{id}` retornando o JSON multi-fonte
- Múltiplas linhas Plotly por classe (uma por fonte, estilos distintos)
- Toggle para mostrar/ocultar fontes individuais
- Marcadores vermelhos em outliers detectados
- Badge "fonte recomendada" por classe
- Novo endpoint `GET /reports/{rgint_id}` servindo HTML estático por RGINT

### 7.4 Pendências de Dados

| Item | Situação | Impacto |
|---|---|---|
| Dados talhaço Serasa/ABIOVE (2008, 2017, 2024) | Aguardando | Classes 2 e 3 (Soja) |
| TerraClass biomas sem cobertura (MA, Caatinga, Pampa) | Sem previsão | Classes 11–14 nesses biomas |
| LAPIG 2024 | Ainda não publicado | Classes 7–9 em 2024 |
| Validação cruzada Classe 15 (módulos MB especializados) | Pendente | Urbano, mineração, água |
| Escalonamento GTAP: agregação 133 → regiões GTAP | Próxima fase | Produto final ABIOVE |
| RGINTs multi-UF: ponderação CONAB por área municipal | Melhoria técnica | Classes 2,3,4 em fronteiras estaduais |

---

## 8. Infraestrutura e Git

### Rodar localmente (sem Docker)
```bash
cd webapp
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --port 8000
```

### Rodar com Docker
```bash
cd webapp
docker compose up --build
# → http://localhost:8000
```

### Git — O Que Está e O Que Não Está no Repositório

| Item | No git? | Motivo |
|---|---|---|
| `webapp/` completo (código + JSONs) | ✅ | Código e dados processados pequenos |
| `ILUC_NIPE/02–06/` | ✅ | CSVs de tamanho razoável |
| `README_DICIONARIO_PIPELINE.md` | ✅ | Documentação |
| `RG2017_rgint_20180911/` | ✅ | Shapefile (~2 MB) |
| `*.geojson` | ❌ | 59 MB — excede limite GitHub |
| `01_Base_Matrices_RGINT/` | ❌ | 133 xlsx grandes |
| `07_MATRIZES_15_CLASSES_FINAL/` | ❌ | 133+ xlsx grandes |

**Para clonar e rodar em outro servidor:**
1. `git clone https://github.com/aikiesan/ILUC_NIPE`
2. Copiar manualmente `webapp/data/rgint_brasil.geojson` (arquivo local)
3. `cd webapp && docker compose up --build`

---

## 9. Padrões-Ouro de Validação

| RGINT | Nome | UF | Bioma | Por quê é padrão-ouro |
|---|---|---|---|---|
| **1201** | Rio Branco | AC | Amazônia | Forte presença de vegetação primária, pecuária relevante, dados TerraClass completos |
| **5101** | Cuiabá | MT | Cerrado | Principal fronteira agrícola Brasil, toda a complexidade soja/milho/pastagem presente |

Ambos têm arquivo GOLDEN na pasta `07_MATRIZES_15_CLASSES_FINAL/` e são marcados com ★ no mapa do webapp.

---

## 10. Contatos e Referências

| Recurso | URL |
|---|---|
| MapBiomas Col.10 | https://mapbiomas.org |
| TerraClass INPE | http://www.inpe.br/terraclass |
| PRODES INPE | http://www.obt.inpe.br/OBT/assuntos/programas/amazonia/prodes |
| LAPIG Pastagens | https://pastagem.org |
| PAM IBGE SIDRA 5457 | https://sidra.ibge.gov.br/tabela/5457 |
| CONAB Série Histórica | https://www.conab.gov.br/info-agro/safras/serie-historica |
| IBGE RGINTs 2017 | https://www.ibge.gov.br/geociencias/organizacao-do-territorio/divisao-regional |
| Repositório GitHub | https://github.com/aikiesan/ILUC_NIPE |
