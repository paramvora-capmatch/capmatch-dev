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
		assetType: "Multifamily / Apartment",
		dealStatus: "Operating / Stabilized",
		projectPhase: "Existing / Stabilized Asset",
		constructionType: "Existing Construction",
		ownershipType: "LLC / Trust",
		lastRenovationDate: "2022 - 2023",
		propertyAddressStreet: "540 SOUTH ST",
		propertyAddressCity: "REDDING",
		propertyAddressState: "CA",
		propertyAddressCounty: "Shasta County",
		propertyAddressZip: "96001",
		parcelNumber: "102-090-028-000",
		zoningDesignation: "COMMERCIAL",
		taxingDistrictID: "1-000",
		projectDescription:
			"84-unit multifamily apartment complex built in 1977, totaling 51,435 Gross SqFt on 4.54 acres in Redding, CA. Features detached garages and rooftop package HVAC units.",
		businessPlanSummary:
			"Public-record refinance scenario for an existing 84-unit apartment property. The seed uses ATTOM gross building area instead of the smaller building-size field because the gross-size figure appears to represent the full asset.",
		marketOverviewSummary:
			"The 96001 zip code has seen steady appreciation. Average residential sale prices grew from $284,441 in 2018 to $401,212 in 2025 (Median: $372,000), supported by ~525 average annual transactions.",
		adjacentLandUse: "Exceptional proximity to the Redding Elementary and Shasta Union High School Districts: Sequoia Middle School (Rating: B-): 0.31 miles. Cypress Elementary School (Rating: D): 0.37 miles. Shasta High School (Rating: A): 1.85 miles.",
		totalResidentialUnits: unitCount,
		totalResidentialNRSF: grossArea,
		averageUnitSize: roundToOneDecimal(grossArea / unitCount),
		grossBuildingArea: grossArea,
		numberOfStories: 2,
		buildingType: "APARTMENT HOUSE (5+ UNITS)",
		totalSiteAcreage: 4.54,
		buildableAcreage: 197_762,
		parkingType: "Garage, Detached",
		amenityList: ["No Pool"],
		hvacSystem: "Rooftop Package Heat Pumps / Electric Units",
		roofTypeAge: "New / ~3-4 Years",
		realEstateTaxes: 94_948.74,
		purchasePrice: 8_510_000,
		loanAmountRequested: firstMortgageAmount,
		loanType: "Senior Debt",
		requestedTerm: 5,
		lender: "EXCHANGE BANCORP OF MISSOURI INC.",
		existingLender: "EXCHANGE BANCORP OF MISSOURI INC.",
		existingLoanAmount: firstMortgageAmount,
		interestRate: 2.90,
		interestRateType: "Adjustable Rate (ADJ)",
		targetLtvPercent: 77.6,
		ltv: 77.6,
		ltc: 77.6,
		appraisedLandValue: 1_061_208,
		stabilizedValue: 9_041_681,
		appraisedInsurableValue: 9_041_681,
		capexItems: "Roofing: Full tear-off and reroofing across almost all buildings (Estimated >$46.5k). HVAC: Complete removal and replacement of rooftop package units across 9 buildings throughout 2022-2023. Electrical: Removed/replaced 400 amp main panel (Feb 2022).",
		useOfProceeds:
			"Refinance existing multifamily asset based on the recorded first mortgage and public-record parcel data.",
		exitStrategy: "Refinance",
		currentSiteStatus: "Active / Occupied",
		topography: "VIEW - NONE",
		foreclosureHistory: "Clean",
		riskLevel: "Low",
		landValueDefinition_Legal: "SUBD: KUTRAS RIVERSIDE ADDITION",
		msaName: "Redding",
		submarketName: "Redding / Shasta County",
		sponsorEntityName: "DK PROPERTIES 540 SOUTH LLC",
		sponsorStructure: "Limited Liability Company",
		contactInfo:
			"Public-record mailing address: 2015 SHASTA ST, REDDING, CA 96001-0421",
		internalAdvisorNotes:
			"Mapped from data/property-upserge/540_south_st.json and supplemented with data/property-upserge/540-capitalize.txt. Complete modernization executed in 2022.",
	},
	borrowerResume: {
		fullLegalName: "YANIV BENAROYA LIVING TRUST, DK PROPERTIES 540 SOUTH LLC, THE BENAROYA TRUST",
		primaryEntityName: "DK PROPERTIES 540 SOUTH LLC",
		primaryEntityStructure: "LLC / Living Trust",
		principalLegalName: "Yaniv Benaroya",
		contactAddress: "2015 SHASTA ST, REDDING, CA 96001-0421",
		yearsCREExperienceRange: "Highly Experienced",
		geographicMarketsExperience: ["Northern California (Redding, Yuba City)"],
		trackRecord: "The sponsor acquired a large, older (1977) 84-unit asset in 2021. Within 12 months of acquisition, they proved their operational capability by systematically replacing the roofs and rooftop HVAC systems across the majority of the complex to modernize the asset.",
		existingLenderRelationships: "EXCHANGE BANCORP OF MISSOURI INC., SYMETRA LIFE INSURANCE CO, BANNER BANK, RUBICON",
		historicalCostBasis: 8_510_000,
		sreoProperties: "540 South St, Redding, CA 96001",
		foreclosureHistory: "Clean",
		creditScoreRange: "Excellent (Implied by 77.6% LTV at $6.6M on adjustable terms)",
		bioNarrative:
			"Public record identifies DK PROPERTIES 540 SOUTH LLC and Yaniv Benaroya as owners tied to the 540 South St apartment property in Redding, California.",
		assetClassesExperience: ["Multifamily"],
		scheduleOfRealEstateOwned:
			"540 South St, Redding, CA 96001 | Apartment property | Assessed value $9,041,681 | Purchase price $8_510_000 | First mortgage $6,604,500 with Exchange Bank | 5-year adjustable loan originated 2021-08-17 with maturing date 2026-08-17.",
	},
};

runPropertyUpsurgeSeed(seedConfig).catch((error) => {
	console.error("[seed] 540 South St seed failed:", error);
	process.exitCode = 1;
});
