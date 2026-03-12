import { sanitizeProjectProfile } from "@/features/project-resume/domain/sanitizeProjectProfile";
import {
	projectProfileWithLegacyBooleanInNonBooleanField,
	projectProfileWithLegacySourcesArray,
	projectProfileWithMetadata,
	minimalProjectProfile,
} from "./fixtures/projectProfile";

describe("sanitizeProjectProfile", () => {
	it("preserves minimal profile", () => {
		const result = sanitizeProjectProfile(minimalProjectProfile);
		expect(result.id).toBe(minimalProjectProfile.id);
		expect(result._metadata).toBeDefined();
		expect(typeof result._metadata).toBe("object");
	});

	it("creates user_input metadata for fields with values and no existing metadata", () => {
		const input = {
			...minimalProjectProfile,
			projectName: "Test Project",
			_metadata: {},
			_lockedFields: {},
		};
		const result = sanitizeProjectProfile(input as any);
		expect(result._metadata?.projectName).toBeDefined();
		expect(result._metadata?.projectName?.source?.type).toBe("user_input");
		expect(result._metadata?.projectName?.value).toBe("Test Project");
	});

	it("does not create metadata for empty fields without existing metadata", () => {
		const input = {
			...minimalProjectProfile,
			projectName: "Only this",
			_metadata: {},
			_lockedFields: {},
		};
		const result = sanitizeProjectProfile(input as any);
		// Empty fields like propertyAddressStreet should not get new metadata
		expect(result._metadata?.projectName).toBeDefined();
	});

	it("nulls out boolean in non-Boolean flat field (legacy)", () => {
		const input = projectProfileWithLegacyBooleanInNonBooleanField;
		const result = sanitizeProjectProfile(input);
		// totalDevelopmentCost had value true (wrong type) - should be nulled
		expect(result.totalDevelopmentCost).toBeNull();
	});

	it("normalizes sources array to single source in metadata", () => {
		const input = projectProfileWithLegacySourcesArray;
		const result = sanitizeProjectProfile(input);
		const meta = result._metadata?.projectDescription;
		expect(meta).toBeDefined();
		expect(meta?.source).toBeDefined();
		expect(meta?.source?.type).toBe("user_input");
		expect((meta as any).sources).toBeUndefined();
	});

	it("preserves existing metadata when present", () => {
		const result = sanitizeProjectProfile(projectProfileWithMetadata);
		expect(result._metadata?.projectName?.value).toBe("SoGood Apartments");
		expect(result._metadata?.propertyAddressStreet?.source?.type).toBe(
			"document"
		);
	});
});
