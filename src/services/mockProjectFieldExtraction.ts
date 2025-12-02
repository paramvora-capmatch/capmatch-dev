// src/services/mockProjectFieldExtraction.ts
/**
 * Mock API service for project field extraction
 * Returns field values in section-wise format matching backend API
 */

import { SourceMetadata } from "@/types/source-metadata";
import formSchema from "@/lib/enhanced-project-form.schema.json";
import { projectResumeFieldMetadata } from "@/lib/project-resume-field-metadata";

/**
 * Section-wise field extraction response structure
 * Each section contains fields with their extraction data
 */
export interface SectionWiseExtractionResponse {
	[sectionId: string]: {
		[fieldId: string]: {
			value: any;
			sources: SourceMetadata[];
			warnings: string[];
			original_value?: any;
		};
	};
}

/**
 * Helper function to convert source string to SourceMetadata
 */
function createSourceMetadata(source: string): SourceMetadata {
	const normalized = source.toLowerCase();

	// User Input
	if (normalized === "user input" || normalized === "user_input") {
		return { type: "user_input" };
	}

	// Derived sources (calculations, extractions)
	const derivedPatterns = [
		"extract from address",
		"sum of",
		"nrsf / units",
		"spaces / units",
		"loan / value",
		"loan / tdc",
		"noi /",
		"egi -",
		"trended /",
		"untrended /",
		"geo-calc",
		"stress calc",
	];
	if (derivedPatterns.some((pattern) => normalized.includes(pattern))) {
		return {
			type: "derived",
			name: source,
			derivation: source,
		};
	}

	// External APIs
	const externalPatterns = [
		"api",
		"walk score",
		"census acs",
		"us treasury",
		"nps cert",
		"cdfi fund",
		"city gis",
	];
	if (externalPatterns.some((pattern) => normalized.includes(pattern))) {
		return {
			type: "external",
			name: source,
		};
	}

	// Document sources (default)
	return {
		type: "document",
		name: source,
	};
}

/**
 * Mock extraction API for project resumes
 * Returns project field values with realistic data in section-wise format
 * Uses structured SourceMetadata format
 */
