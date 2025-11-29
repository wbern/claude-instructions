import { describe, it, expect } from "vitest";
import { VARIANT_OPTIONS, VARIANTS } from "../cli-generator.js";

describe("VARIANT_OPTIONS", () => {
  it("should include hints explaining each variant", () => {
    const withBeads = VARIANT_OPTIONS.find(
      (opt) => opt.value === VARIANTS.WITH_BEADS,
    );
    const withoutBeads = VARIANT_OPTIONS.find(
      (opt) => opt.value === VARIANTS.WITHOUT_BEADS,
    );

    expect(withBeads?.hint).toBeDefined();
    expect(withoutBeads?.hint).toBeDefined();
    expect(withBeads?.hint).toContain("Beads");
    expect(withoutBeads?.hint).not.toContain("Beads");
  });
});
