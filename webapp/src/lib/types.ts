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
