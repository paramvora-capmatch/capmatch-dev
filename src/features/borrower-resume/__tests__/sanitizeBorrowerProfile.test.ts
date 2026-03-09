import { sanitizeBorrowerProfile } from "@/features/borrower-resume/domain/sanitizeBorrowerProfile";
import {
	borrowerProfileWithLegacyBooleanInNonBooleanField,
	borrowerProfileWithLegacySourcesArray,
	borrowerProfileWithMetadata,
	minimalBorrowerProfile,
} from "./fixtures/borrowerProfile";

describe("sanitizeBorrowerProfile", () => {
	it("preserves minimal profile", () => {
		const result = sanitizeBorrowerProfile(minimalBorrowerProfile);
		expect(result._metadata).toBeDefined();
		expect(typeof result._metadata).toBe("object");
	});

	it("creates user_input metadata for fields with values and no existing metadata", () => {
		const input = {
			...minimalBorrowerProfile,
			fullLegalName: "Test Borrower",
			_metadata: {},
			_lockedFields: {},
		};
		const result = sanitizeBorrowerProfile(input);
		expect(result._metadata?.fullLegalName).toBeDefined();
		expect((result._metadata?.fullLegalName as { source?: { type?: string } })?.source?.type).toBe("user_input");
		expect((result._metadata?.fullLegalName as { value?: unknown })?.value).toBe("Test Borrower");
	});

	it("nulls out boolean in non-Boolean flat field (legacy)", () => {
		const input = borrowerProfileWithLegacyBooleanInNonBooleanField;
		const result = sanitizeBorrowerProfile(input);
		expect(result.yearFounded).toBeNull();
	});

	it("normalizes sources array to single source in metadata", () => {
		const input = borrowerProfileWithLegacySourcesArray;
		const result = sanitizeBorrowerProfile(input);
		const meta = result._metadata?.bioNarrative as { source?: unknown; sources?: unknown };
		expect(meta).toBeDefined();
		expect(meta?.source).toBeDefined();
		expect((meta?.source as { type?: string })?.type).toBe("user_input");
		expect(meta?.sources).toBeUndefined();
	});

	it("preserves existing metadata when present", () => {
		const result = sanitizeBorrowerProfile(borrowerProfileWithMetadata);
		expect((result._metadata?.fullLegalName as { value?: string })?.value).toBe("Acme LLC");
		expect((result._metadata?.primaryEntityName as { source?: { type?: string } })?.source?.type).toBe("document");
	});
});
