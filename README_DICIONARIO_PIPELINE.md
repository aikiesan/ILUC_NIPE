# ABIOVE Biocombustíveis 2026 - Dicionário de Dados e Organização do Pipeline
## Pasta raiz: 05_FINAL_INTEGRATION_DATA
Gerado em: 07/05/2026
Responsável: Lucas Nakamura Cerejo - NIPE/CP2b UNICAMP
Projeto: Insumos para Modelo GTAP - Matrizes de Transição LULC 15 Classes

---

## Visão Geral

Este diretório concentra todos os dados, scripts e resultados da Fase 2 do pipeline
ABIOVE 2026 - construção das matrizes de transição LULC em 15 classes para as 133
Regiões Geográficas Intermediárias (RGINT) do Brasil, cobrindo 16 pares de anos (2008-2024).

---

## Estrutura de Pastas

### 01_Base_Matrices_RGINT/
Matrizes originais de 12 classes - ground truth MapBiomas Col.10

- Padrão: ILUC_matrix_RGINT{ID}_{Nome}.xlsx
- 133 arquivos, um por RGINT | 16 abas por arquivo | Dimensão: 12x12 classes
- Estas matrizes são imutáveis - conservação de área garantida
- Fonte: MapBiomas Col.10, ArcGIS Pro (zonal statistics sobre rasters de transição 30m)

---

### 02_Spatial_Lookups/
Tabelas de correspondência espacial RGINT -> municipios

Arquivo: regioes_geograficas_composicao_por_municipios_2017_20180911.xlsx
Colunas-chave: nome_mun, CD_GEOCODI, cod_rgint, nome_rgint
Fonte: IBGE 2017

---

### 03_Pasture_Vigor_LAPIG/
Atlas de Pastagens - vigor por municipio e ano

- Padrão: brasil_pasture_vigor_col9_s100_year=YYYY.csv
- Anos: 2008-2023 (todos os anos)
- Colunas: geocod_mun (float64->Int64), classe, area_past_ha
- Classes: Ausente->9 (baixa) | Intermediário->7 (media) | Severa->8 (alta)
- ATENCAO: geocod_mun em float64 - cast para Int64 antes de qualquer join
- Fonte: LAPIG/UFG - https://pastagem.org

---

### 04_Vegetation_TerraClass/
TerraClass - proporção vegetação primária/secundária

Arquivo TC_AMZ_AC_harmonizado.csv: Amazonia (Acre) | Anos: 2008,2010,...,2022
  Colunas: Veg_Florestal_Primaria, Veg_Florestal_Secundaria, Natural_Nao_Florestal

Arquivo TC_AMZ_AMAZONIA_LEGAL_harmonizado.csv: Amazonia Legal | Anos: 2008,2010,...,2022
  Colunas: idem acima

Arquivo TC_CER_CERRADO_harmonizado.csv: Cerrado | Anos: 2018,2020,2022,2024
  Colunas: Veg_Natural_Primaria, Veg_Natural_Secundaria

Regras:
- Chave de join: CD_MUN (int64)
- Anos impares: interpolacao linear entre anos pares adjacentes
- Cerrado 2008-2017: extrapolacao regressiva com valor de 2018
- Fonte: INPE TerraClass - mascara PRODES - http://www.inpe.br/terraclass

---

### 05_Agro_Subdivisions/
Dados agricolas - split por safra e cultura

PAM_RGINT_COMPLETO.csv: Area total milho/soja/cana por RGINT/ano (PAM/IBGE)
tabela5457.csv: Area plantada por municipio 2008-2014 (SIDRA IBGE)
tabela5457 (1).csv: Area plantada por municipio 2015-2024 (SIDRA IBGE)
Dados_CONAB.xlsx: Serie historica graos por safra e UF (aba: Serie Historica Graos)
CONAB_GRAOS_CANA_UF_2008_2024.csv: Soja, milho, cana por UF/ano
COMPARATIVO_PAM_CONAB_MILHO_UF.csv: Comparativo PAM x CONAB milho

Logica de split milho:
  pct_2a = milho_2a_CONAB(UF, ano) / total_milho_CONAB(UF, ano)
  milho_2a_RGINT = PAM_milho_RGINT(ano) x pct_2a  -> Classe 3
  milho_1a_RGINT = PAM_milho_RGINT(ano) x pct_1a  -> Classe 4 (diagonal only)

Validacao: ratio SIDRA/PAM = 1.0 confirmado para milho total 2008-2024

---

### 06_Reconciliation_Logic/
Cruzamentos e dicionários de validacao

CRUZAMENTO_TC_MB_CORRETO_v3.csv: Crosswalk MapBiomas x TerraClass por municipio/ano
CONSOLIDADO_IBGE_MB_TC_PAM.csv: Mestre MB + PAM + TC totais e ratios por bioma/cultura/ano

---

### 06_Scripts_and_Logics/
Scripts Python do pipeline

