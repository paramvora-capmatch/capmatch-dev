import {
	isFieldRed,
	isFieldBlue,
	isFieldWhite,
	isFieldGreen,
	type FieldStateContext,
} from "../domain/fieldStateSelectors";

function makeContext(overrides: Partial<FieldStateContext> = {}): FieldStateContext {
	return {
		lockedFields: new Set(),
		unlockedFields: new Set(),
		fieldMetadata: {},
		formData: {},
		...overrides,
	};
}

describe("fieldStateSelectors", () => {
	describe("isFieldRed", () => {
		it("returns true when field has warnings (warnings prevent lock, so always red)", () => {
			const ctx = makeContext({
				fieldMetadata: { a: { warnings: ["err"] } },
			});
			expect(isFieldRed(ctx, "a")).toBe(true);
		});
		it("returns false when no warnings", () => {
			const ctx = makeContext();
			expect(isFieldRed(ctx, "a")).toBe(false);
		});
	});

	describe("isFieldBlue", () => {
		it("returns true when field has value and no warnings", () => {
			const ctx = makeContext({ formData: { a: "x" } });
			expect(isFieldBlue(ctx, "a")).toBe(true);
		});
		it("returns false when locked", () => {
			const ctx = makeContext({
				formData: { a: "x" },
				lockedFields: new Set(["a"]),
			});
			expect(isFieldBlue(ctx, "a")).toBe(false);
		});
		it("returns true when has source but no value", () => {
			const ctx = makeContext({
				fieldMetadata: { a: { source: { type: "ai" } } },
			});
			expect(isFieldBlue(ctx, "a")).toBe(true);
		});
	});

	describe("isFieldWhite", () => {
		it("returns true when no value and no source", () => {
			const ctx = makeContext();
			expect(isFieldWhite(ctx, "a")).toBe(true);
		});
		it("returns false when has value", () => {
			const ctx = makeContext({ formData: { a: "x" } });
			expect(isFieldWhite(ctx, "a")).toBe(false);
		});
	});

	describe("isFieldGreen", () => {
		it("returns true when field is locked", () => {
			const ctx = makeContext({ lockedFields: new Set(["a"]) });
			expect(isFieldGreen(ctx, "a")).toBe(true);
		});
		it("returns false when not locked", () => {
			const ctx = makeContext();
			expect(isFieldGreen(ctx, "a")).toBe(false);
		});
	});
});
