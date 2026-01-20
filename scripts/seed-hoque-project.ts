// scripts/seed-hoque-project.ts
// Comprehensive seed script for the Hoque (SoGood Apartments) project
// Creates complete account setup: advisor, borrower, team members, project, resumes, documents, and chat messages
// Run with: npx tsx scripts/seed-hoque-project.ts [--prod] [cleanup]

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import path, { resolve, join } from "path";
import fs, { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { fileURLToPath } from "url";
import projectFormSchema from "../src/lib/enhanced-project-form.schema.json";
import borrowerFormSchema from "../src/lib/borrower-resume-form.schema.json";

// Helper to determine app role
type AppRole = "advisor" | "borrower" | "lender";

// Parse command line arguments
const args = process.argv.slice(2);
const isProduction = args.includes("--prod") || args.includes("--production");
const isCleanup =
	args.includes("cleanup") ||
	args.includes("--cleanup") ||
	args.includes("-c");

// Load environment variables based on mode
if (isProduction) {
	console.log("🌐 Production mode enabled\n");
	// Load production env file first (highest priority)
	config({ path: resolve(process.cwd(), ".env.production") });
	// Also load .env.local and .env as fallbacks
	// config({ path: resolve(process.cwd(), ".env.local") });
	// config({ path: resolve(process.cwd(), ".env") });

	// Warn if production env file doesn't exist
	const prodEnvPath = resolve(process.cwd(), ".env.production");
	if (!existsSync(prodEnvPath)) {
		console.warn("⚠️  WARNING: .env.production file not found!");
		console.warn("   Create .env.production with production credentials.");
		console.warn("   See README-seed-hoque.md for template.\n");
	}

	// Additional production warnings
	if (!isCleanup) {
		console.log(
			"⚠️  WARNING: This will create real users and data in PRODUCTION!"
		);
		console.log("⚠️  Make sure you have backups before proceeding.\n");
	}
} else {
	// Local development mode
	config({ path: resolve(process.cwd(), ".env.local") });
	config({ path: resolve(process.cwd(), ".env") });
}

const supabaseUrl =
	process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validation
if (!supabaseUrl) {
	const envFile = isProduction ? ".env.production" : ".env.local";
	console.error("\n❌ Missing SUPABASE_URL environment variable");
	console.error(
		`   Please set NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL in ${envFile}`
	);
	process.exit(1);
}

if (!serviceRoleKey) {
	const envFile = isProduction ? ".env.production" : ".env.local";
	console.error(
		"\n❌ Missing SUPABASE_SERVICE_ROLE_KEY environment variable"
	);
	console.error(`   Please add SUPABASE_SERVICE_ROLE_KEY to ${envFile}`);
	process.exit(1);
}

// Initialize Supabase client
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {

			    {
				    name: "Sources & Uses Model Template", filename: "sources_uses_template.xlsx" },
			    {
				    name: "Schedule of Real Estate Owned (SREO) Template", filename: "sreo_template.xlsx" },
			    {
				    name: "T12 Financial Statement Template", filename: "t12_template.xlsx" },
			    {
				    name: "Current Rent Roll Template", filename: "rent_roll_template.xlsx" },
			    {
				    name: "Personal Financial Statement (PFS) Template", filename: "pfs_template.xlsx" },
			    {
				    name: "Sponsor Bio Template", filename: "sponsor_bio_template.docx" },
			    {
				    name: "CapEx Report Template", filename: "capex_report_template.xlsx" },
			    {
				    name: "ProForma Cash flow Template", filename: "pro_forma_template.xlsx" },
 
	// First, try to get from schema.fields (field metadata object)
	if (schema.fields && typeof schema.fields === "object") {
		Object.keys(schema.fields).forEach((fieldId) => fieldIds.add(fieldId));
	}

	// Also extract from schema.steps (steps array with fields)
	if (schema.steps && Array.isArray(schema.steps)) {
		for (const step of schema.steps) {
			if (step.fields && Array.isArray(step.fields)) {
				step.fields.forEach((fieldId: string) => fieldIds.add(fieldId));
			}
			// Also check subsections
			if (step.subsections && Array.isArray(step.subsections)) {
				for (const subsection of step.subsections) {
					if (subsection.fields && Array.isArray(subsection.fields)) {
						subsection.fields.forEach((fieldId: string) =>
							fieldIds.add(fieldId)
						);
					}
				}
			}
		}
	}

	return Array.from(fieldIds);
}

/**
 * Default value helper for project fields
 */
function getDefaultValueForProjectField(fieldId: string): any {
	// Check if it's a known array/table field
	const arrayFields = [
		"residentialUnitMix",
		"commercialSpaceMix",
		"rentComps",
		"drawSchedule",
		"amenityList",
		"incentiveStacking",
		"noiseFactors",
		"riskHigh",
		"riskMedium",
		"riskLow",
		"majorEmployers",
		"siteImages",
		"architecturalDiagrams",
		"t12MonthlyData",
		"t12MonthlyData",
		"rentRollUnits",
		"capexItems",
	];
	if (arrayFields.includes(fieldId)) {
		return [];
	}

	// Check if it's a known object field
	const objectFields = [
		"fiveYearCashFlow",
		"returnsBreakdown",
		"quarterlyDeliverySchedule",
		"sensitivityAnalysis",
		"deliveryByQuarter",
		"capitalUseTiming",
	];
	if (objectFields.includes(fieldId)) {
		return {};
	}

	// Check if it's a known boolean field
	const booleanFields = [
		"furnishedUnits",
		"affordableHousing",
		"opportunityZone",
		"taxExemption",
		"tifDistrict",
		"taxAbatement",
		"paceFinancing",
		"historicTaxCredits",
		"newMarketsCredits",
		"wetlandsPresent",
		"densityBonus",
		"permTakeoutPlanned",
		"zoningCompliant",
	];
	if (booleanFields.includes(fieldId)) {
		return false;
	}

	// Check if it's a known numeric field
	const numericFields = [
		"totalResidentialUnits",
		"totalResidentialNRSF",
		"averageUnitSize",
		"totalCommercialGRSF",
		"grossBuildingArea",
		"numberOfStories",
		"parkingSpaces",
		"parkingRatio",
		"buildingEfficiency",
		"studioCount",
		"oneBedCount",
		"twoBedCount",
		"threeBedCount",
		"lossToLease",
		"adaCompliantPercent",
		"solarCapacity",
		"evChargingStations",
		"totalDevelopmentCost",
		"totalProjectCost",
		"capexBudget",
		"purchasePrice",
		"landAcquisition",
		"baseConstruction",
		"contingency",
		"constructionFees",
		"aeFees",
		"thirdPartyReports",
		"legalAndOrg",
		"titleAndRecording",
		"taxesDuringConstruction",
		"developerFee",
		"loanFees",
		"interestReserve",
		"ffe",
		"workingCapital",
		"opDeficitEscrow",
		"leaseUpEscrow",
		"relocationCosts",
		"syndicationCosts",
		"enviroRemediation",
		"pfcStructuringFee",
		"sponsorEquity",
		"taxCreditEquity",
		"gapFinancing",
		"equityCommittedPercent",
		"loanAmountRequested",
		"amortizationYears",
		"interestRate",
		"underwritingRate",
		"interestOnlyPeriodMonths",
		"targetLtvPercent",
		"targetLtcPercent",
		"allInRate",
		"realEstateTaxes",
		"insurance",
		"utilitiesCosts",
		"repairsAndMaintenance",
		"managementFee",
		"generalAndAdmin",
		"payroll",
		"reserves",
		"marketingLeasing",
		"serviceCoordination",
		"noiYear1",
		"propertyNoiT12",
		"stabilizedNoiProjected",
		"yieldOnCost",
		"capRate",
		"stabilizedValue",
		"ltv",
		"debtYield",
		"dscr",
		"trendedNOIYear1",
		"untrendedNOIYear1",
		"trendedYield",
		"untrendedYield",
		"inflationAssumption",
		"dscrStressTest",
		"ltvStressMax",
		"dscrStressMin",
		"portfolioLTV",
		"portfolioDSCR",
		"expectedHoldPeriod",
		"population3Mi",
		"projGrowth202429",
		"popGrowth201020",
		"medianHHIncome",
		"renterOccupiedPercent",
		"unemploymentRate",
		"employerConcentration",
		"walkabilityScore",
		"submarketAbsorption",
		"supplyPipeline",
		"monthsOfSupply",
		"captureRate",
		"affordableUnitsNumber",
		"amiTargetPercent",
		"exemptionTerm",
		"preLeasedSF",
		"absorptionProjection",
		"totalSiteAcreage",
		"buildableAcreage",
		"allowableFAR",
		"farUtilizedPercent",
		"sponsorExpScore",
		"priorDevelopments",
		"netWorth",
		"guarantorLiquidity",
		"amenitySF",
		"totalAmenities",
		"amenityAvgSize",
		"totalCapitalization",
		"equityContribution",
		"floorRate",
		"ltc",
		"exitCapRate",
		"debtService",
		"taxInsuranceReserve",
		"capExReserve",
		"totalOperatingExpenses",
		"distanceToCBD",
		"distanceToEmployment",
		"distanceToTransit",
		"jobGrowth",
		"rentGrowthAssumption",
		"population1Mi",
		"population5Mi",
		"medianIncome1Mi",
		"medianIncome5Mi",
		"medianAge1Mi",
		"medianAge3Mi",
		"medianAge5Mi",
		"incomeGrowth5yr",
		"jobGrowth5yr",
		"currentInventory",
		"underConstruction",
		"planned24Months",
		"averageOccupancy",
		"avgCapRate",
		"rentPremium",
		"rentGrowth",
		"totalIncentiveValue",
		"impactFees",
		"landAcqToGroundbreakingDays",
		"groundbreakingToVerticalStartDays",
		"verticalStartToFirstOccupancyDays",
		"firstOccupancyToCompletionDays",
		"completionToStabilizationDays",
		"totalProjectDurationDays",
		"greenSpace",
		"setbackFront",
		"setbackSide",
		"setbackRear",
		"greenSpaceRatio",
		"storyHeight",
		"heightLimit",
		"actualHeight",
	];
	if (numericFields.includes(fieldId)) {
		return 0;
	}

	// Default to empty string for text fields
	return "";
}

/**
 * Get realistic value for a project field based on Hoque/SoGood project details
 * This provides believable values for fields that aren't in the base resume
 * Falls back to defaults if no realistic value is available
 */
function getRealisticValueForProjectField(fieldId: string): any {
	// Realistic values based on Hoque/SoGood Apartments project
	const realisticValues: Record<string, any> = {
		// Financial metrics
		amenitySF: 35264, // Total amenity space
		irr: 18.5, // Internal Rate of Return (based on 7.6% yield, 7-year hold, PFC benefits)
		equityMultiple: 2.1, // Equity multiple (based on $11.8M equity and projected returns)
		ltc: 60.4, // Loan-to-Cost: $18M / $29.8M
		exitCapRate: 5.5, // Exit cap rate (conservative, same as going-in)
		rentGrowthAssumption: 3.0, // Annual rent growth assumption

		// Location/distance metrics (Downtown Dallas location)
		distanceToCBD: 0.8, // Miles to Downtown Dallas CBD
		distanceToEmployment: 0.6, // Miles to major employment centers
		distanceToTransit: 0.3, // Miles to DART rail station

		// Market metrics
		jobGrowth: 2.5, // Annual job growth percentage for Dallas market

		// Loan terms details
		loanIndex: "SOFR", // Floating rate index
		loanSpread: 2.75, // Spread over index (8.0% - 5.25% SOFR ≈ 2.75%)
		rateFloor: 4.5, // Minimum interest rate floor
		extensionTerms: "Two 6-month extensions available", // Extension options

		// Lender requirements
		minDSCR: 1.25, // Minimum debt service coverage ratio
		maxLTV: 50.0, // Maximum loan-to-value ratio
		minLiquidity: 2000000, // Minimum liquidity requirement ($2M)

		// Deal timeline
		loiDate: "2024-11-15", // Letter of Intent date
		ddExpirationDate: "2025-05-15", // Due diligence expiration
		closingDate: "2025-08-15", // Target closing date

		// Site details
		siteAcreage: 2.5, // Total site acreage
		farAllowed: 3.5, // Floor Area Ratio allowed
		farUsed: 2.98, // FAR utilized (127,406 SF / 2.3 acres / 43,560 SF per acre)
		frontSetback: 25, // Front setback in feet
		sideSetback: 15, // Side setback in feet
		rearSetback: 20, // Rear setback in feet

		// Amenity breakdown (total 35,264 SF)
		poolSF: 3200, // Swimming pool area
		gymSF: 2500, // Fitness center area
		coworkingSF: 5000, // Shared working space
		loungeSF: 1800, // Lounge area
		terraceSF: 2200, // Outdoor terrace
		otherAmenitySF: 20564, // Other amenity spaces

		// Unit mix details
		minRent: 1550, // Minimum monthly rent (studio S1)
		maxRent: 2800, // Maximum monthly rent (2BR B1)
		avgRent: 1850, // Average monthly rent
		securityDeposit: 500, // Typical security deposit amount

		// Sponsor details
		principalEducation: "MBA, University of Texas at Dallas", // Mike Hoque education
		pastDealIRR: 22.5, // Average IRR on past developments
		lenderReferenceYears: 8, // Years of relationship with key lenders
	};

	// Return realistic value if available
	if (realisticValues.hasOwnProperty(fieldId)) {
		return realisticValues[fieldId];
	}

	// Fallback to defaults for fields not in realistic values
	return getDefaultValueForProjectField(fieldId);
}

/**
 * Default value helper for borrower fields
 */
function getDefaultValueForBorrowerField(fieldId: string): any {
	// Check if it's a known boolean field
	const booleanFields = [
		"bankruptcyHistory",
		"foreclosureHistory",
		"litigationHistory",
	];
	if (booleanFields.includes(fieldId)) {
		return false;
	}

	// Check if it's a known numeric field
	const numericFields = [
		"ownershipPercentage",
		"yearFounded",
		"activeProjects",
	];
	if (numericFields.includes(fieldId)) {
		return 0;
	}

	// Check if it's a known array field
	const arrayFields = [
		"assetClassesExperience",
		"geographicMarketsExperience",
		"principalSpecialties",
		"principalAchievements",
		"references",
		"principals", // Array of principal objects
		"trackRecord", // Array of track record items
	];
	if (arrayFields.includes(fieldId)) {
		return [];
	}

	// Default to empty string for text fields
	return "";
}

/**
 * Convert flat resume content to rich format
 * Rich format: { value, source, warnings, other_values }
 * This matches the format used by the application when saving resume data
 */
function convertToRichFormat(
	content: Record<string, any>
): Record<string, any> {
	const richFormat: Record<string, any> = {};

	for (const key in content) {
		// Skip metadata fields - they stay as-is
		if (key.startsWith("_") || key === "completenessPercent") {
			richFormat[key] = content[key];
			continue;
		}

		const fieldValue = content[key];

		// If already in rich format, keep it
		if (
			fieldValue &&
			typeof fieldValue === "object" &&
			!Array.isArray(fieldValue) &&
			"value" in fieldValue &&
			("source" in fieldValue || "sources" in fieldValue)
		) {
			richFormat[key] = fieldValue;
			continue;
		}

		// Convert to rich format
		richFormat[key] = {
			value: fieldValue,
			source: { type: "user_input" },
			warnings: [],
			other_values: [],
		};
	}

	return richFormat;
}


// Base Hoque project resume – only fields from the schema
const hoqueProjectResumeBase: Record<string, any> = {
	projectName: "SoGood Apartments",
	assetType: "Mixed-Use",
	dealStatus: "Underwriting",
	propertyAddressStreet: "2300 Hickory St",
	propertyAddressCity: "Dallas",
	propertyAddressState: "TX",
	propertyAddressCounty: "Dallas County",
	propertyAddressZip: "75215",
	parcelNumber: "000472000A01B0100",
	zoningDesignation: "PD317",
	constructionType: "Ground-Up",
	groundbreakingDate: "2025-08-01",
	completionDate: "2027-09-30",
	totalDevelopmentCost: 29800000,
	requestedTerm: "2 Years",
	projectDescription:
		"Ground-up development of Building B within the SoGood master plan, delivering 116 units over activated ground-floor innovation space between the Dallas Farmers Market and Deep Ellum.",
	projectPhase: "Construction",
	expectedZoningChanges: "None",
	masterPlanName: "SoGood Master Plan", // Building B within the SoGood master plan

	// Property Specifications
	totalResidentialUnits: 116,
	totalResidentialNRSF: 59520,
	averageUnitSize: 513,
	totalCommercialGRSF: 49569,
	grossBuildingArea: 127406,
	buildingEfficiency: 82.0,
	numberOfStories: 6,
	buildingType: "Mid-rise",
	parkingSpaces: 180,
	parkingRatio: 1.55,
	parkingType: "Structured parking garage with surface spaces",
	amenityList: [
		"Fitness center",
		"Shared working space",
		"Lounge",
		"Outdoor terrace",
		"Swimming pool",
	],
	amenitySF: 35264, // Total amenity space
	totalAmenities: 5, // Number of distinct amenity spaces
	amenityAvgSize: 7053, // Average amenity size (35,264 SF / 5 amenities)
	amenitySpaceType: "Indoor and outdoor mixed-use spaces",
	amenityAccess: "Resident-only access with key fob system",
	// Explicit unit counts by type (in addition to detailed mix)
	studioCount: 84,
	oneBedCount: 24,
	twoBedCount: 8,
	threeBedCount: 0, // No 3-bedroom units in this development
	furnishedUnits: false,
	lossToLease: 5.0,
	adaCompliantPercent: 5.0,
	luxuryTier: "Class A",
	targetMarket:
		"Young professionals, creative class, and workforce housing residents (50% at ≤80% AMI)",
	competitivePosition:
		"Premium workforce housing with strong amenity package and prime location between Farmers Market and Deep Ellum",
	unitPlanDescription:
		"Modern studio, one-bedroom, and two-bedroom units with high-end finishes, in-unit washers/dryers, and energy-efficient appliances. Units feature open floor plans, large windows, and private balconies where applicable.",
	hvacSystem: "Central",
	roofTypeAge: "TPO, new construction",
	solarCapacity: 100,
	evChargingStations: 8,
	leedGreenRating: "Certified",
	residentialUnitMix: [
		{
			unitType: "S1",
			unitCount: 48,
			avgSF: 374,
			monthlyRent: 1550,
			totalSF: 48 * 374,
		},
		{
			unitType: "S2",
			unitCount: 28,
			avgSF: 380,
			monthlyRent: 1600,
			totalSF: 28 * 380,
		},
		{
			unitType: "S3",
			unitCount: 8,
			avgSF: 470,
			monthlyRent: 1750,
			totalSF: 8 * 470,
		},
		{
			unitType: "A1",
			unitCount: 8,
			avgSF: 720,
			monthlyRent: 2100,
			totalSF: 8 * 720,
		},
		{
			unitType: "A2",
			unitCount: 8,
			avgSF: 736,
			monthlyRent: 2150,
			totalSF: 8 * 736,
		},
		{
			unitType: "A3",
			unitCount: 8,
			avgSF: 820,
			monthlyRent: 2300,
			totalSF: 8 * 820,
		},
		{
			unitType: "B1",
			unitCount: 8,
			avgSF: 1120,
			monthlyRent: 2800,
			totalSF: 8 * 1120,
		},
	],
	commercialSpaceMix: [
		{
			spaceType: "Innovation Center",
			squareFootage: 30000,
			tenant: "GSV Holdings LLC",
			leaseTerm: "15-year lease, pre-leased",
			annualRent: 900000,
		},
		{
			spaceType: "Office 1",
			squareFootage: 6785,
			tenant: "TBD – Creative Office",
			leaseTerm: "To be leased",
			annualRent: 0,
		},
		{
			spaceType: "Office 2",
			squareFootage: 5264,
			tenant: "TBD – Professional Services",
			leaseTerm: "To be leased",
			annualRent: 0,
		},
		{
			spaceType: "Retail",
			squareFootage: 745,
			tenant: "Future F&B Operator",
			leaseTerm: "To be leased",
			annualRent: 0,
		},
	],

	t12MonthlyData: [
		{
			month: "Jan-25",
			grossPotentialRent: 150000,
			concessions: 2000,
			badDebt: 1500,
			otherIncome: 7500,
			utilities: 12000,
			repairsMaintenance: 4500,
			makeReady: 1500,
			payroll: 22000,
			managementFee: 4000,
			marketing: 2500,
			generalAdmin: 1200,
			contractServices: 3500,
			realEstateTaxes: 12500,
			insurance: 4200,
			capex: 0,
		},
		{
			month: "Feb-25",
			grossPotentialRent: 150000,
			concessions: 1500,
			badDebt: 1000,
			otherIncome: 7200,
			utilities: 11500,
			repairsMaintenance: 3800,
			makeReady: 1200,
			payroll: 22000,
			managementFee: 4000,
			marketing: 2000,
			generalAdmin: 1100,
			contractServices: 3500,
			realEstateTaxes: 12500,
			insurance: 4200,
			capex: 5000,
		},
		{
			month: "Mar-25",
			grossPotentialRent: 152000,
			concessions: 1000,
			badDebt: 1200,
			otherIncome: 7800,
			utilities: 11000,
			repairsMaintenance: 5000,
			makeReady: 2000,
			payroll: 22000,
			managementFee: 4100,
			marketing: 2500,
			generalAdmin: 1300,
			contractServices: 3500,
			realEstateTaxes: 12500,
			insurance: 4200,
			capex: 0,
		},
		{
			month: "Apr-25",
			grossPotentialRent: 152000,
			concessions: 500,
			badDebt: 1000,
			otherIncome: 8000,
			utilities: 10500,
			repairsMaintenance: 4200,
			makeReady: 1800,
			payroll: 22500,
			managementFee: 4100,
			marketing: 2500,
			generalAdmin: 1200,
			contractServices: 3800,
			realEstateTaxes: 12500,
			insurance: 4200,
			capex: 0,
		},
		{
			month: "May-25",
			grossPotentialRent: 154000,
			concessions: 500,
			badDebt: 800,
			otherIncome: 8200,
			utilities: 11000,
			repairsMaintenance: 4000,
			makeReady: 1500,
			payroll: 22500,
			managementFee: 4200,
			marketing: 3000,
			generalAdmin: 1250,
			contractServices: 3800,
			realEstateTaxes: 12500,
			insurance: 4200,
			capex: 12000,
		},
		{
			month: "Jun-25",
			grossPotentialRent: 155000,
			concessions: 0,
			badDebt: 500,
			otherIncome: 8500,
			utilities: 14000,
			repairsMaintenance: 4500,
			makeReady: 2200,
			payroll: 22500,
			managementFee: 4250,
			marketing: 3000,
			generalAdmin: 1300,
			contractServices: 3800,
			realEstateTaxes: 12500,
			insurance: 4200,
			capex: 0,
		},
		{
			month: "Jul-25",
			grossPotentialRent: 156000,
			concessions: 0,
			badDebt: 600,
			otherIncome: 9000,
			utilities: 15000,
			repairsMaintenance: 5200,
			makeReady: 2500,
			payroll: 23000,
			managementFee: 4300,
			marketing: 2500,
			generalAdmin: 1400,
			contractServices: 4000,
			realEstateTaxes: 12500,
			insurance: 4200,
			capex: 2500,
		},
		{
			month: "Aug-25",
			grossPotentialRent: 156000,
			concessions: 1000,
			badDebt: 1200,
			otherIncome: 8800,
			utilities: 15500,
			repairsMaintenance: 4800,
			makeReady: 2000,
			payroll: 23000,
			managementFee: 4300,
			marketing: 2500,
			generalAdmin: 1350,
			contractServices: 4000,
			realEstateTaxes: 12500,
			insurance: 4200,
			capex: 0,
		},
		{
			month: "Sep-25",
			grossPotentialRent: 157000,
			concessions: 500,
			badDebt: 1500,
			otherIncome: 8500,
			utilities: 13000,
			repairsMaintenance: 4500,
			makeReady: 1800,
			payroll: 23000,
			managementFee: 4350,
			marketing: 2000,
			generalAdmin: 1300,
			contractServices: 4000,
			realEstateTaxes: 12500,
			insurance: 4200,
			capex: 0,
		},
		{
			month: "Oct-25",
			grossPotentialRent: 158000,
			concessions: 500,
			badDebt: 1000,
			otherIncome: 8200,
			utilities: 12000,
			repairsMaintenance: 4200,
			makeReady: 1500,
			payroll: 23500,
			managementFee: 4400,
			marketing: 2000,
			generalAdmin: 1250,
			contractServices: 3800,
			realEstateTaxes: 12500,
			insurance: 4200,
			capex: 8000,
		},
		{
			month: "Nov-25",
			grossPotentialRent: 158000,
			concessions: 0,
			badDebt: 800,
			otherIncome: 8000,
			utilities: 11500,
			repairsMaintenance: 4000,
			makeReady: 1200,
			payroll: 23500,
			managementFee: 4400,
			marketing: 2000,
			generalAdmin: 1200,
			contractServices: 3800,
			realEstateTaxes: 12500,
			insurance: 4200,
			capex: 0,
		},
		{
			month: "Dec-25",
			grossPotentialRent: 160000,
			concessions: 2000,
			badDebt: 1000,
			otherIncome: 8500,
			utilities: 13000,
			repairsMaintenance: 5000,
			makeReady: 2500,
			payroll: 24000,
			managementFee: 4500,
			marketing: 2500,
			generalAdmin: 1500,
			contractServices: 3800,
			realEstateTaxes: 12500,
			insurance: 4200,
			capex: 0,
		},
	],
	rentRollUnits: [
		{
			unitNumber: "101",
			unitType: "1B/1B",
			beds: 1,
			baths: 1,
			sf: 750,
			status: "Occupied",
			tenantName: "John Smith",
			leaseStart: "2024-01-15",
			leaseEnd: "2025-01-14",
			monthlyRent: 2100,
		},
		{
			unitNumber: "102",
			unitType: "2B/2B",
			beds: 2,
			baths: 2,
			sf: 1100,
			status: "Occupied",
			tenantName: "Jane Doe",
			leaseStart: "2024-03-01",
			leaseEnd: "2025-02-28",
			monthlyRent: 3400,
		},
		{
			unitNumber: "103",
			unitType: "1B/1B",
			beds: 1,
			baths: 1,
			sf: 750,
			status: "Occupied",
			tenantName: "Bob Johnson",
			leaseStart: "2024-06-01",
			leaseEnd: "2025-05-31",
			monthlyRent: 2150,
		},
		{
			unitNumber: "104",
			unitType: "2B/1B",
			beds: 2,
			baths: 1,
			sf: 950,
			status: "Vacant",
			tenantName: "",
			leaseStart: "",
			leaseEnd: "",
			monthlyRent: 0,
		},
		{
			unitNumber: "105",
			unitType: "Studio",
			beds: 0,
			baths: 1,
			sf: 500,
			status: "Occupied",
			tenantName: "Alice Brown",
			leaseStart: "2024-02-01",
			leaseEnd: "2025-01-31",
			monthlyRent: 1650,
		},
	],
	capexItems: [
		{
			"item": "Roof Replacement (TPO System)",
			"category": "Structural",
			"cost": 150000,
			"priority": "Critical",
			"condition": "Poor - End of Life",
			"usefulLife": 20,
			"startDate": "2026-04-01",
			"status": "Planned",
			"notes": "Current roof has multiple active leaks. Quote from Apex Roofing."
		},
		{
			"item": "Parking Lot Resurfacing & Striping",
			"category": "Site Work",
			"cost": 45000,
			"priority": "Medium",
			"condition": "Fair",
			"usefulLife": 10,
			"startDate": "2026-06-15",
			"status": "Planned",
			"notes": "Fill cracks and sealcoat. Add accessible spaces."
		},
		{
			"item": "Unit Renovations (Phase 1 - 20 Units)",
			"category": "Interiors",
			"cost": 240000,
			"priority": "High",
			"condition": "Dated",
			"usefulLife": 15,
			"startDate": "2026-02-01",
			"completionDate": "2026-08-01",
			"status": "In Progress",
			"vendor": "Creative Interiors LLC",
			"notes": "New LVP flooring, stainless appliances, quartz countertops. Expected $250 premium/unit."
		},
		{
			"item": "Boiler System Replacement",
			"category": "Mechanical",
			"cost": 85000,
			"priority": "Critical",
			"condition": "Poor",
			"usefulLife": 25,
			"startDate": "2026-09-01",
			"status": "Planned",
			"notes": "Original 1990 system. Efficiency rating < 80%."
		},
		{
			"item": "Common Area LED Lighting Retrofit",
			"category": "Electrical",
			"cost": 12000,
			"priority": "Low",
			"condition": "Functional",
			"startDate": "2026-03-01",
			"status": "Planned",
			"notes": "Energy saving initiative. Estimated 1.5 year payback."
		}
	],

	// Financial Details - Development Budget
	landAcquisition: 6000000,
	baseConstruction: 16950000,
	contingency: 847500,
	ffe: 580000,
	constructionFees: 174000,
	constructionManagementFee: 174000, // Alias for S&U generator
	aeFees: 859800,
	thirdPartyReports: 50000,
	legalAndOrg: 50000,
	acquisitionCosts: 50000, // For S&U generator
	payoffExistingDebt: 0, // For S&U generator
	titleAndRecording: 75000,
	taxesDuringConstruction: 20000,
	workingCapital: 1900000,
	developerFee: 678000,
	pfcStructuringFee: 116000,
	loanFees: 360000,
	interestReserve: 1147500,
	opDeficitEscrow: 650000,
	leaseUpEscrow: 1300000,
	relocationCosts: 0, // No relocation required - vacant site
	syndicationCosts: 150000,
	enviroRemediation: 0, // Phase 1 ESA clean - no remediation needed
	totalProjectCost: 29807800,
	capexBudget: 16950000,
	purchasePrice: 6000000,
	// Label fields for budget items
	landAcquisitionLabel: "Land Acquisition",
	baseConstructionLabel: "Base Construction",
	contingencyLabel: "Contingency (5%)",
	constructionFeesLabel: "Construction Fees",
	aeFeesLabel: "A&E Fees",
	developerFeeLabel: "Developer Fee",
	interestReserveLabel: "Interest Reserve",
	workingCapitalLabel: "Working Capital",
	opDeficitEscrowLabel: "Operating Deficit Escrow",
	leaseUpEscrowLabel: "Lease-Up Escrow",
	ffeLabel: "FF&E",
	thirdPartyReportsLabel: "Third Party Reports",
	legalAndOrgLabel: "Legal & Organizational",
	titleAndRecordingLabel: "Title & Recording",
	taxesDuringConstructionLabel: "Taxes During Construction",
	loanFeesLabel: "Loan Fees",
	relocationCostsLabel: "Relocation Costs",
	syndicationCostsLabel: "Syndication Costs",
	enviroRemediationLabel: "Environmental Remediation",
	pfcStructuringFeeLabel: "PFC Structuring Fee",

	// Sources of Funds & Loan Terms
	totalCapitalization: 29800000, // Total project capitalization
	sponsorEquity: 11800000,
	taxCreditEquity: 0, // Not utilizing tax credits for this project
	gapFinancing: 0, // No gap financing required - fully capitalized
	mezzanineDebt: 0, // For S&U generator
	sellerFinancing: 0, // For S&U generator
	preferredEquity: 0, // For S&U generator
	grantsTaxCredits: 0, // For S&U generator
	equityCommittedPercent: 39.6,
	equityContribution: 39.6, // Same as equityCommittedPercent
	equityContributionDescription:
		"$11.8M sponsor equity contribution representing 39.6% of total project cost. Equity fully committed and available at closing.",
	loanTypeLabel: "Senior Construction Loan",
	sponsorEquityLabel: "Sponsor Equity",
	taxCreditEquityLabel: "Tax Credit Equity",
	gapFinancingLabel: "Gap Financing",
	loanAmountRequested: 18000000,
	loanType: "Senior Construction Loan",
	lender: "TBD - Lender selection in progress",
	interestRate: 8.0,
	underwritingRate: 8.0,
	floorRate: 4.5, // Minimum interest rate floor
	interestRateType: "Floating",
	amortizationYears: 30,
	interestOnlyPeriodMonths: 24,
	extensions: "Two 6-month extensions available with lender approval",
	targetLtvPercent: 44,
	targetLtcPercent: 60,
	ltc: 60.4, // Loan-to-Cost: $18M / $29.8M = 60.4%
	prepaymentTerms: "Minimum interest",
	prepaymentPremium: "None - prepayment allowed after interest-only period",
	originationFee: "1.5% of loan amount",
	exitFee: "None",
	recoursePreference: "Partial Recourse",
	completionGuaranty: "Yes - completion guaranty required",
	permTakeoutPlanned: true,
	allInRate: 8.25,
	targetCloseDate: "2025-08-15",
	useOfProceeds:
		"Land acquisition, vertical construction, soft costs, and financing reserves for Building B within the SoGood master plan.",

	// Operating Expenses & Investment Metrics
	realEstateTaxes: 34200,
	insurance: 92800,
	taxInsuranceReserve: 127000, // Tax and insurance reserve
	utilitiesCosts: 23200,
	repairsAndMaintenance: 46400,
	managementFee: 85000,
	generalAndAdmin: 40600,
	payroll: 174000,
	reserves: 23200,
	capExReserve: 116000, // CapEx reserve for future capital improvements
	marketingLeasing: 68040,
	serviceCoordination: 10000,
	totalOperatingExpenses: 625040, // Sum of all operating expenses
	noiYear1: 2268000,
	propertyNoiT12: 0, // Ground-up development - no existing NOI
	stabilizedNoiProjected: 2268000,
	yieldOnCost: 7.6,
	capRate: 5.5,
	stabilizedValue: 41200000,
	ltv: 44,
	debtYield: 12.6,
	dscr: 1.25,
	expectedHoldPeriod: 7,
	untrendedNOIYear1: 2222640,
	trendedNOIYear1: 2313360,
	untrendedYield: 7.45,
	trendedYield: 7.76,
	inflationAssumption: 2.0,
	dscrStressTest: 1.1,
	ltvStressMax: 50.0,
	dscrStressMin: 1.1,
	portfolioLTV: 60.0,
	portfolioDSCR: 1.3,
	debtService: 1814400, // Annual debt service on $18M loan at 8.0% interest
	exitStrategy: "Refinance",
	// fiveYearCashFlow: Array of annual cash flow values (used by ReturnsCharts component)
	fiveYearCashFlow: [
		453600, // Year 1 cash flow (NOI - Debt Service)
		521640, // Year 2 cash flow
		591721, // Year 3 cash flow
		663905, // Year 4 cash flow
		738254, // Year 5 cash flow
	],
	// returnsBreakdown: Percentage breakdown of return sources (used by ReturnsCharts component)
	returnsBreakdown: {
		cashFlow: 40.0, // Percentage contribution from cash flow
		assetAppreciation: 35.0, // Percentage contribution from appreciation
		taxBenefits: 15.0, // Percentage contribution from tax benefits (PFC structure)
		leverage: 10.0, // Percentage contribution from leverage
	},
	// quarterlyDeliverySchedule: Array of quarterly delivery data (used by ReturnsCharts component)
	quarterlyDeliverySchedule: [
		{ quarter: "Q1 2027", units: 0 },
		{ quarter: "Q2 2027", units: 0 },
		{ quarter: "Q3 2027", units: 29 },
		{ quarter: "Q4 2027", units: 87 },
	],
	// T12 Financials (Mock Data for Generator)
	t12_financials: [
		{
			"month": "Jan-25",
			"grossPotentialRent": 150000,
			"concessions": 2000,
			"badDebt": 1500,
			"otherIncome": 7500,
			"utilities": 12000,
			"repairsMaintenance": 4500,
			"makeReady": 1500,
			"payroll": 22000,
			"managementFee": 4000,
			"marketing": 2500,
			"generalAdmin": 1200,
			"contractServices": 3500,
			"realEstateTaxes": 12500,
			"insurance": 4200,
			"capex": 0
		},
		{
			"month": "Feb-25",
			"grossPotentialRent": 150000,
			"concessions": 1500,
			"badDebt": 1000,
			"otherIncome": 7200,
			"utilities": 11500,
			"repairsMaintenance": 3800,
			"makeReady": 1200,
			"payroll": 22000,
			"managementFee": 4000,
			"marketing": 2000,
			"generalAdmin": 1100,
			"contractServices": 3500,
			"realEstateTaxes": 12500,
			"insurance": 4200,
			"capex": 5000
		},
		{
			"month": "Mar-25",
			"grossPotentialRent": 152000,
			"concessions": 1000,
			"badDebt": 1200,
			"otherIncome": 7800,
			"utilities": 11000,
			"repairsMaintenance": 5000,
			"makeReady": 2000,
			"payroll": 22000,
			"managementFee": 4100,
			"marketing": 2500,
			"generalAdmin": 1300,
			"contractServices": 3500,
			"realEstateTaxes": 12500,
			"insurance": 4200,
			"capex": 0
		},
		{
			"month": "Apr-25",
			"grossPotentialRent": 152000,
			"concessions": 500,
			"badDebt": 1000,
			"otherIncome": 8000,
			"utilities": 10500,
			"repairsMaintenance": 4200,
			"makeReady": 1800,
			"payroll": 22500,
			"managementFee": 4100,
			"marketing": 2500,
			"generalAdmin": 1200,
			"contractServices": 3800,
			"realEstateTaxes": 12500,
			"insurance": 4200,
			"capex": 0
		},
		{
			"month": "May-25",
			"grossPotentialRent": 154000,
			"concessions": 500,
			"badDebt": 800,
			"otherIncome": 8200,
			"utilities": 11000,
			"repairsMaintenance": 4000,
			"makeReady": 1500,
			"payroll": 22500,
			"managementFee": 4200,
			"marketing": 3000,
			"generalAdmin": 1250,
			"contractServices": 3800,
			"realEstateTaxes": 12500,
			"insurance": 4200,
			"capex": 12000
		},
		{
			"month": "Jun-25",
			"grossPotentialRent": 155000,
			"concessions": 0,
			"badDebt": 500,
			"otherIncome": 8500,
			"utilities": 14000,
			"repairsMaintenance": 4500,
			"makeReady": 2200,
			"payroll": 22500,
			"managementFee": 4250,
			"marketing": 3000,
			"generalAdmin": 1300,
			"contractServices": 3800,
			"realEstateTaxes": 12500,
			"insurance": 4200,
			"capex": 0
		},
		{
			"month": "Jul-25",
			"grossPotentialRent": 156000,
			"concessions": 0,
			"badDebt": 600,
			"otherIncome": 9000,
			"utilities": 15000,
			"repairsMaintenance": 5200,
			"makeReady": 2500,
			"payroll": 23000,
			"managementFee": 4300,
			"marketing": 2500,
			"generalAdmin": 1400,
			"contractServices": 4000,
			"realEstateTaxes": 12500,
			"insurance": 4200,
			"capex": 2500
		},
		{
			"month": "Aug-25",
			"grossPotentialRent": 156000,
			"concessions": 1000,
			"badDebt": 1200,
			"otherIncome": 8800,
			"utilities": 15500,
			"repairsMaintenance": 4800,
			"makeReady": 2000,
			"payroll": 23000,
			"managementFee": 4300,
			"marketing": 2500,
			"generalAdmin": 1350,
			"contractServices": 4000,
			"realEstateTaxes": 12500,
			"insurance": 4200,
			"capex": 0
		},
		{
			"month": "Sep-25",
			"grossPotentialRent": 157000,
			"concessions": 500,
			"badDebt": 1500,
			"otherIncome": 8500,
			"utilities": 13000,
			"repairsMaintenance": 4500,
			"makeReady": 1800,
			"payroll": 23000,
			"managementFee": 4350,
			"marketing": 2000,
			"generalAdmin": 1300,
			"contractServices": 4000,
			"realEstateTaxes": 12500,
			"insurance": 4200,
			"capex": 0
		},
		{
			"month": "Oct-25",
			"grossPotentialRent": 158000,
			"concessions": 500,
			"badDebt": 1000,
			"otherIncome": 8200,
			"utilities": 12000,
			"repairsMaintenance": 4200,
			"makeReady": 1500,
			"payroll": 23500,
			"managementFee": 4400,
			"marketing": 2000,
			"generalAdmin": 1250,
			"contractServices": 3800,
			"realEstateTaxes": 12500,
			"insurance": 4200,
			"capex": 8000
		},
		{
			"month": "Nov-25",
			"grossPotentialRent": 158000,
			"concessions": 0,
			"badDebt": 800,
			"otherIncome": 8000,
			"utilities": 11500,
			"repairsMaintenance": 4000,
			"makeReady": 1200,
			"payroll": 23500,
			"managementFee": 4400,
			"marketing": 2000,
			"generalAdmin": 1200,
			"contractServices": 3800,
			"realEstateTaxes": 12500,
			"insurance": 4200,
			"capex": 0
		},
		{
			"month": "Dec-25",
			"grossPotentialRent": 160000,
			"concessions": 2000,
			"badDebt": 1000,
			"otherIncome": 8500,
			"utilities": 13000,
			"repairsMaintenance": 5000,
			"makeReady": 2500,
			"payroll": 24000,
			"managementFee": 4500,
			"marketing": 2500,
			"generalAdmin": 1500,
			"contractServices": 3800,
			"realEstateTaxes": 12500,
			"insurance": 4200,
			"capex": 0
		}
	],
	// sensitivityAnalysis: Sensitivity analysis data (used by ReturnsCharts component)
	sensitivityAnalysis: {
		// Rent growth impact on IRR
		rentGrowthImpact: [
			{ growth: "-2%", irr: 16.2 },
			{ growth: "-1%", irr: 17.3 },
			{ growth: "0%", irr: 18.5 },
			{ growth: "+1%", irr: 19.7 },
			{ growth: "+2%", irr: 21.0 },
		],
		// Construction cost impact on IRR
		constructionCostImpact: [
			{ cost: "+10%", irr: 15.8 },
			{ cost: "+5%", irr: 17.1 },
			{ cost: "Base", irr: 18.5 },
			{ cost: "-5%", irr: 19.9 },
			{ cost: "-10%", irr: 21.3 },
		],
	},
	// Flat fields for returns page
	upsideIRR: 21.8,
	downsideIRR: 15.2,
	upsideEquityMultiple: 2.4,
	downsideEquityMultiple: 1.8,
	upsideProfitMargin: 38.3, // Calculated: ($41.2M exit - $29.8M cost) / $29.8M = 38.3%
	downsideProfitMargin: 27.5, // Calculated: ($38.0M exit - $29.8M cost) / $29.8M = 27.5%
	// Risk levels for returns page
	riskLevelUpside: "Low",
	riskLevelBase: "Moderate",
	riskLevelDownside: "Moderate",
	riskHigh: [
		{
			risk: "Construction cost overruns in current inflationary environment",
			mitigation:
				"Fixed-price construction contract with established GC, 5% contingency reserve, and regular cost monitoring",
			probability: "30%",
		},
		{
			risk: "Lease-up timeline delays affecting stabilization",
			mitigation:
				"Pre-leased 30,000 SF Innovation Center, strong market fundamentals with 94.5% occupancy, experienced leasing team",
			probability: "25%",
		},
	],
	riskMedium: [
		{
			risk: "Interest rate volatility on floating rate construction loan",
			mitigation:
				"Interest reserve funded for 24-month construction period, rate floor at 4.5%, relationship with lender for potential rate cap",
			probability: "40%",
		},
		{
			risk: "Market rent growth assumptions may not materialize",
			mitigation:
				"Conservative 3.0% rent growth assumption, strong market fundamentals with 6.9% population growth, diversified unit mix",
			probability: "20%",
		},
	],
	riskLow: [
		{
			risk: "Pre-leased Innovation Center provides stable commercial income",
			mitigation:
				"15-year lease with GSV Holdings executed, credit-worthy tenant, reduces lease-up risk",
			probability: "10%",
		},
		{
			risk: "Strong sponsor track record and lender relationships",
			mitigation:
				"Proven track record with SoGood Phase A, established relationships with Frost Bank and Citi Community Capital",
			probability: "5%",
		},
	],
	capitalUseTiming: {
		month1_3: 0.15, // 15% in first 3 months
		month4_6: 0.25, // 25% in months 4-6
		month7_12: 0.35, // 35% in months 7-12
		month13_18: 0.2, // 20% in months 13-18
		month19_24: 0.05, // 5% in months 19-24
	},
	businessPlanSummary:
		"Execute a Dallas PFC-backed workforce housing program (50% of units ≤80% AMI) inside a 6-story mixed-use podium with 30,000 SF of pre-leased Innovation Center space. The plan funds land acquisition, hard/soft costs, and reserves for a 24-month build schedule plus two 6-month extensions, targeting a refinancing or sale upon stabilization in 2027.",
	marketOverviewSummary:
		"Site sits between the Dallas Farmers Market, Deep Ellum, and the CBD—walking distance to 5,000+ jobs, DART rail, and the I-30/I-45 interchange. Three-mile demographics show $85K+ median income, 6.9% population growth, and 76% renter share. The submarket has <6,000 units delivering over the next 24 months, keeping occupancy above 94%.",

	// Market Context
	submarketName: "Downtown Dallas",
	msaName: "Dallas-Fort Worth-Arlington, TX",
	population1Mi: 45230, // Population within 1 mile
	population3Mi: 174270,
	population5Mi: 385420, // Population within 5 miles
	popGrowth201020: 23.3,
	projGrowth202429: 6.9,
	medianIncome1Mi: 92000, // Median income within 1 mile
	medianHHIncome: 85906,
	medianIncome5Mi: 81500, // Median income within 5 miles
	medianAge1Mi: 34, // Median age within 1 mile
	medianAge3Mi: 35, // Median age within 3 miles
	medianAge5Mi: 36, // Median age within 5 miles
	incomeGrowth5yr: 3.2, // 5-year income growth projection
	jobGrowth5yr: 2.5, // 5-year job growth projection
	renterShare: 76.7, // Same as renterOccupiedPercent
	bachelorsShare: 42.5, // Percentage with bachelor's degree or higher
	renterOccupiedPercent: 76.7,
	unemploymentRate: 3.5,
	largestEmployer: "Downtown Dallas CBD employers",
	majorEmployers: [
		{
			name: "Downtown Dallas CBD",
			employees: 5000,
			growth: "+2.5%",
			distance: "0.8 mi",
		},
		{
			name: "Dallas Farmers Market",
			employees: 500,
			growth: "+3.0%",
			distance: "0.4 mi",
		},
		{
			name: "Deep Ellum Entertainment District",
			employees: 1000,
			growth: "+4.0%",
			distance: "0.6 mi",
		},
		{
			name: "Baylor University Medical Center",
			employees: 3000,
			growth: "+1.5%",
			distance: "1.2 mi",
		},
	],
	employerConcentration: 15.0,
	crimeRiskLevel: "Moderate",
	walkabilityScore: 92,
	infrastructureCatalyst:
		"DART expansion and I-30/I-45 interchange improvements",
	broadbandSpeed: "Fiber 1 Gbps available",
	submarketAbsorption: 500,
	supplyPipeline: 4000,
	currentInventory: 8500, // Current inventory in submarket (units)
	underConstruction: 2500, // Units currently under construction
	planned24Months: 4000, // Units planned for delivery in next 24 months
	averageOccupancy: 94.5, // Average occupancy rate in submarket
	deliveryByQuarter: [
		{ quarter: "Q3 2025", units: 0 },
		{ quarter: "Q4 2025", units: 0 },
		{ quarter: "Q1 2026", units: 500 },
		{ quarter: "Q2 2026", units: 750 },
		{ quarter: "Q3 2026", units: 1000 },
		{ quarter: "Q4 2026", units: 1250 },
	],
	monthsOfSupply: 7.5,
	captureRate: 2.1,
	avgCapRate: 5.5, // Average cap rate for comparable properties
	rentPremium: 5.0, // Rent premium vs. market average (%)
	qualityTier: "Class A",
	competitionLevel: "Moderate",
	demandTrend: "Strong",
	marketStatus: "Healthy",
	supplyPressure: "Moderate - pipeline manageable",
	rentGrowth: 3.0, // Annual rent growth projection
	marketConcessions: "1 month free on select units",
	northStarComp: "SoGood Phase A and nearby Class A multifamily",
	substantialComp:
		"Farmers Market Lofts (220 units, 2018, 95% occupancy) - similar location and unit mix",
	// Seed basic rent comps so the Market Context table is populated
	rentComps: [
		{
			propertyName: "Farmers Market Lofts",
			address: "1010 S Pearl Expy, Dallas, TX",
			distance: 0.4,
			yearBuilt: 2018,
			totalUnits: 220,
			occupancyPercent: 95,
			avgRentMonth: 1900,
			rentPSF: 2.75,
		},
		{
			propertyName: "Deep Ellum Flats",
			address: "2400 Commerce St, Dallas, TX",
			distance: 0.7,
			yearBuilt: 2020,
			totalUnits: 180,
			occupancyPercent: 94,
			avgRentMonth: 1850,
			rentPSF: 2.65,
		},
		{
			propertyName: "Downtown Exchange",
			address: "1400 Main St, Dallas, TX",
			distance: 0.9,
			yearBuilt: 2017,
			totalUnits: 250,
			occupancyPercent: 93,
			avgRentMonth: 2000,
			rentPSF: 2.85,
		},
	],

	// Special Considerations
	opportunityZone: true,
	affordableHousing: true,
	affordableUnitsNumber: 58,
	amiTargetPercent: 80,
	taxExemption: true,
	exemptionStructure: "PFC",
	sponsoringEntity: "Dallas Housing Finance Corporation PFC",
	exemptionTerm: 99,
	incentiveStacking: ["PFC Tax Exemption", "Opportunity Zone"],
	tifDistrict: false,
	taxAbatement: true,
	paceFinancing: false,
	historicTaxCredits: false,
	newMarketsCredits: false,
	relocationPlan: "N/A",
	seismicPMLRisk: "2.5% PML",
	totalIncentiveValue: 8500000, // Estimated total value of tax exemption over 99-year term
	specialProgramsDescription:
		"PFC-backed workforce housing program with 50% of units at ≤80% AMI. Opportunity Zone designation provides tax benefits for equity investors. Property tax exemption through PFC structure significantly improves NOI and project economics.",
	impactFees: 0, // No impact fees - PFC structure exempts from certain fees

	// Timeline & Milestones
	landAcqClose: "2024-07-12",
	firstOccupancy: "2027-10-15",
	stabilization: "2028-03-31",
	preLeasedSF: 30000,
	entitlements: "Approved",
	entitlementsDate: "2024-05-15", // Date entitlements were approved
	finalPlans: "Pending",
	permitsIssued: "Issued",
	verticalStart: "2025-08-01",
	absorptionProjection: 12, // Months to full stabilization
	landAcqToGroundbreakingDays: 385, // Days from land acquisition to groundbreaking
	groundbreakingToVerticalStartDays: 0, // Same date
	verticalStartToFirstOccupancyDays: 806, // Days from vertical start to first occupancy
	firstOccupancyToCompletionDays: 46, // Days from first occupancy to completion
	completionToStabilizationDays: 153, // Days from completion to stabilization
	totalProjectDurationDays: 1390, // Total project duration in days
	landAcqStatus: "completed",
	entitlementsStatus: "completed",
	groundbreakingStatus: "upcoming",
	verticalStartStatus: "upcoming",
	firstOccupancyStatus: "upcoming",
	completionStatus: "upcoming",
	stabilizationStatus: "upcoming",

	// Site & Context
	totalSiteAcreage: 2.5,
	buildableAcreage: 2.3,
	allowableFAR: 3.5,
	farUtilizedPercent: 85.0,
	densityBonus: true,
	greenSpace: 25000, // Green space in square feet
	setbackFront: 25, // Front setback in feet
	setbackSide: 15, // Side setback in feet
	setbackRear: 20, // Rear setback in feet
	greenSpaceRatio: 25.0, // Green space as percentage of site
	storyHeight: 12, // Average story height in feet
	heightLimit: 75, // Maximum height limit in feet
	actualHeight: 72, // Actual building height in feet (6 stories × 12 ft)
	zoningCompliant: true, // Project is compliant with zoning requirements
	currentSiteStatus: "Vacant",
	siteAccess: "Hickory St, Ferris St",
	proximityShopping: "Farmers Market, Deep Ellum nearby",
	topography: "Flat",
	soilConditions: "Urban fill over clay; deep foundations recommended",
	accessPoints: "Curb cuts on Hickory St and Ferris St",
	adjacentLandUse: "Mixed-use, residential, and light industrial",
	viewCorridors: "Downtown Dallas skyline and Farmers Market",
	floodZone: "Zone X",
	wetlandsPresent: false,
	seismicRisk: "Low",
	phaseIESAFinding: "Clean",
	noiseFactors: ["Highway", "Rail"],
	utilityAvailability: "Available",
	easements: "Utility easement along northern property line",
	siteImages: [], // Will be populated from uploaded images
	architecturalDiagrams: [], // Will be populated from uploaded diagrams
	// Seeded draw schedule so the Timeline table renders with rows
	drawSchedule: [
		{ drawNumber: 1, percentComplete: 10, amount: 2500000 },
		{ drawNumber: 2, percentComplete: 30, amount: 5000000 },
		{ drawNumber: 3, percentComplete: 60, amount: 6500000 },
		{ drawNumber: 4, percentComplete: 90, amount: 5500000 },
	],

	// Sponsor Information
	sponsorEntityName: "Hoque Global",
	sponsorStructure: "General Partner",
	equityPartner: "ACARA",
	syndicationStatus: "In Process",
	contactInfo: "Cody Field (415.202.3258), Joel Heikenfeld (972.455.1943)",
	sponsorExperience: "Seasoned (3+)",
	sponsorExpScore: 8,
	priorDevelopments: 1000,
	netWorth: 50000000,
	guarantorLiquidity: 7500000,

	// Additional fields that may be in schema but not in base resume
	// These are realistic values based on the Hoque/SoGood project
	// Note: amenitySF and ltc are already defined above, so not duplicated here
	irr: 18.5, // Internal Rate of Return - calculated based on 7.6% yield, 7-year hold, PFC benefits
	equityMultiple: 2.1, // Equity multiple based on $11.8M equity and projected returns
	exitCapRate: 5.5, // Exit cap rate (same as going-in cap rate for conservative projection)
	distanceToCBD: 0.8, // Miles to Downtown Dallas CBD (site is between Farmers Market and Deep Ellum)
	distanceToEmployment: 0.6, // Miles to major employment centers
	distanceToTransit: 0.3, // Miles to DART rail station
	jobGrowth: 2.5, // Annual job growth percentage for Dallas market
	rentGrowthAssumption: 3.0, // Annual rent growth assumption (used in trended NOI calculations)
};

/**
 * Build a complete resume object that:
 * - includes ONLY fields from the schema
 * - gives every field a non-empty value
 * - locks every such field via _lockedFields so they render green.
 */
const SCHEMA_FIELD_IDS: string[] = getSchemaFieldIds(projectFormSchema);

const hoqueProjectResume: Record<string, any> = (() => {
	const result: Record<string, any> = { ...hoqueProjectResumeBase };

	// Ensure every schema field has a non-empty value.
	for (const fieldId of SCHEMA_FIELD_IDS) {
		const current = result[fieldId];
		const isEmptyString =
			typeof current === "string" && current.trim().length === 0;
		const isUnset = current === undefined || current === null;

		if (isUnset || isEmptyString) {
			result[fieldId] = getDefaultValueForProjectField(fieldId);
		}
	}

	// Remove any fields not in the schema
	// But preserve special fields that the OM expects (upside/downside scenario fields)
	const schemaFieldSet = new Set(SCHEMA_FIELD_IDS);
	const preserveFields = new Set([
		"upsideIRR",
		"downsideIRR",
		"upsideEquityMultiple",
		"downsideEquityMultiple",
		"upsideProfitMargin",
		"downsideProfitMargin",
		"riskLevelUpside",
		"riskLevelBase",
		"riskLevelDownside",
		"t12MonthlyData", // T12 financial data for document generation
	]);
	for (const key of Object.keys(result)) {
		if (
			key !== "_lockedFields" &&
			key !== "_fieldStates" &&
			key !== "_metadata" &&
			!schemaFieldSet.has(key) &&
			!preserveFields.has(key)
		) {
			delete result[key];
		}
	}

	// Lock all form fields so they show as green/locked in the UI.
	// Lock fields that have non-empty values (including 0 for numeric fields, false for booleans, empty arrays)
	// Also lock special OM fields (upside/downside scenario fields)
	const lockedFields: Record<string, boolean> = {};
	const fieldsToCheck = [
		...SCHEMA_FIELD_IDS,
		"upsideIRR",
		"downsideIRR",
		"upsideEquityMultiple",
		"downsideEquityMultiple",
		"upsideProfitMargin",
		"downsideProfitMargin",
		"riskLevelUpside",
		"riskLevelBase",
		"riskLevelDownside",
	];
	for (const fieldId of fieldsToCheck) {
		const value = result[fieldId];
		if (value !== undefined && value !== null) {
			// Lock fields that have values
			if (typeof value === "string") {
				// Only lock non-empty strings
				if (value.trim() !== "") {
					lockedFields[fieldId] = true;
				}
			} else if (typeof value === "number") {
				// Lock all numeric fields, including 0 (0 is a valid value that should be locked)
				lockedFields[fieldId] = true;
			} else if (typeof value === "boolean") {
				// Lock all boolean fields, including false
				lockedFields[fieldId] = true;
			} else if (Array.isArray(value)) {
				// Lock arrays (even if empty, as empty array is a valid value)
				lockedFields[fieldId] = true;
			} else if (
				typeof value === "object" &&
				Object.keys(value).length > 0
			) {
				// Lock non-empty objects
				lockedFields[fieldId] = true;
			}
		}
	}

	result._lockedFields = lockedFields;

	return result;
})();

// Borrower resume - only fields from the schema
const hoqueBorrowerResumeBase: Record<string, any> = {
	fullLegalName: "Hoque Global",
	primaryEntityName: "Hoque Global / ACARA PFC JV",
	// Must be one of: "LLC", "LP", "S-Corp", "C-Corp", "Sole Proprietorship", "Trust", "Other"
	primaryEntityStructure: "Other", // Partnership structure doesn't fit standard options
	contactEmail: "info@hoqueglobal.com",
	contactPhone: "972.455.1943",
	contactAddress: "2300 Hickory St, Dallas, TX 75215",
	bioNarrative:
		"Hoque Global is a Dallas-based master developer delivering catalytic mixed-use districts and workforce housing through public-private partnerships, including PFC structures with the City of Dallas. ACARA serves as capital partner, structuring Opportunity Zone-aligned investments with a $950M+ track record across Texas.",
	// Must be one of: "0-2", "3-5", "6-10", "11-15", "16+"
	yearsCREExperienceRange: "16+",
	yearFounded: 2010, // Hoque Global founded in 2010
	activeProjects: 3, // SoGood Phase A, SoGood Phase B (this project), and other active developments
	assetClassesExperience: [
		"Mixed-Use",
		"Multifamily",
		"Office",
		"Master-Planned Districts",
	],
	geographicMarketsExperience: [
		"Southwest", // Dallas-Fort Worth and Texas Triangle are in the Southwest region
		"Southeast", // Southeast US maps to Southeast
	],
	// Must be one of: "N/A", "<$10M", "$10M-$50M", "$50M-$100M", "$100M-$250M", "$250M-$500M", "$500M+"
	totalDealValueClosedRange: "$500M+",
	existingLenderRelationships:
		"Frost Bank; Citi Community Capital; Dallas Housing Finance Corp",
	// Track record description (string format for other uses)
	trackRecordDescription:
		"Delivered 1M+ SF of adaptive reuse and mixed-use development across Dallas. Key projects include SoGood Phase A (completed 2022), multiple PFC-backed workforce housing developments, and master-planned district projects. Track record includes on-time delivery, strong lender relationships, and successful public-private partnerships.",
	// Track record array for OM sponsor profile page - this is what the frontend expects
	trackRecord: [
		{
			project: "SoGood Phase A",
			year: 2022,
			units: 180,
			irr: 22.5,
			market: "Dallas-Fort Worth",
			type: "Mixed-Use",
		},
		{
			project: "Deep Ellum Lofts",
			year: 2020,
			units: 120,
			irr: 20.3,
			market: "Dallas-Fort Worth",
			type: "Multifamily",
		},
		{
			project: "Farmers Market District",
			year: 2019,
			units: 95,
			irr: 19.8,
			market: "Dallas-Fort Worth",
			type: "Mixed-Use",
		},
	],
	// Must be one of: "N/A", "<600", "600-649", "650-699", "700-749", "750-799", "800+"
	creditScoreRange: "700-749",
	// Must be one of: "<$1M", "$1M-$5M", "$5M-$10M", "$10M-$25M", "$25M-$50M", "$50M-$100M", "$100M+"
	netWorthRange: "$50M-$100M",
	// Must be one of: "<$100k", "$100k-$500k", "$500k-$1M", "$1M-$5M", "$5M-$10M", "$10M+"
	liquidityRange: "$5M-$10M",
	bankruptcyHistory: false,
	foreclosureHistory: false,
	litigationHistory: false,
	// New fields for Sponsor Resume & PFS
	totalAUM: "$150,000,000",
	totalSqFtManaged: "350,000",
	totalAssets: 9000000,
	totalLiabilities: 2000000,
	netWorth: 7000000,
	totalLiquidAssets: 5000000,
	contingentLiabilities: 500000,
	linkedinUrl: "https://www.linkedin.com/company/hoque-global",
	websiteUrl: "https://www.hoqueglobal.com",
	// Principals array - this is the primary data structure for multiple principals
	// The flat fields (principalLegalName, etc.) are legacy and should not be used
	// All principal data should be in this array
	principals: [
		{
			principalLegalName: "Mike Hoque",
			principalRoleDefault: "Chief Executive Officer",
			principalEmail: "mike@hoqueglobal.com",
			ownershipPercentage: 50,
			principalBio:
				"Founder leading Hoque Global's master plan strategy and public-private initiatives across Dallas. Delivered 1M+ SF of adaptive reuse and serves as Dallas Regional Chamber Urban Taskforce Chair.",
			principalSpecialties: [
				"Master-planned district development",
				"PFC and tax-exempt financing structures",
				"Workforce housing development",
				"Public-private partnerships",
				"Opportunity Zone investments",
			],
			// Also include assetClassesExperience for frontend compatibility
			assetClassesExperience: [
				"Master-planned district development",
				"PFC and tax-exempt financing structures",
				"Workforce housing development",
				"Public-private partnerships",
				"Opportunity Zone investments",
			],
			principalAchievements: [
				"Delivered 1M+ SF of adaptive reuse and mixed-use development",
				"Successfully structured multiple PFC-backed workforce housing projects",
				"Chair of Dallas Regional Chamber Urban Taskforce",
				"Led SoGood master plan development (multi-phase, $200M+ project)",
				"Established strong relationships with key lenders (Frost Bank, Citi Community Capital)",
			],
			principalEducation: "MBA, University of Texas at Dallas",
			yearsCREExperienceRange: "16+",
			netWorthRange: "$50M-$100M",
			liquidityRange: "$5M-$10M",
			creditScoreRange: "700-749",
		},
		{
			principalLegalName: "Sarah Chen",
			principalRoleDefault: "Chief Financial Officer",
			principalEmail: "sarah.chen@hoqueglobal.com",
			ownershipPercentage: 25,
			principalBio:
				"CFO with 12+ years of experience in real estate finance, specializing in tax-exempt bond structures, PFC financing, and Opportunity Zone investments. Previously led finance at a $500M+ multifamily development firm.",
			principalSpecialties: [
				"Real estate finance",
				"Tax-exempt bond structures",
				"PFC financing",
				"Opportunity Zone investments",
				"Capital markets",
			],
			assetClassesExperience: [
				"Real estate finance",
				"Tax-exempt bond structures",
				"PFC financing",
				"Opportunity Zone investments",
				"Capital markets",
			],
			principalAchievements: [
				"Structured $200M+ in tax-exempt financing across multiple projects",
				"Led capital raising for 5+ successful multifamily developments",
				"Established relationships with institutional lenders and capital partners",
				"Expert in PFC and Opportunity Zone compliance",
			],
			principalEducation: "MBA, Finance, Southern Methodist University",
			yearsCREExperienceRange: "12+",
			netWorthRange: "$25M-$50M",
			liquidityRange: "$2M-$5M",
			creditScoreRange: "750-799",
		},
		{
			principalLegalName: "David Martinez",
			principalRoleDefault: "Chief Development Officer",
			principalEmail: "david.martinez@hoqueglobal.com",
			ownershipPercentage: 25,
			principalBio:
				"CDO with 15+ years of experience in mixed-use and multifamily development. Led development of 2M+ SF across Texas, specializing in adaptive reuse and master-planned communities.",
			principalSpecialties: [
				"Mixed-use development",
				"Multifamily development",
				"Adaptive reuse",
				"Master-planned communities",
				"Project management",
			],
			assetClassesExperience: [
				"Mixed-use development",
				"Multifamily development",
				"Adaptive reuse",
				"Master-planned communities",
				"Project management",
			],
			principalAchievements: [
				"Led development of 2M+ SF across Texas",
				"Successfully delivered 10+ mixed-use projects on time and on budget",
				"Expert in adaptive reuse and historic preservation",
				"Established strong relationships with contractors and vendors",
			],
			principalEducation: "BS, Civil Engineering, Texas A&M University",
			yearsCREExperienceRange: "15+",
			netWorthRange: "$25M-$50M",
			liquidityRange: "$2M-$5M",
			creditScoreRange: "700-749",
		},
	],
	references: [
		{
			lenderName: "Frost Bank",
			contactName: "Commercial Real Estate Team",
			contactEmail: "cre@frostbank.com",
			relationshipYears: 8,
			dealCount: 3,
			lastDealDate: "2022-06-15",
			notes: "Primary construction lender for SoGood Phase A and other mixed-use projects",
			// Format for OM sponsor profile page
			firm: "Frost Bank",
			relationship: "Primary Construction Lender",
			years: "8 years",
			contact: "Commercial Real Estate Team (cre@frostbank.com)",
		},
		{
			lenderName: "Citi Community Capital",
			contactName: "Affordable Housing Finance Team",
			contactEmail: "communitycapital@citi.com",
			relationshipYears: 5,
			dealCount: 2,
			lastDealDate: "2021-11-20",
			notes: "Workforce housing and PFC-backed project financing",
			// Format for OM sponsor profile page
			firm: "Citi Community Capital",
			relationship: "Affordable Housing Finance",
			years: "5 years",
			contact:
				"Affordable Housing Finance Team (communitycapital@citi.com)",
		},
		{
			lenderName: "Dallas Housing Finance Corporation",
			contactName: "PFC Program Director",
			contactEmail: "pfc@dhfc.org",
			relationshipYears: 6,
			dealCount: 4,
			lastDealDate: "2024-07-12",
			notes: "PFC structuring and tax-exempt financing for workforce housing projects",
			// Format for OM sponsor profile page
			firm: "Dallas Housing Finance Corporation",
			relationship: "PFC Program Partner",
			years: "6 years",
			contact: "PFC Program Director (pfc@dhfc.org)",
		},
	],
	scheduleOfRealEstateOwned: [
		{
			propertyAddress: "123 Main St, Springfield, IL",
			propertyType: "Multifamily",
			ownershipPercentage: 100,
			dateAcquired: "2020-01-15",
			originalCost: 5000000,
			currentMarketValue: 6500000,
			lenderName: "First Bank",
			currentLoanBalance: 4000000,
			interestRate: 5.0,
			maturityDate: "2030-01-15",
			monthlyPayment: 21000,
			recourse: "Yes",
			grossRentalIncome: 600000,
			operatingExpenses: 200000
		},
		{
			propertyAddress: "456 Oak Ave, Metropolis, NY",
			propertyType: "Retail",
			ownershipPercentage: 50,
			dateAcquired: "2018-06-01",
			originalCost: 10000000,
			currentMarketValue: 12000000,
			lenderName: "City Finance",
			currentLoanBalance: 7000000,
			interestRate: 6.0,
			maturityDate: "2028-06-01",
			monthlyPayment: 42000,
			recourse: "No",
			grossRentalIncome: 1100000,
			operatingExpenses: 400000
		},
		{
			propertyAddress: "789 Pine Ln, Gotham, NJ",
			propertyType: "Office",
			ownershipPercentage: 100,
			dateAcquired: "2022-03-10",
			originalCost: 8000000,
			currentMarketValue: 7500000,
			lenderName: "Gotham Credit",
			currentLoanBalance: 5000000,
			interestRate: 7.0,
			maturityDate: "2027-03-10",
			monthlyPayment: 33000,
			recourse: "Yes",
			grossRentalIncome: 700000,
			operatingExpenses: 300000
		}
	],
};

/**
 * Build borrower resume with only schema fields
 */
const BORROWER_SCHEMA_FIELD_IDS: string[] =
	getSchemaFieldIds(borrowerFormSchema);

const hoqueBorrowerResume: Record<string, any> = (() => {
	const result: Record<string, any> = { ...hoqueBorrowerResumeBase };

	// Ensure every schema field has a value
	for (const fieldId of BORROWER_SCHEMA_FIELD_IDS) {
		const current = result[fieldId];
		const isEmptyString =
			typeof current === "string" && current.trim().length === 0;
		const isUnset = current === undefined || current === null;

		if (isUnset || isEmptyString) {
			result[fieldId] = getDefaultValueForBorrowerField(fieldId);
		}
	}

	// Remove any fields not in the schema
	// But preserve special array fields that the frontend expects (principals, trackRecord)
	const schemaFieldSet = new Set(BORROWER_SCHEMA_FIELD_IDS);
	const preserveFields = new Set([
		"principals",
		"trackRecord",
		"references",
		"scheduleOfRealEstateOwned",
	]);
	for (const key of Object.keys(result)) {
		if (
			key !== "_lockedFields" &&
			key !== "_fieldStates" &&
			key !== "_metadata" &&
			!schemaFieldSet.has(key) &&
			!preserveFields.has(key)
		) {
			delete result[key];
		}
	}

	// Lock all fields that have values (matching project resume logic)
	// Lock fields that have non-empty values (including 0 for numeric fields, false for booleans, empty arrays)
	// Also lock special array fields (principals, trackRecord, references, scheduleOfRealEstateOwned) that the frontend expects
	const lockedFields: Record<string, boolean> = {};
	const fieldsToCheck = [
		...BORROWER_SCHEMA_FIELD_IDS,
		"principals",
		"trackRecord",
		"references",
		"scheduleOfRealEstateOwned",
	];
	for (const fieldId of fieldsToCheck) {
		const value = result[fieldId];
		if (value !== undefined && value !== null) {
			// Lock fields that have values
			if (typeof value === "string") {
				// Only lock non-empty strings
				if (value.trim() !== "") {
					lockedFields[fieldId] = true;
				}
			} else if (typeof value === "number") {
				// Lock all numeric fields, including 0 (0 is a valid value that should be locked)
				lockedFields[fieldId] = true;
			} else if (typeof value === "boolean") {
				// Lock all boolean fields, including false
				lockedFields[fieldId] = true;
			} else if (Array.isArray(value)) {
				// Lock arrays (even if empty, as empty array is a valid value)
				// But for principals, trackRecord, and references, only lock if non-empty
				if (
					fieldId === "principals" ||
					fieldId === "trackRecord" ||
					fieldId === "references" ||
					fieldId === "scheduleOfRealEstateOwned"
				) {
					if (value.length > 0) {
						lockedFields[fieldId] = true;
					}
				} else {
					lockedFields[fieldId] = true;
				}
			} else if (
				typeof value === "object" &&
				Object.keys(value).length > 0
			) {
				// Lock non-empty objects
				lockedFields[fieldId] = true;
			}
		}
	}

	result._lockedFields = lockedFields;

	// Note: completenessPercent is now stored in a separate column, not in content
	// It will be calculated and set during insert

	return result;
})();

// ============================================================================
// ACCOUNT CREATION FUNCTIONS
// ============================================================================

interface OnboardResponse {
	user?: {
		id: string;
		email: string;
	};
	error?: string;
}

/**
 * Direct onboarding function that bypasses backend API
 */
async function onboardUserDirectly(
	email: string,
	password: string,
	fullName: string,
	appRole: AppRole
): Promise<OnboardResponse> {
	console.log(`[seed] Onboarding ${appRole} directly: ${email}...`);

	try {
		// 1. Create Auth User
		const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
			email,
			password,
			email_confirm: true,
			user_metadata: { full_name: fullName },
		});

		let userId: string;

		if (authError) {
			// If user already exists, try to get them
			if (authError.message.includes("already registered") || authError.message.includes("unique constraint")) {
				console.log("[seed] User exists, trying to fetch...");
				const { data: existingUser } = await supabaseAdmin.from("profiles").select("id").eq("email", email).single();
				if (existingUser) {
					return { user: { id: existingUser.id, email } };
				}
				// If profile doesn't exist but auth does, we need to handle that (edge case)
				// For now, let's assume if auth exists, we can't get ID easily without profile
				// Actually, we can search auth users by email if needed, but let's see
			}
			console.error(`[seed] Auth creation failed: ${authError.message}`);
			return { error: authError.message };
		} else {
			userId = authData.user.id;
		}

		console.log(`[seed] Auth user created: ${userId}`);

		// 2. Create Profile
		const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
			id: userId,
			full_name: fullName,
			email: email,
			app_role: appRole,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		}, { onConflict: "id" });

		if (profileError) {
			console.error(`[seed] Profile creation failed: ${profileError.message}`);
			return { error: profileError.message };
		}

		// 3. Create Organization & Memberships
		let orgId: string;

		if (appRole === "borrower") {
			// Borrowers get their own org
			const { data: orgData, error: orgError } = await supabaseAdmin.from("orgs").insert({
				name: `${fullName}'s Organization`,
				entity_type: "borrower",
			}).select().single();

			if (orgError) return { error: orgError.message };
			orgId = orgData.id;

			// Add owner check/insert
			await supabaseAdmin.from("org_members").insert({
				org_id: orgId,
				user_id: userId,
				role: "owner",
			});

			// Create storage bucket for the org
			const { error: bucketError } = await supabaseAdmin.storage.createBucket(orgId, {
				public: false,
				fileSizeLimit: 50 * 1024 * 1024, // 50MB
			});

			if (bucketError && !bucketError.message.includes("already exists")) {
				console.error(`[seed] Failed to create storage bucket: ${bucketError.message}`);
				// Continue anyway, it might be a transient issue or existing bucket
			} else if (!bucketError) {
				console.log(`[seed] Created storage bucket for org: ${orgId}`);
			}

		} else if (appRole === "advisor") {
			// Advisors join/create the advisor org
			const { data: existingOrg } = await supabaseAdmin
				.from("orgs")
				.select("id")
				.eq("entity_type", "advisor")
				.limit(1)
				.maybeSingle();

			if (existingOrg) {
				orgId = existingOrg.id;
			} else {
				const { data: newOrg, error: orgError } = await supabaseAdmin.from("orgs").insert({
					name: "CapMatch Advisors",
					entity_type: "advisor",
				}).select().single();
				if (orgError) return { error: orgError.message };
				orgId = newOrg.id;
			}

			await supabaseAdmin.from("org_members").upsert({
				org_id: orgId,
				user_id: userId,
				role: "owner",
			}, { onConflict: "org_id,user_id" });
		} else if (appRole === "lender") {
			// Lenders get their own org
			const { data: orgData, error: orgError } = await supabaseAdmin.from("orgs").insert({
				name: `${fullName}'s Organization`,
				entity_type: "lender",
			}).select().single();

			if (orgError) return { error: orgError.message };
			orgId = orgData.id;

			// Add owner
			await supabaseAdmin.from("org_members").insert({
				org_id: orgId,
				user_id: userId,
				role: "owner",
			});
		} else {
			return { error: `Unsupported app_role: ${appRole}` };
		}

		// 4. Update Profile with Active Org
		await supabaseAdmin.from("profiles").update({ active_org_id: orgId }).eq("id", userId);

		return { user: { id: userId, email } };

	} catch (e) {
		console.error(`[seed] Unexpected error:`, e);
		return { error: String(e) };
	}
}

