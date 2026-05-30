import { describe, expect, it } from "vitest";
import { classGroup, compositionLatestYear, nativeByBiomeYear } from "./analytics";
import type { NationalTimeseriesRow } from "./types";

describe("classGroup", () => {
  it("maps class codes to high-level groups", () => {
    expect(classGroup("2 - Soja")).toBe("Soja");
    expect(classGroup("8 - Pastagem deg. alta")).toBe("Pastagem");
    expect(classGroup("11 - Veg. prim. florestal")).toBe("Vegetação nativa");
    expect(classGroup("4 - Milho 1ª safra")).toBe("Outras lavouras");
    expect(classGroup("15 - Outro")).toBe("Outro");
  });
});

const rows: NationalTimeseriesRow[] = [
  { ano: 2008, classe: "11 - Veg. prim. florestal", area_ha: 100, bioma: "Amazônia" },
  { ano: 2008, classe: "2 - Soja", area_ha: 50, bioma: "Cerrado" },
  { ano: 2009, classe: "11 - Veg. prim. florestal", area_ha: 80, bioma: "Amazônia" },
  { ano: 2009, classe: "2 - Soja", area_ha: 70, bioma: "Cerrado" },
];

describe("compositionLatestYear", () => {
  it("aggregates the most recent year by group", () => {
    const { year, total, groups } = compositionLatestYear(rows);
    expect(year).toBe(2009);
    expect(total).toBe(150);
    expect(groups.find((g) => g.name === "Soja")?.value).toBe(70);
  });
});

describe("nativeByBiomeYear", () => {
  it("returns native vegetation in Mha per year per biome", () => {
    const out = nativeByBiomeYear(rows, ["Amazônia"]);
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({ ano: 2008, Amazônia: 100 / 1_000_000 });
  });
});
