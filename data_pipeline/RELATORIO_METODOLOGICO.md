# Relatório Metodológico — ABIOVE LULC 2026
## Uso da Terra, Mudança de Uso da Terra e Silvicultura em Regiões Geográficas Intermediárias do Brasil (2008–2024)

**Projeto:** ABIOVE Biocombustíveis 2026 — Estimativa LULC multi-fonte por RGINT  
**Instituição:** NIPE/UNICAMP  
**Responsável técnico:** Lucas Nakamura Cerejo  
**Data de geração deste documento:** Maio de 2026  
**Versão do pipeline:** 1.0 (pós-integração CONAB + TerraClass raw)

---

## Sumário

1. [Sumário Executivo](#1-sumário-executivo)
2. [Escopo Geográfico e Temporal](#2-escopo-geográfico-e-temporal)
3. [Arquitetura do Pipeline de Dados](#3-arquitetura-do-pipeline-de-dados)
4. [Fontes de Dados Brutas](#4-fontes-de-dados-brutas)
5. [Metodologia por Classe ABIOVE](#5-metodologia-por-classe-abiove)
6. [Divergências Conhecidas Entre Fontes](#6-divergências-conhecidas-entre-fontes)
7. [Limitações Gerais e Caveats](#7-limitações-gerais-e-caveats)
8. [Glossário Técnico](#8-glossário-técnico)
9. [Referências](#9-referências)

---

## 1. Sumário Executivo

Este relatório documenta a metodologia completa de construção das séries temporais de uso e cobertura da terra (LULC — *Land Use and Land Cover*) utilizadas no projeto ABIOVE Biocombustíveis 2026, desenvolvido pelo Núcleo Interdisciplinar de Planejamento Energético (NIPE) da Universidade Estadual de Campinas (UNICAMP).

O objetivo central do projeto é estimar, para cada uma das **133 Regiões Geográficas Intermediárias (RGINTs)** do Brasil (IBGE, 2017), a área ocupada por **15 classes de uso da terra** entre **2008 e 2024**, com base em múltiplas fontes de dados. As estimativas são produzidas tanto a partir de sensoriamento remoto (MapBiomas Collection 10, TerraClass) quanto de levantamentos estatísticos oficiais (IBGE/PAM, CONAB, LAPIG/UFG).

A metodologia central baseia-se em **matrizes de transição de uso da terra** (*land use transition matrices*) processadas a nível municipal e agregadas por RGINT — abordagem denominada internamente como "diagonal do pipeline". Além desta estimativa integrada, o sistema também disponibiliza as **fontes alternativas** para cada classe, permitindo comparação visual e análise crítica das divergências entre metodologias.

---

## 2. Escopo Geográfico e Temporal

### 2.1 Unidade Espacial de Análise

A unidade de análise é a **Região Geográfica Intermediária (RGINT)**, definida pelo IBGE na publicação "Regiões Geográficas Imediatas e Regiões Geográficas Intermediárias 2017". O Brasil possui **133 RGINTs**, cada uma composta por múltiplos municípios. A RGINT é a escala ideal para análise de cadeias produtivas agrícolas por equilibrar detalhe regional com disponibilidade de dados.

A correspondência entre municípios e RGINTs é estabelecida pela tabela de lookup do IBGE:
- **Arquivo:** `ILUC_NIPE/02_Spatial_Lookups/regioes_geograficas_composicao_por_municipios_2017_20180911.xlsx`
- **Colunas utilizadas:** `CD_GEOCODI` (código municipal IBGE 7 dígitos), `cod_rgint`, `nome_rgint`

### 2.2 Período de Cobertura

O período analisado é **2008 a 2024** (17 anos). Este intervalo é determinado pela disponibilidade conjunta das fontes primárias:

| Fonte | Início | Fim | Periodicidade |
|---|---|---|---|
| MapBiomas Col.10 | 1985 | 2023 | Anual |
| TerraClass (AMZ) | 2008 | 2022 | Bienal (anos pares) |
| TerraClass (CER) | 2013 | 2022 | Bienal (anos pares) |
| LAPIG Atlas Pastagens | 2008 | 2023 | Anual |
| PAM/IBGE | 1974 | 2023 | Anual |
| CONAB SerieHistórica | 2001 | 2024 | Anual |
| CONAB LevantamentoGrãos | 2017 | 2024 | Anual (safra) |

O ano de 2024 é coberto apenas pelas fontes CONAB (administrativa/estatística). Os dados de sensoriamento remoto têm defasagem: MapBiomas Col.10 encerra em 2023, TerraClass em 2022.

### 2.3 Biomas Cobertos

As 133 RGINTs cobrem todos os biomas brasileiros: Amazônia, Cerrado, Mata Atlântica, Caatinga, Pampa e Pantanal. A cobertura de fontes secundárias varia por bioma (ver Seção 6).

---

## 3. Arquitetura do Pipeline de Dados

### 3.1 Visão Geral do Fluxo

```
Dados brutos (CSV, XLS, shapefiles)
        │
        ▼
[01_load_sources.py]
        │
        ├── processed/pam_rgint.csv
        ├── processed/lapig_vigor_rgint.csv
        ├── processed/conab_cafe_uf.csv
        ├── processed/conab_milho_split_uf.csv
        └── processed/cruzamento_rgint.csv
        │
        ▼
[02_build_multisource_json.py]
        │
        └── webapp/data/rgint_full/{rgint_id}.json  (133 arquivos)
        │
        ▼
[03_generate_reports.py]
        │
        └── webapp/data/html_reports/{rgint_id}.html  (133 arquivos)
        │
        ▼
[Webapp FastAPI + Leaflet + Plotly]
        └── Visualização interativa no navegador
```

### 3.2 Scripts e Responsabilidades

#### `data_pipeline/01_load_sources.py`
Lê cada fonte de dados bruta e produz arquivos CSV canônicos na pasta `processed/`. Não realiza nenhuma lógica de classe ABIOVE — apenas limpeza, padronização de colunas, agregação municipal→RGINT e filtragem temporal.

**Saídas:**
- `pam_rgint.csv` — áreas plantadas PAM por RGINT/ano/cultura
- `lapig_vigor_rgint.csv` — áreas de pastagem por RGINT/ano/classe de vigor
- `conab_cafe_uf.csv` — área plantada de café por UF/ano (CONAB)
- `conab_milho_split_uf.csv` — proporção milho 2ª safra (`pct_2a`) por UF/ano
- `cruzamento_rgint.csv` — colunas MB e TC selecionadas do CRUZAMENTO, agregadas por RGINT/ano

#### `data_pipeline/02_build_multisource_json.py`
Para cada uma das 133 RGINTs, combina a diagonal do pipeline (matriz de transição pré-computada) com as fontes alternativas e gera um JSON multi-fonte. A estrutura do JSON é:

```json
{
  "metadata": {
    "rgint": "5101",
    "nome": "Cuiabá",
    "uf": "MT",
    "biome": "Cerrado",
    "area_ha": 11912600.0
  },
  "classes": {
    "2 - Soja": {
      "pipeline_diagonal": {
        "values": [1440000, 1580000, ...],
        "years": [2008, 2009, ..., 2024],
        "quality": "fallback",
        "notes": "MB Col.10 classe 39 × proporção CONAB"
      },
      "conab_pam": {
        "values": [1350000, 1490000, ...],
        "years": [2008, 2009, ..., 2024],
        "quality": "primary",
        "notes": "PAM área plantada oficial alocada por RGINT"
      }
    }
  }
}
```

O campo `quality` indica se a fonte é primária (★ recomendada) ou alternativa (↩ secundária/proxy), conforme definido em `quality_rules.yaml`.

#### `data_pipeline/03_generate_reports.py`
Renderiza relatórios HTML autossuficientes por RGINT usando o template Jinja2 em `templates/report.html`, com gráficos Plotly embutidos para cada classe.

#### `data_pipeline/utils.py`
Funções auxiliares compartilhadas:
- `load_lookup()` — tabela município→RGINT
- `load_rgint_index()` — índice das 133 RGINTs com metadados
- `load_existing_diagonal(rgint_id)` — lê a matriz diagonal pré-computada
- `load_quality_rules()` — carrega `quality_rules.yaml`
- `ensure_processed_dir()` — cria pasta `processed/` se não existir

### 3.3 Dados de Entrada Pré-Computados (Diagonal)

O ponto de partida do pipeline são as **133 matrizes de transição RGINT** pré-computadas pela equipe do NIPE/UNICAMP, disponíveis como:
- `webapp/data/rgint/{rgint_id}.json` — formato `{"classe": {"2008": valor, "2009": valor, ...}}`
- `ILUC_NIPE/01_Base_Matrices_RGINT/ILUC_matrix_RGINT*.xlsx` — planilhas Excel originais

Estas matrizes foram calculadas a partir da combinação de MapBiomas Col.10 e TerraClass, aplicando as regras de alocação de cada classe ABIOVE (ver Seção 5). O pipeline de dados neste repositório **não recalcula as matrizes** — ele as lê, adiciona fontes alternativas e gera os JSONs multi-fonte.

---

## 4. Fontes de Dados Brutas

### 4.1 MapBiomas — Coleção 10

**Descrição:** Mapeamento anual de uso e cobertura da terra para o Brasil inteiro, produzido por classificação Random Forest sobre imagens Landsat de 30m de resolução espacial. Coleção 10 cobre 1985 a 2023.

**Proveniência:** Plataforma MapBiomas Brasil (https://mapbiomas.org), parceria entre universidades brasileiras, empresas de tecnologia e ONGs de conservação.

**Formato no projeto:** Os dados MB foram pré-processados externamente à pasta `data_pipeline/` e já chegam como:
1. Matrizes de transição por RGINT nas planilhas Excel (`01_Base_Matrices_RGINT/`)
2. Colunas `MB_Floresta_ha`, `MB_Pastagem_ha`, `MB_Savana_ha`, `MB_Agricultura_ha` no arquivo de reconciliação (`CRUZAMENTO_TC_MB_CORRETO_v3.csv`)

**Classes MapBiomas relevantes para o projeto (Col.10):**

| class_id MB | Denominação MB | Classe ABIOVE correspondente |
|---|---|---|
| 9 | Forest Plantation | 10 — Silvicultura |
| 11 | Forest Formation | Base para classes 11 e 12 (×TC) |
| 12 | Savanna Formation | Base para classes 13 e 14 (×TC) |
| 15 | Pasture | Base para classes 7, 8, 9 (×LAPIG) |
| 20 | Sugar Cane | 5 — Cana-de-açúcar |
| 21 | Mosaic of Uses | 6 — Outra agropecuária |
| 24 | Urban Area | 15 — Outro |
| 30 | Mining | 15 — Outro |
| 31 | Aquaculture | 15 — Outro |
| 33 | River, Lake and Ocean | 15 — Outro |
| 39 | Soybean | 2 — Soja |
| 40 | Rice (Flooded) | 6 — Outra agropecuária |
| 41 | Other Temporary Crops | 6 — Outra agropecuária |
| 46 | Coffee | 1 — Culturas perenes |
| 47 | Citrus | 1 — Culturas perenes |
| 48 | Other Perennial Crops | 1 — Culturas perenes |
| 62 | Cotton | 6 — Outra agropecuária |

**Cobertura temporal:** Anual, 1985–2023. No projeto utilizamos 2008–2023.

**Cobertura geográfica:** Brasil completo (todos os biomas, todos os municípios).

**Limitações conhecidas:**
- A classe 15 (Pastagem) do MapBiomas tende a **subestimar** a área de pastagem em relação ao mapeamento específico do LAPIG, pois utiliza critérios espectrais mais restritivos. A diferença é sistemática e constante (~2× na maioria das RGINTs — ver Seção 6.1).
- Confusão espectral pode ocorrer entre pastagem degradada e cerrado nativo, especialmente no bioma Cerrado.
- Culturas temporárias de rotação (soja+milho) podem ser subestimadas em pixels mistos.
- A resolução de 30m pode subestimar pequenas propriedades e culturas intercaladas.
- Dados de 2024 **não disponíveis** na Col.10 (coleção encerrada em 2023).

### 4.2 TerraClass

**Descrição:** Levantamento bienal de uso e cobertura da terra para a Amazônia Legal (AMZ) e Cerrado (CER), produzido pelo INPE utilizando imagens PRODES/Landsat como máscara de floresta primária. Combina classificação automática com validação de campo.

**Proveniência:** Instituto Nacional de Pesquisas Espaciais (INPE), em parceria com Embrapa. Programa TerraClass (http://www.inpe.br/cra/projetos_pesquisas/dados_terraclass.php).

**Arquivos no projeto:**
- `ILUC_NIPE/04_Vegetation_TerraClass/TC_AMZ_*_harmonizado.csv` — dados por estado da Amazônia Legal
- `ILUC_NIPE/04_Vegetation_TerraClass/TC_CER_CERRADO_harmonizado.csv` — dados do Cerrado
- `ILUC_NIPE/06_Reconciliation_Logic/CRUZAMENTO_TC_MB_CORRETO_v3.csv` — arquivo de reconciliação TC×MB (fonte consolidada utilizada pelo pipeline)

**Classes TerraClass utilizadas no pipeline:**

| Coluna no CRUZAMENTO | Denominação TerraClass | Uso no pipeline |
|---|---|---|
| `Veg_Florestal_Primaria` | Vegetação florestal primária | Classes 11 e 12 — pct_prim |
| `Veg_Florestal_Secundaria` | Vegetação florestal secundária | Classes 11 e 12 — pct_sec |
| `Natural_Nao_Florestal` | Vegetação natural não-florestal | Classes 13 e 14 |
| `Pastagem_Herbacea` | Pastagem herbácea | Classes 7, 8, 9 (referência TC) |
| `Pastagem_Arbustiva_Arborea` | Pastagem arbustiva/arbórea | Classes 7, 8, 9 (referência TC) |
| `Silvicultura` | Silvicultura | Classe 10 (referência) |
| `Cultura_Perene` | Cultura perene | Classe 1 (referência) |
| `Cultura_Temporaria_Total` | Cultura temporária total | Classes 2–5 (referência) |
| `Desflorestamento_Ano` | Desflorestamento no ano | Referência interna |

**Cobertura temporal:** Bienal, anos pares. AMZ: 2008, 2010, 2012, 2014, 2016, 2018, 2020, 2022. CER: 2013 (ou 2018 em algumas versões), 2018, 2020, 2022.

**Cobertura geográfica:** Exclusivamente **Amazônia Legal** e **Cerrado**. Regiões nos biomas Mata Atlântica, Caatinga e Pampa **não possuem cobertura TerraClass**. Para essas regiões, as classes de vegetação (11–14) no pipeline diagonal utilizam apenas MapBiomas.

**Limitações conhecidas:**
- Cobertura geográfica restrita (AMZ + CER): aproximadamente 70–75% do território nacional
- Periodicidade bienal: anos ímpares não têm dados TC diretos. A diagonal do pipeline utiliza interpolação linear ou extrapolação do levantamento mais próximo.
- Definições de classes podem divergir entre AMZ e CER (harmonização parcial no arquivo CRUZAMENTO)
- O CRUZAMENTO resultante tem apenas **96 linhas RGINT×ano** (8 anos × ~12 RGINTs), indicando que apenas RGINTs com municípios cobertos pelo TC foram incluídas no join

### 4.3 LAPIG — Atlas de Pastagens do Brasil, Coleção 9

**Descrição:** Mapeamento anual de pastagens brasileiras com estratificação por nível de vigor/degradação, produzido pelo Laboratório de Processamento de Imagens e Geoprocessamento (LAPIG) da Universidade Federal de Goiás (UFG). Utiliza imagens Sentinel-2 e MODIS com índices de vegetação para classificar o vigor da pastagem.

**Proveniência:** LAPIG/UFG — Atlas de Pastagens do Brasil (https://atlasdepastagens.com.br). Coleção 9, sensoriamento de alta resolução.

**Arquivo no projeto:** `ILUC_NIPE/03_Pasture_Vigor_LAPIG/brasil_pasture_vigor_col9_s100_year=YYYY.csv` (um arquivo por ano, 2008–2023)

**Colunas utilizadas:**
- `geocod_mun` — código IBGE do município (float64, convertido para Int64 e zerofill 7 dígitos)
- `classe` — classe de vigor: `"Ausente"`, `"Intermediário"`, `"Severa"`
- `area_past_ha` — área de pastagem nessa classe de vigor no município (hectares)

**Classificação de vigor:**

| Classe LAPIG | Significado agronômico | Classe ABIOVE |
|---|---|---|
| `Ausente` | Degradação ausente — pastagem com alto vigor vegetativo | 9 — Pastagem deg. baixa |
| `Intermediário` | Degradação intermediária — pastagem com vigor reduzido | 7 — Pastagem deg. média |
| `Severa` | Degradação severa — pastagem muito degradada, solo exposto | 8 — Pastagem deg. alta |

**Processamento:** Os 16 arquivos anuais são lidos sequencialmente, os municípios são vinculados ao `cod_rgint` via lookup IBGE, e as áreas são somadas por RGINT/ano/classe. A proporção de cada classe de vigor sobre o total de pastagem LAPIG por RGINT/ano é também calculada (`pct`).

**Cobertura temporal:** Anual, 2008–2023. Dados de 2024 não disponíveis.

**Cobertura geográfica:** Brasil completo.

**Limitações conhecidas — divergência sistemática com MapBiomas:**
O total de pastagem mapeado pelo LAPIG (soma das três classes) é sistematicamente **maior** que a área da classe 15 (Pastagem) do MapBiomas para a maioria das RGINTs, com fator aproximado de 2× e comportamento constante ao longo dos anos. Esta divergência decorre de diferenças metodológicas fundamentais:

1. **Universo de mapeamento:** O LAPIG/Atlas identifica como pastagem toda área com cobertura herbácea dominada por gramíneas, mesmo que moderadamente arbustiva. O MapBiomas classe 15 aplica critérios espectrais mais restritivos, excluindo áreas que julga ambíguas entre pastagem e savana/cerrado.
2. **Imagens utilizadas:** O LAPIG usa Sentinel-2 (10m) e MODIS; o MB usa Landsat (30m). A maior resolução do LAPIG permite detectar pastagens menores.
3. **Época de imageamento:** Diferenças na fenologia podem afetar a classificação de pixels em transição.

Esta divergência é **esperada e não representa erro** — as duas fontes medem o mesmo fenômeno com metodologias distintas. O pipeline diagonal usa a área total MB classe 15 como universo de pastagem e aplica as **proporções** LAPIG (não as áreas absolutas) para obter as áreas de cada nível de degradação por RGINT.

### 4.4 PAM/IBGE — Pesquisa Agrícola Municipal

**Descrição:** Levantamento estatístico anual de produção agrícola municipal publicado pelo IBGE. Coleta dados de área plantada, área colhida, quantidade produzida e valor da produção para dezenas de culturas temporárias e permanentes.

**Proveniência:** Instituto Brasileiro de Geografia e Estatística (IBGE) — Pesquisa Agrícola Municipal (PAM). Disponível em SIDRA/IBGE.

**Arquivo no projeto:** `ILUC_NIPE/05_Agro_Subdivisions/PAM_RGINT_COMPLETO.csv`

**Colunas utilizadas:**
- `CD_RGINT` — código da RGINT (string, 4 dígitos)
- `NM_RGINT` — nome da RGINT
- `SIGLA_UF` — sigla da Unidade da Federação
- `ano` — ano de referência
- `cultura` — nome da cultura
- `area_ha` — área plantada em hectares

**Culturas coletadas pelo PAM e presentes no arquivo:**
- `soja` → Classe ABIOVE 2
- `milho` → Classes ABIOVE 3 e 4 (split por CONAB)
- `cana` → Classe ABIOVE 5
- `algodao_arboreo`, `algodao_herbaceo` → Classe ABIOVE 6

**Nota importante:** O PAM disponível neste projeto **não inclui café** como cultura separada. O café está ausente do `PAM_RGINT_COMPLETO.csv` (verificado: culturas únicas = `['algodao_arboreo', 'algodao_herbaceo', 'cana', 'milho', 'soja']`). Para a Classe 1 (Culturas perenes), o café é obtido via CONAB (ver Seção 4.5).

**Natureza do dado — área plantada vs. área mapeada:**
O PAM registra **área plantada**, um dado administrativo declarado pelos produtores e coletado por agentes municipais do IBGE. Difere da área mapeada por sensoriamento remoto (MapBiomas) em vários aspectos:
- PAM inclui áreas de cultivo não detectadas por satélite por obstrução de nuvens ou resolução
- PAM pode incluir áreas que o produtor plantou mas que não foram colhidas ou detectadas
- MB pode incluir áreas colhidas de cultivos anteriores ainda visíveis espectralmente
- PAM é referenciado ao município declarante; MB ao pixel georreferenciado

**Cobertura temporal:** Anual, 2008–2023 (dados de 2024 não disponíveis no arquivo).

**Cobertura geográfica:** Brasil completo — todos os municípios com atividade agrícola registrada.

### 4.5 CONAB — Companhia Nacional de Abastecimento

O projeto utiliza dois arquivos CONAB distintos para finalidades diferentes.

#### 4.5.1 SerieHistoricaCafe.txt

**Descrição:** Série histórica de área plantada, produção e produtividade de café por Unidade da Federação, publicada anualmente pela CONAB. Inclui variedades arábica (id_produto 7090) e robusta/conilon (id_produto 7498), somadas no pipeline.

**Arquivo:** `Dados_CONAB/SerieHistoricaCafe.txt`  
**Formato:** CSV com separador `;`, decimal `,`, encoding UTF-8  
**Colunas relevantes:** `uf`, `ano_agricola`, `area_plantada_mil_ha`, `produto`, `id_produto`

**Processamento:**
1. Leitura com `encoding="utf-8"`, sep=";"
2. Conversão de `ano_agricola` para inteiro (`year`)
3. Conversão de `area_plantada_mil_ha` de mil ha para ha (× 1000)
4. Agregação por `year` + `uf` (soma das duas variedades)
5. Filtro: anos 2008–2024
6. Saída: `processed/conab_cafe_uf.csv` (183 linhas; anos 2008–2024, todas as UFs produtoras)

**Uso no pipeline:** Base para a fonte alternativa `conab_cafe` da Classe 1 (Culturas perenes). Como o dado está em nível UF (não RGINT), é necessária alocação espacial.

**Alocação UF → RGINT:** A área de café por UF é distribuída entre as RGINTs da UF utilizando a **proporção de milho PAM** como proxy espacial (assumindo correlação geográfica entre áreas de cultivo). Para cada ano:

```
cafe_rgint = cafe_uf × (milho_PAM_rgint / milho_PAM_UF_total)
```

Se a UF não tem milho registrado em um determinado RGINT, utiliza-se divisão uniforme entre os RGINTs da UF com dados PAM naquele ano.

**Cobertura temporal:** Anual, 2008–2024. A CONAB tem dados mais recentes que o PAM (inclui 2024).

**Cobertura geográfica:** Nível UF, apenas estados produtores de café. Estados sem produção registrada retornam `null` na série RGINT.

**Limitações:**
- Nível UF é mais agregado que RGINT — a alocação via proxy milho é uma aproximação
- O proxy milho assume que a distribuição geográfica do café dentro da UF segue a do milho, o que pode não ser verdadeiro em UFs com regiões produtoras especializadas (ex: Sul de MG, ES)
- PAM não inclui café, confirmado; alternativa de proxy mais precisa seria área de café PAM histórico se disponível

#### 4.5.2 LevantamentoGraos.txt

**Descrição:** Levantamentos mensais da estimativa de safra para grãos (soja, milho, algodão, arroz, feijão, trigo, etc.) por UF. Para cada ano agrícola, são realizados múltiplos levantamentos (`id_levantamento`), sendo o último o mais próximo da produção final.

**Arquivo:** `Dados_CONAB/LevantamentoGraos.txt`  
**Formato:** CSV com separador `;`, decimal `,`, **encoding latin-1** (atenção: não é UTF-8)  
**Colunas relevantes:** `produto`, `uf`, `ano_agricola`, `safra`, `id_levantamento`, `area_plantada_mil_ha`

**Uso específico: split milho 1ª/2ª safra**

O milho brasileiro é cultivado em dois sistemas principais:
- **1ª Safra (milho verão):** Plantio outubro–dezembro, colheita março–junho. Cultura principal.
- **2ª Safra (safrinha):** Plantio janeiro–março, colheita junho–setembro. Geralmente em sucessão à soja.
- **3ª Safra:** Irrigação, volume pequeno, excluída do pipeline.

O PAM registra o total de milho sem discriminar a safra. O LevantamentoGrãos distingue `"1ª SAFRA"` e `"2ª SAFRA"` como valores da coluna `safra`.

**Processamento:**
1. Filtro: `produto` contendo "MILHO" (maiúsculas)
2. Uso do **último levantamento** (`max(id_levantamento)`) por `ano_agricola` + `uf` + `safra` como estimativa final
3. Parse de `ano_agricola` = "2017/18" → `year` = 2017
4. Pivot: `safra` em colunas → `area_1a` e `area_2a`
5. Cálculo: `pct_2a = area_2a / (area_1a + area_2a)` por UF/ano
6. Saída: `processed/conab_milho_split_uf.csv` (193 linhas; anos 2017–2024, UFs produtoras de milho)

**Aplicação no pipeline:**
```
milho_2a_rgint = milho_PAM_total_rgint × pct_2a_uf  (Classe 3)
milho_1a_rgint = milho_PAM_total_rgint × (1 − pct_2a_uf)  (Classe 4)
```

Para anos sem dados CONAB (2008–2016): o pipeline utiliza o **total PAM milho** sem split, ou seja, a série das Classes 3 e 4 é idêntica ao total de milho PAM nesse período. Isso representa uma **limitação conhecida** para o período pré-2017.

**Cobertura temporal:** Dados disponíveis apenas a partir do ano agrícola 2017/18 (safra 2017). Anos 2008–2016 não têm split disponível.

**Cobertura geográfica:** UF. Apenas estados com produção de milho registrada.

### 4.6 CRUZAMENTO_TC_MB_CORRETO_v3.csv

**Descrição:** Arquivo de reconciliação que cruza os dados municipais do MapBiomas com os dados municipais do TerraClass para os mesmos municípios e anos onde ambas as fontes têm cobertura. É o arquivo que alimenta as visualizações de "dados brutos MB/TC" na webapp.

**Arquivo:** `ILUC_NIPE/06_Reconciliation_Logic/CRUZAMENTO_TC_MB_CORRETO_v3.csv`

**Estrutura (32 colunas):**

*Identificadores:* `CD_MUN`, `SIGLA_UF`, `municipality`, `state_acronym`, `ANO`

*Colunas MapBiomas (agregadas por bioma):*
- `MB_Floresta_ha` — total MB floresta nativa (classes 11+12+outras formações)
- `MB_Pastagem_ha` — total MB pastagem (classe 15)
- `MB_Savana_ha` — total MB savana/cerrado nativo
- `MB_Agricultura_ha` — total MB agricultura (classes 39+20+46+47+48+40+41+62+21)
- `MB_Mosaico_ha` — total MB mosaico de usos

*Colunas TerraClass (granulares):*
- `Veg_Florestal_Primaria` — floresta primária TC
- `Veg_Florestal_Secundaria` — floresta secundária TC
- `Natural_Nao_Florestal` — vegetação natural não-florestal TC
- `Silvicultura` — silvicultura TC
- `Pastagem_Arbustiva_Arborea` — pastagem arbustiva/arbórea TC
- `Pastagem_Herbacea` — pastagem herbácea TC
- `Cultura_Perene`, `Cultura_Semiperene`, `Cultura_Temporaria_Total`, etc.
- `Desflorestamento_Ano`, `Mineracao`, `Urbanizada`, `Corpo_Dagua`, `Outros_Usos`, `Nao_Observado`

*Colunas TerraClass (agregadas):*
- `TC_Floresta` — floresta total TC
- `TC_Pastagem` — pastagem total TC
- `TC_Agri` — agricultura total TC

**Processamento no pipeline:**
1. Leitura e padronização de `CD_MUN` (zerofill 7 dígitos)
2. Join com lookup IBGE para obter `cod_rgint`
3. Seleção de 8 colunas de interesse: MB_Floresta, MB_Pastagem, MB_Savana + 5 colunas TC
4. Agregação por `rgint_id` + `year` (soma das áreas municipais)
5. Saída: `processed/cruzamento_rgint.csv`

**Cobertura resultante:** 96 linhas (≈12 RGINTs × 8 anos pares). A baixa contagem de RGINTs indica que o CRUZAMENTO só contém municípios das regiões AMZ+CER com cobertura TerraClass.

**Anos disponíveis:** 2008, 2010, 2012, 2014, 2016, 2018, 2020, 2022 (bienal, anos pares). Anos ímpares e o ano 2024 retornam `null` nas fontes MB/TC raw.

---

## 5. Metodologia por Classe ABIOVE

### 5.1 Classe 1 — Culturas Perenes

**Label:** `culturas_perenes`  
**Grupo:** Agropecuária  
**Descrição:** Café, citros, dendê, cacau, borracha e demais culturas perenes. Excluem-se silvicultura (classe 10) e pastagens.

**Fonte primária — `pipeline_diagonal`:**
- MapBiomas Col.10 class_ids: **46** (Coffee), **47** (Citrus), **48** (Other Perennial Crops)
- A diagonal equivale à soma dessas três classes por município/ano, agregada ao RGINT
- Qualidade: **primária** (mapeamento satélite direto, 30m, anual)

**Fonte alternativa — `conab_cafe`:**
- CONAB SerieHistóricaCafe.txt: área plantada de café (arábica + robusta) por UF/ano
- Alocação UF→RGINT via proxy de milho PAM (proporcional)
- Qualidade: **fallback** (dado administrativo declarado, alocação aproximada)
- Nota: a CONAB registra apenas café, enquanto a classe ABIOVE 1 inclui também citros, dendê, cacau. O `conab_cafe` subestima sistematicamente o total da classe.

**Validação:** Comparação visual com séries históricas estaduais de produção (IBGE PAM culturas permanentes). A tendência deve acompanhar a evolução da cafeicultura brasileira.

**Limitações:**
- PAM não contém café nesta versão do dataset — impossível validação municipal
- A classe 1 agrega culturas heterogêneas (café, citros, dendê) que têm distribuições geográficas muito distintas
- Anos ímpares com MB: disponível (anual). CONAB: disponível (anual). TerraClass: não aplicável.
- Dado de 2024: disponível apenas via CONAB (MB Col.10 encerra em 2023)

---

### 5.2 Classe 2 — Soja

**Label:** `soja`  
**Grupo:** Agropecuária  
**Descrição:** Lavoura de soja (verão). Não inclui o sistema integrado soja+milho 2ª safra, tratado separadamente na classe 3.

**Fonte primária — `pipeline_diagonal`:**
- MapBiomas Col.10 class_id: **39** (Soybean)
- A classe 3 do MB (Soja+Milho 2ª) não existe explicitamente — o MB mapeia toda a área como soja no verão; o split sistema simples vs. integrado é feito via proporção CONAB
- Qualidade: **fallback** (o MB é a base, mas a distinção classes 2 vs. 3 depende de CONAB)

**Fonte alternativa — `conab_pam`:**
- PAM/IBGE: área plantada de soja por RGINT/ano
- Qualidade: **primária** (dado administrativo oficial, referência para calibração)

**Interpretação da divergência:**
- PAM tende a ser ligeiramente maior que MB para soja, pois inclui áreas plantadas com problema de detecção (nuvens, início de safra) e lavouras pequenas abaixo do limite de detecção de 30m
- MB pode incluir pixels de transição entre soja e vegetação, contabilizando área não efetivamente plantada

**Validação:** A razão MB/PAM deve ser próxima de 1,0 para a maioria das RGINTs.

---

### 5.3 Classe 3 — Soja + Milho 2ª Safra

**Label:** `soja_milho_2a_safra`  
**Grupo:** Agropecuária  
**Descrição:** Sistema integrado onde a mesma área planta soja no verão e milho safrinha no inverno. É o sistema de produção dominante no Mato Grosso e outras regiões do MATOPIBA.

**Fonte primária — `pipeline_diagonal`:**
- Base: MapBiomas Col.10 class_id **39** × proporção CONAB 2ª safra por UF/ano
- `pipeline_diagonal_classe3 = MB_soja_rgint × pct_2a_uf`
- Qualidade: **primária** (combinação de mapeamento satélite + dado estatístico oficial)

**Fonte alternativa — `conab_pam`:**
- PAM milho total × pct_2a CONAB
- `conab_pam_classe3 = PAM_milho_rgint × pct_2a_uf`
- Para 2008–2016 (sem split CONAB): `conab_pam` retorna o total PAM milho sem split
- Qualidade: **fallback**

**Nota crítica sobre o split temporal:**
- 2017–2024: `pct_2a` derivado do CONAB LevantamentoGrãos. Dado confiável.
- 2008–2016: `pct_2a` = `None`. O pipeline retorna o total PAM milho sem split para ambas as classes 3 e 4 — **as séries das classes 3 e 4 são idênticas nesse período** (limitação metodológica).

---

### 5.4 Classe 4 — Milho 1ª Safra

**Label:** `milho_1a_safra`  
**Grupo:** Agropecuária  
**Descrição:** Milho como cultura principal (safra verão), não em sucessão à soja. Típico em pequenas propriedades e regiões Sul/Nordeste.

**Fonte primária — `pipeline_diagonal`:**
- `pipeline_diagonal_classe4 = PAM_milho_rgint × (1 − pct_2a_uf)`
- **MapBiomas não é utilizado** como fonte primária para milho. O MB subestima sistematicamente a área de milho por confusão espectral com outras culturas temporárias, pastagens degradadas e mosaicos.
- Qualidade: **primária** (PAM + CONAB split)

**Fonte alternativa — `conab_pam`:**
- PAM milho total × (1 − pct_2a)
- Equivalente à fonte primária com pequenas diferenças de arredondamento
- Para 2008–2016: igual ao total PAM milho

---

### 5.5 Classe 5 — Cana-de-Açúcar

**Label:** `cana_de_acucar`  
**Grupo:** Agropecuária  
**Descrição:** Cana-de-açúcar para produção de etanol e açúcar.

**Fonte primária — `pipeline_diagonal`:**
- MapBiomas Col.10 class_id: **20** (Sugar Cane)
- A diagonal equivale diretamente à área MB classe 20 por RGINT/ano
- Qualidade: **primária** (mapeamento satélite, detecção robusta para cana)

**Fonte alternativa — `conab_pam`:**
- PAM/IBGE: área plantada de cana por RGINT/ano
- Qualidade: **fallback**

**Nota:** A cana tem detecção espectral relativamente robusta no MB por seu padrão fenológico distinto (corte escalonado, canaviais extensos). A divergência MB×PAM tende a ser menor que para outras culturas.

---

### 5.6 Classe 6 — Outra Agropecuária

**Label:** `outra_agropecuaria`  
**Grupo:** Agropecuária  
**Descrição:** Categoria residual agregando arroz irrigado, algodão, outras culturas temporárias não classificadas explicitamente e mosaico de usos agropecuários.

**Fonte primária — `pipeline_diagonal`:**
- MapBiomas Col.10 class_ids: **40** (Rice, Flooded), **41** (Other Temporary Crops), **62** (Cotton), **21** (Mosaic of Uses)
- Soma direta dessas classes por RGINT/ano
- Qualidade: **primária**

**Fontes alternativas:** Nenhuma fonte alternativa disponível no pipeline. PAM tem arroz e algodão, mas adicionar somas parciais de culturas seria enganoso (a classe 6 é um resíduo, não uma categoria homogênea).

---

### 5.7 Classes 7, 8, 9 — Pastagens com Diferentes Níveis de Degradação

**Labels:** `pastagem_deg_media`, `pastagem_deg_alta`, `pastagem_deg_baixa`  
**Grupo:** Pastagem  
**Descrição:** Pastagem com degradação intermediária (classe 7), severa (classe 8) e ausente/baixa (classe 9), conforme classificação de vigor vegetativo do LAPIG.

**Lógica geral:**
As três classes somam a área total de pastagem MapBiomas (classe 15 MB), distribuída pelas proporções de vigor LAPIG.

```
pastagem_total_rgint = MB_classe15_rgint
pct_inter = LAPIG_Intermediário_ha / LAPIG_total_ha   (por RGINT/ano)
pct_severa = LAPIG_Severa_ha / LAPIG_total_ha
pct_ausente = LAPIG_Ausente_ha / LAPIG_total_ha

classe_7 = pastagem_total_rgint × pct_inter
classe_8 = pastagem_total_rgint × pct_severa
classe_9 = pastagem_total_rgint × pct_ausente
```

**Fontes no pipeline por classe:**

**`pipeline_diagonal`** (primária para todas):
- Base área: MB classe 15
- Proporções: LAPIG Col.9 vigor por RGINT/ano

**`lapig_vigor`** (fallback):
- `lapig_vigor_classe7` = LAPIG `area_past_ha` da classe "Intermediário" em hectares absolutos
- `lapig_vigor_classe8` = LAPIG `area_past_ha` da classe "Severa"
- `lapig_vigor_classe9` = LAPIG `area_past_ha` da classe "Ausente"
- Estes valores são as **áreas LAPIG brutas**, não proporcionadas pelo MB. São sistematicamente maiores que o `pipeline_diagonal` (~2×), refletindo o universo de pastagem maior do LAPIG.

**`mb_pastagem_total`** (referência raw MB):
- `MB_Pastagem_ha` do CRUZAMENTO, agregado por RGINT
- Representa o total de pastagem MB antes do split por vigor
- Disponível apenas para anos pares (2008, 2010, ..., 2022) e RGINTs com cobertura TerraClass
- Útil para verificar a consistência interna: `classe_7 + classe_8 + classe_9 ≈ mb_pastagem_total`

**`tc_pastagem`** (referência raw TC):
- Soma `Pastagem_Herbacea + Pastagem_Arbustiva_Arborea` do CRUZAMENTO
- Bienal, AMZ/CER apenas
- Inclui pastagem arbustiva que o MB pode classificar como savana

**Divergência entre fontes — detalhamento:**

| Fonte | O que mede | Universo de pastagem |
|---|---|---|
| `pipeline_diagonal` | MB classe 15 × proporção LAPIG | MB (restrito) |
| `lapig_vigor` | Área LAPIG por vigor (bruta) | LAPIG (amplo) |
| `mb_pastagem_total` | MB classe 15 total | MB (restrito) |
| `tc_pastagem` | TC herbácea + arbustiva | TC (AMZ/CER, bienal) |

A relação esperada entre as fontes: `lapig_vigor_total ≈ 2× pipeline_diagonal_total` para a maioria das RGINTs. Esta diferença é **constante no tempo** (não é tendência de conversão de uso), indicando divergência metodológica sistemática e não mudança real de uso da terra.

---

### 5.8 Classe 10 — Silvicultura

**Label:** `silvicultura`  
**Grupo:** Florestal  
**Descrição:** Florestas plantadas comerciais: eucalipto, pinus, teca, outras espécies exóticas e nativas para fins industriais ou energéticos.

**Fonte primária — `pipeline_diagonal`:**
- MapBiomas Col.10 class_id: **9** (Forest Plantation)
- Qualidade: **primária**

**Fontes alternativas:** Nenhuma disponível. O IBGE PAM não coleta área de silvicultura de forma equivalente. O IBGE Silvicultura (PEVS) usa como unidade declarante o estabelecimento, não compatível com RGINT.

---

### 5.9 Classe 11 — Vegetação Primária Florestal

**Label:** `veg_prim_florestal`  
**Grupo:** Vegetação  
**Descrição:** Vegetação primária (não perturbada ou com perturbação anterior à série histórica) em formação florestal — florestas ombrófilas, florestas estacionais, florestas de igapó, etc.

**Fonte primária — `pipeline_diagonal`:**
- Base área: MB formações florestais (classes 11, 3, 4, 5, 6 MB — floresta nativa total)
- Proporção primária: TerraClass `Veg_Florestal_Primaria / (Veg_Florestal_Primaria + Veg_Florestal_Secundaria)` por RGINT/ano
- `classe_11 = MB_floresta_total × pct_prim_TC`
- Para anos sem TerraClass (ímpares, regiões fora de AMZ/CER): interpolação linear entre levantamentos TC adjacentes
- Para biomas sem TC (Mata Atlântica, Caatinga, Pampa): classificação direta MB sem split TC
- Qualidade: **primária**

**Fontes alternativas:**
- `mb_floresta_total`: total MB floresta do CRUZAMENTO (bienal, AMZ/CER)
- `tc_floresta_prim`: coluna `Veg_Florestal_Primaria` do CRUZAMENTO (bienal, AMZ/CER)

**Relação entre fontes:**
```
pipeline_diagonal_classe11 ≈ mb_floresta_total × (tc_floresta_prim / (tc_floresta_prim + tc_floresta_sec))
```
A verificação desta identidade é um teste de consistência da diagonal.

---

### 5.10 Classe 12 — Vegetação Secundária Florestal

**Label:** `veg_sec_florestal`  
**Grupo:** Vegetação  
**Descrição:** Vegetação em regeneração ou anteriormente perturbada em formação florestal — capoeiras, segundas matas, florestas em regeneração pós-desmatamento.

**Fonte primária — `pipeline_diagonal`:**
- `classe_12 = MB_floresta_total × pct_sec_TC`
- `pct_sec_TC = Veg_Florestal_Secundaria / (Veg_Florestal_Primaria + Veg_Florestal_Secundaria)`
- Para Amazônia: a classe 11 do MB (Formação Florestal secundária) é tratada como 100% vegetação secundária
- Qualidade: **primária**

**Fontes alternativas:**
- `mb_floresta_total`: total MB floresta (mesma série que para classe 11)
- `tc_floresta_sec`: coluna `Veg_Florestal_Secundaria` do CRUZAMENTO

---

### 5.11 Classe 13 — Vegetação Primária Não-Florestal

**Label:** `veg_prim_nflorestal`  
**Grupo:** Vegetação  
**Descrição:** Vegetação natural primária em formação não-florestal — savanas, campos nativos, cerrado sentido estrito, campos rupestres.

**Fonte primária — `pipeline_diagonal`:**
- Base área: MB formações savânicas (classes 12, 11 MB savânicas — cerrado/savana total)
- `pct_savana = MB_Savana / (MB_Floresta + MB_Savana)` (proporção de savana no total de vegetação nativa)
- `pct_prim_nf = Natural_Nao_Florestal / MB_vegetacao_nao_florestal` (TC)
- `classe_13 = MB_savana_total × pct_prim_nf_TC`
- Para Amazônia: classe 14 = zero (não há savana primária relevante na AMZ)
- Para Cerrado 2008–2017: extrapolação do valor TC de 2018 para anos anteriores
- Qualidade: **primária**

**Fontes alternativas:**
- `mb_savana_total`: total MB savana do CRUZAMENTO (bienal, AMZ/CER)
- `tc_nao_florestal`: coluna `Natural_Nao_Florestal` do CRUZAMENTO

---

### 5.12 Classe 14 — Vegetação Secundária Não-Florestal

**Label:** `veg_sec_nflorestal`  
**Grupo:** Vegetação  
**Descrição:** Vegetação em regeneração em formação não-florestal — cerrado em regeneração, campo sujo em recuperação.

**Fonte primária — `pipeline_diagonal`:**
- `classe_14 = MB_savana_total × pct_sec_nf_TC`
- Amazônia: classe 14 = zero por definição metodológica
- Cerrado 2008–2017: extrapolação do TC 2018

**Fontes alternativas:**
- `mb_savana_total`: mesma série que classe 13
- `tc_nao_florestal`: mesma coluna que classe 13 (ambas derivam de `Natural_Nao_Florestal`)
- Nota: classes 13 e 14 compartilham a mesma fonte TC raw — a diferenciação é feita apenas pelo `pct_prim` vs. `pct_sec` da diagonal

---

### 5.13 Classe 15 — Outro

**Label:** `outro`  
**Grupo:** Outros  
**Descrição:** Categoria residual: corpos d'água, áreas urbanizadas, mineração, aquicultura e outros usos não classificáveis nas categorias anteriores.

**Fonte primária — `pipeline_diagonal`:**
- MapBiomas Col.10 class_ids: **24** (Urban Area), **30** (Mining), **31** (Aquaculture), **33** (River, Lake and Ocean)
- Nota especial: a classe 12 MB original (Várzea/Floodplain) foi reclassificada para a classe 15 ABIOVE, por decisão metodológica da equipe NIPE
- Qualidade: **primária**

**Fontes alternativas:** Nenhuma disponível.

---

## 6. Divergências Conhecidas Entre Fontes

### 6.1 LAPIG vs. MapBiomas para Pastagem (~2× sistemático)

**Magnitude:** O total de pastagem LAPIG (soma das três classes de vigor por RGINT) é sistematicamente **cerca de 2 vezes maior** que a área da classe 15 do MapBiomas para a mesma RGINT e ano.

**Comportamento temporal:** A razão LAPIG/MB é **constante ao longo dos anos** para a maioria das RGINTs, indicando que não se trata de um problema de tendência ou de mudança de uso, mas de uma **diferença sistemática de definição**.

**Causas identificadas:**

1. **Definição de pastagem:** O LAPIG (Pastagem.BR) considera como pastagem toda área com cobertura herbácea dominada por gramíneas forrageiras, incluindo:
   - Pastagens com arbustos e árvores esparsas (savana pastejada)
   - Pastagens em estágio inicial de degradação ainda com algum dossel
   - Antigas pastagens em regeneração incipiente
   
   O MapBiomas classe 15 aplica algoritmo Random Forest com features espectrais e temporais que excluem estas áreas ambíguas, classificando-as como:
   - Classe 12 (Savana Formation) — quando há cobertura arbórea/arbustiva significativa
   - Classe 21 (Mosaic of Uses) — quando há alternância de cultivo e pastagem

2. **Resolução espacial:** O LAPIG usa Sentinel-2 (10m) e MODIS (250m/500m), enquanto o MB usa Landsat (30m). A maior resolução do Sentinel-2 permite detectar pastagens em fragmentos menores e em bordas de propriedades.

3. **Época de análise:** Diferenças na data-base de imagens podem gerar divergências em regiões com sazonalidade pronunciada (ex: pastagens do Norte secam mais no período seco, podendo ser reclassificadas como solo exposto pelo MB).

**Implicação para análise:**
- A Classe ABIOVE 7+8+9 (pastagens) usa MB como universo total e LAPIG apenas para proporções de vigor
- A série `lapig_vigor` no gráfico representa as áreas LAPIG brutas — sempre maiores que o `pipeline_diagonal`
- A comparação entre `pipeline_diagonal` e `lapig_vigor` é útil para entender a incerteza associada ao mapeamento de pastagens
- Nenhuma das duas estimativas deve ser tratada como "verdade absoluta"

---

### 6.2 PAM vs. MapBiomas para Culturas Agrícolas

**Natureza da divergência:** PAM mede **área plantada** (declaração administrativa) enquanto MB mede **área mapeada por satélite** (pixels classificados). São conceitualmente distintos.

| Aspecto | PAM/IBGE | MapBiomas |
|---|---|---|
| Método | Declarativo (entrevista com produtor ou secretaria rural) | Satélite + machine learning |
| Unidade | Município declarante | Pixel georreferenciado |
| Cobertura | Toda área plantada (mesmo não detectável) | Apenas áreas com assinatura espectral detectada |
| Data-base | Ano civil ou safra | Data de imageamento (época específica) |
| Resolução | Municipal (sem informação intra-municipal) | 30m (Landsat) |

**Divergências típicas observadas:**
- **Soja:** PAM ≈ MB × 1.0–1.15. PAM levemente maior por incluir lavouras pequenas e áreas com obstrução de nuvens.
- **Milho:** PAM >> MB. O MB subestima sistematicamente milho por confusão com outras culturas temporárias, pastagens degradadas e mosaicos.
- **Cana:** PAM ≈ MB × 1.0–1.10. Divergência menor, pois canaviais são espectralmente distintos.
- **Culturas perenes (café):** PAM café > MB classes 46+47+48, pois o MB subestima cafezais sombreados e de pequeno porte.

**Implicação metodológica:** Para soja e cana, o `pipeline_diagonal` (base MB) e o `conab_pam` (PAM) são comparáveis e a diferença é informativa. Para milho, o `pipeline_diagonal` das classes 3 e 4 usa PAM como base (não MB), precisamente porque o MB subestima sistematicamente o milho.

---

### 6.3 TerraClass: Lacunas Temporais e Geográficas

**Lacunas geográficas:**
- TerraClass cobre **apenas Amazônia Legal e Cerrado** (~70% do território nacional)
- Mata Atlântica, Caatinga, Pampa e Pantanal **não têm cobertura TC**
- RGINTs nestes biomas sem TC: classes 11–14 usam apenas MB (sem split primário/secundário pelo TC)
- As fontes `tc_floresta_prim`, `tc_floresta_sec`, `tc_nao_florestal`, `tc_pastagem` retornam `null` para RGINTs fora de AMZ/CER

**Lacunas temporais:**
- TC é bienal (apenas anos pares): 2008, 2010, 2012, 2014, 2016, 2018, 2020, 2022
- Anos ímpares 2009, 2011, ..., 2021 e o ano 2023 **não têm dado TC direto**
- O `pipeline_diagonal` interpola linearmente as proporções TC entre levantamentos consecutivos para anos intermediários
- As fontes raw `tc_*` no gráfico mostram `null` para anos ímpares — os pontos ficam ausentes na linha

**Implicação para interpretação:**
- A linha `TC Floresta Primária` no gráfico mostrará apenas 8 pontos (anos pares 2008–2022), com intervalos ausentes
- A linha `Pipeline MB/TC` mostrará todos os anos porque interpola as proporções TC nos intervalos

---

### 6.4 CONAB Milho: Ausência de Split 2008–2016

**Situação:** O LevantamentoGrãos CONAB com a coluna `safra` discriminando 1ª e 2ª safra está disponível apenas a partir do ano agrícola 2017/18 (dados de 2017 em diante).

**Comportamento do pipeline 2008–2016:**
- `pct_2a = None` para todos os anos < 2017
- `milho_split_series()` retorna o total PAM milho sem split para ambas as classes 3 e 4
- **As classes 3 e 4 apresentam valores idênticos para 2008–2016** — ambas mostram o total de milho PAM
- A partir de 2017, as classes se diferenciam conforme o split CONAB

**Implicação para análise:** Qualquer tendência ou variação observada nas classes 3 e 4 para o período 2008–2016 deve ser interpretada com cautela, pois os valores são artificialmente iguais. A diferenciação real começa em 2017.

**Dados alternativos:** Séries históricas CONAB de safras de milho por UF existem para anos anteriores a 2017 (SerieHistóricaGrãos.txt inclui dados desde 1976/77), mas a coluna `safra` não está disponível no arquivo de série histórica — apenas no LevantamentoGrãos.

---

### 6.5 CONAB Café: Proxy de Alocação UF→RGINT

**Situação:** O dado CONAB café está em nível UF (estado). Para alocar ao RGINT, o pipeline usa a área de milho PAM do RGINT como proxy da distribuição geográfica do café.

**Justificativa do proxy:** Assume-se que municípios com maior atividade agrícola geral (medida pelo milho) também concentram maior área de culturas permanentes. Isso é uma aproximação — o milho e o café têm distribuições geográficas muito diferentes em vários estados.

**Casos problemáticos:**
- **Minas Gerais:** O café se concentra no Sul de MG e Zona da Mata, mas o milho é distribuído por todo o estado. A alocação via milho distribui café uniformemente, subestimando regiões especializadas.
- **Espírito Santo:** Produção de café concentrada no interior (conilon), milho mais difuso.
- **São Paulo:** Café historicamente concentrado no interior paulista, milho em todo o estado.

**Implicação:** A série `conab_cafe` nos gráficos de RGINT deve ser interpretada como uma estimativa de ordem de grandeza da área de café na região, não como uma alocação precisa.

---

## 7. Limitações Gerais e Caveats

### 7.1 Consistência Temporal das Fontes

As fontes têm defasagens e limites temporais distintos:

| Classe | 2008–2016 | 2017–2023 | 2024 |
|---|---|---|---|
| 1 — Perenes | MB anual + CONAB | MB anual + CONAB | CONAB apenas |
| 2 — Soja | MB anual + PAM | MB anual + PAM | PAM estimado |
| 3 — Soja+Milho 2a | MB+PAM (sem split CONAB) | MB+PAM+CONAB split | PAM+CONAB |
| 4 — Milho 1a | PAM (sem split) | PAM+CONAB split | PAM+CONAB |
| 5 — Cana | MB anual + PAM | MB anual + PAM | PAM estimado |
| 6 — Outra agro | MB anual | MB anual | Não disponível |
| 7–9 — Pastagem | MB+LAPIG (anual) | MB+LAPIG (anual) | Não disponível |
| 10 — Silvicultura | MB anual | MB anual | Não disponível |
| 11–14 — Vegetação | MB+TC (TC bienal) | MB+TC (TC bienal) | Não disponível |
| 15 — Outro | MB anual | MB anual | Não disponível |

### 7.2 Soma das Classes por RGINT

A soma das 15 classes ABIOVE por RGINT e ano **não necessariamente é igual à área total da RGINT**, pois:
- Classes derivadas de proporções (7–9, 11–14) podem não fechar exatamente por arredondamento
- Corpos d'água, várzeas e áreas sem dado em alguns anos podem gerar lacunas
- A área total da RGINT varia conforme a fonte: limites IBGE, área efetivamente mapeada pelo MB, etc.

### 7.3 Valores Nulos vs. Zero

No JSON multi-fonte, valores `null` e `0` têm significados distintos:
- `null` — dado não disponível para aquele ano/fonte (ex: TC em anos ímpares, CONAB antes de 2017)
- `0` — dado disponível e indica ausência real da classe (ex: classe 13 = 0 na Amazônia por definição)

Análises estatísticas devem tratar `null` como dado ausente (excluir do cálculo), não como zero.

### 7.4 Ano de 2024

O ano de 2024 é coberto apenas por fontes administrativas (CONAB SafraHistóricaCafe, PAM se disponível). As fontes de sensoriamento remoto (MapBiomas, TerraClass, LAPIG) não cobrem 2024. O `pipeline_diagonal` para 2024 é uma **extrapolação administrativa**, não uma estimativa de satélite.

### 7.5 Modificações no Pipeline que Afetam Resultados

Alterações nos parâmetros do pipeline que modificam os resultados:
1. **YEARS**: atualmente `list(range(2008, 2025))` — alterar este parâmetro afeta todas as séries
2. **pct_2a**: se o LevantamentoGrãos for atualizado com safras mais recentes, reprocessar `01_load_sources.py` e `02_build_multisource_json.py`
3. **CRUZAMENTO**: o arquivo `CRUZAMENTO_TC_MB_CORRETO_v3.csv` é estático — se atualizado, reprocessar
4. **Matrizes diagonais**: atualizações nas planilhas RGINT Excel requerem reprocessamento de todos os JSONs

---

## 8. Glossário Técnico

**ABIOVE** — Associação Brasileira das Indústrias de Óleos Vegetais.

**Área colhida** — Área efetivamente colhida na safra, em hectares. Pode ser menor que área plantada por perdas.

**Área plantada** — Área total onde a cultura foi semeada ou plantada na safra, em hectares. Dado declarativo PAM/IBGE.

**CONAB** — Companhia Nacional de Abastecimento. Empresa pública federal responsável pelo acompanhamento e divulgação das safras brasileiras.

**Diagonal do pipeline** — Estimativa integrada de área por classe ABIOVE, derivada da combinação de MapBiomas (pixel de satélite) e TerraClass (proporções de vegetação), pré-calculada como matriz de transição.

**IBGE** — Instituto Brasileiro de Geografia e Estatística.

**INPE** — Instituto Nacional de Pesquisas Espaciais.

**LAPIG** — Laboratório de Processamento de Imagens e Geoprocessamento, Universidade Federal de Goiás.

**LevantamentoGrãos** — Relatório mensal da CONAB com estimativas de produção de grãos por UF, discriminando 1ª e 2ª safra de milho.

**LULC** (*Land Use and Land Cover*) — Uso e Cobertura da Terra.

**MapBiomas** — Projeto colaborativo brasileiro de mapeamento anual do uso e cobertura da terra por meio de classificação automática de imagens de satélite (Landsat).

**Matrizes de transição** — Matriz onde cada célula (i,j) representa a área que transitou da classe i para a classe j entre dois períodos. A "diagonal" (células i=j) representa a área que permaneceu na mesma classe.

**NIPE** — Núcleo Interdisciplinar de Planejamento Energético, UNICAMP.

**PAM** — Pesquisa Agrícola Municipal, levantamento anual do IBGE sobre produção agrícola.

**Pipeline** — Sequência de scripts de processamento de dados: 01_load_sources → 02_build_multisource_json → 03_generate_reports.

**Pipeline diagonal** — Ver "Diagonal do pipeline".

**pct_2a** — Proporção da área de milho 2ª safra em relação ao total de milho por UF/ano, calculada a partir do LevantamentoGrãos CONAB.

**PRODES** — Programa de Monitoramento da Floresta Amazônica Brasileira por Satélite, INPE. Fornece a máscara de floresta primária usada pelo TerraClass.

**RGINT** — Região Geográfica Intermediária. Unidade de planejamento regional do IBGE (2017), composta por múltiplos municípios. O Brasil possui 133 RGINTs.

**Safrinha** — Denominação popular para a 2ª safra de milho no Brasil, plantada após a colheita da soja no verão.

**Sensoriamento remoto** — Técnica de obtenção de informações sobre objetos ou áreas sem contato direto, tipicamente por imagens de satélite.

**TerraClass** — Projeto do INPE para mapeamento bienal detalhado do uso da terra em áreas desmatadas da Amazônia Legal e do Cerrado.

**UF** — Unidade da Federação (estado brasileiro).

**Vigor de pastagem** — Medida da qualidade da pastagem baseada em índices de vegetação. LAPIG classifica em: Ausente (alta produtividade), Intermediário (degradação moderada), Severa (degradação acentuada).

---

## 9. Referências

**MapBiomas:**
- MapBiomas Project (2024). *Collection 10 of the Annual Series of Land Use and Land Cover Maps of Brazil*. Disponível em: https://mapbiomas.org
- Souza et al. (2020). Reconstructing Three Decades of Land Use and Land Cover Changes in Brazilian Biomes with Landsat Archive and Earth Engine. *Remote Sensing*, 12(17), 2735. https://doi.org/10.3390/rs12172735

**TerraClass:**
- Almeida, C. A. et al. (2016). High spatial resolution land use and land cover mapping of the Brazilian Legal Amazon in 2008 using Landsat-5/TM and MODIS data. *Acta Amazonica*, 46(3), 291–302.
- INPE. *TerraClass — Mapeamento do uso e da cobertura da terra na Amazônia Legal*. Disponível em: http://www.inpe.br/cra/projetos_pesquisas/dados_terraclass.php

**LAPIG — Atlas de Pastagens:**
- Laboratório de Processamento de Imagens e Geoprocessamento (LAPIG/UFG). *Atlas das Pastagens Brasileiras — Coleção 9*. Disponível em: https://atlasdepastagens.com.br
- Dias, L. C. P. et al. (2016). Patterns of land use, extensification, and intensification of Brazilian agriculture. *Global Change Biology*, 22(8), 2887–2903.

**PAM/IBGE:**
- IBGE. *Pesquisa Agrícola Municipal (PAM)*. Sistema SIDRA. Disponível em: https://sidra.ibge.gov.br/pesquisa/pam/tabelas

**CONAB:**
- CONAB. *Série Histórica de Área Plantada, Produtividade e Produção*. Disponível em: https://www.conab.gov.br/info-agro/safras/serie-historica-das-safras

**IBGE — RGINTs:**
- IBGE (2017). *Regiões Geográficas Imediatas e Regiões Geográficas Intermediárias: 2017*. Rio de Janeiro: IBGE. ISBN 978-85-240-4423-3.

---

*Documento gerado automaticamente pelo pipeline ABIOVE LULC 2026 — NIPE/UNICAMP. Para questões metodológicas, contatar: lucasnc@unicamp.br*
