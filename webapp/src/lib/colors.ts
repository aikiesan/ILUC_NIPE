/**
 * Single source of truth for the ILUC_NIPE color system.
 *
 * Goals: a restrained, publication-grade scientific palette — a deep-teal
 * primary, a regeneration green, a pressure/loss warm tone, and a
 * colorblind-aware, WCAG-AA biome set. Sequential/diverging scales are
 * perceptually uniform (Viridis / ColorBrewer). Recharts and the Plotly
 * Sankey/heatmap/choropleth all consume these exports.
 */

/* ------------------------------------------------------------------ */
/* Semantic tokens (mirror tailwind.config.js)                         */
/* ------------------------------------------------------------------ */
export const SEMANTIC = {
  primary: "#0F766E", // deep teal — accent / soy / focus
  positive: "#15803D", // regeneration / native-veg gain
  negative: "#B45309", // pressure / loss (amber→rust, not alarm red)
  negativeStrong: "#9A3412",
  neutral: "#525252",
  grid: "#E5E5E5",
  axis: "#6B6B6B",
} as const;

/* ------------------------------------------------------------------ */
/* Biome palette — colorblind-aware, AA ink-on-tint for badges         */
/* ------------------------------------------------------------------ */
export interface BiomeTone {
  solid: string; // chart fills, map legends
  tint: string; // badge background
  ink: string; // badge text (AA on tint)
}

export const BIOME_COLORS: Record<string, BiomeTone> = {
  "Amazônia": { solid: "#047857", tint: "#ECFDF5", ink: "#065F46" },
  "Cerrado": { solid: "#B45309", tint: "#FFFBEB", ink: "#92400E" },
  "Mata Atlântica": { solid: "#0E7490", tint: "#ECFEFF", ink: "#155E75" },
  "Caatinga": { solid: "#C2410C", tint: "#FFF7ED", ink: "#9A3412" },
  "Pampa": { solid: "#6D28D9", tint: "#F5F3FF", ink: "#5B21B6" },
  "Pantanal": { solid: "#1D4ED8", tint: "#EFF6FF", ink: "#1E40AF" },
};

const FALLBACK_TONE: BiomeTone = { solid: "#525252", tint: "#F5F5F5", ink: "#404040" };

export function biomeTone(name: string | undefined | null): BiomeTone {
  return (name && BIOME_COLORS[name]) || FALLBACK_TONE;
}

export function biomeColor(name: string | undefined | null): string {
  return biomeTone(name).solid;
}

/* ------------------------------------------------------------------ */
/* Categorical palettes (qualitative, distinct)                        */
/* ------------------------------------------------------------------ */

/** High-level LULC groups used by the national composition donut. */
export const CATEGORY_COLORS: Record<string, string> = {
  "Vegetação nativa": "#047857",
  "Pastagem": "#B45309",
  "Soja": "#0F766E",
  "Outras lavouras": "#0E7490",
  "Outra agropecuária": "#A16207",
  "Silvicultura": "#6D28D9",
  "Outro": "#9CA3AF",
};

/** PAM cultures (bar chart). */
export const CULTURE_COLORS: Record<string, string> = {
  soja: "#0F766E",
  milho: "#B45309",
  cana: "#15803D",
  algodao: "#6D28D9",
};

/** Region time-series lines. */
export const SERIES_COLORS: Record<string, string> = {
  Soja: "#0F766E",
  Pastagem: "#B45309",
  "Veg. nativa": "#15803D",
};

/**
 * Map a 15-class label to a representative group color (Sankey nodes).
 * Accepts both full labels ("2 - Soja") and short labels ("Soja").
 */
