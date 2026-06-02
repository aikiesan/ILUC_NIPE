import { describe, expect, it } from "vitest";
import {
  BIOME_COLORS,
  CATEGORY_COLORS,
  DIVERGING_BALANCE,
  SEQ_GAIN,
  SEQ_LOSS,
  VIRIDIS,
  biomeColor,
  biomeTone,
  classColor,
  scaleForVariable,
} from "./colors";
import { BIOMES } from "./classes";

const HEX = /^#[0-9A-Fa-f]{6}$/;

describe("biome palette", () => {
  it("defines a tone for every biome in the dataset", () => {
    for (const b of BIOMES) {
      expect(BIOME_COLORS[b], `missing biome ${b}`).toBeDefined();
    }
  });

  it("exposes valid hex triplets per biome", () => {
    for (const tone of Object.values(BIOME_COLORS)) {
      expect(tone.solid).toMatch(HEX);
      expect(tone.tint).toMatch(HEX);
      expect(tone.ink).toMatch(HEX);
    }
  });

  it("falls back gracefully for unknown / nullish biomes", () => {
    expect(biomeColor("Atlantis")).toMatch(HEX);
    expect(biomeTone(undefined).solid).toMatch(HEX);
    expect(biomeColor("Amazônia")).toBe(BIOME_COLORS["Amazônia"].solid);
  });

  it("uses distinct solid hues across biomes", () => {
    const solids = Object.values(BIOME_COLORS).map((t) => t.solid);
    expect(new Set(solids).size).toBe(solids.length);
  });
});

describe("classColor", () => {
  it("maps full labels by class number group", () => {
    expect(classColor("2 - Soja")).toBe(CATEGORY_COLORS["Soja"]);
    expect(classColor("11 - Veg. prim. florestal")).toBe(CATEGORY_COLORS["Vegetação nativa"]);
    expect(classColor("8 - Pastagem deg. alta")).toBe(CATEGORY_COLORS["Pastagem"]);
    expect(classColor("15 - Outro")).toBe(CATEGORY_COLORS["Outro"]);
  });

  it("maps short labels (no number prefix) by keyword", () => {
    expect(classColor("Soja")).toBe(CATEGORY_COLORS["Soja"]);
    expect(classColor("Pastagem deg. alta")).toBe(CATEGORY_COLORS["Pastagem"]);
    expect(classColor("Veg. prim. florestal")).toBe(CATEGORY_COLORS["Vegetação nativa"]);
  });
});

describe("scaleForVariable", () => {
  it("uses diverging only for net balance", () => {
    expect(scaleForVariable("balanco_ha")).toEqual({
      colorscale: DIVERGING_BALANCE,
      diverging: true,
    });
    expect(scaleForVariable("pressao_ha")).toEqual({ colorscale: SEQ_LOSS, diverging: false });
    expect(scaleForVariable("regeneracao_ha")).toEqual({ colorscale: SEQ_GAIN, diverging: false });
    expect(scaleForVariable("whatever").colorscale).toBe(VIRIDIS);
  });
});

describe("colorscale shape", () => {
  it("is monotonic in [0,1] with valid colors", () => {
    for (const scale of [VIRIDIS, SEQ_LOSS, SEQ_GAIN, DIVERGING_BALANCE]) {
      expect(scale[0][0]).toBe(0);
      expect(scale[scale.length - 1][0]).toBe(1);
      for (let i = 1; i < scale.length; i++) {
        expect(scale[i][0]).toBeGreaterThan(scale[i - 1][0]);
        expect(scale[i][1]).toMatch(HEX);
      }
    }
  });
});
