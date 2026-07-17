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

/** Custom sequential scale for native veg (light green to dark green) */
export const SEQ_GREEN: PlotlyColorscale = [
  [0.0, "#F7FCF5"], [0.2, "#E5F5E0"], [0.4, "#A1D99B"],
  [0.6, "#41AB5D"], [0.8, "#238B45"], [1.0, "#00441B"],
];

/** Custom sequential scale for pasture (light yellow/orange to dark amber) */
export const SEQ_ORANGE: PlotlyColorscale = [
  [0.0, "#FFF5EB"], [0.2, "#FDD0A2"], [0.4, "#FDAE6B"],
  [0.6, "#F16913"], [0.8, "#D94801"], [1.0, "#7F2704"],
];

/** Custom sequential scale for soy (light teal to dark teal) */
export const SEQ_TEAL: PlotlyColorscale = [
  [0.0, "#F0FDF4"], [0.2, "#CCFBF1"], [0.4, "#5EEAD4"],
  [0.6, "#0D9488"], [0.8, "#0F766E"], [1.0, "#115E59"],
];

/** Custom sequential scale for other agriculture (light blue to dark blue) */
export const SEQ_BLUE: PlotlyColorscale = [
  [0.0, "#F0F9FF"], [0.2, "#BAE6FD"], [0.4, "#38BDF8"],
  [0.6, "#0284C7"], [0.8, "#0369A1"], [1.0, "#0C4A6E"],
];

/**
 * "loss"/pressure sequential — **Magma** (reversed: low = pale, high = near-black).
 * Perceptually uniform and colorblind-safe by design (matplotlib scientific
 * colormap), replacing the prior YlOrRd whose red high-end read poorly under
 * deuteranopia. Monotonic in lightness, so magnitude survives any dichromacy.
 */
export const SEQ_LOSS: PlotlyColorscale = [
  [0.0, "#FCFDBF"], [0.2, "#FE9F6D"], [0.4, "#DE4968"],
  [0.6, "#8C2981"], [0.8, "#3B0F70"], [1.0, "#000004"],
];

/**
 * "gain"/regeneration sequential — **Cividis** (reversed: low = yellow, high =
 * dark blue). Cividis is explicitly engineered so colorblind and normal-vision
 * viewers perceive it near-identically; replaces the prior green YlGn (green
 * being exactly the hue the project lead can't distinguish).
 */
export const SEQ_GAIN: PlotlyColorscale = [
  [0.0, "#FFE945"], [0.25, "#A69D75"], [0.5, "#666970"],
  [0.75, "#31446B"], [1.0, "#00204D"],
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

/** Colorblind-friendly diverging scale (Purple ↔ Orange - PuOr) */
export const COLORBLIND_DIVERGING: PlotlyColorscale = [
  [0.0, "#B35806"], [0.25, "#F1A340"], [0.5, "#F7F7F7"],
  [0.75, "#998EC3"], [1.0, "#542788"],
];

/** Choropleth scale + diverging flag for a given indicator variable. */
export function scaleForVariable(variable: string): {
  colorscale: PlotlyColorscale;
  diverging: boolean;
} {
  // Check if the variable is one of the 15 classes by checking prefix number
  const prefixMatch = variable.match(/^(\d+)\s*-\s*/);
  if (prefixMatch) {
    const num = parseInt(prefixMatch[1], 10);
    if (num >= 11 && num <= 14) {
      return { colorscale: SEQ_GREEN, diverging: false };
    }
    if (num >= 7 && num <= 9) {
      return { colorscale: SEQ_ORANGE, diverging: false };
    }
    if (num === 2 || num === 3) {
      return { colorscale: SEQ_TEAL, diverging: false };
    }
    if (num === 10) {
      return { colorscale: SEQ_GAIN, diverging: false }; // Silvicultura
    }
    return { colorscale: SEQ_BLUE, diverging: false }; // Other crops
  }

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
