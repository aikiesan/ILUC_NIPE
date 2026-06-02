import { describe, expect, it } from "vitest";
import { BIOMES, CLASS_ORDER, NATIVE_CLASSES, PASTURE_CLASSES, shortClassLabel } from "./classes";

describe("class system", () => {
  it("defines exactly 15 classes in order", () => {
    expect(CLASS_ORDER).toHaveLength(15);
    expect(CLASS_ORDER[0]).toBe("1 - Culturas perenes");
    expect(CLASS_ORDER[14]).toBe("15 - Outro");
  });

  it("native classes are 11–14 and pasture 7–9", () => {
    expect(NATIVE_CLASSES).toHaveLength(4);
    expect(NATIVE_CLASSES.every((c) => CLASS_ORDER.includes(c))).toBe(true);
    expect(PASTURE_CLASSES).toHaveLength(3);
  });

  it("strips the numeric prefix for short labels", () => {
    expect(shortClassLabel("2 - Soja")).toBe("Soja");
    expect(shortClassLabel("11 - Veg. prim. florestal")).toBe("Veg. prim. florestal");
    expect(shortClassLabel("Soja")).toBe("Soja");
  });

  it("lists the six Brazilian biomes", () => {
    expect(BIOMES).toContain("Amazônia");
    expect(BIOMES).toContain("Pantanal");
    expect(BIOMES).toHaveLength(6);
  });
});
