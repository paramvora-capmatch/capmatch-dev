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
		assetType: "Multifamily",
		dealStatus: "Underwriting",
		projectPhase: "Existing / Stabilized Asset",
		constructionType: "Existing Construction",
		propertyAddressStreet: "1230 Canby Rd",
		propertyAddressCity: "Redding",
		propertyAddressState: "CA",
		propertyAddressCounty: "Shasta",
		propertyAddressZip: "96003",
		parcelNumber: "107-570-018-000",
		zoningDesignation: "COMMERCIAL",
		taxingDistrictID: "1-108",
		projectDescription:
			"Existing multifamily asset at 1230 Canby Rd in Redding, California. ATTOM classifies the property as Apartment House (100+ Units), built in 1979, with 19,572 gross square feet across 1 story on 5.94 acres. The source bundle contains a material unit-count conflict: the property-type label implies 100+ units while the building summary reports only 5 units.",
		businessPlanSummary:
			"Public-record refinance scenario for an existing multifamily property. The seed carries forward the recorded mortgage, tax, and ownership data while leaving the unit-count-driven fields blank where the ATTOM bundle is internally inconsistent.",
		marketOverviewSummary:
			"The ATTOM bundle provides parcel, tax, ownership, and current mortgage context for a multifamily asset in Redding, California. No rent, occupancy, or opportunity-zone flag was present in the source data.",
		totalResidentialNRSF: 19_572,
		grossBuildingArea: 19_572,
		numberOfStories: 1,
		buildingType: "1-story apartment complex",
		constructionClass: "Wood Frame",
		foundationSystemType: "CONCRETE",
		amenityList: ["Pool"],
		totalSiteAcreage: 5.94,
		realEstateTaxes: 172_912.92,
		purchasePrice: 15_675_000,
		loanAmountRequested: firstMortgageAmount,
		loanType: "Senior Debt",
		lender: "REDWOOD CAPITAL BANK",
		existingLender: "REDWOOD CAPITAL BANK",
		targetLtvPercent: roundToOneDecimal(
			(firstMortgageAmount / assessedValue) * 100
		),
		ltv: roundToOneDecimal((firstMortgageAmount / assessedValue) * 100),
		stabilizedValue: assessedValue,
		useOfProceeds:
			"Refinance existing multifamily asset based on the recorded first mortgage and public-record parcel data.",
		exitStrategy: "Refinance",
		currentSiteStatus: "Existing apartment property",
		msaName: "Redding",
		submarketName: "Redding / Shasta County",
		sponsorEntityName: "BHZ TRUST",
		contactInfo:
			"Public-record mailing address: 2015 SHASTA ST, REDDING, CA 96001-0421",
		internalAdvisorNotes:
			"Mapped from data/property-upserge/1230_canby.json. ATTOM labels the property as Apartment House (100+ Units) but the building summary reports unitsCount = 5. totalResidentialUnits and averageUnitSize were left blank until the unit count is independently verified. Added tax district, foundation system, and the pool amenity from subject-property ATTOM detail endpoints.",
	},
	borrowerResume: {
		fullLegalName: "BHZ TRUST",
		primaryEntityName: "BHZ TRUST",
		primaryEntityStructure: "Trust",
		contactAddress: "2015 SHASTA ST, REDDING, CA 96001-0421",
		bioNarrative:
			"Public record identifies BHZ TRUST as an owner tied to the 1230 Canby Rd apartment property in Redding, California. ATTOM shows absentee ownership with a shared Redding mailing address and a current first mortgage with Redwood Capital Bank.",
		assetClassesExperience: ["Multifamily"],
		geographicMarketsExperience: ["Redding, CA", "Shasta County, CA"],
		existingLenderRelationships: "REDWOOD CAPITAL BANK",
		scheduleOfRealEstateOwned:
			"1230 Canby Rd, Redding, CA 96003 | Apartment property | Assessed value $15,715,299 | First mortgage $11,756,250 with Redwood Capital Bank.",
	},
};

runPropertyUpsurgeSeed(seedConfig).catch((error) => {
	console.error("[seed] 1230 Canby Rd seed failed:", error);
	process.exitCode = 1;
});
