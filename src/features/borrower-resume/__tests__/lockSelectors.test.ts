import {
	isFieldLocked,
	isSubsectionFullyLocked,
} from "@/features/borrower-resume/domain/lockSelectors";

describe("borrower-resume lockSelectors", () => {
	const baseContext = {
		lockedFields: new Set<string>(["a", "b"]),
		unlockedFields: new Set<string>(),
		fieldMetadata: {} as Record<string, { warnings?: string[] }>,
	};

	it("isFieldLocked returns true when field is in lockedFields and not in unlockedFields", () => {
		expect(isFieldLocked(baseContext, "a")).toBe(true);
		expect(isFieldLocked(baseContext, "b")).toBe(true);
	});

	it("isFieldLocked returns false when field is in unlockedFields", () => {
		const ctx = {
			...baseContext,
			unlockedFields: new Set(["a"]),
		};
		expect(isFieldLocked(ctx, "a")).toBe(false);
		expect(isFieldLocked(ctx, "b")).toBe(true);
	});

	it("isFieldLocked returns false when field has warnings", () => {
		const ctx = {
			...baseContext,
			fieldMetadata: { a: { warnings: ["Some warning"] } },
		};
		expect(isFieldLocked(ctx, "a")).toBe(false);
	});

	it("isSubsectionFullyLocked returns true when all fieldIds are locked", () => {
		expect(isSubsectionFullyLocked(baseContext, ["a", "b"])).toBe(true);
	});

	it("isSubsectionFullyLocked returns false when any fieldId is not locked", () => {
		expect(isSubsectionFullyLocked(baseContext, ["a", "c"])).toBe(false);
		expect(isSubsectionFullyLocked(baseContext, [])).toBe(false);
	});
});
