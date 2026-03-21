import { describe, it, expect } from "vitest";
import { formatDate, formatDateShort, isInviteExpired } from "@/utils/dateUtils";

describe("@unit @frontend @fast dateUtils", () => {
  it("formatDate returns string for ISO date string", () => {
    const s = formatDate("2024-01-15T12:00:00Z");
    expect(typeof s).toBe("string");
    expect(s.length).toBeGreaterThan(0);
  });
  it("formatDateShort returns N/A for undefined", () => {
    expect(formatDateShort(undefined)).toBe("N/A");
  });
  it("isInviteExpired returns true for past date", () => {
    expect(isInviteExpired("2020-01-01T00:00:00Z")).toBe(true);
  });
});
