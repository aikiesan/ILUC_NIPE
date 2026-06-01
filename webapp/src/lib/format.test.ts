import { describe, expect, it } from "vitest";
import { formatHa, formatMha, formatPct, formatSignedHa } from "./format";

describe("format helpers", () => {
  it("formats hectares with pt-BR thousands separators", () => {
    expect(formatHa(38392587)).toBe("38.392.587");
    expect(formatHa(0)).toBe("0");
  });

  it("returns an em dash for nullish/NaN values", () => {
    expect(formatHa(null)).toBe("—");
    expect(formatHa(undefined)).toBe("—");
    expect(formatHa(NaN)).toBe("—");
  });

  it("formats million hectares with two decimals", () => {
    expect(formatMha(37904939)).toBe("37,90");
  });

  it("formats percentages with one decimal", () => {
    expect(formatPct(54.9)).toBe("54,9%");
  });

  it("formats signed hectares with explicit sign and unicode minus", () => {
    expect(formatSignedHa(-37904939)).toBe("−37.904.939");
    expect(formatSignedHa(1000)).toBe("+1.000");
    expect(formatSignedHa(0)).toBe("0");
  });
});
