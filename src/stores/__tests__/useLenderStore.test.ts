import { describe, it, expect } from "vitest";
import { useLenderStore } from "../useLenderStore";

describe("@unit @frontend @lender @fast useLenderStore", () => {
  it("has initial empty lenders and default filters", () => {
    expect(useLenderStore.getState().lenders).toEqual([]);
    expect(useLenderStore.getState().filters.asset_types).toContain("Multifamily");
  });
});
