// src/utils/resumeCompletion.ts
import {
	AdvisorResumeContent,
	BorrowerResumeContent,
	ProjectResumeContent,
} from "@/lib/project-queries";
import { ProjectProfile } from "@/types/enhanced-types";
import formSchema from "@/lib/enhanced-project-form.schema.json";
import borrowerFormSchema from "@/lib/borrower-resume-form.schema.json";

const clampPercent = (value: number): number => {
	if (!Number.isFinite(value)) return 0;
	return Math.max(0, Math.min(100, Math.round(value)));
};

// Helper to unwrap rich data values ({ value, source, ... })
const unwrapValue = (val: any): any => {
	if (val && typeof val === "object") {
		if ("value" in val) {
			return val.value;
		}
	}
	return val;
};

const isStringFilled = (value: unknown): boolean => {
	const val = unwrapValue(value);
	return typeof val === "string" && val.trim().length > 0;
};

const isArrayFilled = (value: unknown): boolean => {
	const val = unwrapValue(value);
	return Array.isArray(val) && val.length > 0;
};

const isNumberFilled = (value: unknown): boolean => {
	const val = unwrapValue(value);
	return typeof val === "number" && !Number.isNaN(val);
};

const isBooleanAnswered = (value: unknown): value is boolean => {
	const val = unwrapValue(value);
	return val === true || val === false;
};

const isSameValue = (left: unknown, right: unknown): boolean => {
	const l = unwrapValue(left);
	const r = unwrapValue(right);

	if (Array.isArray(l) && Array.isArray(r)) {
		if (l.length !== r.length) return false;
		return l.every((item, index) => item === r[index]);
	}
	return l === r;
};

const valueProvided = (value: unknown): boolean => {
	const val = unwrapValue(value);

	if (val === null || val === undefined) return false;
	if (isStringFilled(val)) return true;
	if (isArrayFilled(val)) return true;
	if (isNumberFilled(val)) return true;
	if (isBooleanAnswered(val)) return true;
	return false;
};

/**
 * Derive the list of required borrower fields from the borrower resume schema.
 * This keeps borrower completion in sync with the actual form configuration.
 */
const getBorrowerRequiredFieldsFromSchema =
	(): (keyof BorrowerResumeContent)[] => {
		const fieldsConfig = (borrowerFormSchema as any).fields || {};

		const requiredFieldIds = Object.entries(fieldsConfig)
			.filter(([, cfg]) => {
				if (!cfg || typeof cfg !== "object") return false;
				return (cfg as any).required === true;
			})
			.map(([fieldId]) => fieldId);

		return requiredFieldIds as (keyof BorrowerResumeContent)[];
	};

export const BORROWER_REQUIRED_FIELDS: (keyof BorrowerResumeContent)[] =
	getBorrowerRequiredFieldsFromSchema();

export const BORROWER_PLACEHOLDER_VALUES: Partial<
	Record<keyof BorrowerResumeContent, unknown>
> = {
	primaryEntityStructure: "LLC",
	yearsCREExperienceRange: "0-2",
	totalDealValueClosedRange: "N/A",
	creditScoreRange: "N/A",
	netWorthRange: "<$1M",
	liquidityRange: "<$100k",
	bankruptcyHistory: false,
	foreclosureHistory: false,
	litigationHistory: false,
};

export const isBorrowerPlaceholderValue = (
	field: keyof BorrowerResumeContent,
	value: unknown
): boolean => {
	if (!BORROWER_PLACEHOLDER_VALUES.hasOwnProperty(field)) return false;
	return isSameValue(value, BORROWER_PLACEHOLDER_VALUES[field]);
};

export const computeBorrowerCompletion = (
	data: Partial<BorrowerResumeContent> | null | undefined
): number => {
	const source = data || {};
	const total = BORROWER_REQUIRED_FIELDS.length;
	if (total === 0) return 0;

	let answered = 0;
	BORROWER_REQUIRED_FIELDS.forEach((field) => {
		const value = source[field];
		if (!valueProvided(value)) return;

		// Count all provided values, including placeholders, without requiring confirmation
		answered += 1;
	});

	return clampPercent((answered / total) * 100);
};

/**
 * Derive the list of required project fields from the enhanced project form schema.
 * This keeps the completion percentage in sync with the actual form configuration.
 */
const getProjectRequiredFieldsFromSchema = (): (keyof ProjectProfile)[] => {
	const fieldsConfig = (formSchema as any).fields || {};

	const requiredFieldIds = Object.entries(fieldsConfig)
		.filter(([, cfg]) => {
			if (!cfg || typeof cfg !== "object") return false;
			return (cfg as any).required === true;
		})
		.map(([fieldId]) => fieldId);

	return requiredFieldIds as (keyof ProjectProfile)[];
};

export const PROJECT_REQUIRED_FIELDS: (keyof ProjectProfile)[] =
	getProjectRequiredFieldsFromSchema();

export const PROJECT_PLACEHOLDER_VALUES: Partial<
	Record<keyof ProjectProfile, unknown>
> = {
	assetType: "Multifamily",
	interestRateType: "Not Specified",
	recoursePreference: "Flexible",
	exitStrategy: "Undecided",
};

export const isProjectPlaceholderValue = (
	field: keyof ProjectProfile,
	value: unknown
): boolean => {
	if (!PROJECT_PLACEHOLDER_VALUES.hasOwnProperty(field)) return false;
	return isSameValue(value, PROJECT_PLACEHOLDER_VALUES[field]);
};

export const computeProjectCompletion = (
	project: Partial<ProjectProfile> | null | undefined
): number => {
	const source = project || {};
	const total = PROJECT_REQUIRED_FIELDS.length;
	if (total === 0) return 0;

	let answered = 0;
	PROJECT_REQUIRED_FIELDS.forEach((field) => {
		const value = source[field];
		if (!valueProvided(value)) return;

		// Count all provided values, including placeholders, without requiring confirmation
		answered += 1;
	});

	return clampPercent((answered / total) * 100);
};

export const ADVISOR_REQUIRED_FIELDS: (keyof AdvisorResumeContent)[] = [
	"name",
	"title",
	"email",
	"phone",
	"bio",
	"specialties",
	"yearsExperience",
	"linkedinUrl",
	"websiteUrl",
	"company",
	"location",
];

export const ADVISOR_PLACEHOLDER_VALUES: Partial<
	Record<keyof AdvisorResumeContent, unknown>
> = {
	yearsExperience: 0,
	specialties: [],
};

export const isAdvisorPlaceholderValue = (
	field: keyof AdvisorResumeContent,
	value: unknown
): boolean => {
	if (!ADVISOR_PLACEHOLDER_VALUES.hasOwnProperty(field)) return false;
	return isSameValue(value, ADVISOR_PLACEHOLDER_VALUES[field]);
};

export const computeAdvisorCompletion = (
	data: Partial<AdvisorResumeContent> | null | undefined
): number => {
	const source = data || {};
	const total = ADVISOR_REQUIRED_FIELDS.length;
	if (total === 0) return 0;

	let answered = 0;
	ADVISOR_REQUIRED_FIELDS.forEach((field) => {
		const value = source[field];
		if (!valueProvided(value)) return;

		// Count all provided values, including placeholders, without requiring confirmation
		answered += 1;
	});

	return clampPercent((answered / total) * 100);
};
