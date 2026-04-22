// Run with: npx tsx scripts/seed-330-bird-st-project.ts [--prod] [cleanup]
import {
	propertyUpsurgeMain,
	type PropertyUpsurgeSeedConfig,
} from "./seed-property-upsurge-common";

const roundToOneDecimal = (value: number): number =>
	Number(value.toFixed(1));

const assessedValue = 3_085_649;
const firstMortgageAmount = 1_600_000;
const acquisitionDate = "2020-08-12";
const yubaCityZoningReferenceUrl =
	"https://yubacity.net/doing_business/zoning_ordinances.php";

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
		zoningDesignation: "R-3",
		zoningDescriptionUrl: yubaCityZoningReferenceUrl,
		taxingDistrictID: "1-000",
		projectDescription:
			"330 Bird St is a 28-unit, two-story apartment community in central Yuba City with a pool, courtyard-style common area, and two on-site laundry rooms. Public records point to a 1971 vintage asset on roughly 1.13 acres, with recent permit history showing continued investment in roofing, HVAC, and electrical systems.",
		businessPlanSummary:
			"This reads as a refinance of a stabilized workforce apartment property rather than a major repositioning story. Ownership has already been reinvesting into core building systems, so the practical near-term plan is to keep the property operating, handle routine turns and maintenance, and continue holding the asset in an established Yuba City rental pocket.",
		marketOverviewSummary:
			"330 Bird sits in an established Yuba City multifamily pocket where renter demand is supported by the broader Yuba-Sutter employment base, including healthcare, education, food processing, and commuters tied to Beale Air Force Base. Current online asking rents around $1,450 to $1,495 for two-bedroom units suggest the property competes as practical workforce housing rather than luxury product.",
		adjacentLandUse:
			"The surrounding area is primarily established residential fabric with neighborhood-serving uses mixed in. Nearby school references place King Avenue Elementary about 0.52 miles away, Gray Avenue Middle about 1.12 miles away, and River Valley High about 2.48 miles away; Sutter County Free Library is roughly 0.8 miles away, Sutter Surgical Hospital North Valley is about 1.0 mile away, and Yuba City City Hall is about 1.2 miles away.",
		siteAccess:
			"Bird Street feeds into Yuba City's local street grid and sits about a mile east of CA-99, giving the property straightforward north-south regional access while still functioning as an in-town apartment location.",
		proximityShopping:
			"Residents are a short drive from the Downtown/Plumas Street commercial area and the broader shopping and service base that makes Yuba City the business hub of the Yuba-Sutter region.",
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
		purchasePriceDate: acquisitionDate,
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
			"Loan proceeds are intended to refinance the existing Symetra debt on the apartment community and preserve flexibility for ongoing maintenance, unit turns, and normal operating reserves.",
		exitStrategy: "Refinance",
		currentSiteStatus: "Developed / Improved",
		foreclosureHistory: "Clean",
		riskLevel: "Low",
		landValueDefinition_Legal:
			"PARCEL MAP NO 37 FORMERLY @: 01-292-026- - 12-03-2003 PARCEL 1 AS SHOWN ON SUBD MAP RECORDED IN BOOK 1 OF SURVEYS, PG 37.",
		msaName: "Yuba City MSA",
		submarketName: "Sutter County",
		landAcqClose: acquisitionDate,
		sponsorEntityName: "PROPERTY UPSURGE 101 LLC",
		sponsorStructure: "LLC",
		internalAdvisorNotes:
			"Mapped from data/property-upserge/330_bird_st.json and supplemented with Yuba City GIS zoning layers plus live property marketing pages. Purchase date uses the recorded 2020-08-12 transaction date. Parcel-level Yuba City GIS spot checks at 051-452-026-000 returned zoning R-3. Available public sources do not expose a reliable current loan maturity, so targetCloseDate is intentionally left unset rather than inferred.",
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
			"Public record identifies PROPERTY UPSURGE 101 LLC and the Benaroya family members as owners tied to the 330 Bird St apartment property in Yuba City, California. Recorded ownership data also points to absentee ownership with a shared Redding mailing address and a current first mortgage with Symetra Life Insurance Co.",
		assetClassesExperience: ["Multi-Family / Apartments"],
		scheduleOfRealEstateOwned: "330 BIRD ST, YUBA CITY, CA 95991",
	},
};

propertyUpsurgeMain(seedConfig).catch((error) => {
	console.error("[seed] 330 Bird St seed failed:", error);
	process.exitCode = 1;
});
