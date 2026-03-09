import { isBorrowerValueProvided } from "@/features/borrower-resume/domain/isBorrowerValueProvided";

describe("isBorrowerValueProvided", () => {
	it("returns false for null and undefined", () => {
		expect(isBorrowerValueProvided(null)).toBe(false);
		expect(isBorrowerValueProvided(undefined)).toBe(false);
	});

	it("returns false for empty string", () => {
		expect(isBorrowerValueProvided("")).toBe(false);
		expect(isBorrowerValueProvided("   ")).toBe(false);
	});

	it("returns true for non-empty string", () => {
		expect(isBorrowerValueProvided("hello")).toBe(true);
		expect(isBorrowerValueProvided("  x  ")).toBe(true);
	});

	it("returns false for empty array", () => {
		expect(isBorrowerValueProvided([])).toBe(false);
	});

	it("returns true for non-empty array", () => {
		expect(isBorrowerValueProvided([1])).toBe(true);
		expect(isBorrowerValueProvided(["a", "b"])).toBe(true);
	});

	it("returns true for valid number including zero", () => {
		expect(isBorrowerValueProvided(0)).toBe(true);
		expect(isBorrowerValueProvided(1)).toBe(true);
		expect(isBorrowerValueProvided(-1)).toBe(true);
	});

	it("returns false for NaN", () => {
		expect(isBorrowerValueProvided(Number.NaN)).toBe(false);
	});

	it("returns true for boolean", () => {
		expect(isBorrowerValueProvided(true)).toBe(true);
		expect(isBorrowerValueProvided(false)).toBe(true);
	});
});