async function ensureStorageBucket(orgId: string) {
	try {
		const { error: bucketError } = await supabaseAdmin.storage.createBucket(orgId, {
			public: false,
			fileSizeLimit: 50 * 1024 * 1024, // 50MB
		});

		if (bucketError && !bucketError.message.includes("already exists")) {
			console.error(`[seed] Failed to ensure storage bucket: ${bucketError.message}`);
		} else if (!bucketError) {
			console.log(`[seed] Created storage bucket for org: ${orgId}`);
		} else {
			// Bucket already exists, which is fine
		}
	} catch (e) {
		console.error(`[seed] Exception ensuring storage bucket:`, e);
	}
}

async function createAdvisorAccount(): Promise<{
	userId: string;
	orgId: string;
} | null> {
	console.log("[seed] Setting up advisor account (Cody Field)...");

	const advisorEmail = "cody.field@capmatch.com";
	const advisorPassword = "password";
	const advisorName = "Cody Field";

	// Check if advisor already exists
	const { data: existingProfile, error: profileError } = await supabaseAdmin
		.from("profiles")
		.select("id, active_org_id")
		.eq("email", advisorEmail)
		.maybeSingle();

	if (profileError) {
		console.warn(`[seed] Warning checking for existing advisor: ${profileError.message}`);
		console.warn(`[seed] This might indicate the 'profiles' table is missing or inaccessible.`);
	}

	let advisorUserId: string;
	let advisorOrgId: string | null = null;

	if (existingProfile) {
		console.log(
			`[seed] Advisor already exists: ${advisorEmail} (${existingProfile.id})`
		);
		advisorUserId = existingProfile.id;
		advisorOrgId = existingProfile.active_org_id;
	} else {
		// Create advisor user via onboardUserDirectly (direct DB call)
		const advisorResult = await onboardUserDirectly(
			advisorEmail,
			advisorPassword,
			advisorName,
			"advisor"
		);
		if (advisorResult.error || !advisorResult.user) {
			console.error(
				`[seed] ❌ Failed to create advisor: ${advisorResult.error}`
			);
			return null;
		}
		advisorUserId = advisorResult.user.id;

		console.log(
			`[seed] ✅ Created advisor: ${advisorEmail} (${advisorUserId})`
		);
	}

	// Create or get advisor org
	const { data: existingOrg } = await supabaseAdmin
		.from("orgs")
		.select("id")
		.eq("entity_type", "advisor")
		.limit(1)
		.maybeSingle();

	if (existingOrg) {
		advisorOrgId = existingOrg.id;
		console.log(
			"[seed] Advisor org already exists, using existing:",
			advisorOrgId
		);
	} else {
		const { data: orgData, error: orgError } = await supabaseAdmin
			.from("orgs")
			.insert({
				name: "CapMatch Advisors",
				entity_type: "advisor",
			})
			.select()
			.single();

		if (orgError) {
			console.error("[seed] Failed to create advisor org:", orgError);
			return null;
		}

		advisorOrgId = orgData.id;
		console.log("[seed] ✅ Created advisor org:", advisorOrgId);
	}

	// Add advisor to org as owner
	await supabaseAdmin.from("org_members").upsert(
		{
			org_id: advisorOrgId,
			user_id: advisorUserId,
			role: "owner",
		},
		{ onConflict: "org_id,user_id" }
	);

	// Update profile with active org
	await supabaseAdmin
		.from("profiles")
		.update({ active_org_id: advisorOrgId })
		.eq("id", advisorUserId);

	console.log("[seed] ✅ Advisor account setup complete");
	if (!advisorOrgId) {
		console.error("[seed] ❌ Advisor org ID is null");
		return null;
	}
	return { userId: advisorUserId, orgId: advisorOrgId };
}

