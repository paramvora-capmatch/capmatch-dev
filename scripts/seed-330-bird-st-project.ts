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
		projectName: "330 Bird St Apartments",
		assetType: "Multifamily",
		dealStatus: "Underwriting",
		projectPhase: "Existing / Stabilized Asset",
		constructionType: "Existing Construction",
		propertyAddressStreet: "330 Bird St",
		propertyAddressCity: "Yuba City",
		propertyAddressState: "CA",
		propertyAddressCounty: "Sutter",
		propertyAddressZip: "95991",
		parcelNumber: "051-452-026-000",
		zoningDesignation: "R3",
		projectDescription:
			"Existing multifamily asset at 330 Bird St in Yuba City, California. ATTOM classifies the property as Apartments (Generic), built in 1971, with 22,008 square feet across 2 stories on 1.13 acres. Public record shows 48 beds and 28 baths, but no explicit unit count was provided in the source bundle.",
		businessPlanSummary:
			"Public-record refinance scenario for an existing multifamily property. The seed anchors loan sizing to the recorded first mortgage and keeps ambiguous operational fields blank when the ATTOM bundle does not provide a reliable value.",
		marketOverviewSummary:
			"The ATTOM bundle provides parcel, tax, ownership, zoning, and mortgage context for a multifamily asset in Yuba City, California. No rent roll, occupancy, or opportunity-zone flag was present in the source data.",
		totalResidentialNRSF: 22_008,
		grossBuildingArea: 22_008,
		numberOfStories: 2,
		buildingType: "2-story apartment building",
		constructionClass: "Wood Frame",
		totalSiteAcreage: 1.13,
		realEstateTaxes: 35_053.32,
		purchasePrice: 2_850_000,
		loanAmountRequested: firstMortgageAmount,
		loanType: "Senior Debt",
		lender: "SYMETRA LIFE INSURANCE CO",
		existingLender: "SYMETRA LIFE INSURANCE CO",
		targetLtvPercent: roundToOneDecimal(
			(firstMortgageAmount / assessedValue) * 100
		),
		ltv: roundToOneDecimal((firstMortgageAmount / assessedValue) * 100),
		stabilizedValue: assessedValue,
		useOfProceeds:
			"Refinance existing multifamily asset based on the recorded first mortgage and public-record parcel data.",
		exitStrategy: "Refinance",
		currentSiteStatus: "Existing apartment property",
		msaName: "Yuba City",
		submarketName: "Yuba City / Sutter County",
		sponsorEntityName: "PROPERTY UPSURGE 101 LLC",
		contactInfo:
			"Public-record mailing address: 2015 SHASTA ST, REDDING, CA 96001-0421",
		internalAdvisorNotes:
			"Mapped from data/property-upserge/330_bird_st.json. ATTOM exposes 48 beds and 28 baths but no explicit unit count, so totalResidentialUnits and averageUnitSize were left blank. Loan amount requested is anchored to the recorded first mortgage amount rather than a new sponsor ask.",
		utilities: "Municipal sewer; heating indicator present in ATTOM basic profile.",
	},
	borrowerResume: {
		fullLegalName: "PROPERTY UPSURGE 101 LLC",
		primaryEntityName: "PROPERTY UPSURGE 101 LLC",
		primaryEntityStructure: "LLC",
		contactAddress: "2015 SHASTA ST, REDDING, CA 96001-0421",
		bioNarrative:
			"Public record identifies PROPERTY UPSURGE 101 LLC as an owner tied to the 330 Bird St apartment property in Yuba City, California. ATTOM shows absentee ownership with a shared Redding mailing address and a current first mortgage with Symetra Life Insurance Co.",
		assetClassesExperience: ["Multifamily"],
		geographicMarketsExperience: ["Yuba City, CA", "Sutter County, CA"],
		existingLenderRelationships: "SYMETRA LIFE INSURANCE CO",
		scheduleOfRealEstateOwned:
			"330 Bird St, Yuba City, CA 95991 | Apartment property | Assessed value $3,085,649 | First mortgage $1,600,000 with Symetra Life Insurance Co.",
	},
};

runPropertyUpsurgeSeed(seedConfig).catch((error) => {
	console.error("[seed] 330 Bird St seed failed:", error);
	process.exitCode = 1;
});
