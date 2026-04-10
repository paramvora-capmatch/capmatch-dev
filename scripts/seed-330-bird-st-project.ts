import {
	runPropertyUpsurgeSeed,
	type PropertyUpsurgeSeedConfig,
} from "./seed-property-upsurge-common";

const roundToOneDecimal = (value: number): number =>
	Number(value.toFixed(1));

const assessedValue = 3_085_649;
const firstMortgageAmount = 1_600_000;

const seedConfig: PropertyUpsurgeSeedConfig = {
	projectName: "330 Bird St Apartments",
	sourceJsonFile: "data/property-upserge/330_bird_st.json",
	projectResume: {
		deal_type: "refinance",
		projectName: "Palm Garden Apartments",
		assetType: "Apartment",
		dealStatus: "Stabilized / Operating",
		projectPhase: "Existing / Stabilized Asset",
		constructionType: "Wood Frame",
		ownershipType: "Tenants in Common / Corporate Trust",
		lastRenovationDate: "2021 / 2025",
		propertyAddressStreet: "330 BIRD ST",
		propertyAddressCity: "YUBA CITY",
		propertyAddressState: "CA",
		propertyAddressCounty: "Sutter",
		propertyAddressZip: "95991",
		parcelNumber: "051-452-026-000",
		zoningDesignation: "Residential (R3)",
		taxingDistrictID: "1-000",
		projectDescription:
			"22,008 SqFt, 2-story Wood-frame Apartment complex built in 1971. Features 48 bedrooms, 28 full bathrooms, and a swimming pool, situated on a 1.13-acre (49,222 sq ft) lot.",
		businessPlanSummary:
			"Public-record refinance scenario for an existing multifamily property. The seed anchors loan sizing to the recorded first mortgage and keeps ambiguous operational fields blank when the ATTOM bundle does not provide a reliable value.",
		marketOverviewSummary:
			"Strong historical appreciation in the 95991 zip code. In 2018, average home values were $272,657. By 2025, values appreciated to $393,223 (Median $385,000), supported by 288 recent sales transactions.",
		adjacentLandUse: "Robust educational corridor (Yuba City Unified School District): King Avenue Elementary (C-): 0.52 miles. Gray Avenue Middle (D+): 1.12 miles. River Valley High (C+): 2.48 miles.",
		totalResidentialUnits: 28,
		averageUnitSize: 786,
		totalResidentialNRSF: 22_008,
		grossBuildingArea: 22_008,
		numberOfStories: 2,
		buildingType: "APARTMENTS (GENERIC)",
		constructionClass: "WOOD",
		amenityList: ["Swimming Pool"],
		hvacSystem: "Central / Package Roof / Wall Units",
		roofTypeAge: "TPO / ~5 Years",
		topography: "VIEW - NONE",
		providerWaterSewer: "MUNICIPAL Sewer / COMMERCIAL Water",
		totalSiteAcreage: 1.13,
		buildableAcreage: 49_222,
		utilityAvailability:
			"Water service: COMMERCIAL; sewer service: MUNICIPAL; heating indicator: YES.",
		realEstateTaxes: 35_053.32,
		purchasePrice: 2_850_000,
		loanAmountRequested: firstMortgageAmount,
		loanType: "COM (Commercial)",
		lender: "SYMETRA LIFE INSURANCE CO",
		existingLender: "SYMETRA LIFE INSURANCE CO",
		existingLoanAmount: firstMortgageAmount,
		targetLtvPercent: roundToOneDecimal(
			(firstMortgageAmount / assessedValue) * 100
		),
		ltv: roundToOneDecimal((firstMortgageAmount / assessedValue) * 100),
		stabilizedValue: assessedValue,
		appraisedLandValue: 243_543,
		appraisedInsurableValue: 3_085_649,
		titleAndRecording: "FIDELITY NATL TTL CO OF CA",
		capexItems: "Meticulous permit log detailing a historical CapEx budget of roughly $145,590+ since 2017: $55k TPO Reroof (2021), $38.5k TPO Reroof (2020), $40k+ in systematic HVAC / Package unit modifications spanning 2017-2025.",
		useOfProceeds:
			"Refinance existing multifamily asset based on the recorded first mortgage and public-record parcel data.",
		exitStrategy: "Refinance",
		currentSiteStatus: "Occupied / Revenue Generating",
		foreclosureHistory: "Clean",
		riskLevel: "Low",
		landValueDefinition_Legal:
			"PARCEL MAP NO 37 FORMERLY @: 01-292-026- - 12-03-2003 PARCEL 1 AS SHOWN ON SUBD MAP RECORDED IN BOOK 1 OF SURVEYS, PG 37.",
		msaName: "Yuba City",
		submarketName: "Yuba City / Sutter County",
		sponsorEntityName: "PROPERTY UPSURGE 101 LLC",
		sponsorStructure: "Limited Liability Company",
		contactInfo:
			"Public-record mailing address: 2015 SHASTA ST, REDDING, CA 96001-0421",
		internalAdvisorNotes:
			"Mapped from data/property-upserge/330_bird_st.json. Added 28 implicitly derived units.",
	},
	borrowerResume: {
		fullLegalName: "ELIEZER BENAROYA, SHOSHANA BENAROYA, YANIV BENAROYA, PROPERTY UPSURGE 101 LLC",
		primaryEntityName: "PROPERTY UPSURGE 101 LLC",
		primaryEntityStructure: "COMPANY / LLC",
		principalLegalName: "Yaniv Benaroya, Eliezer Benaroya, Shoshana Benaroya",
		contactAddress: "2015 SHASTA ST, REDDING, CA 96001-0421",
		yearsCREExperienceRange: "10+ Years",
		geographicMarketsExperience: ["Northern California (Redding, Yuba City)"],
		trackRecord: "Sponsor executed a highly successful value-add strategy on this site. Acquired for $1.42M in 2015, used construction/bridge debt from Rubicon and Banner Bank to stabilize, and doubled the valuation to $2.85M upon transfer to current LLC in 2020.",
		existingLenderRelationships: "SYMETRA LIFE INSURANCE CO, BANNER BANK, RUBICON MORTGAGE FUND LLC",
		historicalCostBasis: 2_850_000,
		sreoProperties: "330 Bird St, Yuba City, CA 95991 (Current amortized loan balance ~$1.32M)",
		foreclosureHistory: "None detected on this asset.",
		bioNarrative:
			"Public record identifies PROPERTY UPSURGE 101 LLC and the Benaroya family members as owners tied to the 330 Bird St apartment property in Yuba City, California. ATTOM shows absentee ownership with a shared Redding mailing address and a current first mortgage with Symetra Life Insurance Co.",
		assetClassesExperience: ["Multifamily"],
		scheduleOfRealEstateOwned:
			"330 Bird St, Yuba City, CA 95991 | Apartment property | Assessed value $3,085,649 | First mortgage $1,600,000 with Symetra Life Insurance Co.",
	},
};

runPropertyUpsurgeSeed(seedConfig).catch((error) => {
	console.error("[seed] 330 Bird St seed failed:", error);
	process.exitCode = 1;
});