/**
 * Get or create the borrower account (param.vora@capmatch.com)
 * This account is shared between the Hoque seed script and the demo seed script.
 * Both scripts can run together - they create different projects in the same account.
 */
async function getOrCreateDemoBorrowerAccount(): Promise<{
	userId: string;
	orgId: string;
} | null> {
	console.log(
		"[seed] Getting or creating borrower account (param.vora@capmatch.com)..."
	);
	console.log("[seed] Note: This account is shared with seed-demo-data.ts");

	const borrowerEmail = "param.vora@capmatch.com";
	const borrowerPassword = "password";
	const borrowerName = "Param Vora";

	// Check if borrower already exists
	const { data: existingProfile } = await supabaseAdmin
		.from("profiles")
		.select("id, active_org_id")
		.eq("email", borrowerEmail)
		.maybeSingle();

	let borrowerUserId: string;
	let borrowerOrgId: string | null = null;

	if (existingProfile) {
		console.log(
			`[seed] Borrower already exists: ${borrowerEmail} (${existingProfile.id})`
		);
		borrowerUserId = existingProfile.id;
		borrowerOrgId = existingProfile.active_org_id;

		if (!borrowerOrgId) {
			// Get org from org_members
			const { data: memberData } = await supabaseAdmin
				.from("org_members")
				.select("org_id")
				.eq("user_id", borrowerUserId)
				.eq("role", "owner")
				.single();

			if (memberData) {
				borrowerOrgId = memberData.org_id;
			}
		}
	} else {
		// Create borrower user via onboardUserDirectly (direct DB call)
		const borrowerResult = await onboardUserDirectly(
			borrowerEmail,
			borrowerPassword,
			borrowerName,
			"borrower"
		);
		if (borrowerResult.error || !borrowerResult.user) {
			console.error(
				`[seed] ❌ Failed to create borrower: ${borrowerResult.error}`
			);
			return null;
		}
		borrowerUserId = borrowerResult.user.id;

		// Get the org that was created during onboarding
		const { data: borrowerProfile } = await supabaseAdmin
			.from("profiles")
			.select("active_org_id")
			.eq("id", borrowerUserId)
			.single();

		if (!borrowerProfile?.active_org_id) {
			console.error("[seed] ❌ Borrower org not found after onboarding");
			return null;
		}

		borrowerOrgId = borrowerProfile.active_org_id;
		console.log(
			`[seed] ✅ Created borrower: ${borrowerEmail} (${borrowerUserId})`
		);
		console.log(`[seed] ✅ Borrower org: ${borrowerOrgId}`);
	}

	if (!borrowerOrgId) {
		console.error("[seed] ❌ Borrower org ID is null");
		return null;
	}

	// Ensure bucket exists
	await ensureStorageBucket(borrowerOrgId);

	return { userId: borrowerUserId, orgId: borrowerOrgId };
}