export const extractProjectFields = async (
	projectId: string,
	documentPaths?: string[]
): Promise<SectionWiseExtractionResponse> => {
	// Simulate API delay
	await new Promise((resolve) => setTimeout(resolve, 1000));

	// Helper to create field data
	const createField = (
		value: any,
		source: string,
		warnings: string[] = []
	): {
		value: any;
		sources: SourceMetadata[];
		warnings: string[];
		original_value: any;
	} => ({
		value,
		sources: [createSourceMetadata(source)],
		warnings,
		original_value: value,
	});

	/**
	 * Best-effort type sanitizer to prevent obviously wrong mock values
	 * (e.g. boolean `true` for numeric/text fields).
	 */
	const sanitizeMockValue = (fieldId: string, value: any): any => {
		if (value === null || value === undefined) return value;

		const meta = projectResumeFieldMetadata[fieldId];
		const dataType = meta?.dataType;

		// If we somehow end up with a boolean for a non-Boolean field, drop it.
		if (typeof value === "boolean" && dataType && dataType !== "Boolean") {
			return null;
		}

		return value;
	};

	// Return project field extraction results in section-wise format
	// Format: { section_1: { fieldId: { value, sources, warnings, original_value } } }
	const sectionWiseFields: SectionWiseExtractionResponse = {
		section_1: {
			// Basic Info - Project Identification
			// Only 2 fields are empty (User Input): projectName and guarantorNames
			projectName: createField(null, "User Input"), // Empty field 1
			assetType: createField("Multifamily", "Marketing Brochure"),
			projectStatus: createField("Pre-Construction", "Project Status"),
			propertyAddressStreet: createField(
				"2800 Commerce Street",
				"ALTA Survey"
			),
			propertyAddressCity: createField("Dallas", "Extract from Address"),
			propertyAddressState: createField("TX", "Extract from Address"),
			propertyAddressZip: createField("75215", "Extract from Address"),
			propertyAddressCounty: createField(
				"Dallas County",
				"Title Commitment"
			),
			parcelNumber: createField(
				"R-12345-67890, R-12345-67891",
				"ALTA Survey"
			),
			zoningDesignation: createField("MU-3", "Zoning Letter"),
			currentZoning: createField("MU-3", "Zoneomics API"),
			expectedZoningChanges: createField("None", "Zoning Letter"), // "None" is a valid value, not null
			primaryAssetClass: createField("Mixed-Use", "Arch Plans"),
			constructionType: createField("Ground-Up", "Arch Plans"),
			projectPhase: createField("Construction", "Project Status"),
			groundbreakingDate: createField(
				"2025-08-01",
				"Construction Schedule"
			),
			completionDate: createField("2027-09-30", "Construction Schedule"),
			totalDevelopmentCost: createField(29807800, "Sum of Budget"),
			loanAmountRequested: createField(18000000, "Sources & Uses"),
			loanType: createField("Construction Loan", "Term Sheet"),
			requestedLoanTerm: createField("2 years", "Term Sheet"),
			requestedTerm: createField("3 Years + 1 Year Ext", "Term Sheet"),
			masterPlanName: createField(
				"SoGood Master Planned Development",
				"Marketing Brochure"
			),
			phaseNumber: createField("Building B", "Site Plan"),
			dealStatus: createField("Pre-Submission", "Deal Status"),
			syndicationStatus: createField("Committed", "Equity Commitment"),
			sponsorExperience: createField("Seasoned (3+)", "Track Record"),
			ltvStressMax: createField(50.0, "Underwriting Parameters"),
			dscrStressMin: createField(1.1, "Underwriting Parameters"),
			expectedHoldPeriod: createField(5, "Inv. Memo"),
			guarantorNames: createField(null, "User Input"), // Empty field 2
			projectDescription: createField(
				"116-unit mixed-use development in Deep Ellum featuring retail and office components",
				"Marketing Brochure"
			),
		},
		section_2: {
			// Property Specifications
			// Only 2 fields are empty (User Input): furnishedUnits and buildingEfficiency
			totalResidentialUnits: createField(116, "Sum of Unit Mix"),
			totalResidentialNRSF: createField(59520, "Sum of Unit SF"),
			averageUnitSize: createField(513, "NRSF / Units"),
			totalCommercialGRSF: createField(49569, "Arch Plans"),
			grossBuildingArea: createField(127406, "Arch Plans"),
			numberOfStories: createField(6, "Elevations"),
			buildingType: createField("Mid-rise", "Arch Plans"),
			parkingSpaces: createField(180, "Site Plan"),
			parkingRatio: createField(1.55, "Spaces / Units"),
			parkingType: createField("Structured", "Site Plan"),
			amenityList: createField(
				["Pool", "Gym", "Coworking", "Rooftop Deck"],
				"Arch Plans"
			),
			amenitySF: createField(8500, "Sum of Areas"),
			buildingEfficiency: createField(null, "User Input"), // Empty field 1
			studioCount: createField(12, "Arch Plans"),
			oneBedCount: createField(46, "Arch Plans"),
			twoBedCount: createField(58, "Arch Plans"),
			threeBedCount: createField(0, "Arch Plans"),
			furnishedUnits: createField(null, "User Input"), // Empty field 2
			lossToLease: createField(5.0, "Rent Roll"),
			adaCompliantUnitsPercent: createField(5.0, "Arch Plans"),
			adaCompliantPercent: createField(5.0, "Arch Plans"),
			hvacSystem: createField("Central", "MEP Plans"),
			roofTypeAge: createField("TPO, 2 years old", "Eng. Report"),
			solarCapacity: createField(0, "Arch Plans"),
			evChargingStations: createField(8, "Site Plan"),
			leedSustainabilityRating: createField("Pending", "Arch Plans"),
			leedGreenRating: createField("Pending", "Specs"),
			residentialUnitMix: createField(
				[
					{
						unitType: "Studio S1",
						unitCount: 12,
						avgSF: 450,
						monthlyRent: 1200,
						totalSF: 5400,
						percentOfTotal: 10.3,
						affordabilityStatus: "Market Rate",
						affordableUnitsCount: 0,
						amiTargetPercent: null,
						rentBumpSchedule: "$2.67 to $2.89",
					},
					{
						unitType: "1BR A1",
						unitCount: 46,
						avgSF: 550,
						monthlyRent: 1500,
						totalSF: 25300,
						percentOfTotal: 39.7,
						affordabilityStatus: "Affordable @ 80% AMI",
						affordableUnitsCount: 23,
						amiTargetPercent: 80,
						rentBumpSchedule: "$2.73 to $3.15",
					},
					{
						unitType: "2BR B1",
						unitCount: 58,
						avgSF: 990,
						monthlyRent: 2200,
						totalSF: 57420,
						percentOfTotal: 50.0,
						affordabilityStatus: "Affordable @ 80% AMI",
						affordableUnitsCount: 29,
						amiTargetPercent: 80,
						rentBumpSchedule: "$2.22 to $2.56",
					},
				],
				"Arch Plans"
			),
			commercialSpaceMix: createField(
				[
					{
						spaceType: "Retail",
						squareFootage: 19669,
						tenant: "GSV Holdings",
						leaseTerm: "10 years",
						annualRent: 590070,
						tiAllowance: 500000,
					},
					{
						spaceType: "Office",
						squareFootage: 29900,
						tenant: null,
						leaseTerm: null,
						annualRent: null,
						tiAllowance: null,
					},
				],
				"Arch Plans"
			),
		},
		section_3: {
			// Development Budget & Financial Details
			// Only 2 fields are empty (User Input): internalAdvisorNotes and marketOverviewSummary
			landAcquisition: createField(3500000, "Purchase Agmt"),
			baseConstruction: createField(18500000, "Budget"),
			contingency: createField(925000, "Budget"),
			ffe: createField(450000, "Budget"),
			constructionFees: createField(1200000, "Budget"),
			aeFees: createField(850000, "Budget"),
			thirdPartyReports: createField(125000, "Budget"),
			legalAndOrg: createField(200000, "Budget"),
			titleAndRecording: createField(75000, "Budget"),
			taxesDuringConstruction: createField(150000, "Budget"),
			workingCapital: createField(300000, "Budget"),
			developerFee: createField(1192312, "Budget"),
			pfcStructuringFee: createField(250000, "Budget"),
			loanFees: createField(360000, "Budget"),
			interestReserve: createField(1800000, "Budget"),
			relocationCosts: createField(0, "Relocation Plan"),
			syndicationCosts: createField(238000, "Equity Commit"),
			enviroRemediation: createField(0, "Phase II ESA"),
			// Sources of Funds
			sponsorEquity: createField(11807800, "Sources & Uses"),
			taxCreditEquity: createField(0, "Equity Commit"),
			gapFinancing: createField(0, "Sources & Uses"),
			// Loan Terms
			interestRate: createField(6.5, "Term Sheet"),
			underwritingRate: createField(8.5, "Term Sheet"),
			prepaymentTerms: createField(
				"No prepayment penalty after year 1",
				"Term Sheet"
			),
			permTakeoutPlanned: createField(true, "Term Sheet"),
			allInRate: createField(7.2, "Term Sheet"),
			// Legacy Financial Fields
			targetLtvPercent: createField(43.7, "Loan / Value"),
			targetLtcPercent: createField(60.4, "Loan / TDC"),
			amortizationYears: createField(30, "Term Sheet"),
			interestOnlyPeriodMonths: createField(24, "Term Sheet"),
			interestRateType: createField("Fixed", "Term Sheet"),
			targetCloseDate: createField("2024-12-15", "Term Sheet"),
			useOfProceeds: createField(
				"Construction financing for ground-up development of 116-unit mixed-use project",
				"Term Sheet"
			),
			recoursePreference: createField("Full Recourse", "Term Sheet"),
			purchasePrice: createField(3500000, "Purchase Agmt"),
			totalProjectCost: createField(29807800, "Sum of Budget"),
			totalDevelopmentCost: createField(29807800, "Sum of Budget"), // TDC - also in section_1
			capexBudget: createField(450000, "Budget"),
			propertyNoiT12: createField(0, "N/A - New Construction"),
			stabilizedNoiProjected: createField(2268000, "Proforma"),
			exitStrategy: createField(
				"Hold for long-term cash flow, potential sale after stabilization at 5-7 year mark",
				"Business Plan"
			),
			businessPlanSummary: createField(
				"Develop and operate a high-quality mixed-use property in the rapidly growing Deep Ellum submarket. Target market-rate and affordable units (80% AMI) with strong retail and office components. Projected stabilization within 18 months of first occupancy.",
				"Business Plan"
			),
			marketOverviewSummary: createField(null, "User Input"), // Empty field 2
			equityCommittedPercent: createField(39.6, "Equity Commit"),
			internalAdvisorNotes: createField(null, "User Input"), // Empty field 1
			// Additional fields that should be in section_3
			loanAmountRequested: createField(18000000, "Sources & Uses"), // Also in section_1
			loanType: createField("Construction Loan", "Term Sheet"), // Also in section_1
			requestedTerm: createField("3 Years + 1 Year Ext", "Term Sheet"), // Also in section_1
			expectedHoldPeriod: createField(5, "Inv. Memo"), // Also in section_1
			ltvStressMax: createField(50.0, "Underwriting Parameters"), // Also in section_1
			dscrStressMin: createField(1.1, "Underwriting Parameters"), // Also in section_1
			// Operating Expenses
			realEstateTaxes: createField(450000, "Proforma"),
			insurance: createField(125000, "Proforma"),
			utilitiesCosts: createField(180000, "Proforma"),
			repairsAndMaintenance: createField(95000, "Proforma"),
			managementFee: createField(113400, "Proforma"),
			generalAndAdmin: createField(75000, "Proforma"),
			payroll: createField(120000, "Proforma"),
			reserves: createField(29000, "Proforma"),
			marketingLeasing: createField(68040, "Proforma"),
			serviceCoordination: createField(0, "Proforma"),
			// Investment Metrics
			noiYear1: createField(2268000, "EGI - Total Exp"),
			yieldOnCost: createField(7.6, "NOI / TDC"),
			capRate: createField(5.5, "Appraisal"),
			stabilizedValue: createField(41200000, "NOI / Cap Rate"),
			ltv: createField(43.7, "Loan / Value"),
			debtYield: createField(12.6, "NOI / Loan"),
			dscr: createField(1.25, "NOI / Debt Svc"),
			trendedNOIYear1: createField(2313360, "Proforma"),
			untrendedNOIYear1: createField(2222640, "Proforma"),
			trendedYield: createField(7.76, "Trended / TDC"),
			untrendedYield: createField(7.45, "Untrended / TDC"),
			inflationAssumption: createField(2.0, "Proforma"),
			dscrStressTest: createField(1.08, "Stress Calc"),
			portfolioLTV: createField(65.0, "Sponsor FS"),
			portfolioDSCR: createField(1.35, "Sponsor FS"),
		},
		section_4: {
			// Market Context
			// Only 2 fields are empty (User Input): northStarComp and infraCompletion
			submarketName: createField(
				"Deep Ellum / Farmers Market",
				"Market Study"
			),
			distanceToCBD: createField(1.2, "Geo-calc"),
			distanceToEmployment: createField(
				"0.5 miles to Downtown Dallas",
				"Market Study"
			),
			distanceToTransit: createField(0.3, "Geo-calc"),
			walkabilityScore: createField(85, "Walk Score"),
			population3Mi: createField(125000, "Census ACS"),
			popGrowth201020: createField(12.5, "Census ACS"),
			projGrowth202429: createField(8.3, "Census ACS"),
			medianHHIncome: createField(62500, "Census ACS"),
			renterOccupiedPercent: createField(68.5, "Census ACS"),
			bachelorsDegreePercent: createField(42.3, "Census ACS"),
			msaName: createField("Dallas-Fort Worth-Arlington, TX", "Geo"),
			unemploymentRate: createField(3.5, "BLS"),
			largestEmployer: createField("Downtown Dallas", "Market Study"),
			employerConcentration: createField(15.0, "Market Study"),
			submarketAbsorption: createField(500, "CoStar"),
			supplyPipeline: createField(1200, "CoStar"),
			monthsOfSupply: createField(8.5, "Supply/Absorp"),
			captureRate: createField(2.1, "Subj Units/Demand"),
			marketConcessions: createField("1 Month Free", "CoStar"),
			absorptionRate: createField(12, "Market Study"),
			penetrationRate: createField(2.1, "Market Study"),
			northStarComp: createField(null, "User Input"), // Empty field 1
			infrastructureProject: createField(
				"DART Rail Extension",
				"Market Study"
			),
			infrastructureCatalyst: createField(
				"New Light Rail Station",
				"Market Study"
			),
			broadbandSpeed: createField("Fiber 1Gbps Available", "FCC Map"),
			crimeRiskLevel: createField("Low", "Crime Data"),
			projectBudget: createField(250000000, "Market Study"),
			infraCompletion: createField(null, "User Input"), // Empty field 2
			rentComps: createField(
				[
					{
						propertyName: "The Alexan Deep Ellum",
						address: "2800 Commerce St, Dallas, TX 75226",
						distance: 0.4,
						yearBuilt: 2019,
						totalUnits: 245,
						occupancyPercent: 95.5,
						avgRentMonth: 1850,
						rentPSF: 3.36,
						concessions: "1 month free",
					},
					{
						propertyName: "The Brady",
						address: "2600 Main St, Dallas, TX 75226",
						distance: 0.6,
						yearBuilt: 2020,
						totalUnits: 180,
						occupancyPercent: 97.2,
						avgRentMonth: 1950,
						rentPSF: 3.55,
						concessions: "None",
					},
				],
				"Market Study"
			),
			saleComps: createField(
				[
					{
						propertyName: "The Alexan Deep Ellum",
						salePricePerUnit: 355000,
						capRate: 5.2,
						saleDate: "2023-06-15",
					},
					{
						propertyName: "The Brady",
						salePricePerUnit: 365000,
						capRate: 5.4,
						saleDate: "2023-09-20",
					},
				],
				"Appraisal"
			),
		},
		section_5: {
			// Special Considerations
			// Only 2 fields are empty (User Input): paceFinancing and incentiveStacking
			opportunityZone: createField(false, "US Treasury"),
			affordableHousing: createField(true, "Reg Agreement"),
			affordableUnitsNumber: createField(58, "Reg Agreement"),
			amiTargetPercent: createField(80, "Reg Agreement"),
			taxExemption: createField(true, "Incentive Agmt"),
			exemptionStructure: createField("PFC", "Incentive Agmt"),
			sponsoringEntity: createField("SoGood MMD", "Incentive Agmt"),
			structuringFee: createField(250000, "Budget"),
			exemptionTerm: createField(15, "Incentive Agmt"),
			incentiveStacking: createField(null, "User Input"), // Empty field 1
			tifDistrict: createField(false, "City GIS"),
			taxAbatement: createField(true, "Incentive Agmt"),
			paceFinancing: createField(null, "User Input"), // Empty field 2
			historicTaxCredits: createField(false, "NPS Cert"),
			newMarketsCredits: createField(false, "CDFI Fund"),
			relocationPlan: createField("N/A", "Relocation Plan"),
			seismicPMLRisk: createField("2.5% PML", "Eng Report"),
		},
		section_6: {
			// Timeline & Milestones
			// Only 2 fields are empty (User Input): opDeficitEscrow and leaseUpEscrow
			landAcqClose: createField("2024-12-15", "Settlement Stmt"),
			entitlements: createField("Approved", "Zoning Letter"),
			finalPlans: createField("Approved", "Arch Contract"),
			permitsIssued: createField("Issued", "Building Permits"),
			verticalStart: createField("2025-10-01", "Schedule"),
			firstOccupancy: createField("2027-10-15", "Schedule"),
			stabilization: createField("2028-03-31", "Proforma"),
			preLeasedSF: createField(19669, "Lease Agmt"),
			drawSchedule: createField(
				[
					{ drawNumber: 1, percentComplete: 10, amount: 1800000 },
					{ drawNumber: 2, percentComplete: 25, amount: 2700000 },
					{ drawNumber: 3, percentComplete: 50, amount: 3600000 },
					{ drawNumber: 4, percentComplete: 75, amount: 3600000 },
					{ drawNumber: 5, percentComplete: 100, amount: 6300000 },
				],
				"Const Contract"
			),
			absorptionProjection: createField(12, "Market Study"),
			opDeficitEscrow: createField(null, "User Input"), // Empty field 1
			leaseUpEscrow: createField(null, "User Input"), // Empty field 2
			// Also include groundbreakingDate and completionDate here (they're also in section_1)
			groundbreakingDate: createField(
				"2025-08-01",
				"Construction Schedule"
			),
			completionDate: createField("2027-09-30", "Construction Schedule"),
		},
		section_7: {
			// Site & Context
			// Only 2 fields are empty (User Input): viewCorridors and topEmployers
			totalSiteAcreage: createField(2.85, "ALTA Survey"),
			currentSiteStatus: createField("Vacant", "Phase I ESA"),
			topography: createField("Flat", "Survey"),
			environmental: createField("Clean", "Phase I ESA"),
			utilities: createField("Available", "Civil Plans"),
			buildableAcreage: createField(2.3, "ALTA Survey"),
			allowableFAR: createField(3.5, "Zoning Letter"),
			farUtilizedPercent: createField(85.0, "GBA/Land Area"),
			densityBonus: createField(true, "Zoning"),
			soilConditions: createField("Expansive Clay, req Piles", "Geotech"),
			utilityCapacity: createField(
				"Water: 500 GPM available, Sewer: 600 GPM capacity",
				"Civil Plans"
			),
			geotechSoilsRep: createField(
				"Suitable bearing capacity, no special foundation requirements",
				"Soils Report"
			),
			floodZone: createField("Zone X", "ALTA Survey"),
			wetlandsPresent: createField(false, "Env Report"),
			seismicRisk: createField("Low", "Eng Report"),
			phaseIESAFinding: createField("Clean", "Phase I ESA"),
			utilityAvailability: createField("All Available", "Will Serve"),
			easements: createField(
				"Utility easement on north side",
				"Title/ALTA"
			),
			accessPoints: createField("1 Curb Cut on Main St", "Civil Plans"),
			adjacentLandUse: createField("Mixed-Use", "Zoning"),
			noiseFactors: createField(["Highway"], "Env Report"),
			viewCorridors: createField(null, "User Input"), // Empty field 1
			siteAccess: createField(
				"Primary access from Hickory St, secondary from Commerce St",
				"Civil Plans"
			),
			proximityShopping: createField(
				"0.2 miles to Deep Ellum retail district",
				"Market Study"
			),
			proximityRestaurants: createField(
				"0.1 miles to multiple restaurants and cafes",
				"Market Study"
			),
			proximityParks: createField(
				"0.3 miles to Farmers Market Park",
				"Market Study"
			),
			proximitySchools: createField(
				"0.5 miles to elementary school, 1.2 miles to high school",
				"Market Study"
			),
			proximityHospitals: createField(
				"1.5 miles to Baylor University Medical Center",
				"Market Study"
			),
			topEmployers: createField(null, "User Input"), // Empty field 2
		},
		section_8: {
			// Sponsor Information
			// Only 2 fields are empty (User Input): contactInfo and priorDevelopments
			sponsorEntityName: createField("Hoque Global", "Org Chart"),
			sponsorStructure: createField("General Partner", "Org Chart"),
			equityPartner: createField("ACARA", "Org Chart"),
			contactInfo: createField(null, "User Input"), // Empty field 1
			sponsorExpScore: createField(8, "Prior Units"),
			priorDevelopments: createField(null, "User Input"), // Empty field 2
			netWorth: createField(45000000, "Financials"),
			guarantorLiquidity: createField(2500000, "Guarantor FS"),
			portfolioDSCR: createField(1.35, "Sponsor FS"),
			// Also include fields that are in section_1 but should also be here
			syndicationStatus: createField("Committed", "Equity Commitment"),
			sponsorExperience: createField("Seasoned (3+)", "Track Record"),
		},
	};

	// ---------------------------------------------------------------------------
	// Schema Alignment:
	// Ensure that every field defined in the enhanced project form schema
	// has a corresponding entry in the mock extraction response.
	// This guarantees that after autofill runs, all fields are at least
	// initialized with metadata (User Input source) so the UI can treat
	// them as "touched" (blue/unlocked) or "filled by AI" (green/locked).
	// ---------------------------------------------------------------------------

	const STEP_ID_TO_SECTION_KEY: Record<string, string> = {
		"basic-info": "section_1",
		"property-specs": "section_2",
		"financial-details": "section_3",
		"market-context": "section_4",
		"special-considerations": "section_5",
		timeline: "section_6",
		"site-context": "section_7",
		"sponsor-info": "section_8",
	};

	const schemaAny = formSchema as any;
	if (Array.isArray(schemaAny.steps)) {
		for (const step of schemaAny.steps) {
			const stepId = step?.id as string | undefined;
			const sectionKey =
				(stepId && STEP_ID_TO_SECTION_KEY[stepId]) || undefined;
			if (!sectionKey) continue;

			if (!sectionWiseFields[sectionKey]) {
				sectionWiseFields[sectionKey] = {};
			}

			const stepFields: string[] = Array.isArray(step.fields)
				? step.fields
				: [];

			for (const fieldId of stepFields) {
				if (!fieldId || typeof fieldId !== "string") continue;
				// Only initialize if field doesn't exist - don't overwrite existing values
				// IMPORTANT: Check if field exists and has a value before overwriting
				const existingField = sectionWiseFields[sectionKey]?.[fieldId];
				if (
					!existingField ||
					(typeof existingField === "object" &&
						"value" in existingField &&
						(existingField.value === null ||
							existingField.value === undefined))
				) {
					// Field doesn't exist or has null value - initialize with User Input
					// The explicit definitions above handle all fields that should have AI values
					sectionWiseFields[sectionKey][fieldId] = createField(
						null,
						"User Input"
					);
				}
				// If field already exists with a value, preserve it (don't overwrite)
			}
		}
	}

	// Final pass: sanitize values to ensure they match expected data types
	for (const [sectionId, fields] of Object.entries(sectionWiseFields)) {
		if (!fields) continue;
		for (const [fieldId, fieldData] of Object.entries(fields)) {
			if (
				!fieldData ||
				typeof fieldData !== "object" ||
				!("value" in fieldData)
			) {
				continue;
			}
			const cleaned = sanitizeMockValue(fieldId, fieldData.value);
			if (cleaned !== fieldData.value) {
				(fieldData as any).value = cleaned;
				(fieldData as any).original_value =
					(fieldData as any).original_value ?? cleaned;
			}
		}
	}

	// Final verification: Ensure critical fields have values (not null)
	// These fields should always have values from the mock API
	const criticalFields = {
		section_1: [
			"parcelNumber",
			"zoningDesignation",
			"expectedZoningChanges",
		],
		section_5: ["seismicPMLRisk"],
	};

	for (const [sectionId, fieldIds] of Object.entries(criticalFields)) {
		if (!sectionWiseFields[sectionId]) continue;
		for (const fieldId of fieldIds) {
			const fieldData = sectionWiseFields[sectionId][fieldId];
			if (
				fieldData &&
				typeof fieldData === "object" &&
				"value" in fieldData
			) {
				// Check if value is null/undefined - if so, ensure it's explicitly set (shouldn't happen if mock is correct)
				if (fieldData.value === null || fieldData.value === undefined) {
					console.warn(
						`[Mock API] Warning: Field ${sectionId}.${fieldId} has null value but should have a value`
					);
				}
			}
		}
	}

	return sectionWiseFields;
};

/**
 * Extract fields for a specific section
 */
export const extractProjectFieldsBySection = async (
	projectId: string,
	sectionId: string,
	documentPaths?: string[]
): Promise<SectionWiseExtractionResponse> => {
	// Simulate API delay
	await new Promise((resolve) => setTimeout(resolve, 800));

	// Get all fields
	const allFields = await extractProjectFields(projectId, documentPaths);

	// Return only the requested section
	return {
		[sectionId]: allFields[sectionId] || {},
	};
};
