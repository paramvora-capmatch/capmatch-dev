import {
	runPropertyUpsurgeSeed,
	type PropertyUpsurgeSeedConfig,
} from "./seed-property-upsurge-common";

const roundToOneDecimal = (value: number): number =>
	Number(value.toFixed(1));

const assessedValue = 9_041_681;
const firstMortgageAmount = 6_604_500;
const grossArea = 51_435;
const unitCount = 84;

const seedConfig: PropertyUpsurgeSeedConfig = {
	projectName: "540 South St Apartments",
	sourceJsonFile: "data/property-upserge/540_south_st.json",
	projectResume: {
		deal_type: "refinance",
		projectName: "540 South St Apartments",
		assetType: "Multifamily",
		dealStatus: "Underwriting",
		projectPhase: "Existing / Stabilized Asset",
		constructionType: "Existing Construction",
		propertyAddressStreet: "540 South St",
		propertyAddressCity: "Redding",
		propertyAddressState: "CA",
		propertyAddressCounty: "Shasta",
		propertyAddressZip: "96001",
		parcelNumber: "102-090-028-000",
		zoningDesignation: "COMMERCIAL",
		taxingDistrictID: "1-000",
		projectDescription:
			"Existing multifamily asset at 540 South St in Redding, California. ATTOM classifies the property as Apartment House (5+ Units), built in 1977, with 84 units across 2 stories on 4.54 acres. The source bundle includes a conflicting 1,350-square-foot building-size line item alongside a 51,435-square-foot gross-size figure.",
		businessPlanSummary:
			"Public-record refinance scenario for an existing 84-unit apartment property. The seed uses ATTOM gross building area instead of the smaller building-size field because the gross-size figure appears to represent the full asset.",
		marketOverviewSummary:
			"The ATTOM bundle provides parcel, tax, ownership, and current mortgage context for a multifamily asset in Redding, California. No rent, occupancy, or opportunity-zone flag was present in the source data.",
		totalResidentialUnits: unitCount,
		totalResidentialNRSF: grossArea,
		averageUnitSize: roundToOneDecimal(grossArea / unitCount),
		grossBuildingArea: grossArea,
		numberOfStories: 2,
		buildingType: "2-story apartment complex",
		totalSiteAcreage: 4.54,
		parkingType: "Garage, Detached",
		realEstateTaxes: 94_948.74,
		purchasePrice: 8_510_000,
		loanAmountRequested: firstMortgageAmount,
		loanType: "Senior Debt",
		lender: "EXCHANGE BANK",
		existingLender: "EXCHANGE BANK",
		interestRateType: "ADJUSTABLE RATE",
		targetLtvPercent: roundToOneDecimal(
			(firstMortgageAmount / assessedValue) * 100
		),
		ltv: roundToOneDecimal((firstMortgageAmount / assessedValue) * 100),
		stabilizedValue: assessedValue,
		useOfProceeds:
			"Refinance existing multifamily asset based on the recorded first mortgage and public-record parcel data.",
		exitStrategy: "Refinance",
		currentSiteStatus: "Existing apartment property",
		landValueDefinition_Legal: "SUBD:KUTRAS RIVERSIDE ADDITION",
		msaName: "Redding",
		submarketName: "Redding / Shasta County",
		sponsorEntityName: "DK PROPERTIES 540 SOUTH LLC",
		contactInfo:
			"Public-record mailing address: 2015 SHASTA ST, REDDING, CA 96001-0421",
		internalAdvisorNotes:
			"Mapped from data/property-upserge/540_south_st.json. ATTOM reports 84 units and 51,435 gross square feet, but also includes a conflicting 1,350 square foot building-size line item. This seed uses grossSize as the more plausible whole-property area. Added tax district, legal land-definition text, and the current first mortgage rate type from subject-property ATTOM detail endpoints.",
	},
	borrowerResume: {
		fullLegalName: "DK PROPERTIES 540 SOUTH LLC",
		primaryEntityName: "DK PROPERTIES 540 SOUTH LLC",
		primaryEntityStructure: "LLC",
		contactAddress: "2015 SHASTA ST, REDDING, CA 96001-0421",
		bioNarrative:
			"Public record identifies DK PROPERTIES 540 SOUTH LLC as an owner tied to the 540 South St apartment property in Redding, California. ATTOM shows absentee ownership with a shared Redding mailing address and a current first mortgage with Exchange Bank.",
		assetClassesExperience: ["Multifamily"],
		geographicMarketsExperience: ["Redding, CA", "Shasta County, CA"],
		existingLenderRelationships: "EXCHANGE BANK",
		scheduleOfRealEstateOwned:
			"540 South St, Redding, CA 96001 | Apartment property | Assessed value $9,041,681 | First mortgage $6,604,500 with Exchange Bank.",
	},
};

runPropertyUpsurgeSeed(seedConfig).catch((error) => {
	console.error("[seed] 540 South St seed failed:", error);
	process.exitCode = 1;
});