/**
 * Create lender account (lender@capmatch.com)
 */
async function createLenderAccount(): Promise<{
	userId: string;
	orgId: string;
} | null> {
	console.log("[seed] Setting up lender account (Capital Lending Group)...");

	const lenderEmail = "lender@capmatch.com";
	const lenderPassword = "password";
	const lenderName = "Capital Lending Group";

	// Check if lender already exists
	const { data: existingProfile } = await supabaseAdmin
		.from("profiles")
		.select("id, active_org_id")
		.eq("email", lenderEmail)
		.maybeSingle();

	let lenderUserId: string;
	let lenderOrgId: string | null = null;

	if (existingProfile) {
		console.log(
			`[seed] Lender already exists: ${lenderEmail} (${existingProfile.id})`
		);
		lenderUserId = existingProfile.id;
		lenderOrgId = existingProfile.active_org_id;
	} else {
		// Create lender user via onboardUserDirectly
		const lenderResult = await onboardUserDirectly(
			lenderEmail,
			lenderPassword,
			lenderName,
			"lender"
		);
		if (lenderResult.error || !lenderResult.user) {
			console.error(
				`[seed] ❌ Failed to create lender: ${lenderResult.error}`
			);
			return null;
		}
		lenderUserId = lenderResult.user.id;

		// Get the org that was created during onboarding
		const { data: lenderProfile } = await supabaseAdmin
			.from("profiles")
			.select("active_org_id")
			.eq("id", lenderUserId)
			.single();

		if (!lenderProfile?.active_org_id) {
			console.error("[seed] ❌ Lender org not found after onboarding");
			return null;
		}

		lenderOrgId = lenderProfile.active_org_id;
		console.log(
			`[seed] ✅ Created lender: ${lenderEmail} (${lenderUserId})`
		);
		console.log(`[seed] ✅ Lender org: ${lenderOrgId}`);
	}

	if (!lenderOrgId) {
		console.error("[seed] ❌ Lender org ID is null");
		return null;
	}

	return { userId: lenderUserId, orgId: lenderOrgId };
}

