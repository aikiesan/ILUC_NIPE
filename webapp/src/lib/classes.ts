/** The 15-class LULC system shared across the dataset and UI. */

export const CLASS_ORDER = [
  "1 - Culturas perenes",
  "2 - Soja",
  "3 - Soja + Milho 2ª safra",
  "4 - Milho 1ª safra",
  "5 - Cana-de-açúcar",
  "6 - Outra agropecuária",
  "7 - Pastagem deg. média",
  "8 - Pastagem deg. alta",
  "9 - Pastagem deg. baixa",
  "10 - Silvicultura",
  "11 - Veg. prim. florestal",
  "12 - Veg. sec. florestal",
  "13 - Veg. prim. não-florestal",
  "14 - Veg. sec. não-florestal",
  "15 - Outro",
] as const;

export type LulcClass = (typeof CLASS_ORDER)[number];

/** Native vegetation classes (11–14) drive pressure/balance metrics. */
export const NATIVE_CLASSES: LulcClass[] = [
  "11 - Veg. prim. florestal",
  "12 - Veg. sec. florestal",
  "13 - Veg. prim. não-florestal",
  "14 - Veg. sec. não-florestal",
];

export const PASTURE_CLASSES: LulcClass[] = [
  "7 - Pastagem deg. média",
  "8 - Pastagem deg. alta",
  "9 - Pastagem deg. baixa",
];

/** Short labels for charts where the full name is too long. */
export function shortClassLabel(cls: string): string {
  return cls.replace(/^\d+\s*-\s*/, "");
}

/** How a class is placed in the 15×15 transition matrix (D4 §3). */
export type Allocation = "Diagonal" | "Proporcional" | "Completa";

/**
 * Canonical 15-class crosswalk — D4 "Dicionário de Dados" is the normative
 * reference (resolves the minor MapBiomas-ID discrepancies between the org doc,
 * D1 and D4 in favour of D4). One row per class code 1–15.
 */
export interface ClassMeta {
  code: number;
  name: string;
  group: string;
  /** MapBiomas Col. 10.1 class IDs, or "—" when the class has no direct ID. */
  mapbiomas: string;
  /** Complementary sources used to derive / subdivide the class. */
  sources: string;
  allocation: Allocation;
}

export const CLASS_META: ClassMeta[] = [
  { code: 1, name: "Culturas perenes", group: "Agropecuária", mapbiomas: "46, 47, 48", sources: "PAM/SIDRA", allocation: "Diagonal" },
  { code: 2, name: "Soja", group: "Agropecuária", mapbiomas: "39", sources: "PAM × CONAB × Serasa (HARVEX)", allocation: "Completa" },
  { code: 3, name: "Soja + Milho 2ª safra", group: "Agropecuária", mapbiomas: "39 (split por pct_2a)", sources: "CONAB por UF/ano", allocation: "Completa" },
  { code: 4, name: "Milho 1ª safra", group: "Agropecuária", mapbiomas: "—", sources: "PAM/SIDRA × CONAB (1 − pct_2a)", allocation: "Diagonal" },
  { code: 5, name: "Cana-de-açúcar", group: "Agropecuária", mapbiomas: "20", sources: "PAM/SIDRA", allocation: "Diagonal" },
  { code: 6, name: "Outra agropecuária", group: "Agropecuária", mapbiomas: "40, 41, 62, 21", sources: "PAM/SIDRA", allocation: "Diagonal" },
  { code: 7, name: "Pastagem deg. média", group: "Pastagem", mapbiomas: "15 (fração)", sources: "LAPIG — vigor Intermediário", allocation: "Proporcional" },
  { code: 8, name: "Pastagem deg. alta", group: "Pastagem", mapbiomas: "15 (fração)", sources: "LAPIG — vigor Severo", allocation: "Proporcional" },
  { code: 9, name: "Pastagem deg. baixa", group: "Pastagem", mapbiomas: "15 (fração)", sources: "LAPIG — vigor Ausente", allocation: "Proporcional" },
  { code: 10, name: "Silvicultura", group: "Floresta plantada", mapbiomas: "9", sources: "—", allocation: "Diagonal" },
  { code: 11, name: "Veg. prim. florestal", group: "Vegetação nativa", mapbiomas: "3, 4, 6", sources: "TerraClass pct_primária × MB", allocation: "Proporcional" },
  { code: 12, name: "Veg. sec. florestal", group: "Vegetação nativa", mapbiomas: "3, 4, 6 (fração)", sources: "TerraClass pct_secundária × MB", allocation: "Proporcional" },
  { code: 13, name: "Veg. prim. não-florestal", group: "Vegetação nativa", mapbiomas: "11, 12, 29", sources: "TerraClass pct_primária × MB", allocation: "Proporcional" },
  { code: 14, name: "Veg. sec. não-florestal", group: "Vegetação nativa", mapbiomas: "11, 12, 29 (fração)", sources: "TerraClass pct_secundária × MB", allocation: "Proporcional" },
  { code: 15, name: "Outro (urbano/água/mineração)", group: "Outros", mapbiomas: "24, 30, 33, 31, 23, 25", sources: "—", allocation: "Diagonal" },
];

export const BIOMES = [
  "Amazônia",
  "Cerrado",
  "Mata Atlântica",
  "Caatinga",
  "Pampa",
  "Pantanal",
] as const;
