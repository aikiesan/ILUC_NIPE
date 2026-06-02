import { describe, expect, it } from "vitest";
import { classGroup, compositionLatestYear, nativeByBiomeYear } from "./analytics";
import type { NationalTimeseriesRow } from "./types";

describe("classGroup", () => {
  it("buckets each class into its high-level group", () => {
    expect(classGroup("2 - Soja")).toBe("Soja");
    expect(classGroup("6 - Outra agropecuária")).toBe("Outra agropecuária");
    expect(classGroup("8 - Pastagem deg. alta")).toBe("Pastagem");
    expect(classGroup("10 - Silvicultura")).toBe("Silvicultura");
    expect(classGroup("12 - Veg. sec. florestal")).toBe("Vegetação nativa");
    expect(classGroup("15 - Outro")).toBe("Outro");
    expect(classGroup("4 - Milho 1ª safra")).toBe("Outras lavouras");
  });
});

const rows: NationalTimeseriesRow[] = [
  { ano: 2008, classe: "2 - Soja", area_ha: 100, bioma: "Cerrado" },
  { ano: 2008, classe: "11 - Veg. prim. florestal", area_ha: 1_000_000, bioma: "Amazônia" },
  { ano: 2009, classe: "11 - Veg. prim. florestal", area_ha: 900_000, bioma: "Amazônia" },
  { ano: 2009, classe: "2 - Soja", area_ha: 200, bioma: "Cerrado" },
];

describe("compositionLatestYear", () => {
  it("aggregates groups for the most recent year", () => {
    const c = compositionLatestYear(rows);
    expect(c.year).toBe(2009);
    expect(c.total).toBe(900_200);
    const soja = c.groups.find((g) => g.name === "Soja");
    expect(soja?.value).toBe(200);
  });
});

describe("nativeByBiomeYear", () => {
  it("returns native veg in Mha per biome per year", () => {
    const series = nativeByBiomeYear(rows, ["Amazônia"]);
    expect(series).toHaveLength(2);
    expect(series[0]).toEqual({ ano: 2008, "Amazônia": 1 });
    expect(series[1]["Amazônia"]).toBeCloseTo(0.9);
  });
});