// Helper to safely get service role key
function getServiceRoleKey(): string {
	if (!serviceRoleKey) {
		throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
	}
	return serviceRoleKey;
}

// ============================================================================
// HELPER FUNCTIONS (reused from seed-demo-data.ts)
// ============================================================================

async function uploadDocumentToProject(
	projectId: string,
	orgId: string,
	filePath: string,
	fileName: string,
	rootResourceType: "PROJECT_DOCS_ROOT" | "BORROWER_DOCS_ROOT",
	uploadedById: string,
	originalFileName?: string
): Promise<string | null> {
	console.log(
		`[seed] Uploading document: ${fileName} to ${rootResourceType}...`
	);

	try {
		// Get the root resource
		const { data: rootResource, error: rootError } = await supabaseAdmin
			.from("resources")
			.select("id")
			.eq("project_id", projectId)
			.eq("resource_type", rootResourceType)
			.maybeSingle();

		if (rootError || !rootResource) {
			console.error(
				`[seed] Failed to find ${rootResourceType} resource:`,
				rootError
			);
			return null;
		}

		// Create FILE resource entry
		const { data: fileResource, error: resourceError } = await supabaseAdmin
			.from("resources")
			.insert({
				org_id: orgId,
				project_id: projectId,
				parent_id: rootResource.id,
				resource_type: "FILE",
				name: fileName,
			})
			.select()
			.single();

		if (resourceError) {
			console.error(
				`[seed] Failed to create file resource:`,
				resourceError
			);
			return null;
		}

		const resourceId = fileResource.id;

		// Create document version
		const { data: version, error: versionError } = await supabaseAdmin
			.from("document_versions")
			.insert({
				resource_id: resourceId,
				created_by: uploadedById,
				storage_path: "placeholder",
			})
			.select()
			.single();

		if (versionError) {
			console.error(
				`[seed] Failed to create document version:`,
				versionError
			);
			await supabaseAdmin.from("resources").delete().eq("id", resourceId);
			return null;
		}

		// Mark version as active
		await supabaseAdmin
			.from("document_versions")
			.update({ status: "active" })
			.eq("id", version.id);

		// Build storage path - use original file name for storage, display name for resource
		const storageSubdir =
			rootResourceType === "BORROWER_DOCS_ROOT"
				? "borrower-docs"
				: "project-docs";
		const originalFileName = filePath.split("/").pop() || fileName;
		const storageFileName = originalFileName.replace(
			/[^a-zA-Z0-9._-]/g,
			"_"
		); // Sanitize for storage
		const finalStoragePath = `${projectId}/${storageSubdir}/${resourceId}/v${version.version_number}_${storageFileName}`;

		// Read file from filesystem
		if (!existsSync(filePath)) {
			console.error(`[seed] File not found: ${filePath}`);
			await supabaseAdmin.from("resources").delete().eq("id", resourceId);
			return null;
		}

		const fileBuffer = readFileSync(filePath);

		// Detect content type based on actual file path extension
		const fileExtension = filePath.split(".").pop()?.toLowerCase();
		let contentType = "application/pdf"; // default
		if (fileExtension === "xlsx" || fileExtension === "xls") {
			contentType =
				"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
		} else if (fileExtension === "pdf") {
			contentType = "application/pdf";
		}

		// Upload to storage
		const { error: uploadError } = await supabaseAdmin.storage
			.from(orgId)
			.upload(finalStoragePath, fileBuffer, {
				contentType,
				upsert: false,
			});

		if (uploadError) {
			console.error(
				`[seed] Failed to upload file to storage:`,
				uploadError
			);
			await supabaseAdmin.from("resources").delete().eq("id", resourceId);
			return null;
		}

		// Store metadata for the document version
		const metadata = {
			size: fileBuffer.length,
			mimeType: contentType,
			uploadedAt: new Date().toISOString(),
			source: "seed-hoque-project",
		};

		// Update version with storage path and metadata
		const { error: updateVersionError } = await supabaseAdmin
			.from("document_versions")
			.update({
				storage_path: finalStoragePath,
				metadata: metadata,
			})
			.eq("id", version.id);

		if (updateVersionError) {
			console.error(
				`[seed] Failed to update version storage path and metadata:`,
				updateVersionError
			);
			await supabaseAdmin.storage.from(orgId).remove([finalStoragePath]);
			await supabaseAdmin.from("resources").delete().eq("id", resourceId);
			return null;
		}

		// Update resource with current version
		const { error: updateResourceError } = await supabaseAdmin
			.from("resources")
			.update({ current_version_id: version.id })
			.eq("id", resourceId);

		if (updateResourceError) {
			console.error(
				`[seed] Failed to update resource current version:`,
				updateResourceError
			);
		}

		// Log a domain event so downstream notification plumbing sees seeded docs
		const { data: eventId, error: eventError } = await supabaseAdmin.rpc(
			"insert_document_uploaded_event",
			{
				p_actor_id: uploadedById,
				p_project_id: projectId,
				p_resource_id: resourceId,
				p_payload: {
					fileName,
					size: fileBuffer.length,
					mimeType: contentType,
					rootResourceType,
					source: "seed-hoque-project",
				},
			}
		);

		if (eventError) {
			console.warn(
				"[seed] Failed to log document_uploaded event during seeding",
				{
					projectId,
					resourceId,
					error: eventError.message,
				}
			);
		} else if (eventId) {
			// Note: Notifications are handled by the notification system separately.
			// The domain event has been logged, which will trigger notifications
			// through the regular notification processing pipeline.
			// We no longer call the notify-fan-out edge function as it's not critical
			// for seed script execution.
		}

		console.log(`[seed] ✅ Uploaded document: ${fileName}`);
		return resourceId;
	} catch (err) {
		console.error(`[seed] Exception uploading document ${fileName}:`, err);
		return null;
	}
}

async function createChatMessage(
	threadId: string,
	userId: string,
	content: string,
	resourceIds?: string[]
): Promise<boolean> {
	try {
		const { error } = await supabaseAdmin.rpc("insert_thread_message", {
			p_thread_id: threadId,
			p_user_id: userId,
			p_content: content,
			p_resource_ids: resourceIds || [],
			p_reply_to: null,
		});

		if (error) {
			console.error(`[seed] Failed to create chat message:`, error);
			return false;
		}

		return true;
	} catch (err) {
		console.error(`[seed] Exception creating chat message:`, err);
		return false;
	}
}

async function createThread(
	projectId: string,
	topic: string,
	participantIds: string[]
): Promise<string | null> {
	try {
		const { data: thread, error: threadError } = await supabaseAdmin
			.from("chat_threads")
			.insert({
				project_id: projectId,
				topic,
			})
			.select()
			.single();

		if (threadError) {
			console.error(`[seed] Failed to create thread:`, threadError);
			return null;
		}

		// Add participants
		const participants = participantIds.map((userId) => ({
			thread_id: thread.id,
			user_id: userId,
		}));

		const { error: participantsError } = await supabaseAdmin
			.from("chat_thread_participants")
			.insert(participants);

		if (participantsError) {
			console.error(
				`[seed] Failed to add participants:`,
				participantsError
			);
			// Continue anyway
		}

		return thread.id;
	} catch (err) {
		console.error(`[seed] Exception creating thread:`, err);
		return null;
	}
}

async function createMemberUser(
	email: string,
	password: string,
	fullName: string,
	orgId: string
): Promise<string | null> {
	console.log(`[seed] Creating member user: ${email}...`);

	try {
		// Check if user already exists
		const { data: existingProfile } = await supabaseAdmin
			.from("profiles")
			.select("id")
			.eq("email", email)
			.maybeSingle();

		let userId: string;

		if (existingProfile) {
			console.log(
				`[seed] Member already exists: ${email} (${existingProfile.id})`
			);
			userId = existingProfile.id;
		} else {
			// Create user via auth
			const { data: authUser, error: authError } =
				await supabaseAdmin.auth.admin.createUser({
					email,
					password,
					email_confirm: true,
					user_metadata: { full_name: fullName },
				});

			if (authError || !authUser.user) {
				console.error(
					`[seed] Failed to create member user:`,
					authError
				);
				return null;
			}

			userId = authUser.user.id;

			// Create profile
			const { error: profileError } = await supabaseAdmin
				.from("profiles")
				.insert({
					id: userId,
					email,
					full_name: fullName,
					app_role: "borrower",
					active_org_id: orgId,
				});

			if (profileError) {
				console.error(
					`[seed] Failed to create member profile:`,
					profileError
				);
				await supabaseAdmin.auth.admin.deleteUser(userId);
				return null;
			}

			console.log(`[seed] ✅ Created member user: ${email} (${userId})`);
		}

		// Add to org_members
		const { error: memberError } = await supabaseAdmin
			.from("org_members")
			.upsert(
				{
					org_id: orgId,
					user_id: userId,
					role: "member",
				},
				{ onConflict: "org_id,user_id" }
			);

		if (memberError) {
			console.error(`[seed] Failed to add member to org:`, memberError);
			return null;
		}

		// Ensure active_org_id is set
		await supabaseAdmin
			.from("profiles")
			.update({ active_org_id: orgId })
			.eq("id", userId);

		console.log(`[seed] ✅ Member user setup complete: ${email}`);
		return userId;
	} catch (err) {
		console.error(`[seed] Exception creating member user ${email}:`, err);
		return null;
	}
}

async function grantMemberProjectAccess(
	projectId: string,
	memberId: string,
	grantedById: string
): Promise<boolean> {
	console.log(
		`[seed] Granting project access to member: ${memberId} for project: ${projectId}...`
	);

	try {
		const { error: grantError } = await supabaseAdmin.rpc(
			"grant_project_access",
			{
				p_project_id: projectId,
				p_user_id: memberId,
				p_granted_by_id: grantedById,
				p_permissions: [
					{ resource_type: "PROJECT_RESUME", permission: "edit" },
					{ resource_type: "PROJECT_DOCS_ROOT", permission: "edit" },
					{ resource_type: "BORROWER_RESUME", permission: "edit" },
					{ resource_type: "BORROWER_DOCS_ROOT", permission: "edit" },
				],
			}
		);

		if (grantError) {
			console.error(`[seed] Failed to grant project access:`, grantError);
			return false;
		}

		console.log(`[seed] ✅ Granted project access to member`);
		return true;
	} catch (err) {
		console.error(`[seed] Exception granting project access:`, err);
		return false;
	}
}


// ============================================================================
// UNDERWRITING DOCS SEEDING
// ============================================================================

