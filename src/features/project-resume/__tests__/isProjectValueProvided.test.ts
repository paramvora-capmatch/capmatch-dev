import { isProjectValueProvided } from "@/features/project-resume/domain/isProjectValueProvided";

describe("isProjectValueProvided", () => {
	it("returns false for null and undefined", () => {
		expect(isProjectValueProvided(null)).toBe(false);
		expect(isProjectValueProvided(undefined)).toBe(false);
	});

	it("returns false for empty string", () => {
		expect(isProjectValueProvided("")).toBe(false);
		expect(isProjectValueProvided("   ")).toBe(false);
	});

	it("returns true for non-empty string", () => {
		expect(isProjectValueProvided("hello")).toBe(true);
		expect(isProjectValueProvided("  x  ")).toBe(true);
	});

	it("returns false for empty array", () => {
		expect(isProjectValueProvided([])).toBe(false);
	});

	it("returns true for non-empty array", () => {
		expect(isProjectValueProvided([1])).toBe(true);
		expect(isProjectValueProvided(["a", "b"])).toBe(true);
	});

	it("returns true for valid number including zero", () => {
		expect(isProjectValueProvided(0)).toBe(true);
		expect(isProjectValueProvided(1)).toBe(true);
		expect(isProjectValueProvided(-1)).toBe(true);
	});

	it("returns false for NaN", () => {
		expect(isProjectValueProvided(Number.NaN)).toBe(false);
	});

	it("returns true for boolean", () => {
		expect(isProjectValueProvided(true)).toBe(true);
		expect(isProjectValueProvided(false)).toBe(true);
	});
});
