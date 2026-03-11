import { hasCompletePrincipals } from "@/features/borrower-resume/domain/hasCompletePrincipals";

describe("hasCompletePrincipals", () => {
	it("returns false for non-array", () => {
		expect(hasCompletePrincipals(null)).toBe(false);
		expect(hasCompletePrincipals(undefined)).toBe(false);
		expect(hasCompletePrincipals("")).toBe(false);
	});

	it("returns false for empty array", () => {
		expect(hasCompletePrincipals([])).toBe(false);
	});

	it("returns false when any principal missing name or role", () => {
		expect(
			hasCompletePrincipals([
				{ principalLegalName: "Alice", principalRoleDefault: "Sponsor" },
				{ principalLegalName: "", principalRoleDefault: "GP" },
			])
		).toBe(false);
		expect(
			hasCompletePrincipals([
				{ principalLegalName: "Bob", principalRoleDefault: "" },
			])
		).toBe(false);
	});

	it("returns true when all principals have name and role", () => {
		expect(
			hasCompletePrincipals([
				{ principalLegalName: "Alice", principalRoleDefault: "Sponsor" },
				{ principalLegalName: "Bob", principalRoleDefault: "GP" },
			])
		).toBe(true);
		expect(
			hasCompletePrincipals([
				{ principalLegalName: "  Jane  ", principalRoleDefault: "  Key Principal  " },
			])
		).toBe(true);
	});
});
