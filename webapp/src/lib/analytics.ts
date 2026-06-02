import { NATIVE_CLASSES, PASTURE_CLASSES } from "./classes";
import type { NationalTimeseriesRow, RegionIndicator } from "./types";

/**
 * D3 report reference — national accumulated 2008–2024, transition-based
 * methodology (D3 §3.3). These are the authoritative figures the consolidated
 * 133-region matrices should reproduce; today's stock-based indicators are a
 * proxy until the full matrices land. Kept as a single source of truth for the
 * parity guard (see analytics.parity.test.ts).
 */
export const D3_NATIONAL_REFERENCE = {
  pressao_ha: 38_392_587,
  regeneracao_ha: 487_648,
  balanco_ha: -37_904_939,
  razao_pressao_regeneracao: 78.7,
} as const;

export interface NationalSummary {
  pressao_ha: number;
  regeneracao_ha: number;
  balanco_ha: number;
  /** Pressure-to-regeneration ratio (0 when there is no regeneration). */
  razao: number;
  regioes: number;
}

/** Aggregate the per-region indicators into national totals. */
export function nationalSummary(rows: RegionIndicator[]): NationalSummary {
  let pressao = 0;
  let regen = 0;
  let balanco = 0;
  for (const r of rows) {
    pressao += Number(r.pressao_ha) || 0;
    regen += Number(r.regeneracao_ha) || 0;
    balanco += Number(r.balanco_ha) || 0;
  }
  return {
    pressao_ha: pressao,
    regeneracao_ha: regen,
    balanco_ha: balanco,
    razao: regen > 0 ? pressao / regen : 0,
    regioes: rows.length,
  };
}

/** Group the 15 classes into the high-level categories used by the donut. */
export function classGroup(cls: string): string {
  const num = Number(cls.split(" - ")[0]);
  if (num === 15) return "Outro";
  if (num >= 11) return "Vegetação nativa";
  if (num >= 7 && num <= 9) return "Pastagem";
  if (num === 2) return "Soja";
  if (num === 6) return "Outra agropecuária";
  if (num === 10) return "Silvicultura";
  return "Outras lavouras";
}

export const GROUP_ORDER = [
  "Vegetação nativa",
  "Pastagem",
  "Soja",
  "Outras lavouras",
  "Outra agropecuária",
  "Silvicultura",
  "Outro",
];

/** National composition (ha by group) for the most recent available year. */
export function compositionLatestYear(rows: NationalTimeseriesRow[]): {
  year: number;
  groups: { name: string; value: number }[];
  total: number;
} {
  const year = Math.max(...rows.map((r) => r.ano));
  const byGroup = new Map<string, number>();
  let total = 0;
  for (const r of rows) {
    if (r.ano !== year || r.area_ha == null) continue;
    const g = classGroup(r.classe);
    byGroup.set(g, (byGroup.get(g) ?? 0) + r.area_ha);
    total += r.area_ha;
  }
  const groups = GROUP_ORDER.filter((g) => byGroup.has(g)).map((name) => ({
    name,
    value: byGroup.get(name)!,
  }));
  return { year, groups, total };
}

/** Native-vegetation total (Mha) per year per biome. */
export function nativeByBiomeYear(
  rows: NationalTimeseriesRow[],
  biomes: string[],
): { ano: number;[biome: string]: number }[] {
  const nativeSet = new Set<string>(NATIVE_CLASSES);
  const byYear = new Map<number, Record<string, number>>();
  for (const r of rows) {
    if (!nativeSet.has(r.classe) || r.area_ha == null || !biomes.includes(r.bioma)) continue;
    const entry = byYear.get(r.ano) ?? {};
    entry[r.bioma] = (entry[r.bioma] ?? 0) + r.area_ha;
    byYear.set(r.ano, entry);
  }
  return [...byYear.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([ano, vals]) => {
      const out: { ano: number;[biome: string]: number } = { ano };
      for (const b of biomes) out[b] = (vals[b] ?? 0) / 1_000_000;
      return out;
    });
}

export const _pasture = PASTURE_CLASSES; // re-exported grouping reference
