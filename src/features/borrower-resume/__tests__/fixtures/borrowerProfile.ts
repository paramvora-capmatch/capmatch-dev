/**
 * Fixtures for borrower resume characterization tests.
 */
import type { BorrowerResumeContent } from "@/lib/project-queries";

export const minimalBorrowerProfile: Partial<BorrowerResumeContent> = {
	fullLegalName: "",
	_metadata: {},
	_lockedFields: {},
};

export const borrowerProfileWithMetadata: Partial<BorrowerResumeContent> = {
	...minimalBorrowerProfile,
	fullLegalName: "Acme LLC",
	primaryEntityName: "Acme Holdings",
	primaryEntityStructure: "LLC",
	_metadata: {
		fullLegalName: {
			value: "Acme LLC",
			source: { type: "user_input" },
			warnings: [],
			other_values: [],
		},
		primaryEntityName: {
			value: "Acme Holdings",
			source: { type: "document", name: "formation.pdf" },
			warnings: [],
			other_values: [],
		},
	},
	_lockedFields: { fullLegalName: true },
};

export const borrowerProfileWithLegacyBooleanInNonBooleanField: Partial<BorrowerResumeContent> = {
	...minimalBorrowerProfile,
	yearFounded: true as unknown as number,
	_metadata: {
		yearFounded: {
			value: true as unknown as number,
			source: { type: "document" },
			warnings: [],
			other_values: [],
		},
	},
	_lockedFields: {},
};

export const borrowerProfileWithLegacySourcesArray: Partial<BorrowerResumeContent> = {
	...minimalBorrowerProfile,
	bioNarrative: "Experienced sponsor",
	_metadata: {
		bioNarrative: {
			value: "Experienced sponsor",
			source: { type: "user_input" },
			warnings: [],
			other_values: [],
		},
	},
	_lockedFields: {},
};