async function seedUnderwritingDocs(
	projectId: string,
	orgId: string,
	creatorId: string // Using advisor ID as creator for underwriting docs
): Promise<void> {
	console.log(`[seed] Seeding underwriting documents...`);

	// 1. Get Underwriting Root
	const { data: uRoot, error: rootError } = await supabaseAdmin
		.from("resources")
		.select("id")
		.eq("project_id", projectId)
		.eq("resource_type", "UNDERWRITING_DOCS_ROOT")
		.single();

	if (rootError || !uRoot) {
		console.error(`[seed] ❌ Failed to find UNDERWRITING_DOCS_ROOT`, rootError);
		return;
	}

	const docsToSeed = [
		{
			filename: "t12_filled.xlsx",
			displayName: "T12 Financial Statement",
			mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		},
		{
			filename: "sources_uses_filled.xlsx",
			displayName: "Sources & Uses Model",
			mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		},
		{
			filename: "pfs_filled.xlsx",
			displayName: "Personal Financial Statement (PFS)",
			mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		},
		{
			filename: "sponsor_resume_filled.docx",
			displayName: "Sponsor Bio",
			mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		},
        {
            filename: "rent_roll_filled.xlsx",
            displayName: "Current Rent Roll",
            mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        },
        {
            filename: "sreo_filled.xlsx",
            displayName: "Schedule of Real Estate Owned (SREO)",
            mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        },
        {
            filename: "capex_report_filled.xlsx",
            displayName: "CapEx Report",
            mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
		},
		{
			filename: "pro_forma_filled.xlsx",
			displayName: "ProForma Cash flow",
			mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
		}
	];

	// Point to the parent "docs/so-good-apartments/underwriting-docs" directory
	const basePath = path.join(
		process.cwd(),
		"docs/so-good-apartments/underwriting-docs"
	);

	for (const doc of docsToSeed) {
		try {
			const filePath = path.join(basePath, doc.filename);
			if (!fs.existsSync(filePath)) {
				console.warn(`[seed] ⚠️ File not found: ${filePath}`);
				continue;
			}

			// Check if resource already exists to avoid duplicates
			const { data: existing } = await supabaseAdmin
				.from("resources")
				.select("id")
				.eq("parent_id", uRoot.id)
				.eq("name", doc.displayName)
				.maybeSingle();

			if (existing) {
				console.log(`[seed] ℹ️  Underwriting doc already exists: ${doc.displayName}`);
				continue;
			}

			// 1. Create Resource First (to get ID for path)
			const { data: resource, error: resourceError } = await supabaseAdmin
				.from("resources")
				.insert({
					org_id: orgId,
					project_id: projectId,
					parent_id: uRoot.id,
					resource_type: "FILE",
					name: doc.displayName,
				})
				.select("id")
				.single();

			if (resourceError) {
				console.error(
					`[seed] ❌ Failed to create resource record for ${doc.displayName}:`,
					resourceError.message
				);
				continue;
			}

			const fileBuffer = fs.readFileSync(filePath);
			const fileSize = fs.statSync(filePath).size;
			const fileNameOnly = path.basename(doc.filename);

			// Construct Deep Path
			// {ProjectId}/underwriting-docs/{ResourceId}/v1_user{CreatorId}_{Filename}
			const storagePath = `${projectId}/underwriting-docs/${resource.id}/v1_user${creatorId}_${fileNameOnly}`;

			// 2. Upload to Storage
			const { error: uploadError } = await supabaseAdmin.storage
				.from(orgId)
				.upload(storagePath, fileBuffer, {
					contentType: doc.mimeType,
					upsert: true,
				});

			if (uploadError) {
				console.error(
					`[seed] ❌ Failed to upload ${doc.filename}:`,
					uploadError.message
				);
				// Cleanup resource if upload failed
				await supabaseAdmin.from("resources").delete().eq("id", resource.id);
				continue;
			}

			// 3. Create Document Version
			const { data: version, error: versionError } = await supabaseAdmin
				.from("document_versions")
				.insert({
					resource_id: resource.id,
					version_number: 1,
					storage_path: storagePath,
					created_by: creatorId,
					status: "active",
					metadata: {
						size: fileSize,
						mimeType: doc.mimeType,
						source: "generated", // Marked as generated per requirements
						isGenerated: true,   // Explicit flag
					},
				})
				.select("id")
				.single();

			if (versionError) {
				console.error(
					`[seed] ❌ Failed to create version for ${doc.displayName}:`,
					versionError.message
				);
				continue;
			}

			// 4. Update Resource with current_version_id
			await supabaseAdmin
				.from("resources")
				.update({ current_version_id: version.id })
				.eq("id", resource.id);

			console.log(`[seed] ✅ Seeded underwriting doc: ${doc.displayName}`);

		} catch (err) {
			console.error(`[seed] ❌ Error seeding ${doc.displayName}:`, err);
		}
	}
}

// ============================================================================
// MAIN SEEDING FUNCTIONS
// ============================================================================

async function seedProjectResume(
	projectId: string,
	createdById: string
): Promise<boolean> {
	console.log(`[seed] Updating project resume for SoGood Apartments...`);

	// Calculate completeness_percent (stored in column, not content)
	// Extract locked_fields from content (now stored in column, not content)
	const lockedFields = hoqueProjectResume._lockedFields || {};
	const { _lockedFields, ...contentWithoutLockedFields } = hoqueProjectResume;

	const { computeProjectCompletion } = await import(
		"../src/utils/resumeCompletion"
	);
	const completenessPercent = computeProjectCompletion(
		hoqueProjectResume,
		lockedFields
	);

	// Convert to rich format before saving (matches application format)
	const richFormatContent = convertToRichFormat(contentWithoutLockedFields);

	// Insert new resume version and get the ID
	const { data: newResume, error } = await supabaseAdmin
		.from("project_resumes")
		.insert({
			project_id: projectId,
			content: richFormatContent,
			locked_fields: lockedFields,
			completeness_percent: completenessPercent,
			created_by: createdById,
		})
		.select()
		.single();

	if (error || !newResume) {
		console.error(`[seed] Failed to insert project resume:`, error);
		return false;
	}

	// Update the PROJECT_RESUME resource's current_version_id
	const { error: updateResourceError } = await supabaseAdmin
		.from("resources")
		.update({ current_version_id: newResume.id })
		.eq("project_id", projectId)
		.eq("resource_type", "PROJECT_RESUME");

	if (updateResourceError) {
		console.error(
			`[seed] Failed to update PROJECT_RESUME resource current_version_id:`,
			updateResourceError
		);
		return false;
	}

	console.log(`[seed] ✅ Updated project resume`);
	return true;
}

async function seedBorrowerResume(
	projectId: string,
	createdById: string
): Promise<boolean> {
	console.log(`[seed] Updating borrower resume for SoGood Apartments...`);

	// Ensure borrower root resources exist
	const { error: rootError } = await supabaseAdmin.rpc(
		"ensure_project_borrower_roots",
		{
			p_project_id: projectId,
		}
	);

	if (rootError) {
		console.warn(
			`[seed] Warning: Failed to ensure borrower root resources:`,
			rootError.message
		);
	}

	// Extract locked_fields from content (now stored in column, not content)
	const borrowerLockedFields = hoqueBorrowerResume._lockedFields || {};
	const { _lockedFields, ...borrowerContentWithoutLockedFields } =
		hoqueBorrowerResume;

	// Calculate completeness_percent (stored in column, not content)
	const { computeBorrowerCompletion } = await import(
		"../src/utils/resumeCompletion"
	);
	const completenessPercent = computeBorrowerCompletion(
		hoqueBorrowerResume,
		borrowerLockedFields
	);

	// Convert to rich format before saving (matches application format)
	const richFormatContent = convertToRichFormat(
		borrowerContentWithoutLockedFields
	);

	// Insert new resume version and get the ID
	const { data: newResume, error } = await supabaseAdmin
		.from("borrower_resumes")
		.insert({
			project_id: projectId,
			content: richFormatContent,
			locked_fields: borrowerLockedFields,
			completeness_percent: completenessPercent,
			created_by: createdById,
		})
		.select()
		.single();

	if (error || !newResume) {
		console.error(`[seed] Failed to insert borrower resume:`, error);
		return false;
	}

	// Update the BORROWER_RESUME resource's current_version_id
	const { error: updateResourceError } = await supabaseAdmin
		.from("resources")
		.update({ current_version_id: newResume.id })
		.eq("project_id", projectId)
		.eq("resource_type", "BORROWER_RESUME");

	if (updateResourceError) {
		console.error(
			`[seed] Failed to update BORROWER_RESUME resource current_version_id:`,
			updateResourceError
		);
		return false;
	}

	const lockedCount = hoqueBorrowerResume._lockedFields
		? Object.keys(hoqueBorrowerResume._lockedFields).length
		: 0;
	console.log(
		`[seed] ✅ Updated borrower resume (locked fields: ${lockedCount})`
	);
	return true;
}

async function seedDocuments(
	projectId: string,
	orgId: string,
	uploadedById: string
): Promise<Record<string, string>> {
	console.log(`[seed] Seeding documents for SoGood Apartments...`);

	const documents: Record<string, string> = {};

	// Project documents - from docs/so-good-apartments/project/
	const projectDocuments = [
		{ file: "alta_survey.pdf", name: "ALTA Survey" },
		{ file: "appraisal_summary.pdf", name: "Appraisal Summary" },
		{
			file: "architectural_plan_abstract.docx",
			name: "Architectural Plan Abstract",
		},
		{
			file: "construction_draw_schedule.xlsx",
			name: "Construction Draw Schedule",
		},
		{ file: "construction_schedule.pdf", name: "Construction Schedule" },
		{ file: "development_budget.xlsx", name: "Development Budget" },
		{ file: "geotechnical_report.docx", name: "Geotechnical Report" },
		{ file: "images.pdf", name: "Project Images" },
		{ file: "incentive_agreement.docx", name: "Incentive Agreement" },
		{ file: "market_study.docx", name: "Market Study" },
		{ file: "operating_proforma.xlsx", name: "Operating Pro Forma" },
		{ file: "phase_1_esa.docx", name: "Phase 1 ESA" },
		{
			file: "purchase_and_sale_agreement.docx",
			name: "Purchase and Sale Agreement",
		},
		{ file: "regulatory_agreement.docx", name: "Regulatory Agreement" },
		{ file: "relocation_plan.docx", name: "Relocation Plan" },
		{ file: "rent_comp_survey.pdf", name: "Rent Comp Survey" },
		{ file: "rent_roll.xlsx", name: "Rent Roll" },
		{ file: "sales_comparables.xlsx", name: "Sales Comparables" },
		{ file: "site_plan_abstract.docx", name: "Site Plan Abstract" },
		{ file: "sources_uses.xlsx", name: "Sources & Uses" },
		{ file: "sponsor_financials.xlsx", name: "Sponsor Financials" },
		{ file: "sponsor_org_chart.docx", name: "Sponsor Org Chart" },
		{ file: "term_sheet.docx", name: "Term Sheet" },
		{ file: "title_commitment.docx", name: "Title Commitment" },
		{ file: "utility_letter.docx", name: "Utility Letter" },
		{
			file: "zoning_verification_letter.docx",
			name: "Zoning Verification Letter",
		},
	];

	// Borrower documents - from docs/so-good-apartments/borrower/
	const borrowerDocuments = [
		{ file: "entity_structure.docx", name: "Entity Structure" },
		{ file: "operating_agreement.docx", name: "Operating Agreement" },
		{
			file: "personal_financial_statement.xlsx",
			name: "Personal Financial Statement",
		},
		{ file: "principals.docx", name: "Principals" },
		{ file: "reo_track_record.xlsx", name: "REO Track Record" },
		{ file: "sponsor_track_record.xlsx", name: "Sponsor Track Record" },
	];

	// Possible base paths for docs/so-good-apartments
	const possibleBasePaths = [
		resolve(process.cwd(), "./docs/so-good-apartments"),
		resolve(process.cwd(), "../docs/so-good-apartments"),
		resolve(process.cwd(), "../../docs/so-good-apartments"),
	];

	// Find the base path
	let basePath: string | null = null;
	for (const path of possibleBasePaths) {
		if (existsSync(path)) {
			basePath = path;
			console.log(`[seed] Found document directory: ${path}`);
			break;
		}
	}

	if (!basePath) {
		console.log(
			`[seed] ⚠️  No document directory found. Skipping document upload.`
		);
		console.log(`[seed]    To upload documents, place them in one of:`);
		possibleBasePaths.forEach((p) => console.log(`[seed]    - ${p}`));
		return documents;
	}

	// Upload project documents
	const projectPath = join(basePath, "project");
	if (existsSync(projectPath)) {
		for (const doc of projectDocuments) {
			const filePath = join(projectPath, doc.file);
			if (existsSync(filePath)) {
				const fileExtension = doc.file.split(".").pop()?.toLowerCase();
				const fileNameWithExtension = fileExtension
					? `${doc.name}.${fileExtension}`
					: doc.name;

				const resourceId = await uploadDocumentToProject(
					projectId,
					orgId,
					filePath,
					fileNameWithExtension,
					"PROJECT_DOCS_ROOT",
					uploadedById
				);
				if (resourceId) {
					documents[doc.name] = resourceId;
				}
			} else {
				console.log(
					`[seed] ⚠️  Project document not found: ${doc.file}`
				);
			}
		}
	} else {
		console.log(
			`[seed] ⚠️  Project documents directory not found: ${projectPath}`
		);
	}

	// Upload borrower documents
	const borrowerPath = join(basePath, "borrower");
	if (existsSync(borrowerPath)) {
		for (const doc of borrowerDocuments) {
			const filePath = join(borrowerPath, doc.file);
			if (existsSync(filePath)) {
				const fileExtension = doc.file.split(".").pop()?.toLowerCase();
				const fileNameWithExtension = fileExtension
					? `${doc.name}.${fileExtension}`
					: doc.name;

				const resourceId = await uploadDocumentToProject(
					projectId,
					orgId,
					filePath,
					fileNameWithExtension,
					"BORROWER_DOCS_ROOT",
					uploadedById
				);
				if (resourceId) {
					documents[doc.name] = resourceId;
				}
			} else {
				console.log(
					`[seed] ⚠️  Borrower document not found: ${doc.file}`
				);
			}
		}
	} else {
		console.log(
			`[seed] ⚠️  Borrower documents directory not found: ${borrowerPath}`
		);
	}

	console.log(`[seed] ✅ Seeded ${Object.keys(documents).length} documents`);
	return documents;
}

async function seedImages(projectId: string, orgId: string): Promise<void> {
	console.log(`[seed] Seeding images for SoGood Apartments...`);

	// Possible base paths for images directory
	const possibleImagePaths = [
		resolve(process.cwd(), "data/so-good-apartments/project/images"),
		resolve(process.cwd(), "./data/so-good-apartments/project/images"),
		resolve(process.cwd(), "../data/so-good-apartments/project/images"),
	];

	let imagesPath: string | null = null;
	for (const path of possibleImagePaths) {
		if (existsSync(path)) {
			imagesPath = path;
			console.log(`[seed] Found images directory: ${path}`);
			break;
		}
	}

	if (!imagesPath) {
		console.log(
			`[seed] ⚠️  No images directory found. Skipping image upload.`
		);
		console.log(`[seed]    To upload images, place them in one of:`);
		possibleImagePaths.forEach((p) => console.log(`[seed]    - ${p}`));
		return;
	}

	// Supported image extensions
	const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];

	// Upload architectural diagrams
	const archDiagramsPath = join(imagesPath, "architectural-diagrams");
	if (existsSync(archDiagramsPath)) {
		console.log(`[seed] Uploading architectural diagrams...`);
		const archFiles = readdirSync(archDiagramsPath).filter((file) => {
			const ext = file.toLowerCase().substring(file.lastIndexOf("."));
			return imageExtensions.includes(ext);
		});

		for (const file of archFiles) {
			const filePath = join(archDiagramsPath, file);
			const stats = statSync(filePath);
			if (stats.isFile()) {
				try {
					const fileBuffer = readFileSync(filePath);
					const storagePath = `${projectId}/architectural-diagrams/${file}`;

					// Detect content type
					const lastDot = file.toLowerCase().lastIndexOf(".");
					const ext =
						lastDot >= 0
							? file.toLowerCase().substring(lastDot)
							: "";
					let contentType = "image/jpeg";
					if (ext === ".png") contentType = "image/png";
					else if (ext === ".gif") contentType = "image/gif";
					else if (ext === ".webp") contentType = "image/webp";

					const { error: uploadError } = await supabaseAdmin.storage
						.from(orgId)
						.upload(storagePath, fileBuffer, {
							contentType,
							upsert: false,
						});

					if (uploadError) {
						if (
							uploadError.message
								?.toLowerCase()
								.includes("already exists")
						) {
							console.log(
								`[seed]   ⚠️  ${file} already exists, skipping`
							);
						} else {
							console.error(
								`[seed]   ❌ Failed to upload ${file}:`,
								uploadError.message
							);
						}
					} else {
						console.log(`[seed]   ✅ Uploaded: ${file}`);
					}
				} catch (err) {
					console.error(
						`[seed]   ❌ Exception uploading ${file}:`,
						err
					);
				}
			}
		}
	} else {
		console.log(
			`[seed] ⚠️  architectural-diagrams folder not found in images directory`
		);
	}

	// Upload site images
	const siteImagesPath = join(imagesPath, "site-images");
	if (existsSync(siteImagesPath)) {
		console.log(`[seed] Uploading site images...`);
		const siteFiles = readdirSync(siteImagesPath).filter((file) => {
			const ext = file.toLowerCase().substring(file.lastIndexOf("."));
			return imageExtensions.includes(ext);
		});

		for (const file of siteFiles) {
			const filePath = join(siteImagesPath, file);
			const stats = statSync(filePath);
			if (stats.isFile()) {
				try {
					const fileBuffer = readFileSync(filePath);
					const storagePath = `${projectId}/site-images/${file}`;

					// Detect content type
					const lastDot = file.toLowerCase().lastIndexOf(".");
					const ext =
						lastDot >= 0
							? file.toLowerCase().substring(lastDot)
							: "";
					let contentType = "image/jpeg";
					if (ext === ".png") contentType = "image/png";
					else if (ext === ".gif") contentType = "image/gif";
					else if (ext === ".webp") contentType = "image/webp";

					const { error: uploadError } = await supabaseAdmin.storage
						.from(orgId)
						.upload(storagePath, fileBuffer, {
							contentType,
							upsert: false,
						});

					if (uploadError) {
						if (
							uploadError.message
								?.toLowerCase()
								.includes("already exists")
						) {
							console.log(
								`[seed]   ⚠️  ${file} already exists, skipping`
							);
						} else {
							console.error(
								`[seed]   ❌ Failed to upload ${file}:`,
								uploadError.message
							);
						}
					} else {
						console.log(`[seed]   ✅ Uploaded: ${file}`);
					}
				} catch (err) {
					console.error(
						`[seed]   ❌ Exception uploading ${file}:`,
						err
					);
				}
			}
		}
	} else {
		console.log(
			`[seed] ⚠️  site-images folder not found in images directory`
		);
	}

	console.log(`[seed] ✅ Completed image upload`);
}