pipeline_15classes_v2.ipynb: Notebook principal - pipeline completo 133 RGINTs
LOG_processamento_133_RGINTs.csv: Log de execucao com status e tempo por RGINT

---

### 07_MATRIZES_15_CLASSES_FINAL/
Produtos finais - matrizes 15 classes

GOLDEN_ILUC_15_Classes_RGINT_1201.xlsx: Golden standard - Rio Branco (AC) - Amazonia
GOLDEN_ILUC_15_Classes_RGINT_5101.xlsx: Golden standard - Cuiaba (MT) - Cerrado
TEMPLATE_ILUC_15Classes_ABIOVE2026_RGINT5101.xlsx: Template Excel com 4 abas fixas + matriz dinamica
ALL_RGINTS/ILUC_15Classes_RGINT*.xlsx: 133 matrizes processadas (uma por RGINT)
LOG_processamento_133_RGINTs.csv: Log de validacao - conservacao de area 16/16

---

## Mapeamento de Classes - MapBiomas Col.10 -> 15 Classes Alvo

Classe 1  - Culturas perenes:      class_ids 46,47,48 | MB cobertura | Diagonal only
Classe 2  - Soja:                  class_id 39        | MB + CONAB   | Matriz completa x (1-pct_2a)
Classe 3  - Soja+Milho 2a:         class_id 39 split  | MB+CONAB+PAM | Matriz completa x pct_2a
Classe 4  - Milho 1a safra:        PAM (sem MB)        | PAM x CONAB  | Diagonal only
Classe 5  - Cana:                  class_id 20        | MB cobertura | Diagonal only
Classe 6  - Outra agro:            class_ids 40,41,62,21 | MB cobertura | Diagonal only
Classe 7  - Past. deg. media:      class_id 15 LAPIG Intermediario | Proporcional matriz
Classe 8  - Past. deg. alta:       class_id 15 LAPIG Severa        | Proporcional matriz
Classe 9  - Past. deg. baixa:      class_id 15 LAPIG Ausente       | Proporcional matriz
Classe 10 - Silvicultura:          class_id 9         | MB cobertura | Diagonal only
Classe 11 - Veg. prim. flor.:      class_ids 3,4,6 TC | TerraClass pct_prim x floresta
Classe 12 - Veg. sec. flor.:       class_ids 3,4,6 TC | TerraClass pct_sec x floresta
Classe 13 - Veg. prim. n-flor.:    class_ids 11,12,29 TC | TerraClass pct_prim x savana
Classe 14 - Veg. sec. n-flor.:     class_ids 11,12,29 TC | TerraClass pct_sec x savana
Classe 15 - Outro:                 class_ids 24,25,30,31,33,23 | MB cobertura | Diagonal only
            (urbano, outras nao-veg, mineracao, aquicultura, agua, praia/duna)

---

## Roteamento por Bioma

Amazonia   (23 RGINTs): TC AMZ 2008-2022, interpolacao linear anos impares
Cerrado    (29 RGINTs): TC CER 2018-2024, extrapolacao 2008-2017 com valor 2018
Mata Atlantica (53): sem TerraClass - fallback MB class_ids 3+4+6 vs 11
Caatinga   (25 RGINTs): sem TerraClass - fallback MB class_ids 3+4+6 vs 11
Pampa       (3 RGINTs): sem TerraClass - fallback MB class_ids 3+4+6 vs 11

---

## Validacoes Realizadas

- Conservacao de area: |diff| < 0.01 ha em 16/16 pares x 133 RGINTs = 2.128 verificacoes OK
- Diagonais ficticias: eliminadas para classes 9/10 (veg) e 2/3 (soja)
- Proporcoes CONAB: ratio milho_2a/soja_MB < 1.0 em todos os anos e RGINTs
- SIDRA x PAM: ratio = 1.0 confirmado para milho total

---

## Pendencias e Integracoes Futuras

1. Serasa/ABIOVE: dados de talhaço para 2008, 2017 e 2024
2. Biomas sem TerraClass: validacao adicional com dados PRODES por bioma
3. RGINTs multi-UF: ponderacao CONAB por area municipal por UF
4. Escalonamento para modelo GTAP: agregacao das 133 matrizes por regiao GTAP
5. Classe 15: validacao cruzada com modulos especializados MB (agua Col4, mineracao Col9, urbano Col10)

---

## Fontes e Referencias

MapBiomas Col.10:    https://mapbiomas.org | DOI: 10.58053/MapBiomas/JNJGVT
TerraClass INPE:     http://www.inpe.br/terraclass
PRODES INPE:         http://www.obt.inpe.br/OBT/assuntos/programas/amazonia/prodes
LAPIG Pastagens:     https://pastagem.org
PAM IBGE SIDRA 5457: https://sidra.ibge.gov.br/tabela/5457
CONAB Serie Hist.:   https://www.conab.gov.br/info-agro/safras/serie-historica
IBGE RGINTs 2017:    https://www.ibge.gov.br/geociencias/organizacao-do-territorio/divisao-regional
