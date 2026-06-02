import { describe, expect, it } from "vitest";
import { matrixToRows, seriesToRows } from "./data";
import type { RegionMatrix, RegionSeries } from "./types";

describe("seriesToRows", () => {
  it("flattens {class: {year: area}} into tidy rows", () => {
    const series: RegionSeries = {
      "2 - Soja": { "2008": 10, "2009": 20 },
      "11 - Veg. prim. florestal": { "2008": 100 },
    };
    const rows = seriesToRows(series);
    expect(rows).toHaveLength(3);
    expect(rows).toContainEqual({ classe: "2 - Soja", ano: 2008, area_ha: 10 });
    expect(rows).toContainEqual({ classe: "11 - Veg. prim. florestal", ano: 2008, area_ha: 100 });
  });
});

describe("matrixToRows", () => {
  it("flattens nested matrices into periodo/origem/destino/area rows", () => {
    const matrix = {
      metadata: { rgint: "5101", nome: "Cuiabá", uf: "MT", biome: "Cerrado" },
      anchor_years: [2008, 2024],
      years: [2008, 2024],
      classes: ["2 - Soja"],
      matrices: {
        "2008_2024": { "11 - Veg. prim. florestal": { "2 - Soja": 42 } },
      },
    } as RegionMatrix;
    const rows = matrixToRows(matrix);
    expect(rows).toEqual([
      { periodo: "2008_2024", origem: "11 - Veg. prim. florestal", destino: "2 - Soja", area_ha: 42 },
    ]);
  });
});
