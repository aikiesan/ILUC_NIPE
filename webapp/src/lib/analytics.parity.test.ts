import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Papa from "papaparse";
import { describe, expect, it } from "vitest";
import { D3_NATIONAL_REFERENCE, nationalSummary } from "./analytics";
import type { RegionIndicator } from "./types";

/**
 * Parity guard between the committed indicators artifact and the D3 report.
 *
 * Today the indicators are stock-based (native-area year-over-year change) and
 * differ from D3's transition-based figures because only 3 of 133 transition
 * matrices are loaded. This test therefore locks the *structural* invariants
 * now and records the D3 reference. Once the consolidated 133-region matrices
 * land and the indicators are recomputed transition-based, tighten the final
 * assertions to `toBeCloseTo` the D3 reference (TOLERANCE ~5%, D1 §12).
 */
function loadIndicatorsCsv(): RegionIndicator[] {
  const path = resolve(process.cwd(), "public/data/rgint_indicators.csv");
  const csv = readFileSync(path, "utf8");
  const parsed = Papa.parse<RegionIndicator>(csv, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
  });
  return parsed.data;
}

describe("national indicators parity", () => {
  const summary = nationalSummary(loadIndicatorsCsv());

  it("covers all 133 RGINTs", () => {
    expect(summary.regioes).toBe(133);
  });

  it("preserves the balance identity (balanço = regeneração − pressão)", () => {
    expect(Math.abs(summary.balanco_ha - (summary.regeneracao_ha - summary.pressao_ha))).toBeLessThan(1);
  });

  it("yields plausible, non-negative gross totals", () => {
    expect(summary.pressao_ha).toBeGreaterThan(0);
    expect(summary.regeneracao_ha).toBeGreaterThan(0);
    expect(summary.razao).toBeGreaterThan(1);
  });

  // Pending: with the consolidated transition matrices, flip these to assert
  // the totals match the D3 reference within ±5%.
  it("records the D3 reference for the post-reconciliation flip", () => {
    expect(D3_NATIONAL_REFERENCE.pressao_ha).toBe(38_392_587);
    expect(D3_NATIONAL_REFERENCE.balanco_ha).toBe(
      D3_NATIONAL_REFERENCE.regeneracao_ha - D3_NATIONAL_REFERENCE.pressao_ha,
    );
  });
});
