import { describe, it, expect } from "vitest";
import { cn } from "../cn";

describe("@unit @frontend @fast cn", () => {
  it("merges class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });
  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "visible")).toContain("base");
  });
});