export function classColor(cls: string): string {
  const num = Number(cls.split(" - ")[0]);
  if (!Number.isNaN(num)) {
    if (num >= 11 && num <= 14) return CATEGORY_COLORS["Vegetação nativa"];
    if (num >= 7 && num <= 9) return CATEGORY_COLORS["Pastagem"];
    if (num === 2 || num === 3) return CATEGORY_COLORS["Soja"];
    if (num === 10) return CATEGORY_COLORS["Silvicultura"];
    if (num === 6) return CATEGORY_COLORS["Outra agropecuária"];
    if (num === 15) return CATEGORY_COLORS["Outro"];
    return CATEGORY_COLORS["Outras lavouras"];
  }
  const s = cls.toLowerCase();
  if (s.includes("veg.") || s.includes("vegeta") || s.includes("florestal")) return CATEGORY_COLORS["Vegetação nativa"];
  if (s.includes("pastagem")) return CATEGORY_COLORS["Pastagem"];
  if (s.includes("soja")) return CATEGORY_COLORS["Soja"];
  if (s.includes("silvicultura")) return CATEGORY_COLORS["Silvicultura"];
  if (s.includes("outra agro")) return CATEGORY_COLORS["Outra agropecuária"];
  if (s === "outro" || s.includes("outro ")) return CATEGORY_COLORS["Outro"];
  return CATEGORY_COLORS["Outras lavouras"];
}

/* ------------------------------------------------------------------ */
/* Perceptually-uniform scales (Plotly colorscale = [stop, color][])   */
/* ------------------------------------------------------------------ */
export type PlotlyColorscale = [number, string][];

/** Viridis — default sequential / heatmap scale. */
export const VIRIDIS: PlotlyColorscale = [
  [0.0, "#440154"], [0.1, "#482878"], [0.2, "#3E4A89"], [0.3, "#31688E"],
  [0.4, "#26828E"], [0.5, "#1F9E89"], [0.6, "#35B779"], [0.7, "#6DCD59"],
  [0.85, "#B4DE2C"], [1.0, "#FDE725"],
];

/** ColorBrewer YlOrRd — "loss"/pressure sequential. */
export const SEQ_LOSS: PlotlyColorscale = [
  [0.0, "#FFFFCC"], [0.25, "#FED976"], [0.5, "#FD8D3C"],
  [0.75, "#E31A1C"], [1.0, "#800026"],
];

/** ColorBrewer YlGn — "gain"/regeneration sequential. */
export const SEQ_GAIN: PlotlyColorscale = [
  [0.0, "#FFFFE5"], [0.5, "#78C679"], [1.0, "#004529"],
];

/**
 * Diverging net balance (loss ↔ gain), use with zmid = 0.
 *
 * ColorBrewer **RdBu** (red↔blue), one of the few diverging schemes flagged
 * colorblind-safe: the prior RdYlGn collapsed to indistinguishable brown under
 * deuteranopia/protanopia (~8% of men, incl. the project's lead). Red↔blue
 * survives because the blue channel is preserved across the common dichromacies
 * and the two ends also differ in lightness. Loss = red, gain = blue.
 */
export const DIVERGING_BALANCE: PlotlyColorscale = [
  [0.0, "#B2182B"], [0.25, "#D6604D"], [0.5, "#F7F7F7"],
  [0.75, "#4393C3"], [1.0, "#2166AC"],
];

/** Teal sequential for the transition-matrix heatmap (white → primary). */
export const SEQ_MATRIX: PlotlyColorscale = [
  [0.0, "#FFFFFF"], [0.25, "#CCFBF1"], [0.5, "#5EEAD4"],
  [0.75, "#0F766E"], [1.0, "#134E4A"],
];

/** Choropleth scale + diverging flag for a given indicator variable. */
export function scaleForVariable(variable: string): {
  colorscale: PlotlyColorscale;
  diverging: boolean;
} {
  switch (variable) {
    case "regeneracao_ha":
      return { colorscale: SEQ_GAIN, diverging: false };
    case "balanco_ha":
      return { colorscale: DIVERGING_BALANCE, diverging: true };
    case "pressao_ha":
    case "soja_2024_ha":
      return { colorscale: SEQ_LOSS, diverging: false };
    default:
      return { colorscale: VIRIDIS, diverging: false };
  }
}
