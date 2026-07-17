/** Shared data types mirroring the generated /data artifacts. */

export interface RegionMeta {
  id: string;
  nome: string;
  uf: string;
  bioma_principal: string;
  area_ha: number;
  n_municipios: number;
  lat_centroide: number;
  lon_centroide: number;
}

export interface RegionIndicator {
  rgint_id: string;
  nome: string;
  uf: string;
  bioma: string;
  pressao_ha: number;
  regeneracao_ha: number;
  balanco_ha: number;
  area_agro_2024: number;
  ranking_pressao: number;
  soja_2024_ha: number;
}

export interface NationalTimeseriesRow {
  ano: number;
  classe: string;
  area_ha: number;
  bioma: string;
}

export interface NationalTransitionRow {
  periodo: string;
  origem_id: string;
  origem_nome: string;
  destino_id: string;
  destino_nome: string;
  area_ha: number;
}

export interface RegionTransitionRow {
  ano_par: string;
  origem_id: string;
  destino_id: string;
  area_ha: number;
}

export interface PamRow {
  ano: number;
  cultura: string;
  area_ha: number;
}

export interface SourceData {
  values: (number | null)[];
  years: number[];
  quality?: string;
  notes?: string;
}

export interface RegionFullData {
  metadata: { rgint: string; nome: string; uf: string; biome: string; area_ha: number };
  classes: Record<string, Record<string, SourceData>>;
}

/** class -> { year -> area_ha } */
export type RegionSeries = Record<string, Record<string, number | null>>;

export interface RegionMatrix {
  metadata: { rgint: string; nome: string; uf: string; biome: string };
  anchor_years: number[];
  years: number[];
  classes: string[];
  matrices: Record<string, Record<string, Record<string, number | null>>>;
}

export interface IndexEntry {
  rgint: string;
  nome: string;
  uf: string;
  biome: string;
  label: string;
}

/** One regional cut of the direct/indirect soy-conversion split. */
export interface DirectIndirectCut {
  direta_ha: number;
  indireta_ha: number;
  total_ha: number;
  /** Share of total that is direct (native veg → soy); null when total is 0. */
  pct_direta: number | null;
  /** false when total volume is statistically negligible (divide-by-noise). */
  reliable: boolean;
}

/** direct_indirect_soy.json: per GTAP period, a map of cut name → split. */
export interface DirectIndirectData {
  periodos: Record<string, { recortes: Record<string, DirectIndirectCut> }>;
}
