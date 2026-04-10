/**
 * Constants and option arrays for EnhancedProjectForm.
 * Extracted to keep the main form file smaller and allow reuse.
 */
import type {
	ProjectProfile,
	ProjectPhase,
	InterestRateType,
	RecoursePreference,
	ExitStrategy,
} from "@/types/enhanced-types";
import {
	matchmakingAssetTypeOptions,
	matchmakingLenderTypeOptions,
	matchmakingRatePreferenceOptions,
	matchmakingRateTypeOptions,
	matchmakingTermOptions,
} from "@/lib/matchmaking/resumeFields";

export const assetTypeOptions: string[] = [
	...matchmakingAssetTypeOptions,
];

export const projectPhaseOptions: ProjectPhase[] = [
	"Acquisition",
	"Refinance",
	"Construction",
	"Bridge",
	"Development",
	"Value-Add",
	"Other",
];

export const capitalTypeOptions = [
	{ label: "Senior Debt", value: "Senior Debt" },
	{ label: "Mezz", value: "Mezzanine" },
	{ label: "Preferred Equity", value: "Preferred Equity" },
	{ label: "Common Equity", value: "Common Equity" },
	{ label: "JV Equity", value: "JV Equity" },
	{ label: "Other", value: "Other" },
];

export const interestRateTypeOptions: Array<{
	label: InterestRateType;
	value: InterestRateType;
}> = matchmakingRateTypeOptions as Array<{
	label: InterestRateType;
	value: InterestRateType;
}>;

export const requestedTermOptions = [...matchmakingTermOptions];

export const ratePreferenceOptions = [...matchmakingRatePreferenceOptions];

export const lenderTypeOptions = [...matchmakingLenderTypeOptions];

export const recourseOptions: RecoursePreference[] = [
	"Flexible",
	"Full Recourse",
	"Partial Recourse",
	"Non-Recourse",
];

export const exitStrategyOptions: ExitStrategy[] = [
	"Undecided",
	"Sale",
	"Refinance",
	"Long-Term Hold",
];

export const buildWorkspaceStepId = (stepId: string) => `project:${stepId}`;

export const STATE_MAP: Record<string, string> = {
	AL: "Alabama",
	AK: "Alaska",
	AZ: "Arizona",
	AR: "Arkansas",
	CA: "California",
	CO: "Colorado",
	CT: "Connecticut",
	DE: "Delaware",
	FL: "Florida",
	GA: "Georgia",
	HI: "Hawaii",
	ID: "Idaho",
	IL: "Illinois",
	IN: "Indiana",
	IA: "Iowa",
	KS: "Kansas",
	KY: "Kentucky",
	LA: "Louisiana",
	ME: "Maine",
	MD: "Maryland",
	MA: "Massachusetts",
	MI: "Michigan",
	MN: "Minnesota",
	MS: "Mississippi",
	MO: "Missouri",
	MT: "Montana",
	NE: "Nebraska",
	NV: "Nevada",
	NH: "New Hampshire",
	NJ: "New Jersey",
	NM: "New Mexico",
	NY: "New York",
	NC: "North Carolina",
	ND: "North Dakota",
	OH: "Ohio",
	OK: "Oklahoma",
	OR: "Oregon",
	PA: "Pennsylvania",
	RI: "Rhode Island",
	SC: "South Carolina",
	SD: "South Dakota",
	TN: "Tennessee",
	TX: "Texas",
	UT: "Utah",
	VT: "Vermont",
	VA: "Virginia",
	WA: "Washington",
	WV: "West Virginia",
	WI: "Wisconsin",
	WY: "Wyoming",
};

export const STATE_REVERSE_MAP: Record<string, string> = Object.fromEntries(
	Object.entries(STATE_MAP).map(([abbr, full]) => [full, abbr])
);

export const stateOptionsFullNames = Object.values(STATE_MAP).sort();

export const INCENTIVE_LABELS: { key: keyof ProjectProfile; label: string }[] = [
	{ key: "opportunityZone", label: "Opportunity Zone" },
	{ key: "taxExemption", label: "Tax Exemption" },
	{ key: "tifDistrict", label: "TIF District" },
	{ key: "taxAbatement", label: "Tax Abatement" },
	{ key: "paceFinancing", label: "PACE Financing" },
	{ key: "historicTaxCredits", label: "Historic Tax Credits" },
	{ key: "newMarketsCredits", label: "New Markets Credits" },
];

export const dealStatusOptions = [
	"Inquiry",
	"Underwriting",
	"Pre-Submission",
	"Submitted",
	"Closed",
];

export const expectedZoningChangesOptions = ["None", "Variance", "PUD", "Re-Zoning"];
export const syndicationStatusOptions = ["Committed", "In Process", "TBD"];
export const sponsorExperienceOptions = [
	"First-Time",
	"Emerging (1-3)",
	"Seasoned (3+)",
];

export const loanTypeOptions = [
	"Construction",
	"Permanent",
	"Bridge",
	"Mezzanine",
	"Preferred Equity",
	"Other",
];

export const constructionTypeOptions = ["Ground-Up", "Renovation", "Adaptive Reuse"];
export const buildingTypeOptions = ["High-rise", "Mid-rise", "Garden", "Podium"];
export const hvacSystemOptions = ["Central", "Split System", "PTAC", "VRF"];
export const leedGreenRatingOptions = [
	"Certified",
	"Silver",
	"Gold",
	"Platinum",
	"NGBS",
];

export const crimeRiskLevelOptions = ["Low", "Moderate", "High"];
export const exemptionStructureOptions = ["PFC", "MMD", "PILOT"];
export const relocationPlanOptions = ["Complete", "In Process", "N/A"];
export const entitlementsOptions = ["Approved", "Pending"];
export const finalPlansOptions = ["Approved", "Pending"];
export const permitsIssuedOptions = ["Issued", "Pending"];
export const currentSiteStatusOptions = ["Vacant", "Existing"];
export const topographyOptions = ["Flat", "Sloped"];
export const environmentalOptions = ["Clean", "Remediation"];
export const utilitiesOptions = ["Available", "None"];
export const seismicRiskOptions = ["Low", "Moderate", "High"];
export const phaseIESAFindingOptions = ["Clean", "REC", "HREC"];
export const riskLevelOptions = ["Low", "Medium", "High"];
export const marketStatusOptions = ["Tight", "Balanced", "Soft"];
export const demandTrendOptions = ["↑ Growing", "→ Stable", "↓ Declining"];
export const supplyPressureOptions = ["Low", "Moderate", "High"];
export const luxuryTierOptions = ["Luxury", "Premium", "Value", "Economy"];
export const competitivePositionOptions = ["Top 20%", "Middle 60%", "Bottom 20%"];
export const zoningCompliantOptions = ["Compliant", "Non-Compliant"];
export const ownershipTypeOptions = [
	"Fee Simple",
	"Leased Fee Interest (Ground Lease)",
];