async function seedChatMessages(
	projectId: string,
	advisorId: string,
	borrowerId: string,
	memberIds: string[],
	documents: Record<string, string>
): Promise<void> {
	console.log(`[seed] Seeding chat messages for SoGood Apartments...`);

	// Get or create General thread
	let { data: generalThread } = await supabaseAdmin
		.from("chat_threads")
		.select("id")
		.eq("project_id", projectId)
		.eq("topic", "General")
		.maybeSingle();

	if (!generalThread) {
		const threadId = await createThread(projectId, "General", [
			advisorId,
			borrowerId,
			...memberIds,
		]);
		if (!threadId) {
			console.error(`[seed] Failed to create General thread`);
			return;
		}
		generalThread = { id: threadId };
	} else {
		// Ensure all participants are added
		const allParticipantIds = [advisorId, borrowerId, ...memberIds];
		for (const userId of allParticipantIds) {
			await supabaseAdmin
				.from("chat_thread_participants")
				.upsert(
					{ thread_id: generalThread.id, user_id: userId },
					{ onConflict: "thread_id,user_id" }
				);
		}
	}

	const threadId = generalThread.id;

	// Get document IDs for references (using new document names)
	const proFormaId = documents["Operating Pro Forma"];
	const sitePlanId = documents["Site Plan Abstract"];
	const architecturalPlanId = documents["Architectural Plan Abstract"];
	const marketStudyId = documents["Market Study"];
	const termSheetId = documents["Term Sheet"];
	const sourcesUsesId = documents["Sources & Uses"];

	// Realistic chat messages about the SoGood Apartments deal
	const messages = [
		// Initial project kickoff
		{
			userId: borrowerId,
			content: `Hi @[Cody Field](user:${advisorId})! Excited to work with you on SoGood Apartments Building B. I've uploaded the key documents including the @[Term Sheet](doc:${termSheetId || ""
				}) and @[Sources & Uses](doc:${sourcesUsesId || ""
				}) which have all the key details for our 116-unit mixed-use development. This is Building B in the SoGood master plan, located between the Dallas Farmers Market and Deep Ellum.`,
			resourceIds: [termSheetId, sourcesUsesId].filter(Boolean),
		},
		{
			userId: advisorId,
			content: `Hi team! Thanks for getting everything uploaded. I've reviewed the term sheet - this is a strong deal. The PFC structure with 50% workforce housing is compelling, and having 30,000 SF pre-leased to GSV Holdings is great for lender comfort. What's our timeline for debt marketing?`,
			resourceIds: [],
		},
		{
			userId: borrowerId,
			content: `We're targeting Q1 2025 for debt marketing kickoff. Site control and PFC approval are complete as of July 2024. I've also uploaded the @[Market Study](doc:${marketStudyId || ""
				}) so you can see the market context. Groundbreaking is scheduled for August 2025.`,
			resourceIds: marketStudyId ? [marketStudyId] : [],
		},

		// PFC discussion
		{
			userId: advisorId,
			content: `The PFC structure is really going to help with underwriting. I've reviewed the incentive agreement - having that tax exemption executed is a huge benefit. That's going to significantly improve NOI and exit value. The regulatory agreement shows the framework is solid.`,
			resourceIds: [],
		},
		{
			userId: borrowerId,
			content: `Exactly. The PFC structure through the City of Dallas Housing Finance Corp gives us property tax exemption, which is critical for the workforce housing component. We're targeting 50% of units at ≤80% AMI, which aligns perfectly with the PFC program and makes us eligible for agency lending on the permanent side.`,
			resourceIds: [],
		},

		// Financial discussion
		{
			userId: advisorId,
			content: `I've been reviewing the @[Operating Pro Forma](doc:${proFormaId || ""
				}) - $18M loan request against $29.8M TDC is 60% LTC, which is reasonable for construction. Your base case shows 7.6% yield on cost with 44% LTV at stabilization. The partial recourse structure should help with pricing.`,
			resourceIds: proFormaId ? [proFormaId] : [],
		},
		{
			userId: borrowerId,
			content: `Yes, we're comfortable with partial recourse. We have strong relationships with Frost Bank and Citi Community Capital from previous deals, including SoGood Phase A. The pro forma shows stabilized NOI around $2.27M with a 5.5% cap rate, getting us to a $41.2M exit value.`,
			resourceIds: [],
		},

		// Design and site discussion
		{
			userId: advisorId,
			content: `The location between Farmers Market and Deep Ellum is excellent. I've looked at the @[Site Plan Abstract](doc:${sitePlanId || ""
				}) - the site access from Hickory St and Ferris St works well. The @[Architectural Plan Abstract](doc:${architecturalPlanId || ""
				}) shows a solid 6-story podium design with good amenity spaces.`,
			resourceIds: [sitePlanId, architecturalPlanId].filter(Boolean),
		},
		{
			userId: borrowerId,
			content: `Thanks! The design maximizes the site while keeping costs reasonable. We're delivering 116 units with 59,520 SF residential, plus 49,569 SF of commercial. The amenity package includes a resort-style pool, fitness center, sky lounge, and co-working space - all totaling 35,264 SF.`,
			resourceIds: [],
		},

		// Innovation Center discussion
		{
			userId: advisorId,
			content: `The 30,000 SF Innovation Center pre-lease to GSV Holdings is a real differentiator. Having that much commercial space locked up before groundbreaking reduces lease-up risk significantly. What's the lease term?`,
			resourceIds: [],
		},
		{
			userId: borrowerId,
			content: `It's a 15-year lease with GSV Holdings. They're an education/flex space operator, and they're expanding their Dallas footprint. We're also marketing the two office suites (6,785 SF and 5,264 SF) and have interest from a few creative office users. The retail bay at 745 SF is targeted for a local food & beverage operator.`,
			resourceIds: [],
		},

		// Timeline and next steps
		{
			userId: advisorId,
			content: `Sounds great. So timeline-wise: we have design development wrapping up in November, then debt marketing starting Q1 2025, with closing targeted for August 2025 to align with groundbreaking. That gives us about 6 months for lender outreach and due diligence.`,
			resourceIds: [],
		},
		{
			userId: borrowerId,
			content: `That's the plan. We'll have final construction drawings by end of Q1, and permits should be issued by Q2. The construction schedule calls for topping out in November 2026, then substantial completion September 2027. First occupancy target is October 2027, with stabilization by Q1 2028.`,
			resourceIds: [],
		},
		{
			userId: advisorId,
			content: `Perfect. I'll start putting together a targeted lender list - focusing on construction lenders comfortable with mixed-use, PFC structures, and workforce housing. Given your track record with SoGood Phase A and the pre-leasing, I think we'll have strong interest. Let me know if there are any specific lenders you want prioritized.`,
			resourceIds: [],
		},
	];

	// Create messages with slight delays to simulate real conversation timing
	for (const message of messages) {
		await createChatMessage(
			threadId,
			message.userId,
			message.content,
			message.resourceIds
		);
		// Small delay to space out messages
		await new Promise((resolve) => setTimeout(resolve, 100));
	}

	// Create additional threads for specific topics
	if (memberIds.length > 0) {
		const constructionThreadId = await createThread(
			projectId,
			"Construction & Timeline",
			[advisorId, borrowerId, ...memberIds]
		);

		if (constructionThreadId) {
			const constructionMessages = [
				{
					userId: borrowerId,
					content: `Setting up a dedicated thread for construction updates. Our GC is lined up and ready to break ground in August 2025. Key milestone: topping out by November 2026. The @[Architectural Plan Abstract](doc:${architecturalPlanId || ""
						}) shows the full scope - 6-story podium with structured parking.`,
					resourceIds: architecturalPlanId
						? [architecturalPlanId]
						: [],
				},
				{
					userId: advisorId,
					content: `Good idea to have a separate thread. Lenders will want regular construction updates. Are you planning monthly progress reports? Also, I noticed the @[Site Plan Abstract](doc:${sitePlanId || ""
						}) shows good site access - that should help with construction logistics.`,
					resourceIds: sitePlanId ? [sitePlanId] : [],
				},
				{
					userId: borrowerId,
					content: `Yes, we'll provide monthly draw requests and progress photos. Our GC has experience with lender reporting requirements. The site is well-positioned with access from both Hickory St and Ferris St, which helps with material delivery and staging.`,
					resourceIds: [],
				},
			];

			for (const message of constructionMessages) {
				await createChatMessage(
					constructionThreadId,
					message.userId,
					message.content,
					message.resourceIds
				);
				await new Promise((resolve) => setTimeout(resolve, 100));
			}
		}

		const financingThreadId = await createThread(
			projectId,
			"Financing & Lender Outreach",
			[advisorId, borrowerId, ...memberIds]
		);

		if (financingThreadId) {
			const financingMessages = [
				{
					userId: advisorId,
					content: `Starting lender outreach thread. I'm identifying potential lenders who specialize in: 1) Mixed-use construction, 2) PFC/tax-exempt structures, 3) Workforce housing. The @[Term Sheet](doc:${termSheetId || ""
						}) and @[Sources & Uses](doc:${sourcesUsesId || ""
						}) are comprehensive - I'll use these for initial outreach. Target list coming next week.`,
					resourceIds: [termSheetId, sourcesUsesId].filter(Boolean),
				},
				{
					userId: borrowerId,
					content: `Thanks! We have existing relationships with Frost Bank and Citi Community Capital. Should we prioritize those or cast a wider net? The incentive agreement details the tax exemption structure which should be attractive to lenders.`,
					resourceIds: [],
				},
				{
					userId: advisorId,
					content: `Let's leverage those relationships but also expand. Given the deal size ($18M) and structure, there are several regional banks and specialty lenders who'd be competitive. The PFC structure is a key selling point - having that tax exemption executed removes a lot of execution risk. I'll coordinate initial outreach and prioritize lenders familiar with PFC deals.`,
					resourceIds: [],
				},
				{
					userId: borrowerId,
					content: `Sounds good. The @[Operating Pro Forma](doc:${proFormaId || ""
						}) shows strong returns - 7.6% yield on cost with multiple exit scenarios. That should help with lender underwriting.`,
					resourceIds: proFormaId ? [proFormaId] : [],
				},
			];

			for (const message of financingMessages) {
				await createChatMessage(
					financingThreadId,
					message.userId,
					message.content,
					message.resourceIds
				);
				await new Promise((resolve) => setTimeout(resolve, 100));
			}
		}
	}

	console.log(`[seed] ✅ Seeded chat messages`);
}

async function createProject(
	ownerOrgId: string,
	projectName: string,
	assignedAdvisorId: string | null,
	creatorId: string
): Promise<string | null> {
	console.log(`[seed] Creating project: ${projectName}...`);

	try {
		// 1. Create the project record
		const { data: project, error: projectError } = await supabaseAdmin
			.from("projects")
			.insert({
				name: projectName,
				owner_org_id: ownerOrgId,
				assigned_advisor_id: assignedAdvisorId,
			})
			.select()
			.single();

		if (projectError) {
			console.error(
				`[seed] Failed to create project record:`,
				projectError
			);
			return null;
		}

		const projectId = project.id;
		console.log(`[seed] ✅ Created project record: ${projectId}`);

		// 2. Create storage folders (project root, architectural-diagrams, site-images)
		const { error: storageError } = await supabaseAdmin.storage
			.from(ownerOrgId)
			.upload(
				`${projectId}/.placeholder`,
				new Blob([""], { type: "text/plain" }),
				{
					contentType: "text/plain;charset=UTF-8",
				}
			);

		if (
			storageError &&
			!storageError.message?.toLowerCase().includes("already exists")
		) {
			console.warn(
				`[seed] Warning: Storage folder creation failed (non-critical):`,
				storageError.message
			);
		}

		// Create architectural-diagrams folder
		const { error: archDiagramsError } = await supabaseAdmin.storage
			.from(ownerOrgId)
			.upload(
				`${projectId}/architectural-diagrams/.keep`,
				new Blob([""], { type: "text/plain" }),
				{
					contentType: "text/plain;charset=UTF-8",
				}
			);

		if (
			archDiagramsError &&
			!archDiagramsError.message?.toLowerCase().includes("already exists")
		) {
			console.warn(
				`[seed] Warning: architectural-diagrams folder creation failed (non-critical):`,
				archDiagramsError.message
			);
		}

		// Create site-images folder
		const { error: siteImagesError } = await supabaseAdmin.storage
			.from(ownerOrgId)
			.upload(
				`${projectId}/site-images/.keep`,
				new Blob([""], { type: "text/plain" }),
				{
					contentType: "text/plain;charset=UTF-8",
				}
			);

		if (
			siteImagesError &&
			!siteImagesError.message?.toLowerCase().includes("already exists")
		) {
			console.warn(
				`[seed] Warning: site-images folder creation failed (non-critical):`,
				siteImagesError.message
			);
		}

		// 3. Create PROJECT_RESUME resource
		const { data: projectResumeResource, error: resumeResourceError } =
			await supabaseAdmin
				.from("resources")
				.insert({
					org_id: ownerOrgId,
					project_id: projectId,
					resource_type: "PROJECT_RESUME",
					name: `${projectName} Resume`,
				})
				.select()
				.single();

		if (resumeResourceError) {
			console.error(
				`[seed] Failed to create PROJECT_RESUME resource:`,
				resumeResourceError
			);
		}

		// 4. Create PROJECT_DOCS_ROOT resource
		const { data: projectDocsRootResource, error: docsRootError } =
			await supabaseAdmin
				.from("resources")
				.insert({
					org_id: ownerOrgId,
					project_id: projectId,
					resource_type: "PROJECT_DOCS_ROOT",
					name: `${projectName} Documents`,
				})
				.select()
				.single();

		if (docsRootError) {
			console.error(
				`[seed] Failed to create PROJECT_DOCS_ROOT resource:`,
				docsRootError
			);
		}

		// 5. Ensure borrower root resources
		const { error: borrowerRootError } = await supabaseAdmin.rpc(
			"ensure_project_borrower_roots",
			{
				p_project_id: projectId,
			}
		);

		if (borrowerRootError) {
			console.warn(
				`[seed] Warning: Failed to ensure borrower root resources:`,
				borrowerRootError.message
			);
		}

		// 6. Grant creator access
		const { error: grantError } = await supabaseAdmin
			.from("project_access_grants")
			.insert({
				project_id: projectId,
				org_id: ownerOrgId,
				user_id: creatorId,
				granted_by: creatorId,
			});

		if (grantError) {
			console.warn(
				`[seed] Warning: Failed to grant project access:`,
				grantError.message
			);
		}

		// 8. Grant permissions on resources
		if (projectResumeResource?.id) {
			await supabaseAdmin.from("permissions").upsert({
				resource_id: projectResumeResource.id,
				user_id: creatorId,
				permission: "edit",
				granted_by: creatorId,
			});
		}

		if (projectDocsRootResource?.id) {
			await supabaseAdmin.from("permissions").upsert({
				resource_id: projectDocsRootResource.id,
				user_id: creatorId,
				permission: "edit",
				granted_by: creatorId,
			});
		}

		// 10. Create UNDERWRITING_DOCS_ROOT resource and grant access
		const { data: underwritingDocsRoot, error: underwritingError } =
			await supabaseAdmin
				.from("resources")
				.insert({
					org_id: ownerOrgId,
					project_id: projectId,
					resource_type: "UNDERWRITING_DOCS_ROOT",
					name: "Underwriting Documents",
				})
				.select()
				.single();

		if (underwritingError) {
			console.error(
				`[seed] Failed to create UNDERWRITING_DOCS_ROOT resource:`,
				underwritingError
			);
		} else if (underwritingDocsRoot?.id) {
			// Grant ADVISOR edit permission
			// Borrowers (creator) explicitly get NO access to underwriting docs
			if (assignedAdvisorId) {
				await supabaseAdmin.from("permissions").upsert({
					resource_id: underwritingDocsRoot.id,
					user_id: assignedAdvisorId,
					permission: "edit",
					granted_by: creatorId,
				});
			}
		}

		// 9. Create default chat thread
		const { data: chatThread, error: chatThreadError } = await supabaseAdmin
			.from("chat_threads")
			.insert({
				project_id: projectId,
				topic: "General",
			})
			.select()
			.single();

		if (!chatThreadError && chatThread) {
			const participants = [
				{ thread_id: chatThread.id, user_id: creatorId },
			];
			if (assignedAdvisorId) {
				participants.push({
					thread_id: chatThread.id,
					user_id: assignedAdvisorId,
				});
			}
			await supabaseAdmin
				.from("chat_thread_participants")
				.insert(participants);
		}

		console.log(`[seed] ✅ Created project: ${projectName} (${projectId})`);
		return projectId;
	} catch (err) {
		console.error(`[seed] Exception creating project ${projectName}:`, err);
		return null;
	}
}

async function seedTeamMembers(
	projectId: string,
	orgId: string,
	ownerId: string
): Promise<string[]> {
	console.log(`[seed] Seeding team members for SoGood Apartments...`);
	console.log(
		`[seed] Note: Using same member accounts as seed-demo-data.ts for compatibility`
	);

	const memberEmails = [
		{
			email: "aryan.jain@capmatch.com",
			name: "Aryan Jain",
			role: "Team Member",
		},
		{
			email: "sarthak.karandikar@capmatch.com",
			name: "Sarthak Karandikar",
			role: "Team Member",
		},
		{
			email: "kabeer.merchant@capmatch.com",
			name: "Kabeer Merchant",
			role: "Team Member",
		},
		{
			email: "vatsal.hariramani@capmatch.com",
			name: "Vatsal Hariramani",
			role: "Team Member",
		},
	];

	const memberIds: string[] = [];

	for (const member of memberEmails) {
		const userId = await createMemberUser(
			member.email,
			"password",
			member.name,
			orgId
		);
		if (userId) {
			memberIds.push(userId);

			// Grant project access
			await grantMemberProjectAccess(projectId, userId, ownerId);

			// Add to General chat thread
			const { data: generalThread } = await supabaseAdmin
				.from("chat_threads")
				.select("id")
				.eq("project_id", projectId)
				.eq("topic", "General")
				.maybeSingle();

			if (generalThread) {
				await supabaseAdmin
					.from("chat_thread_participants")
					.upsert(
						{ thread_id: generalThread.id, user_id: userId },
						{ onConflict: "thread_id,user_id" }
					);
			}
		}
	}

	console.log(`[seed] ✅ Seeded ${memberIds.length} team members`);
	return memberIds;
}

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================

