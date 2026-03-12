import {
	isFieldLocked,
	isSubsectionFullyLocked,
	type LockSelectorContext,
} from "../domain/lockSelectors";

function makeContext(overrides: Partial<LockSelectorContext> = {}): LockSelectorContext {
	return {
		lockedFields: new Set(),
		unlockedFields: new Set(),
		fieldMetadata: {},
		...overrides,
	};
}

describe("lockSelectors", () => {
	describe("isFieldLocked", () => {
		it("returns false when field has warnings", () => {
			const ctx = makeContext({
				lockedFields: new Set(["a"]),
				fieldMetadata: { a: { warnings: ["bad"] } },
			});
			expect(isFieldLocked(ctx, "a")).toBe(false);
		});

		it("returns false when field is in unlockedFields", () => {
			const ctx = makeContext({
				lockedFields: new Set(["a"]),
				unlockedFields: new Set(["a"]),
			});
			expect(isFieldLocked(ctx, "a")).toBe(false);
		});

		it("returns true when field is in lockedFields and no warnings", () => {
			const ctx = makeContext({ lockedFields: new Set(["a"]) });
			expect(isFieldLocked(ctx, "a")).toBe(true);
		});

		it("returns false when field is in neither set", () => {
			const ctx = makeContext();
			expect(isFieldLocked(ctx, "a")).toBe(false);
		});
	});

	describe("isSubsectionFullyLocked", () => {
		it("returns false for empty field list", () => {
			const ctx = makeContext({ lockedFields: new Set(["a"]) });
			expect(isSubsectionFullyLocked(ctx, [])).toBe(false);
		});

		it("returns true when all fields are locked and none unlocked", () => {
			const ctx = makeContext({
				lockedFields: new Set(["a", "b"]),
				unlockedFields: new Set(),
			});
			expect(isSubsectionFullyLocked(ctx, ["a", "b"])).toBe(true);
		});

		it("returns false when one field is not locked", () => {
			const ctx = makeContext({ lockedFields: new Set(["a"]) });
			expect(isSubsectionFullyLocked(ctx, ["a", "b"])).toBe(false);
		});

		it("returns false when one field is explicitly unlocked", () => {
			const ctx = makeContext({
				lockedFields: new Set(["a", "b"]),
				unlockedFields: new Set(["a"]),
			});
			expect(isSubsectionFullyLocked(ctx, ["a", "b"])).toBe(false);
		});
	});
});
