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
		dealStatus: "Existing / Hold",
		projectPhase: "Stabilized / Existing (Built in 1971)",
		constructionType: "WOOD (Wood Frame)",
		ownershipType: "Company (Corporate Indicator: Y)",
		lastRenovationDate:
			"2025 (Based on latest HVAC building permits; major TPO reroofing completed in 2021)",
		propertyAddressStreet: "330 BIRD ST",
		propertyAddressCity: "YUBA CITY",
		propertyAddressState: "CA",
		propertyAddressCounty: "Sutter",
		propertyAddressZip: "95991",
		parcelNumber: "051-452-026-000",
		zoningDesignation: "R3 (Residential)",
		taxingDistrictID: "1-000",
		projectDescription:
			"22,008 sq ft, 2-story residential apartment complex built in 1971 on 1.13 acres, containing approximately 28 units (48 beds) with a pool.",
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
		assetType: "Apartment / Multifamily",
		constructionClass: "WOOD",
		amenityList: ["Swimming Pool"],
		hvacSystem:
			"Package air conditioning unit on roof & HVAC wall furnaces (Multiple recent change-outs from 2017 to 2025)",
		roofTypeAge:
			"TPO Roof (Installed August 2021, replaced tar/gravel foam)",
		topography: "VIEW - NONE",
		providerWaterSewer: "MUNICIPAL Sewer / COMMERCIAL Water",
		totalSiteAcreage: 1.13,
		buildableAcreage: 1.13,
		utilityAvailability: "Sewer: MUNICIPAL, Water: COMMERCIAL, Heating: YES",
		realEstateTaxes: 35_053.32,
		purchasePrice: 2_850_000,
		capexBudget: 150_890,
		loanAmountRequested: firstMortgageAmount,
		loanType: "COM (Commercial)",
		lender: "SYMETRA LIFE INSURANCE CO",
		existingLender:
			"SYMETRA LIFE INSURANCE CO (First Concurrent Mortgage: $1,600,000 from 2020)",
		existingLoanAmount: firstMortgageAmount,
		targetLtvPercent: roundToOneDecimal(
			(firstMortgageAmount / assessedValue) * 100
		),
		ltv: roundToOneDecimal((firstMortgageAmount / assessedValue) * 100),
		stabilizedValue: assessedValue,
		appraisedLandValue: 243_543,
		appraisedInsurableValue: 2_842_106,
		titleAndRecording: "FIDELITY NATL TTL CO OF CA",
		capexItems:
			"HVAC change-outs (multiple units), TPO Reroofing, Main Breaker electrical change. (Detailed permit log shows $150k+ in systematic improvements since 2017).",
		useOfProceeds:
			"Refinance existing multifamily asset based on the recorded first mortgage and public-record parcel data.",
		exitStrategy: "Refinance",
		currentSiteStatus: "Developed / Improved",
		foreclosureHistory: "Clean",
		riskLevel: "Low",
		landValueDefinition_Legal:
			"PARCEL MAP NO 37 FORMERLY @: 01-292-026- - 12-03-2003 PARCEL 1 AS SHOWN ON SUBD MAP RECORDED IN BOOK 1 OF SURVEYS, PG 37.",
		msaName: "Yuba City MSA",
		submarketName: "Sutter County",
		sponsorEntityName: "PROPERTY UPSURGE 101 LLC",
		sponsorStructure: "LLC",
		contactInfo: "2015 SHASTA ST, REDDING, CA 96001-0421",
		internalAdvisorNotes:
			"Mapped from data/property-upserge/330_bird_st.json. Added 28 implicitly derived units.",
	},
	borrowerResume: {
		fullLegalName: "PROPERTY UPSURGE 101 LLC",
		primaryEntityName: "PROPERTY UPSURGE 101 LLC",
		primaryEntityStructure: "LLC / Company",
		principalLegalName: "ELIEZER BENAROYA, SHOSHANA BENAROYA, YANIV BENAROYA",
		principalRoleDefault: "Co-Owners / Managing Members",
		contactAddress: "2015 SHASTA ST, REDDING, CA 96001-0421",
		yearsCREExperienceRange: "10+ Years",
		geographicMarketsExperience: ["Northern California (Redding, Yuba City)"],
		trackRecord:
			"Successful acquisition and ongoing operation/renovation of 330 Bird St Apartments, Yuba City CA. Sponsor executed a highly successful value-add strategy on this site: acquired for $1.42M in 2015, used construction/bridge debt from Rubicon and Banner Bank to stabilize, and doubled the valuation to $2.85M upon transfer to current LLC in 2020.",
		existingLenderRelationships:
			"SYMETRA LIFE INSURANCE CO (Issued $1.6M Commercial Loan in Aug 2020), BANNER BANK, RUBICON MORTGAGE FUND LLC",
		historicalCostBasis: 2_850_000,
		totalAssets: 3_085_649,
		totalLiabilities: 1_600_000,
		assets: "330 BIRD ST, YUBA CITY, CA 95991",
		liabilities: "$1.6M First Concurrent Mortgage",
		sreoProperties:
			"330 BIRD ST, YUBA CITY, CA 95991 (28-Unit / 48-Bed Apartment Complex)",
		foreclosureHistory: "None detected on this asset.",
		bioNarrative:
			"Public record identifies PROPERTY UPSURGE 101 LLC and the Benaroya family members as owners tied to the 330 Bird St apartment property in Yuba City, California. ATTOM shows absentee ownership with a shared Redding mailing address and a current first mortgage with Symetra Life Insurance Co.",
		assetClassesExperience: ["Multi-Family / Apartments"],
		scheduleOfRealEstateOwned: "330 BIRD ST, YUBA CITY, CA 95991",
	},
};

runPropertyUpsurgeSeed(seedConfig).catch((error) => {
	console.error("[seed] 330 Bird St seed failed:", error);
	process.exitCode = 1;
});
