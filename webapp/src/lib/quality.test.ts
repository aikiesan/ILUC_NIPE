import { describe, expect, it } from "vitest";
import { GOLDEN_RGINTS, regionStatus } from "./quality";

describe("regionStatus", () => {
  it("marks golden-standard regions regardless of matrix presence", () => {
    expect(GOLDEN_RGINTS.has("5101")).toBe(true);
    expect(regionStatus("5101", false).kind).toBe("golden");
    expect(regionStatus("1201", true).kind).toBe("golden");
  });

  it("marks non-golden regions with a matrix as available", () => {
    const s = regionStatus("5102", true);
    expect(s.kind).toBe("available");
    expect(s.variant).toBe("solid");
  });

  it("marks regions without a matrix as pending", () => {
    const s = regionStatus("2302", false);
    expect(s.kind).toBe("pending");
    expect(s.variant).toBe("outline");
  });
});
