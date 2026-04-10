import {
	runPropertyUpsurgeSeed,
	type PropertyUpsurgeSeedConfig,
} from "./seed-property-upsurge-common";

const roundToOneDecimal = (value: number): number =>
	Number(value.toFixed(1));

const assessedValue = 15_715_299;
const firstMortgageAmount = 11_756_250;

const seedConfig: PropertyUpsurgeSeedConfig = {
	projectName: "1230 Canby Rd Apartments",
	sourceJsonFile: "data/property-upserge/1230_canby.json",
	projectResume: {
		deal_type: "refinance",
		projectName: "1230 Canby Rd Apartments",
		assetType: "Apartment",
		dealStatus: "Recently Sold / Existing",
		projectPhase: "Stabilized / Operational (Built in 1979)",
		constructionType: "WOOD",
		ownershipType: "Tenants in Common / Corporate Trust",
		lastRenovationDate:
			"2025-11-24 (Derived from latest issued building permit for electrical upgrades)",
		propertyAddressStreet: "1230 CANBY RD",
		propertyAddressCity: "REDDING",
		propertyAddressState: "CA",
		propertyAddressCounty: "Shasta",
		propertyAddressZip: "96003",
		parcelNumber: "107-570-018-000",
		zoningDesignation: "COMMERCIAL",
		taxingDistrictID: "1-108",
		projectDescription:
			"APARTMENT HOUSE (100+ UNITS) / COMMERCIAL APARTMENT",
		businessPlanSummary:
			"Public-record refinance scenario for an existing multifamily property. The seed carries forward the recorded mortgage, tax, and ownership data while leaving the unit-count-driven fields blank where the ATTOM bundle is internally inconsistent.",
		marketOverviewSummary:
			"The 96003 zip code is a highly active market. Average home sale prices grew from $276,701 in 2018 to $395,235 in 2024.",
		adjacentLandUse: "Exceptional proximity to the Enterprise Elementary and Shasta Union High School Districts: Mistletoe Elementary School (Rating: B-): 0.90 miles. Boulder Creek Elementary School (Rating: B+): 0.92 miles. Enterprise High School (Rating: B+): 2.24 miles.",
		totalResidentialUnits: 5,
		totalResidentialNRSF: 6272,
		averageUnitSize: 1254.4,
		grossBuildingArea: 19572,
		numberOfStories: 1,
		buildingType: "CONVENTIONAL HOUSE / APARTMENT",
		constructionClass: "WOOD FRAME / CONCRETE FOUNDATION",
		foundationSystemType: "CONCRETE",
		amenityList: ["Pool"],
		roofTypeAge:
			"COMPOSITION SHINGLE (Recent re-roofs recorded in 2023, 2022, and 2017)",
		parkingType: "Garage, Detached",
		totalSiteAcreage: 5.94,
		buildableAcreage: 258_746,
		realEstateTaxes: 172_912.92,
		purchasePrice: 15_675_000,
		landAcquisition: 1_500_000,
		baseConstruction: 14_215_299,
		sponsorEquity: 3_918_750,
		equityCommittedPercent: 25,
		loanAmountRequested: firstMortgageAmount,
		loanType: "Senior Debt",
		lender: "REDWOOD CAPITAL BANK",
		existingLender: "REDWOOD CAPITAL BANK",
		existingLoanAmount: firstMortgageAmount,
		targetLtvPercent: roundToOneDecimal(
			(firstMortgageAmount / assessedValue) * 100
		),
		ltv: 75.0,
		ltc: 75.0,
		appraisedLandValue: 1_500_000,
		stabilizedValue: 15_715_299,
		appraisedInsurableValue: 15_715_299,
		titleAndRecording: "PLACER TITLE COMPANY",
		capexItems: "Electrical (2024/2025): Massive property-wide electrical upgrade including new meter packs and sub-panels. Roofing (2022-2023): Systematic tear-off and reroofing across the complex. Decks & Balconies (2009-2010): Extensive dry rot repair and deck board replacements.",
		useOfProceeds:
			"Refinance existing multifamily asset based on the recorded first mortgage and public-record parcel data.",
		exitStrategy: "Refinance",
		currentSiteStatus: "Active / Occupied",
		topography: "VIEW - NONE",
		foreclosureHistory: "Clean",
		riskLevel: "Low",
		msaName: "Redding, CA MSA",
		submarketName: "Redding (96003)",
		landAcqClose: "2024-07-19",
		landAcqStatus: "Closed",
		completionStatus: "Complete",
		equityPartner: "YANIV BENAROYA",
		sponsorEntityName: "BHZ TRUST",
		contactInfo: "2015 SHASTA ST, REDDING, CA 96001-0421",
		internalAdvisorNotes:
			"Mapped from data/property-upserge/1230_canby.json. Property is heavily undergoing electrical CapEx program currently.",
	},
	borrowerResume: {
		fullLegalName: "BHZ Trust",
		primaryEntityName: "BHZ TRUST",
		primaryEntityStructure: "COMPANY / CORPORATE TRUST",
		principalLegalName: "BENZION H ZADIK, YANIV BENAROYA",
		principalRoleDefault: "Owner / Trustee",
		contactAddress: "2015 SHASTA ST, REDDING, CA 96001-0421",
		yearsCREExperienceRange: "Highly Experienced / Institutional Scale",
		geographicMarketsExperience: ["Northern California (Redding, Yuba City)"],
		trackRecord:
			"Completed $15.675M acquisition in July 2024. Active pulling permits for electrical upgrades in 2025.",
		existingLenderRelationships:
			"REDWOOD CAPITAL BANK, NORTH VALLEY BANK, CITIBANK NA",
		historicalCostBasis: 15_675_000,
		assets: "1230 Canby Rd, Redding, CA 96003 ($15,715,299 Assessed Value)",
		liabilities: "Existing Mortgage: $11,756,250 (Redwood Capital Bank)",
		sreoProperties: "1230 Canby Rd, Redding, CA 96003 ($15.7M Asset value).",
		foreclosureHistory: "None / Clear",
		netWorth: "Immensely high net worth/liquidity (Closed a $15.6M acquisition with a $4M down payment in July 2024).",
		liquidity: "High (Closed a $15.6M acquisition with 25% down payment in July 2024)",
		bioNarrative:
			"Public record identifies BHZ TRUST and Guarantor Yaniv Benaroya as owners tied to the 1230 Canby Rd apartment property in Redding, California.",
		assetClassesExperience: "Multifamily / Commercial Apartments",
		scheduleOfRealEstateOwned: "1230 CANBY RD, REDDING, CA 96003",
	},
};

runPropertyUpsurgeSeed(seedConfig).catch((error) => {
	console.error("[seed] 1230 Canby Rd seed failed:", error);
	process.exitCode = 1;
});
