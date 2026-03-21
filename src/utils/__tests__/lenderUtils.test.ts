import { describe, it, expect } from "vitest";
import { parseDebtRange, calculateMatchScores } from "../lenderUtils";

describe("@unit @frontend @lender @fast lenderUtils", () => {
  it("parseDebtRange parses $0 - $5M", () => {
    const r = parseDebtRange("$0 - $5M");
    expect(r).toEqual({ min: 0, max: 5000000 });
  });
  it("calculateMatchScores returns empty array for no lenders", () => {
    expect(calculateMatchScores([])).toEqual([]);
  });
});
