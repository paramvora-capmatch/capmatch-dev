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
		dealStatus: "Recently Acquired / Operating",
		projectPhase: "Existing / Stabilized Asset",
		constructionType: "Wood Frame",
		ownershipType: "Tenants in Common / Trust",
		lastRenovationDate: "2024 / 2025",
		propertyAddressStreet: "1230 CANBY RD",
		propertyAddressCity: "REDDING",
		propertyAddressState: "CA",
		propertyAddressCounty: "Shasta",
		propertyAddressZip: "96003",
		parcelNumber: "107-570-018-000",
		zoningDesignation: "COMMERCIAL",
		taxingDistrictID: "1-108",
		projectDescription:
			"Large multifamily apartment complex built in 1979 on a sprawling 5.94-acre lot. Features wood-frame construction on a concrete foundation, a swimming pool/spa, and detached garages.",
		businessPlanSummary:
			"Public-record refinance scenario for an existing multifamily property. The seed carries forward the recorded mortgage, tax, and ownership data while leaving the unit-count-driven fields blank where the ATTOM bundle is internally inconsistent.",
		marketOverviewSummary:
			"The 96003 zip code is a highly active market. Average home sale prices grew from $276,701 in 2018 to $395,235 in 2024.",
		adjacentLandUse: "Exceptional proximity to the Enterprise Elementary and Shasta Union High School Districts: Mistletoe Elementary School (Rating: B-): 0.90 miles. Boulder Creek Elementary School (Rating: B+): 0.92 miles. Enterprise High School (Rating: B+): 2.24 miles.",
		totalResidentialUnits: 100,
		totalResidentialNRSF: 19_572,
		grossBuildingArea: 19_572,
		numberOfStories: 1,
		buildingType: "1-story apartment complex",
		constructionClass: "Wood Frame",
		foundationSystemType: "CONCRETE",
		amenityList: ["Swimming Pool", "Spa"],
		roofTypeAge: "Composition / Mixed",
		parkingType: "Garage, Detached",
		totalSiteAcreage: 5.94,
		buildableAcreage: 258_746,
		realEstateTaxes: 172_912.92,
		purchasePrice: 15_675_000,
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
		msaName: "Redding",
		submarketName: "Redding / Shasta County",
		sponsorEntityName: "BHZ TRUST",
		contactInfo:
			"Public-record mailing address: 2015 SHASTA ST, REDDING, CA 96001-0421",
		internalAdvisorNotes:
			"Mapped from data/property-upserge/1230_canby.json. Property is heavily undergoing electrical CapEx program currently.",
	},
	borrowerResume: {
		fullLegalName: "BENZION H ZADIK, BHZ TRUST, YANIV BENAROYA",
		primaryEntityName: "BHZ TRUST",
		primaryEntityStructure: "Trust / Individual / Corporate Partners",
		principalLegalName: "Yaniv Benaroya, Benzion H Zadik",
		contactAddress: "2015 SHASTA ST, REDDING, CA 96001-0421",
		yearsCREExperienceRange: "Highly Experienced / Institutional Scale",
		geographicMarketsExperience: ["Northern California (Redding, Yuba City)"],
		trackRecord: "This sponsor's portfolio is aggressively expanding. Total identified transaction volume for Yaniv Benaroya/Property Upsurge is well over $27,000,000 in the last few years alone (e.g., Yuba City $2.85M, 540 South St $8.5M, 1230 Canby Rd $15.6M).",
		existingLenderRelationships: "REDWOOD CAPITAL BANK, EXCHANGE BANCORP OF MISSOURI INC., SYMETRA LIFE INSURANCE CO, BANNER BANK, MUFG UNION BANK, CITIBANK NA",
		historicalCostBasis: 15_675_000,
		sreoProperties: "1230 Canby Rd, Redding, CA 96003 ($15.7M Asset value).",
		foreclosureHistory: "Clean",
		netWorth: "Immensely high net worth/liquidity (Closed a $15.6M acquisition with a $4M down payment in July 2024).",
		liquidity: "High (Closed a $15.6M acquisition with 25% down payment in July 2024)",
		bioNarrative:
			"Public record identifies BHZ TRUST and Guarantor Yaniv Benaroya as owners tied to the 1230 Canby Rd apartment property in Redding, California.",
		assetClassesExperience: ["Multifamily"],
		scheduleOfRealEstateOwned:
			"1230 Canby Rd, Redding, CA 96003 | Apartment property | Assessed value $15,715,299 | First mortgage $11,756,250 with Redwood Capital Bank. Brand new active acquisition in portfolio.",
	},
};

runPropertyUpsurgeSeed(seedConfig).catch((error) => {
	console.error("[seed] 1230 Canby Rd seed failed:", error);
	process.exitCode = 1;
});
