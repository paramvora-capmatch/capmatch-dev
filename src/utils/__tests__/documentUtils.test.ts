import { describe, it, expect } from "vitest";
import { extractOriginalFilename } from "../documentUtils";

describe("@unit @frontend @fast documentUtils", () => {
  it("extractOriginalFilename strips version prefix", () => {
    const out = extractOriginalFilename("v1_user123_myfile.pdf");
    expect(out).toBe("myfile.pdf");
  });
});