async function seedHoqueProject(): Promise<void> {
	console.log(
		"🌱 Starting Hoque (SoGood Apartments) complete account seed...\n"
	);
	console.log(
		"📝 Note: This script uses the same borrower and advisor accounts as seed-demo-data.ts"
	);
	console.log(
		"📝 Both scripts can be run together - they create different projects in the same accounts\n"
	);

	try {
		// Step 1: Create advisor account and org
		// Note: Uses same advisor as demo script (cody.field@capmatch.com)
		console.log("📋 Step 1: Creating advisor account (Cody Field)...");
		const advisorInfo = await createAdvisorAccount();
		if (!advisorInfo) {
			console.error("[seed] ❌ Failed to create advisor account");
			return;
		}
		const { userId: advisorId, orgId: advisorOrgId } = advisorInfo;

		// Step 2: Get or create borrower account (param.vora@capmatch.com)
		// This uses the same account as the demo script, so both scripts can work together
		console.log(
			"\n📋 Step 2: Getting/creating borrower account (param.vora@capmatch.com)..."
		);
		const borrowerInfo = await getOrCreateDemoBorrowerAccount();
		if (!borrowerInfo) {
			console.error("[seed] ❌ Failed to get/create borrower account");
			return;
		}
		const { userId: borrowerId, orgId: borrowerOrgId } = borrowerInfo;

		// Step 2.5: Ensure Jeff Richmond is added as owner (for notifications)
		console.log(
			"\n📋 Step 2.5: Ensuring Jeff Richmond is added as owner..."
		);
		const jeffEmail = "jeff.richmond@capmatch.com";
		const jeffPassword = "password";
		const jeffName = "Jeff Richmond";

		// Check if Jeff already exists
		const { data: existingJeffProfile } = await supabaseAdmin
			.from("profiles")
			.select("id")
			.eq("email", jeffEmail)
			.maybeSingle();

		let jeffUserId: string | null = null;

		if (existingJeffProfile) {
			console.log(
				`[seed] Jeff Richmond already exists: ${jeffEmail} (${existingJeffProfile.id})`
			);
			jeffUserId = existingJeffProfile.id;
		} else {
			// Create user via auth
			const { data: authUser, error: authError } =
				await supabaseAdmin.auth.admin.createUser({
					email: jeffEmail,
					password: jeffPassword,
					email_confirm: true,
					user_metadata: { full_name: jeffName },
				});

			if (authError || !authUser.user) {
				console.warn(
					`[seed] Warning: Failed to create Jeff Richmond user:`,
					authError
				);
			} else {
				jeffUserId = authUser.user.id;

				// Create profile
				const { error: profileError } = await supabaseAdmin
					.from("profiles")
					.insert({
						id: jeffUserId,
						email: jeffEmail,
						full_name: jeffName,
						app_role: "borrower",
						active_org_id: borrowerOrgId,
					});

				if (profileError) {
					console.warn(
						`[seed] Warning: Failed to create Jeff Richmond profile:`,
						profileError
					);
					await supabaseAdmin.auth.admin.deleteUser(jeffUserId);
					jeffUserId = null;
				} else {
					console.log(
						`[seed] ✅ Created Jeff Richmond user: ${jeffEmail} (${jeffUserId})`
					);
				}
			}
		}

		// Add Jeff to org_members as owner if user was created/found
		if (jeffUserId) {
			const { error: memberError } = await supabaseAdmin
				.from("org_members")
				.upsert(
					{
						org_id: borrowerOrgId,
						user_id: jeffUserId,
						role: "owner",
					},
					{ onConflict: "org_id,user_id" }
				);

			if (memberError) {
				console.warn(
					`[seed] Warning: Failed to add Jeff Richmond to org:`,
					memberError
				);
			} else {
				console.log(`[seed] ✅ Added Jeff Richmond as owner to org`);
			}

			// Ensure active_org_id is set
			await supabaseAdmin
				.from("profiles")
				.update({ active_org_id: borrowerOrgId })
				.eq("id", jeffUserId);
		}

		// Step 3: Create SoGood Apartments project
		console.log("\n📋 Step 3: Creating SoGood Apartments project...");
		const projectId = await createProject(
			borrowerOrgId,
			HOQUE_PROJECT_NAME,
			advisorId,
			borrowerId
		);

		if (!projectId) {
			console.error("[seed] ❌ Failed to create project");
			return;
		}

		// Grant advisor permissions
		const { error: permError } = await supabaseAdmin.rpc(
			"grant_advisor_project_permissions",
			{
				p_project_id: projectId,
				p_advisor_id: advisorId,
				p_granted_by_id: advisorId,
			}
		);

		if (permError) {
			console.warn(
				`[seed] Warning: Failed to grant advisor permissions:`,
				permError.message
			);
		}

		// Step 4: Seed project and borrower resumes
		console.log("\n📋 Step 4: Seeding project and borrower resumes...");
		await seedProjectResume(projectId, borrowerId);
		await seedBorrowerResume(projectId, borrowerId);

		// Note: OM data is NOT seeded here - it will be synced automatically when user clicks "View OM"
		// The backend sync will read from project_resumes and borrower_resumes tables and populate OM correctly

		// Step 5: Seed documents
		console.log("\n📋 Step 5: Seeding documents...");
		const documents = await seedDocuments(
			projectId,
			borrowerOrgId,
			borrowerId
		);

		// Step 5.5: Seed images
		console.log("\n📋 Step 5.5: Seeding images...");
		await seedImages(projectId, borrowerOrgId);

		// Step 5.6: Seed underwriting documents
		console.log("\n📋 Step 5.6: Seeding underwriting documents...");
		await seedUnderwritingDocs(projectId, borrowerOrgId, advisorId);

		// Step 5.7: Seed Underwriting Templates (Project Specific)
		console.log("\n📋 Step 5.7: Seeding underwriting templates (Project Specific)...");

		// Create Template Root
		// User reports missing unique constraint on (project_id, resource_type), so we use check-then-insert
		let templatesRoot: any = null;

		const { data: existingRoot, error: findRootError } = await supabaseAdmin
			.from("resources")
			.select("*")
			.eq("project_id", projectId)
			.eq("resource_type", "UNDERWRITING_TEMPLATES_ROOT")
			.maybeSingle();

		if (findRootError) {
			console.error("[seed] ❌ Failed to query UNDERWRITING_TEMPLATES_ROOT:", findRootError);
		}

		if (existingRoot) {
			templatesRoot = existingRoot;
			console.log(`[seed] ✅ Found existing Template Root: ${templatesRoot.id}`);
		} else {
			const { data: newRoot, error: createRootError } = await supabaseAdmin
				.from("resources")
				.insert({
					project_id: projectId,
					resource_type: "UNDERWRITING_TEMPLATES_ROOT",
					name: "Underwriting Templates",
                    org_id: borrowerOrgId,
                    // parent_id is null for roots, allowed.
                })
                .select()
                .single();
            
             if (createRootError) {
                 console.error("[seed] ❌ Failed to create UNDERWRITING_TEMPLATES_ROOT:", createRootError);
             } else {
                 templatesRoot = newRoot;
                 console.log(`[seed] ✅ Created Template Root: ${templatesRoot?.id}`);
             }
        }
            
        if (templatesRoot && advisorId) {
             const { error: permError } = await supabaseAdmin.from("permissions").upsert({
                resource_id: templatesRoot.id,
                user_id: advisorId,
                permission: "edit",
                granted_by: advisorId, 
            });
            if (permError) console.error("[seed] ❌ Failed to grant root permissions:", permError);
        }

		const templateDir = path.join(process.cwd(), "docs/so-good-apartments/underwriting-templates");
		const templatesToSeed = [
			{ name: "Sources & Uses Model Template", filename: "sources_uses_template.xlsx" },
			{ name: "Schedule of Real Estate Owned (SREO) Template", filename: "sreo_template.xlsx" },
			{ name: "T12 Financial Statement Template", filename: "t12_template.xlsx" },
			{ name: "Current Rent Roll Template", filename: "rent_roll_template.xlsx" },
			{ name: "Personal Financial Statement (PFS) Template", filename: "pfs_template.xlsx" },
			{ name: "Sponsor Bio Template", filename: "sponsor_bio_template.docx" },
			{ name: "CapEx Report Template", filename: "capex_report_template.xlsx" },
		];

		for (const tmpl of templatesToSeed) {
			const filePath = path.join(templateDir, tmpl.filename);
			if (fs.existsSync(filePath)) {
				// Check if resource exists - STRICTLY checking within the templates root
				let existingRes = null;
				
				if (templatesRoot?.id) {
					const { data } = await supabaseAdmin
						.from("resources")
						.select("*")
						.eq("project_id", projectId)
						.eq("parent_id", templatesRoot.id)
						.eq("name", tmpl.name)
						.eq("resource_type", "FILE")
						.maybeSingle();
					existingRes = data;
				}

				if (existingRes) {
					console.log(`[seed]   - Template correctly exists for ${tmpl.name}`);
					continue;
				}

				// Create new resource
				if (!templatesRoot?.id) {
					console.error(`[seed] ❌ Cannot create ${tmpl.name} because Template Root ID is missing.`);
					continue;
				}

				const { data: res, error: resError } = await supabaseAdmin
					.from("resources")
					.insert({
						project_id: projectId,
						org_id: borrowerOrgId,
						resource_type: "FILE",
						name: tmpl.name,
						parent_id: templatesRoot.id
					})
					.select()
					.single();

				if (resError) {
					console.error(`[seed] ❌ Failed to create resource for ${tmpl.name}:`, resError);
					continue;
				}

				if (res) {
					const fileBuffer = fs.readFileSync(filePath);
					// Construct Deep Path for Templates
					// {ProjectId}/underwriting-templates/{ResourceId}/v1_user{AdvisorId}_{Filename}
					const storagePath = `${projectId}/underwriting-templates/${res.id}/v1_user${advisorId}_${tmpl.filename}`;

					// Upload
					const { error: uploadError } = await supabaseAdmin.storage
						.from(borrowerOrgId)
						.upload(storagePath, fileBuffer, {
							contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
							upsert: true
						});

					if (uploadError) {
						console.error(`[seed] ❌ Failed to upload ${tmpl.name}:`, uploadError);
						// cleanup
						await supabaseAdmin.from("resources").delete().eq("id", res.id);
						continue;
					}

					console.log(`[seed] ✅ Uploaded ${tmpl.name} to storage`);

					const { data: ver, error: verError } = await supabaseAdmin
						.from("document_versions")
						.insert({
							resource_id: res.id,
							version_number: 1,
							storage_path: storagePath,
							status: "active",
							created_by: advisorId,
							metadata: {
								size: fileBuffer.length,
								mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
								bucket: borrowerOrgId
							}
						})
						.select()
						.single();

					if (verError) {
						console.error(`[seed] ❌ Failed to create version for ${tmpl.name}:`, verError);
					}

					if (ver) {
						await supabaseAdmin
							.from("resources")
							.update({ current_version_id: ver.id })
							.eq("id", res.id);
					}
					console.log(`[seed]   - Registered Resource & Version for ${tmpl.name}`);
				}
			} else {
				console.warn(`[seed] ⚠️  Template file missing: ${filePath}`);
			}
		}

		// Step 6: Seed team members
		console.log("\n📋 Step 6: Seeding team members...");
		const memberIds = await seedTeamMembers(
			projectId,
			borrowerOrgId,
			borrowerId
		);

		// Step 7: Seed chat messages
		console.log("\n📋 Step 7: Seeding chat messages...");
		await seedChatMessages(
			projectId,
			advisorId,
			borrowerId,
			memberIds,
			documents
		);

		// Step 8: Create lender account and grant access
		console.log("\n📋 Step 8: Creating lender account and granting project access...");
		const lenderInfo = await createLenderAccount();
		if (lenderInfo) {
			const { userId: lenderUserId, orgId: lenderOrgId } = lenderInfo;

			// Grant lender access to this project
			try {
				const { data: accessId, error: grantError } = await supabaseAdmin.rpc(
					"grant_lender_project_access",
					{
						p_lender_org_id: lenderOrgId,
						p_project_id: projectId,
						p_granted_by: advisorId, // Advisor grants the access
					}
				);

				if (grantError) {
					console.error(
						`[seed] ⚠️  Failed to grant lender access:`,
						grantError.message
					);
				} else {
					console.log(
						`[seed] ✅ Granted lender access to project (access_id: ${accessId})`
					);

					// Also explicit grant VIEW permission on UNDERWRITING_DOCS_ROOT
					const { data: uRoot } = await supabaseAdmin
						.from("resources")
						.select("id")
						.eq("project_id", projectId)
						.eq("resource_type", "UNDERWRITING_DOCS_ROOT")
						.single();

					if (uRoot) {
						const { error: permError } = await supabaseAdmin.from("permissions").upsert({
							resource_id: uRoot.id,
							user_id: lenderUserId,
							permission: "view",
							granted_by: advisorId,
						});
                        
                        if (permError) {
                             console.error(`[seed] ❌ Failed to grant permission on UNDERWRITING_DOCS_ROOT:`, permError);
                        } else {
    						console.log(
    							`[seed] ✅ Granted lender VIEW access to UNDERWRITING_DOCS_ROOT`
    						);
                        }
                        
                        // Grant lender VIEW access to UNDERWRITING_TEMPLATES_ROOT
                        const { data: uTemplatesRoot } = await supabaseAdmin
                            .from("resources")
                            .select("id")
                            .eq("project_id", projectId)
                            .eq("resource_type", "UNDERWRITING_TEMPLATES_ROOT")
                            .maybeSingle();

                        if (uTemplatesRoot) {
                            const { error: tmplPermError } = await supabaseAdmin.from("permissions").upsert({
                                resource_id: uTemplatesRoot.id,
                                user_id: lenderUserId,
                                permission: "view",
                                granted_by: advisorId, 
                            });
                            
                            if (tmplPermError) {
                                console.error(`[seed] ❌ Failed to grant permission on UNDERWRITING_TEMPLATES_ROOT:`, tmplPermError);
                            } else {
                                console.log(
                                    `[seed] ✅ Granted lender VIEW access to UNDERWRITING_TEMPLATES_ROOT`
                                );
                            }
                        }
					}
				}
			} catch (err) {
				console.error(`[seed] ⚠️  Exception granting lender access:`, err);
			}
		} else {
			console.warn("[seed] ⚠️  Lender account creation failed, skipping lender access grant");
		}

		// Summary
		console.log(
			"\n✅ Hoque (SoGood Apartments) complete account seed completed successfully!"
		);
		console.log("\n📊 Summary:");
		console.log(`   Advisor: cody.field@capmatch.com (password: password)`);
		console.log(
			`   Project Owner: param.vora@capmatch.com (password: password)`
		);
		console.log(`   Lender: lender@capmatch.com (password: password)`);
		console.log(`   Project: ${HOQUE_PROJECT_NAME} (${projectId})`);
		console.log(`   Project Resume: ✅ Seeded (100% complete)`);
		console.log(`   Borrower Resume: ✅ Seeded (100% complete)`);
		console.log(`   OM Data: ⚠️  Will be synced when "View OM" is clicked`);
		console.log(
			`   Documents: ✅ ${Object.keys(documents).length} documents`
		);
		console.log(`   Team Members: ✅ ${memberIds.length} members`);
		console.log(`   Chat Messages: ✅ Seeded in General and topic threads`);
		console.log(`   Lender Access: ✅ Capital Lending Group has view access`);
		console.log(
			"\n🎉 The Hoque project is now fully seeded in the borrower account!"
		);
	} catch (error) {
		console.error("\n❌ Seed script failed:", error);
		if (error instanceof Error) {
			console.error("Error details:", error.message);
			console.error("Stack:", error.stack);
		}
		throw error;
	}
}

// ============================================================================
// CLEANUP FUNCTION
// ============================================================================

async function cleanupHoqueAccounts(): Promise<void> {
	console.log("🧹 Starting Hoque project cleanup...\n");

	try {
		const borrowerEmail = "param.vora@capmatch.com";
		const advisorEmail = "cody.field@capmatch.com";
		const lenderEmail = "lender@capmatch.com";
		const teamMemberEmails = [
			"aryan.jain@capmatch.com",
			"sarthak.karandikar@capmatch.com",
			"kabeer.merchant@capmatch.com",
			"vatsal.hariramani@capmatch.com",
		];

		// Step 1: Find and delete SoGood Apartments project
		// Note: This only deletes the Hoque project, not the demo projects
		console.log("📋 Step 1: Deleting SoGood Apartments project...");
		const { data: projects } = await supabaseAdmin
			.from("projects")
			.select("id, name, owner_org_id")
			.eq("name", HOQUE_PROJECT_NAME);

		if (projects && projects.length > 0) {
			const projectIds = projects.map((p) => p.id);
			let borrowerOrgId: string | null = null;

			for (const project of projects) {
				borrowerOrgId = project.owner_org_id;

				// Delete lender project access grants first
				await supabaseAdmin
					.from("lender_project_access")
					.delete()
					.eq("project_id", project.id);

				// Delete chat data
				const { data: threads } = await supabaseAdmin
					.from("chat_threads")
					.select("id")
					.eq("project_id", project.id);

				if (threads && threads.length > 0) {
					const threadIds = threads.map((t) => t.id);
					await supabaseAdmin
						.from("chat_thread_participants")
						.delete()
						.in("thread_id", threadIds);
					await supabaseAdmin
						.from("chat_threads")
						.delete()
						.eq("project_id", project.id);
				}

				// Delete resources
				const { data: resources } = await supabaseAdmin
					.from("resources")
					.select("id")
					.eq("project_id", project.id);

				if (resources && resources.length > 0) {
					const resourceIds = resources.map((r) => r.id);
					await supabaseAdmin
						.from("permissions")
						.delete()
						.in("resource_id", resourceIds);
					await supabaseAdmin
						.from("resources")
						.delete()
						.in("id", resourceIds);
				}

				// Delete resumes
				await supabaseAdmin
					.from("project_resumes")
					.delete()
					.eq("project_id", project.id);
				await supabaseAdmin
					.from("borrower_resumes")
					.delete()
					.eq("project_id", project.id);

				// Delete OM data
				await supabaseAdmin
					.from("om")
					.delete()
					.eq("project_id", project.id);

				// Delete project access grants
				await supabaseAdmin
					.from("project_access_grants")
					.delete()
					.in("project_id", projectIds);
			}

			// Delete projects
			await supabaseAdmin.from("projects").delete().in("id", projectIds);
			console.log(`[cleanup] ✅ Deleted ${projects.length} project(s)`);

			// Note: We do NOT delete the borrower account (param.vora@capmatch.com) or its org
			// as it's shared with the demo script and may have other projects
		} else {
			console.log("[cleanup] No SoGood Apartments projects found");
		}

		// Step 3: Skip team member cleanup (team members are shared with demo script)
		// Note: We do NOT delete team member accounts as they're shared with the demo script
		console.log("\n📋 Step 3: Skipping team member cleanup...");
		console.log(
			`[cleanup] ⚠️  Preserving team member accounts - shared with demo script:`
		);
		for (const email of teamMemberEmails) {
			console.log(`[cleanup]   - ${email}`);
		}
		console.log(
			`[cleanup] Note: Only Hoque project access will be removed (project deletion handles this)`
		);

		// Step 4: Skip advisor cleanup (advisor is shared with demo script)
		// Note: We do NOT delete the advisor account (cody.field@capmatch.com) or its org
		// as it's shared with the demo script and may be used by other projects
		console.log("\n📋 Step 4: Skipping advisor cleanup...");
		console.log(
			`[cleanup] ⚠️  Preserving advisor account (${advisorEmail}) - shared with demo script`
		);

		// Step 5: Skip lender cleanup (lender might be used by other projects)
		console.log("\n📋 Step 5: Skipping lender cleanup...");
		console.log(
			`[cleanup] ⚠️  Preserving lender account (${lenderEmail}) - may be used by other projects`
		);
		console.log(
			`[cleanup] Note: Lender project access was removed with project deletion`
		);

		console.log("\n✅ Hoque project cleanup completed!");
		console.log(
			"🌱 Note: Borrower account (param.vora@capmatch.com) was NOT deleted."
		);
		console.log(
			"🌱 Note: This account is shared with the demo script, so it is preserved."
		);
		console.log(
			"🌱 Note: Lender account (lender@capmatch.com) was preserved."
		);
		console.log(
			"🌱 You can now run the seed script again for a fresh start."
		);
	} catch (error) {
		console.error("\n❌ Cleanup failed:", error);
		throw error;
	}
}

// ============================================================================
// CLI HANDLING
// ============================================================================

async function main() {
	// Production confirmation
	if (isProduction && !isCleanup) {
		console.log("⚠️  PRODUCTION MODE DETECTED");
		console.log(`   Database: ${supabaseUrl}`);
		const key = getServiceRoleKey();
		console.log(`   Service Role Key: ${key.substring(0, 20)}...`);
		console.log(
			"\n⚠️  This will create real users and data in PRODUCTION!"
		);
		console.log("⚠️  Make sure you have backups before proceeding.");
		console.log(
			"\nPress Ctrl+C to cancel, or wait 5 seconds to proceed...\n"
		);

		// Wait 5 seconds for user to cancel
		await new Promise((resolve) => setTimeout(resolve, 5000));
		console.log("Proceeding with production seed...\n");
	}

	if (isCleanup) {
		if (isProduction) {
			console.log("⚠️  PRODUCTION CLEANUP MODE");
			console.log(`   Database: ${supabaseUrl}`);
			console.log(
				"⚠️  This will DELETE all Hoque accounts and data from PRODUCTION!"
			);
			console.log(
				"\nPress Ctrl+C to cancel, or wait 5 seconds to proceed...\n"
			);
			await new Promise((resolve) => setTimeout(resolve, 5000));
			console.log("Proceeding with production cleanup...\n");
		}

		await cleanupHoqueAccounts();
		console.log("\n✨ Cleanup done!");
	} else {
		await seedHoqueProject();
		console.log("\n✨ Done!");
		if (isProduction) {
			console.log("\n📝 Next steps:");
			console.log('   1. Change user passwords (default is "password")');
			console.log("   2. Verify data in Supabase Dashboard");
			console.log("   3. Test login with created accounts");
		}
	}
}

if (require.main === module) {
	main()
		.then(() => {
			process.exit(0);
		})
		.catch((error) => {
			console.error("Fatal error:", error);
			process.exit(1);
		});
}

export { seedHoqueProject, cleanupHoqueAccounts };
