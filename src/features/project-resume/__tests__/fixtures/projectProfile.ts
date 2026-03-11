/**
 * Fixtures for project resume characterization tests.
 * Representative ProjectProfile with metadata, warnings, locks, and arrays.
 */
import type { ProjectProfile } from "@/types/enhanced-types";

export const minimalProjectProfile: ProjectProfile = {
	id: "fixture-project-id",
	owner_org_id: "fixture-org-id",
	projectName: "Fixture Project",
	_metadata: {},
	_lockedFields: {},
} as ProjectProfile;

export const projectProfileWithMetadata: ProjectProfile = {
	...minimalProjectProfile,
	projectName: "SoGood Apartments",
	propertyAddressStreet: "2300 Hickory St",
	propertyAddressCity: "Dallas",
	propertyAddressState: "TX",
	assetType: "Multifamily",
	_metadata: {
		projectName: {
			value: "SoGood Apartments",
			source: { type: "user_input" },
			warnings: [],
			other_values: [],
		},
		propertyAddressStreet: {
			value: "2300 Hickory St",
			source: { type: "document", name: "appraisal.pdf" },
			warnings: [],
			other_values: [],
		},
	},
	_lockedFields: {
		projectName: true,
	},
} as ProjectProfile;

export const projectProfileWithWarnings: ProjectProfile = {
	...minimalProjectProfile,
	totalResidentialUnits: 100,
	_metadata: {
		totalResidentialUnits: {
			value: 100,
			source: { type: "user_input" },
			warnings: ["Unit mix sum does not match totalResidentialUnits"],
			other_values: [],
		},
	},
	_lockedFields: {},
} as ProjectProfile;

export const projectProfileWithLegacyBooleanInNonBooleanField: ProjectProfile = {
	...minimalProjectProfile,
	totalDevelopmentCost: true as unknown as number, // legacy wrong type
	loanAmountRequested: 1000000,
	_metadata: {
		totalDevelopmentCost: {
			value: true as unknown as number,
			source: { type: "document", name: "budget.xlsx" },
			warnings: [],
			other_values: [],
		},
	},
	_lockedFields: {},
} as ProjectProfile;

export const projectProfileWithLegacySourcesArray: ProjectProfile = {
	...minimalProjectProfile,
	projectDescription: "A mixed-use development",
	_metadata: {
		projectDescription: {
			value: "A mixed-use development",
			sources: [{ type: "user_input" }],
			warnings: [],
			other_values: [],
		},
	},
	_lockedFields: {},
} as ProjectProfile;

export const projectProfileWithArrays: ProjectProfile = {
	...minimalProjectProfile,
	residentialUnitMix: [
		{ unitType: "Studio", unitCount: 20, avgSF: 550, monthlyRent: 1200 },
		{ unitType: "1BR", unitCount: 50, avgSF: 750, monthlyRent: 1500 },
	],
	amenityList: ["Pool", "Gym", "Clubhouse"],
	_metadata: {},
	_lockedFields: { residentialUnitMix: true },
} as ProjectProfile;

export const projectProfileForCompletion: ProjectProfile = {
	...minimalProjectProfile,
	projectName: "Test",
	propertyAddressStreet: "123 Main",
	propertyAddressCity: "Dallas",
	propertyAddressState: "TX",
	assetType: "Multifamily",
	_lockedFields: {
		projectName: true,
		propertyAddressStreet: true,
		propertyAddressCity: true,
		propertyAddressState: true,
		assetType: true,
	},
	_metadata: {},
} as ProjectProfile;
