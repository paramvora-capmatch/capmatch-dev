import {
	runPropertyUpsurgeSeed,
	type PropertyUpsurgeSeedConfig,
} from "./seed-property-upsurge-common";

const roundToOneDecimal = (value: number): number =>
	Number(value.toFixed(1));

const assessedValue = 15_715_299;
const firstMortgageAmount = 11_756_250;
const marketedUnitCount = 131;
const marketedBuildingArea = 104_939;
const acquisitionDate = "2024-07-16";
const reddingZoningReferenceUrl =
	"https://www.municode.com/library/ca/redding/codes/code_of_ordinances?nodeId=TIT18ZO_DIVIIIBADIRE_CH18.33CODINCNECOSCSHCERCRECOGCGECOHCHECO";

const seedConfig: PropertyUpsurgeSeedConfig = {
	projectName: "1230 Canby Rd Apartments",
	sourceJsonFile: "data/property-upserge/1230_canby.json",
	projectResume: {
		deal_type: "refinance",
		projectName: "1230 Canby Rd Apartments",
		assetType: "Apartment / Multifamily",
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
		zoningDesignation: "RC (Regional Commercial)",
		zoningDescriptionUrl: reddingZoningReferenceUrl,
		taxingDistrictID: "1-108",
		projectDescription:
			"1230 Canby Rd is an existing 131-unit, garden-style apartment community in northeast Redding totaling about 104,939 square feet across a large 5.94-acre site. Public records, permit history, and brokerage marketing all point to an operating asset that has already seen meaningful roof, paving, landscaping, and electrical work, with ownership continuing to improve the property after the 2024 acquisition.",
		businessPlanSummary:
			"This reads as a post-acquisition refinance and hold of a large multifamily property rather than a ground-up or heavy transitional execution. The practical plan is to continue the current improvement program, finish remaining deferred-capital and unit work, and stabilize cash flow around an already operating apartment community.",
		marketOverviewSummary:
			"The Canby/Hilltop pocket is one of Redding's stronger apartment locations because it sits near the city's main retail corridor, regional medical employment, and quick I-5/CA-44 access. Current online rents around $1,295 to $1,495 for one- and two-bedroom units reinforce the asset's position as practical workforce rental housing rather than a for-sale residential story.",
		adjacentLandUse:
			"The site sits within an established northeast Redding residential-commercial area. ATTOM school data places Mistletoe Elementary about 0.90 miles away, Boulder Creek Elementary about 0.92 miles away, and Enterprise High about 2.24 miles away; Hilltop Drive is roughly 0.4 miles away, Churn Creek Road about 0.6 miles away, the Redding Library about 2.0 miles away, and Mercy Medical Center roughly 2.5 miles away.",
		siteAccess:
			"Canby Road gives residents quick access to Hilltop Drive and Churn Creek Road, with I-5 about 0.9 miles away and CA-44 about 1.3 miles away for broader regional movement across Redding and beyond.",
		proximityShopping:
			"The property is positioned just east of the Hilltop retail corridor, one of Redding's main concentrations of shopping, dining, and day-to-day services.",
		totalResidentialUnits: marketedUnitCount,
		totalResidentialNRSF: marketedBuildingArea,
		averageUnitSize: roundToOneDecimal(
			marketedBuildingArea / marketedUnitCount
		),
		grossBuildingArea: marketedBuildingArea,
		numberOfStories: 2,
		buildingType: "APARTMENT HOUSE (100+ UNITS)",
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
		purchasePriceDate: acquisitionDate,
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
			"Loan proceeds are intended to refinance the current Redwood Capital Bank debt while ownership continues the electrical and deferred-capital work already underway across the apartment community.",
		exitStrategy: "Refinance",
		currentSiteStatus: "Active / Occupied",
		topography: "VIEW - NONE",
		foreclosureHistory: "Clean",
		riskLevel: "Low",
		msaName: "Redding, CA MSA",
		submarketName: "Redding (96003)",
		landAcqClose: acquisitionDate,
		landAcqStatus: "Closed",
		completionStatus: "Complete",
		equityPartner: "YANIV BENAROYA",
		sponsorEntityName: "BHZ TRUST",
		internalAdvisorNotes:
			"Mapped from data/property-upserge/1230_canby.json and supplemented with City of Redding GIS zoning layers plus live property marketing pages. Purchase date uses ATTOM's recorded 2024-07-16 saleTransDate. Parcel-level City of Redding GIS spot checks at 107-570-018-000 returned RC (Regional Commercial) and supplied the municipal code link. ATTOM's 5-unit / 6,272 SF / 19,572 gross SF record appears to reflect a partial improvement card rather than the full complex, so the seed uses the marketed 131-unit, 104,939 SF, 2-story profile from live property and brokerage pages. TargetCloseDate and other maturity-based fields remain intentionally unset where no reliable due date surfaced.",
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
