// Run with: npx tsx scripts/seed-540-south-st-project.ts [--prod] [cleanup]
import {
	propertyUpsurgeMain,
	type PropertyUpsurgeSeedConfig,
} from "./seed-property-upsurge-common";

const roundToOneDecimal = (value: number): number =>
	Number(value.toFixed(1));

const assessedValue = 9_041_681;
const firstMortgageAmount = 6_604_500;
const grossArea = 51_435;
const unitCount = 84;
const acquisitionDate = "2021-08-17";
const loanMaturityDate = "2026-08-17";
const reddingZoningReferenceUrl =
	"https://www.municode.com/library/ca/redding/codes/code_of_ordinances?nodeId=TIT18ZO_DIVIIIBADIRE_CH18.31REDIREREESRSRESIMIRMREMUMI";

const seedConfig: PropertyUpsurgeSeedConfig = {
	projectName: "540 South St Apartments",
	sourceJsonFile: "data/property-upserge/540_south_st.json",
	projectResume: {
		deal_type: "refinance",
		projectName: "540 South St Apartments",
		assetType: "Multifamily / Apartment",
		dealStatus: "Operating / Stabilized",
		masterPlanName: "KUTRAS RIVERSIDE ADDITION",
		ownershipType: "COMPANY / LLC",
		projectPhase: "Built / Existing (Year Built: 1977)",
		constructionType: "FRAME / WOOD",
		lastRenovationDate:
			"December 2023 (Based on the latest building permits for HVAC and major 2022 reroofing)",
		propertyAddressStreet: "540 SOUTH ST",
		propertyAddressCity: "REDDING",
		propertyAddressState: "CA",
		propertyAddressCounty: "Shasta County",
		propertyAddressZip: "96001",
		parcelNumber: "102-090-028-000",
		zoningDesignation: "Split-zoned RM-15 / RS-3.5",
		zoningDescriptionUrl: reddingZoningReferenceUrl,
		taxingDistrictID: "1-000",
		projectDescription:
			"540 South St is an 84-unit apartment community in Redding totaling roughly 51,435 square feet on a 4.54-acre site. The property was built in 1977 and is operating as an existing multifamily asset with major roof, HVAC, and electrical work already completed in recent years.",
		businessPlanSummary:
			"This is a straightforward refinance of a stabilized apartment property. Ownership has already completed meaningful capital work, so the near-term plan is to keep the asset operating, continue routine turns and maintenance, and hold the community as workforce-oriented housing in Redding.",
		marketOverviewSummary:
			"540 South St sits in an established Redding multifamily area just south of Downtown. The location benefits from nearby schools, neighborhood services, and civic anchors, which supports day-to-day renter demand for existing apartment housing more directly than a for-sale residential narrative.",
		adjacentLandUse:
			"The surrounding area is a mix of established residential and neighborhood-serving uses. Nearby school references place Sequoia Middle School about 0.31 miles away, Cypress Elementary about 0.37 miles away, and Shasta High about 1.85 miles away, with Downtown Redding civic uses, the Redding Library, and Mercy Medical Center also nearby.",
		siteAccess:
			"South Street provides neighborhood access into the surrounding residential blocks and convenient connections into Downtown Redding and the city's primary north-south roadway network.",
		proximityShopping:
			"Neighborhood retail and services are available in and around Downtown Redding, giving residents access to everyday shopping without relying on a single destination center.",
		totalResidentialUnits: unitCount,
		totalResidentialNRSF: grossArea,
		averageUnitSize: roundToOneDecimal(grossArea / unitCount),
		grossBuildingArea: grossArea,
		numberOfStories: 2,
		buildingType: "APARTMENT",
		constructionClass: "COMMERCIAL",
		totalSiteAcreage: 4.54,
		buildableAcreage: 197_762,
		parkingSpaces: 2,
		parkingRatio: 0.02,
		parkingType: "Garage, Detached",
		amenityList: ["No Pool"],
		meteringStructure: "Multi-meter pack (Noted in 2025 electrical permit)",
		hvacSystem:
			"Rooftop package heat pump/electric units (Multiple replacements 2021-2023)",
		roofTypeAge: "Comparable/Comp - Re-roofed heavily in July 2022",
		realEstateTaxes: 94_948.74,
		purchasePrice: 8_510_000,
		purchasePriceDate: acquisitionDate,
		totalProjectCost: 8_510_000,
		baseConstruction: 7_980_473,
		sponsorEquity: 1_905_500,
		equityCommittedPercent: 22.39,
		loanAmountRequested: firstMortgageAmount,
		loanType: "Senior Debt",
		requestedTerm: 5,
		targetCloseDate: loanMaturityDate,
		lender: "EXCHANGE BANCORP OF MISSOURI INC.",
		existingLender: "EXCHANGE BANCORP OF MISSOURI INC.",
		existingLoanAmount: firstMortgageAmount,
		interestRate: 2.90,
		interestRateType: "ADJUSTABLE RATE (ADJ)",
		targetLtvPercent: 77.6,
		ltv: 77.6,
		ltc: 77.6,
		appraisedLandValue: 1_061_208,
		stabilizedValue: 9_041_681,
		appraisedInsurableValue: 9_041_681,
		capexItems: "Roofing: Full tear-off and reroofing across almost all buildings (Estimated >$46.5k). HVAC: Complete removal and replacement of rooftop package units across 9 buildings throughout 2022-2023. Electrical: Removed/replaced 400 amp main panel (Feb 2022).",
		useOfProceeds:
			"Loan proceeds are intended to refinance the existing debt on the 84-unit apartment community and keep the property positioned for ongoing maintenance, unit turns, and normal operating needs.",
		exitStrategy: "Refinance",
		currentSiteStatus: "Active / Occupied",
		topography: "VIEW - NONE",
		foreclosureHistory: "Clean",
		riskLevel: "Low",
		landValueDefinition_Legal: "SUBD: KUTRAS RIVERSIDE ADDITION",
		msaName: "Redding, CA",
		submarketName: "Redding",
		landAcqClose: acquisitionDate,
		landAcqStatus: "Closed",
		completionStatus: "Complete",
		sponsorEntityName: "DK PROPERTIES 540 SOUTH LLC",
		sponsorStructure: "Limited Liability Company",
		internalAdvisorNotes:
			"Mapped from data/property-upserge/540_south_st.json and supplemented with recorded loan-date research. Purchase date uses the recorded 2021-08-17 transaction date and target close date uses the recorded 2026-08-17 estimated due date. City of Redding GIS spot checks within parcel 102-090-028-000 returned both RM-15 and RS-3.5, so the zoning is noted as split-zoned RM-15 / RS-3.5 rather than a generic commercial bucket.",
	},
	borrowerResume: {
		fullLegalName: "YANIV BENAROYA LIVING TRUST, DK PROPERTIES 540 SOUTH LLC, THE BENAROYA TRUST",
		primaryEntityName: "DK PROPERTIES 540 SOUTH LLC",
		primaryEntityStructure: "COMPANY / LLC",
		principalLegalName: "YANIV BENAROYA",
		principalRoleDefault: "Owner / Trustee",
		contactAddress: "2015 SHASTA ST, REDDING, CA 96001-0421",
		yearsCREExperienceRange: "Highly Experienced",
		geographicMarketsExperience: ["Northern California (Redding, Yuba City)"],
		trackRecord:
			"The sponsor acquired this large 84-unit asset in 2021 for $8.51M. Within 12 months, they executed a modernization strategy, systematically replacing roofs and rooftop HVAC systems across the majority of the complex.",
		existingLenderRelationships:
			"EXCHANGE BANK, MUFG UNION BK NA, NORTH VALLEY BANK, CITIBANK NA, WASHINGTON MUTUAL FSB, LEWIS TRUST",
		historicalCostBasis: 8_510_000,
		assets: "$9,041,681 (Assessed Value of 540 South St)",
		liabilities: "$6,604,500 (Mortgage on 540 South St)",
		sreoProperties: "1 Property Identified (84 Units, 51,435 SqFt Multifamily)",
		foreclosureHistory: "Clean",
		creditScoreRange: "Excellent (Implied by 77.6% LTV at $6.6M on adjustable terms)",
		bioNarrative:
			"Public record identifies DK PROPERTIES 540 SOUTH LLC and Yaniv Benaroya as owners tied to the 540 South St apartment property in Redding, California.",
		assetClassesExperience: ["Multifamily"],
		scheduleOfRealEstateOwned: "540 SOUTH ST, REDDING, CA 96001",
	},
};

propertyUpsurgeMain(seedConfig).catch((error) => {
	console.error("[seed] 540 South St seed failed:", error);
	process.exitCode = 1;
});
