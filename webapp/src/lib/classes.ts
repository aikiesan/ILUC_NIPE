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

export const BIOMES = [
  "Amazônia",
  "Cerrado",
  "Mata Atlântica",
  "Caatinga",
  "Pampa",
  "Pantanal",
] as const;
