/** Locale-aware formatting helpers (pt-BR) for scientific figures. */

const haFmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const mhaFmt = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const pctFmt = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** Hectares with thousands separators, no decimals. */
export function formatHa(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return haFmt.format(value);
}

/** Million hectares (Mha) with two decimals. */
export function formatMha(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return mhaFmt.format(value / 1_000_000);
}

/** Percentage with one decimal and a trailing %. */
export function formatPct(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${pctFmt.format(value)}%`;
}

/** Signed hectares — used for net balances where the sign matters. */
export function formatSignedHa(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${haFmt.format(Math.abs(value))}`;
}
