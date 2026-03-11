// scripts/seed-marshall-project.ts
// Seed script for The Marshall St. Louis: param.vora (owner), Cody (advisor), members, lender, project, resumes, documents.
// Run with: npx tsx scripts/seed-marshall-project.ts [--prod] [cleanup]

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import path, { resolve } from "path";
import { readFileSync, existsSync, readdirSync } from "fs";

type AppRole = "advisor" | "borrower" | "lender";

const args = process.argv.slice(2);
const isProduction = args.includes("--prod") || args.includes("--production");
const isCleanup =
	args.includes("cleanup") ||
	args.includes("--cleanup") ||
	args.includes("-c");

if (isProduction) {
	console.log("🌐 Production mode enabled\n");
	config({ path: resolve(process.cwd(), ".env.production") });
	const prodEnvPath = resolve(process.cwd(), ".env.production");
	if (!existsSync(prodEnvPath)) {
		console.warn("⚠️  WARNING: .env.production file not found!");
	}
	if (!isCleanup) {
		console.log("⚠️  WARNING: This will create real users and data in PRODUCTION!");
		console.log("⚠️  Make sure you have backups before proceeding.\n");
	}
} else {
	config({ path: resolve(process.cwd(), ".env.local") });
	config({ path: resolve(process.cwd(), ".env") });
}

const supabaseUrl =
	process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
	console.error("\n❌ Missing SUPABASE URL. Set NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL.");
	process.exit(1);
}
if (!serviceRoleKey) {
	console.error("\n❌ Missing SUPABASE_SERVICE_ROLE_KEY.");
	process.exit(1);
}

if (isProduction && !isCleanup) {
	if (supabaseUrl.includes("localhost") || supabaseUrl.includes("127.0.0.1")) {
		console.error("\n❌ Production mode but Supabase URL is localhost.");
		process.exit(1);
	}
	if (!supabaseUrl.startsWith("https://")) {
		console.error("\n❌ Production Supabase URL must start with https://");
		process.exit(1);
	}
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
	auth: { autoRefreshToken: false, persistSession: false },
});

// ============================================================================
// CONSTANTS
// ============================================================================

const MARSHALL_PROJECT_NAME = "The Marshall St. Louis";

const ADVISOR_EMAIL = "cody.field@capmatch.com";
const ADVISOR_PASSWORD = "password";
const ADVISOR_NAME = "Cody Field";

const BORROWER_EMAIL = "param.vora@capmatch.com";
const BORROWER_PASSWORD = "password";
const BORROWER_NAME = "Param Vora";

const MEMBER_PASSWORD = "password";

const MEMBER_USERS = [
	{ email: "aryan.jain@capmatch.com", name: "Aryan Jain" },
	{ email: "sarthak.karandikar@capmatch.com", name: "Sarthak Karandikar" },
	{ email: "kabeer.merchant@capmatch.com", name: "Kabeer Merchant" },
	{ email: "vatsal.hariramani@capmatch.com", name: "Vatsal Hariramani" },
];

const LENDER_EMAIL = "lender@capmatch.com";
const LENDER_PASSWORD = "password";
const LENDER_NAME = "Capital Lending Group";

const POSSIBLE_DOC_PATHS = [
	...(process.env.MARSHALL_DOCS_PATH ? [process.env.MARSHALL_DOCS_PATH] : []),
	"D:\\Documents\\cyber\\work\\context\\Marshall\\final-set",
	resolve(process.cwd(), "Deals", "Marshall", "Docs", "final-set"),
	resolve(process.cwd(), "..", "Deals", "Marshall", "Docs", "final-set"),
	"D:\\Career\\Technology\\Job\\CapMatch\\Deals\\Marshall\\Docs\\final-set",
];

// ============================================================================
// BORROWER RESUME (from Borrower Resume Data Extraction)
// ============================================================================

const marshallBorrowerResumeBase: Record<string, unknown> = {
	primaryEntityName: "Aptitude Development",
	primaryEntityStructure: "90/10 – LP/GP",
	contactPhone: "(201) 379-4038",
	contactAddress: "669 River Dr, Elmwood Park, NJ 07407 USA",
	yearsCREExperienceRange: "11+ Years (Founded 2014)",
	yearFounded: "2014",
	activeProjects: "The Marshall St. Louis, The Marshall Birmingham, The Marshall Tempe, The Marshall Lehigh",
	totalDealValueClosedRange: "$1B+ (Pipeline Developments)",
	assetClassesExperience: "Student Housing",
	geographicMarketsExperience: "National (MO, NY, KY, SC, AR, AL, AZ, PA)",
	bioNarrative: "Aptitude Development is a real estate development firm specializing in ground-up student housing projects across the nation.",
	trackRecord: "11 Ground up Developments; 20,000+ Beds in Planning; 3,500 Beds Developed",
	historicalCostBasis: "#BLVD404 ($18m), Marshall Syracuse ($52m), Marshall Louisville ($55m)",
	historicalExitValues: "#BLVD404 ($23.1mm), Marshall Syracuse ($70mm)",
	constructionWorkInProgress: "The Marshall St. Louis (2025), The Marshall Tempe (2026), The Marshall Lehigh (2025)",
	netWorth: "~$500,000,000 (Combined Guarantor NW)",
	netWorthRange: "$500M+",
	equitypartnersList: "600+ Unique Investors (High-net-worth)",
	scheduleOfRealEstateOwned: "The Marshall St. Louis, Birmingham, Tempe, Lehigh, Syracuse, Louisville, etc.",
	websiteUrl: "www.aptitudere.com",
	principalLegalName: "Jared Hutter; Brian Rosen",
	principalRoleDefault: "Co-Founders / Principals",
	principalBio: "Jared Hutter (Head of New Development, Acquisitions & Equity); Brian Rosen (Head of Construction, Asset Management & Debt)",
	principalSpecialties: "Student Housing Development, Acquisitions, Construction",
	principalAchievements: "11 Ground-up developments, 20k+ beds planned",
	principalEducation: "Jared Hutter: Bachelor's Finance/Entrepreneurship (Syracuse), Masters in Real Estate (NYU); Brian Rosen: Bachelor's (Syracuse)",
};

// ============================================================================
// PROJECT RESUME (from Project Resume Data Extraction)
// ============================================================================

const marshallProjectResumeBase: Record<string, unknown> = {
	projectName: "The Marshall St. Louis",
	propertyAddressStreet: "3725 Foundry Way Suite 231 / 3834 Forest Park Ave",
	propertyAddressCity: "St. Louis",
	propertyAddressState: "MO",
	propertyAddressZip: "63108",
	propertyAddressCounty: "St. Louis City",
	dealStatus: "Recapitalized Equity / Refinancing",
	masterPlanName: "City Foundry STL",
	ownershipType: "Fee Simple",
	assetType: "Student Housing",
	constructionType: "7 Stories (Podium/Stick likely)",
	projectPhase: "Construction (Nearing Completion/CofO Received)",
	projectDescription: "7 Stories, 177 Units, 508 Beds, 1.75 Acres",
	parcelNumber: "3918-03-0025-0",
	zoningDesignation: "H",
	constructionClass: "Class A",
	lastRenovationDate: "2025 (New Build)",
	totalResidentialUnits: 177,
	totalResidentialNRSF: 210994,
	averageUnitSize: 1192,
	buildingType: "7-story building over two levels of podium parking",
	grossBuildingArea: 368557,
	numberOfStories: 7,
	residentialUnitMix: "Studio, 1, 2, 3, 4, 5 Bedroom",
	modelUnitCount: "Yes (Completed)",
	residentialParkingNetCount: 188,
	parkingSpaces: 188,
	parkingRatio: 0.37,
	parkingType: "Garage / Podium",
	amenityList: ["Fitness Center", "Sauna", "Study Rooms", "Entertainment Room", "Cafe", "Hot-Tub", "Grilling Stations", "Fire Pits"],
	amenitySF: 15847,
	furnishedUnits: "Yes",
	studioCount: 18,
	oneBedCount: 15,
	twoBedCount: 40,
	threeBedCount: 30,
	luxuryTier: "Class A",
	targetMarket: "Students (Saint Louis University)",
	competitivePosition: "Top of Market",
	unitPlanDescription: "S1, A1, A2, B1, B2, C1, C2, D1, D2, D3, D4, D5, E1",
	unitWasherDryer: "Yes",
	unitHardwoodFloors: "Yes (Manufactured)",
	unitEntryType: "Key-Fob Control",
	hvacSystem: "Air Conditioning",
	totalDevelopmentCost: 76500000,
	totalProjectCost: 84000000,
	capexBudget: 23500,
	capexItems: "Appliances, Washers/Dryers, Blinds, FF&E",
	landAcquisition: 5400000,
	baseConstruction: 56200000,
	loanFees: 883000,
	interestReserve: 1700000,
	ffe: 7500,
	landAcquisitionLabel: "Land",
	baseConstructionLabel: "Hard Cost",
	interestReserveLabel: "Financing/ Interest",
	ffeLabel: "CAP - FF&E",
	loanFeesLabel: "Closing and Financing Costs",
	usesDirect: 13200000,
	totalCapitalization: 84000000,
	sponsorEquity: 30000000,
	gapFinancing: 5000000,
	loanTypeLabel: "New Senior Loan",
	sponsorEquityLabel: "Sponsor Equity",
	gapFinancingLabel: "New Equity",
	sourcesDirect: "50,000,000 (Loan) / 6,350,000 (Value Creation)",
	loanAmountRequested: 54000000,
	loanType: "Senior Debt",
	lender: "Nuveen, Northwestern Mutual, PIMCO (Targeted)",
	requestedTerm: "3-10 years",
	amortizationYears: 30,
	interestRate: 6.10,
	underwritingRate: 6.10,
	interestRateType: "Fixed / Floating (Implied from matrix)",
	interestOnlyPeriodMonths: "Maximum / 24+",
	targetLtvPercent: 64,
	prepaymentTerms: "Maximum flexibility",
	recoursePreference: "Non-recourse with standard carveouts",
	targetCloseDate: "August 2025",
	useOfProceeds: "Refinance of construction loan",
	realEstateTaxes: 772451,
	insurance: 197993,
	utilitiesCosts: 404820,
	repairsAndMaintenance: 39000,
	managementFee: 191177,
	generalAndAdmin: 118000,
	payroll: 447000,
	reserves: 76200,
	capExReserve: 76200,
	marketingLeasing: 86000,
	totalOperatingExpenses: 1914200,
	managementFeePercent: 2.9,
	utilityBillBackMethod: "RUBS (Electricity, Water, Trash)",
	trashRemovalMethod: "Contract",
	exitStrategy: "Sale",
	expectedHoldPeriod: 10.0,
	noiYear1: 4626800,
	stabilizedNoiProjected: 4665000,
	yieldOnCost: 5.43,
	capRate: 5.50,
	stabilizedValue: 84800000,
	ltv: 64,
	debtYield: 8.6,
	dscr: "1.42x (IO), 1.19x (Amort)",
	debtService: 3294540,
	irr: 18.57,
	equityMultiple: 2.25,
	businessPlanSummary: "Refinance construction loan and stabilize property.",
	proFormaStartYear: 2025,
	proFormaRentGrowth: "4% (Year 3 onwards)",
	proFormaExpenseInflation: "3% (Year 3 onwards)",
	proFormaVacancyRate: 3.0,
	proFormaExitCapRate: 5.50,
	finalStabilizedValue: 84800000,
	finalCapRate: 5.50,
	expenseGrowthRateAssumption: "3%",
	rentRollUnits: "508 Beds",
	nonRevenueUnitCount: 3,
	msaName: "St. Louis",
	population1Mi: 16472,
	population3Mi: 143942,
	population5Mi: 307055,
	projGrowth202429: "-3.2% (1 Mile)",
	popGrowth201020: "16.2% (1 Mile)",
	medianIncome1Mi: 46079,
	medianHHIncome: 62686,
	medianIncome5Mi: 62686,
	medianAge1Mi: 28.7,
	medianAge3Mi: 35.8,
	medianAge5Mi: 36.0,
	renterShare: "78.6% (1 Mile)",
	bachelorsShare: "49.5% (1 Mile)",
	renterOccupiedPercent: "78.6% (1 Mile)",
	unemploymentRate: "2.03% (1 Mile)",
	largestEmployer: "BJC HealthCare (implied major employer)",
	majorEmployers: "BJC HealthCare, Centene, Edward Jones",
	submarketName: "St. Louis University / Midtown",
	walkabilityScore: 63,
	infrastructureCatalyst: "City Foundry, Cortex Innovation District",
	broadbandSpeed: "High-Speed Fiber Optic Internet",
	distanceToTransit: "1.2 miles to Grand MetroLink",
	supplyPipeline: "No new dorms since 2017",
	captureRate: 18.5,
	currentInventory: "3,066 Beds (Market Total)",
	northStarComp: "Verve St. Louis",
	substantialComp: "The Standard at St. Louis",
	rentComps: "Verve, The Standard, City Lofts on Laclede, West Pine Lofts",
	avgCapRate: 4.80,
	qualityTier: "Class A",
	demandTrend: "Record Enrollment at SLU (15,334 students)",
	marketStatus: "Undersupplied",
	supplyPressure: "Low",
	rentGrowth: "Significant",
	marketOverviewSummary: "SLU enrollment ~15k, housing shortage, no new supply. Midtown area transforming with $8B+ investment.",
	opportunityZone: "Yes",
	groundbreakingDate: "2023-05-01",
	firstOccupancy: "2025-04-07 (CofO Received)",
	stabilization: "AY 2025/2026",
	completionDate: "Q2 2025",
	groundbreakingStatus: "Completed",
	verticalStartStatus: "Completed",
	firstOccupancyStatus: "Completed",
	completionStatus: "Completed (CofO Received)",
	stabilizationStatus: "In Progress (89% Pre-leased)",
	preLeasedSF: "89.2% (Pre-leased Beds)",
	totalSiteAcreage: 1.75,
	allowableFAR: 1.31,
	currentSiteStatus: "Construction (Nearing Completion)",
	proximityShopping: "City Foundry (Mixed-Use)",
	adjacentLandUse: "Saint Louis University, Cortex Innovation District",
	earthquakeDeductible: 100000,
	generalLiabilityAggregate: 12000000,
	liabilityPerOccurrence: 1000000,
	umbrellaLiabilityLimit: 10000000,
	subLimit_PollutantCleanup: 1000000,
	siteImages: "Renderings & Photos Available",
	architecturalDiagrams: "Floor Plans Available",
	sponsorEntityName: "Aptitude Development",
	sponsorStructure: "90/10 – LP/GP",
	equityPartner: "High-net-worth investors",
	syndicationStatus: "600+ Unique Investors",
	contactInfo: "Justin Glasgow / Greg Marx / Chuck Stanwick (Northmarq)",
	sponsorExperience: "11 Ground-up developments, 3,500 Beds Developed",
	priorDevelopments: "The Marshall St. Louis, Birmingham, Tempe, Lehigh, Syracuse, Louisville",
	netWorth: "~$500M (Combined Guarantor NW)",
};

// ============================================================================
// HELPERS
// ============================================================================

function convertToRichFormat(content: Record<string, unknown>): Record<string, unknown> {
	const rich: Record<string, unknown> = {};
	for (const key in content) {
		if (key.startsWith("_") || key === "completenessPercent") {
			rich[key] = content[key];
			continue;
		}
		const v = content[key];
		if (v && typeof v === "object" && !Array.isArray(v) && "value" in (v as object)) {
			rich[key] = v;
			continue;
		}
		rich[key] = { value: v, source: { type: "user_input" }, warnings: [], other_values: [] };
	}
	return rich;
}

async function onboardUserDirectly(
	email: string,
	password: string,
	fullName: string,
	appRole: AppRole
): Promise<{ user?: { id: string; email: string }; error?: string }> {
	try {
		const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
			email,
			password,
			email_confirm: true,
			user_metadata: { full_name: fullName },
		});

		let userId = "";

		if (authError) {
			if (authError.message.includes("already registered") || authError.message.includes("unique")) {
				const { data: existing } = await supabaseAdmin.from("profiles").select("id").eq("email", email).maybeSingle();
				if (existing) return { user: { id: existing.id, email } };

				// If in auth but not profile, we need to find the auth ID
				const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
				if (listError) return { error: listError.message };
				const authUser = users.users.find(u => u.email === email);
				if (!authUser) return { error: "User exists in auth but could not be found by email" };
				userId = authUser.id;
			} else {
				return { error: authError.message };
			}
		} else {
			userId = authData!.user.id;
		}

		await supabaseAdmin.from("profiles").upsert({
			id: userId,
			full_name: fullName,
			email,
			app_role: appRole,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		}, { onConflict: "id" });

		let orgId: string;
		if (appRole === "borrower") {
			const { data: orgData, error: orgError } = await supabaseAdmin.from("orgs").insert({
				name: `${fullName}'s Organization`,
				entity_type: "borrower",
			}).select().single();
			if (orgError) return { error: orgError.message };
			orgId = orgData.id;
			await supabaseAdmin.from("org_members").insert({ org_id: orgId, user_id: userId, role: "owner" });
			const { error: bucketErr } = await supabaseAdmin.storage.createBucket(orgId, { public: false, fileSizeLimit: 50 * 1024 * 1024 });
			if (bucketErr && !bucketErr.message.includes("already exists")) console.warn("[seed] Bucket:", bucketErr.message);
		} else if (appRole === "lender") {
			const { data: orgData, error: orgError } = await supabaseAdmin.from("orgs").insert({
				name: `${fullName}'s Organization`,
				entity_type: "lender",
			}).select().single();
			if (orgError) return { error: orgError.message };
			orgId = orgData.id;
			await supabaseAdmin.from("org_members").insert({ org_id: orgId, user_id: userId, role: "owner" });
		} else {
			const { data: existingOrg } = await supabaseAdmin.from("orgs").select("id").eq("entity_type", "advisor").limit(1).maybeSingle();
			if (existingOrg) orgId = existingOrg.id;
			else {
				const { data: newOrg, error: orgError } = await supabaseAdmin.from("orgs").insert({ name: "CapMatch Advisors", entity_type: "advisor" }).select().single();
				if (orgError) return { error: orgError.message };
				orgId = newOrg.id;
			}
			await supabaseAdmin.from("org_members").upsert({ org_id: orgId, user_id: userId, role: "owner" }, { onConflict: "org_id,user_id" });
		}
		await supabaseAdmin.from("profiles").update({ active_org_id: orgId }).eq("id", userId);
		return { user: { id: userId, email } };
	} catch (e) {
		return { error: String(e) };
	}
}

async function ensureStorageBucket(orgId: string) {
	const { error } = await supabaseAdmin.storage.createBucket(orgId, { public: false, fileSizeLimit: 50 * 1024 * 1024 });
	if (error && !error.message.includes("already exists")) console.warn("[seed] Bucket:", error.message);
}

async function createAdvisorAccount(): Promise<{ userId: string; orgId: string } | null> {
	const { data: existing } = await supabaseAdmin.from("profiles").select("id, active_org_id").eq("email", ADVISOR_EMAIL).maybeSingle();
	let advisorId: string;
	let advisorOrgId: string;
	if (existing) {
		advisorId = existing.id;
		advisorOrgId = existing.active_org_id!;
		console.log(`[seed] Advisor exists: ${ADVISOR_EMAIL}`);
	} else {
		const result = await onboardUserDirectly(ADVISOR_EMAIL, ADVISOR_PASSWORD, ADVISOR_NAME, "advisor");
		if (result.error || !result.user) {
			console.error("[seed] ❌ Advisor:", result.error);
			return null;
		}
		advisorId = result.user.id;
		const { data: p } = await supabaseAdmin.from("profiles").select("active_org_id").eq("id", advisorId).single();
		advisorOrgId = p!.active_org_id!;
		console.log("[seed] ✅ Created advisor:", ADVISOR_EMAIL);
	}
	return { userId: advisorId, orgId: advisorOrgId };
}

async function getOrCreateDemoBorrowerAccount(): Promise<{ userId: string; orgId: string } | null> {
	console.log("[seed] Getting or creating borrower (param.vora@capmatch.com, owner)...");
	const { data: existing } = await supabaseAdmin.from("profiles").select("id, active_org_id").eq("email", BORROWER_EMAIL).maybeSingle();
	let userId: string;
	let orgId: string | null = null;
	if (existing) {
		userId = existing.id;
		orgId = existing.active_org_id;
		if (!orgId) {
			const { data: m } = await supabaseAdmin.from("org_members").select("org_id").eq("user_id", userId).eq("role", "owner").maybeSingle();
			if (m) orgId = m.org_id;
		}
		console.log(`[seed] Borrower (owner) exists: ${BORROWER_EMAIL}`);
	} else {
		const result = await onboardUserDirectly(BORROWER_EMAIL, BORROWER_PASSWORD, BORROWER_NAME, "borrower");
		if (result.error || !result.user) {
			console.error("[seed] ❌ Borrower:", result.error);
			return null;
		}
		userId = result.user.id;
		const { data: p } = await supabaseAdmin.from("profiles").select("active_org_id").eq("id", userId).single();
		orgId = p?.active_org_id ?? null;
		console.log("[seed] ✅ Created borrower (owner):", BORROWER_EMAIL);
	}
	if (!orgId) {
		console.error("[seed] ❌ Borrower org null");
		return null;
	}
	await ensureStorageBucket(orgId);
	return { userId, orgId };
}

async function createMemberUser(
	email: string,
	password: string,
	fullName: string,
	orgId: string
): Promise<string | null> {
	const { data: existingProfile } = await supabaseAdmin.from("profiles").select("id").eq("email", email).maybeSingle();
	let userId: string;
	if (existingProfile) {
		userId = existingProfile.id;
		console.log(`[seed] Member exists: ${email}`);
	} else {
		const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
			email,
			password,
			email_confirm: true,
			user_metadata: { full_name: fullName },
		});
		if (authError) {
			if (authError.message.includes("already registered") || authError.message.includes("unique")) {
				const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
				if (listError) {
					console.error("[seed] Failed to list users to find existing member:", email, listError);
					return null;
				}
				const authUser = users.users.find(u => u.email === email);
				if (!authUser) {
					console.error("[seed] Member exists in auth but could not be found by email:", email);
					return null;
				}
				userId = authUser.id;
			} else {
				console.error("[seed] Failed to create member:", email, authError);
				return null;
			}
		} else {
			userId = authUser!.user.id;
		}
		const { error: profileError } = await supabaseAdmin.from("profiles").insert({
			id: userId,
			email,
			full_name: fullName,
			app_role: "borrower",
			active_org_id: orgId,
		});
		if (profileError) {
			console.error("[seed] Failed to create member profile:", email, profileError);
			await supabaseAdmin.auth.admin.deleteUser(userId);
			return null;
		}
		console.log("[seed] ✅ Created member:", email);
	}
	const { error: memberError } = await supabaseAdmin.from("org_members").upsert(
		{ org_id: orgId, user_id: userId, role: "member" },
		{ onConflict: "org_id,user_id" }
	);
	if (memberError) {
		console.error("[seed] Failed to add member to org:", email, memberError);
		return null;
	}
	await supabaseAdmin.from("profiles").update({ active_org_id: orgId }).eq("id", userId);
	return userId;
}

async function grantMemberProjectAccess(projectId: string, memberId: string, grantedById: string): Promise<boolean> {
	const { error } = await supabaseAdmin.rpc("grant_project_access", {
		p_project_id: projectId,
		p_user_id: memberId,
		p_granted_by_id: grantedById,
		p_permissions: [
			{ resource_type: "PROJECT_RESUME", permission: "edit" },
			{ resource_type: "PROJECT_DOCS_ROOT", permission: "edit" },
			{ resource_type: "BORROWER_RESUME", permission: "edit" },
			{ resource_type: "BORROWER_DOCS_ROOT", permission: "edit" },
		],
	});
	if (error) {
		console.warn("[seed] grant_project_access:", error.message);
		return false;
	}
	return true;
}

async function createProject(
	ownerOrgId: string,
	projectName: string,
	assignedAdvisorId: string | null,
	creatorId: string
): Promise<string | null> {
	const { data: project, error: projectError } = await supabaseAdmin
		.from("projects")
		.insert({ name: projectName, owner_org_id: ownerOrgId, assigned_advisor_id: assignedAdvisorId })
		.select()
		.single();
	if (projectError) {
		console.error("[seed] Project insert:", projectError);
		return null;
	}
	const projectId = project.id;

	await supabaseAdmin.storage.from(ownerOrgId).upload(`${projectId}/.placeholder`, new Blob([""]), { contentType: "text/plain" });
	await supabaseAdmin.storage.from(ownerOrgId).upload(`${projectId}/architectural-diagrams/.keep`, new Blob([""]), { contentType: "text/plain" });
	await supabaseAdmin.storage.from(ownerOrgId).upload(`${projectId}/site-images/.keep`, new Blob([""]), { contentType: "text/plain" });

	const { data: projectResumeResource } = await supabaseAdmin.from("resources").insert({
		org_id: ownerOrgId,
		project_id: projectId,
		resource_type: "PROJECT_RESUME",
		name: `${projectName} Resume`,
	}).select().single();

	const { data: projectDocsRootResource } = await supabaseAdmin.from("resources").insert({
		org_id: ownerOrgId,
		project_id: projectId,
		resource_type: "PROJECT_DOCS_ROOT",
		name: `${projectName} Documents`,
	}).select().single();

	await supabaseAdmin.rpc("ensure_project_borrower_roots", { p_project_id: projectId });

	await supabaseAdmin.from("project_access_grants").insert({
		project_id: projectId,
		org_id: ownerOrgId,
		user_id: creatorId,
		granted_by: creatorId,
	});
	if (projectResumeResource?.id) {
		await supabaseAdmin.from("permissions").upsert({
			resource_id: projectResumeResource.id,
			user_id: creatorId,
			permission: "edit",
			granted_by: creatorId,
		});
	}
	if (projectDocsRootResource?.id) {
		await supabaseAdmin.from("permissions").upsert({
			resource_id: projectDocsRootResource.id,
			user_id: creatorId,
			permission: "edit",
			granted_by: creatorId,
		});
	}

	const { data: underwritingRoot } = await supabaseAdmin.from("resources").insert({
		org_id: ownerOrgId,
		project_id: projectId,
		resource_type: "UNDERWRITING_DOCS_ROOT",
		name: "Underwriting Documents",
	}).select().single();
	if (underwritingRoot?.id && assignedAdvisorId) {
		await supabaseAdmin.from("permissions").upsert({
			resource_id: underwritingRoot.id,
			user_id: assignedAdvisorId,
			permission: "edit",
			granted_by: creatorId,
		});
	}

	const { data: chatThread } = await supabaseAdmin.from("chat_threads").insert({ project_id: projectId, topic: "General" }).select().single();
	if (chatThread) {
		await supabaseAdmin.from("chat_thread_participants").insert([
			{ thread_id: chatThread.id, user_id: creatorId },
			...(assignedAdvisorId ? [{ thread_id: chatThread.id, user_id: assignedAdvisorId }] : []),
		]);
	}

	console.log("[seed] ✅ Created project:", projectName);
	return projectId;
}

async function uploadDocumentToProject(
	projectId: string,
	orgId: string,
	filePath: string,
	fileName: string,
	rootResourceType: "PROJECT_DOCS_ROOT" | "BORROWER_DOCS_ROOT",
	uploadedById: string
): Promise<string | null> {
	const { data: rootResource, error: rootError } = await supabaseAdmin
		.from("resources")
		.select("id")
		.eq("project_id", projectId)
		.eq("resource_type", rootResourceType)
		.maybeSingle();
	if (rootError || !rootResource) return null;

	const { data: fileResource, error: resourceError } = await supabaseAdmin
		.from("resources")
		.insert({
			org_id: orgId,
			project_id: projectId,
			parent_id: rootResource.id,
			resource_type: "FILE",
			name: fileName,
		})
		.select()
		.single();
	if (resourceError) return null;
	const resourceId = fileResource.id;

	const { data: version, error: versionError } = await supabaseAdmin
		.from("document_versions")
		.insert({ resource_id: resourceId, created_by: uploadedById, storage_path: "placeholder" })
		.select()
		.single();
	if (versionError) {
		await supabaseAdmin.from("resources").delete().eq("id", resourceId);
		return null;
	}
	await supabaseAdmin.from("document_versions").update({ status: "active" }).eq("id", version.id);

	const baseName = path.basename(filePath);
	const sanitized = baseName.replace(/[^a-zA-Z0-9._-]/g, "_");
	const storageSubdir = rootResourceType === "BORROWER_DOCS_ROOT" ? "borrower-docs" : "project-docs";
	const finalStoragePath = `${projectId}/${storageSubdir}/${resourceId}/v${version.version_number}_${sanitized}`;

	if (!existsSync(filePath)) {
		await supabaseAdmin.from("resources").delete().eq("id", resourceId);
		return null;
	}
	const fileBuffer = readFileSync(filePath);
	const ext = (filePath.split(".").pop() || "").toLowerCase();
	let contentType = "application/pdf";
	if (ext === "xlsx" || ext === "xls") contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
	else if (ext === "docx" || ext === "doc") contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

	const { error: uploadError } = await supabaseAdmin.storage.from(orgId).upload(finalStoragePath, fileBuffer, { contentType, upsert: false });
	if (uploadError) {
		await supabaseAdmin.from("resources").delete().eq("id", resourceId);
		return null;
	}
	await supabaseAdmin.from("document_versions").update({
		storage_path: finalStoragePath,
		metadata: { size: fileBuffer.length, mimeType: contentType, source: "seed-marshall-project" },
	}).eq("id", version.id);
	await supabaseAdmin.from("resources").update({ current_version_id: version.id }).eq("id", resourceId);
	console.log("[seed] ✅ Uploaded:", fileName);
	return resourceId;
}

async function seedProjectResume(projectId: string, createdById: string): Promise<boolean> {
	const { computeProjectCompletion } = await import("../src/utils/resumeCompletion");
	const lockedFields: Record<string, boolean> = {};
	for (const k of Object.keys(marshallProjectResumeBase)) {
		if (marshallProjectResumeBase[k] !== undefined && marshallProjectResumeBase[k] !== "" && marshallProjectResumeBase[k] !== null) lockedFields[k] = true;
	}
	const completenessPercent = computeProjectCompletion(marshallProjectResumeBase as Record<string, unknown>, lockedFields);
	const richContent = convertToRichFormat(marshallProjectResumeBase);

	const { data: newResume, error } = await supabaseAdmin
		.from("project_resumes")
		.insert({
			project_id: projectId,
			content: richContent,
			locked_fields: lockedFields,
			completeness_percent: completenessPercent,
			created_by: createdById,
		})
		.select()
		.single();
	if (error || !newResume) {
		console.error("[seed] Project resume insert:", error);
		return false;
	}
	await supabaseAdmin.from("resources").update({ current_version_id: newResume.id }).eq("project_id", projectId).eq("resource_type", "PROJECT_RESUME");
	console.log("[seed] ✅ Project resume seeded");
	return true;
}

async function seedBorrowerResume(projectId: string, createdById: string): Promise<boolean> {
	await supabaseAdmin.rpc("ensure_project_borrower_roots", { p_project_id: projectId });
	const lockedFields: Record<string, boolean> = {};
	for (const k of Object.keys(marshallBorrowerResumeBase)) {
		if (marshallBorrowerResumeBase[k] !== undefined && marshallBorrowerResumeBase[k] !== "" && marshallBorrowerResumeBase[k] !== null) lockedFields[k] = true;
	}
	const { computeBorrowerCompletion } = await import("../src/utils/resumeCompletion");
	const completenessPercent = computeBorrowerCompletion(marshallBorrowerResumeBase, lockedFields);
	const richContent = convertToRichFormat(marshallBorrowerResumeBase);

	const { data: newResume, error } = await supabaseAdmin
		.from("borrower_resumes")
		.insert({
			project_id: projectId,
			content: richContent,
			locked_fields: lockedFields,
			completeness_percent: completenessPercent,
			created_by: createdById,
		})
		.select()
		.single();
	if (error || !newResume) {
		console.error("[seed] Borrower resume insert:", error);
		return false;
	}
	await supabaseAdmin.from("resources").update({ current_version_id: newResume.id }).eq("project_id", projectId).eq("resource_type", "BORROWER_RESUME");
	console.log("[seed] ✅ Borrower resume seeded");
	return true;
}

async function seedDocuments(projectId: string, orgId: string, uploadedById: string): Promise<number> {
	let basePath: string | null = null;
	for (const p of POSSIBLE_DOC_PATHS) {
		if (existsSync(p)) {
			basePath = p;
			console.log("[seed] Documents path:", p);
			break;
		}
	}
	if (!basePath) {
		console.warn("[seed] ⚠️ final-set directory not found. Tried:", POSSIBLE_DOC_PATHS);
		return 0;
	}
	const entries = readdirSync(basePath, { withFileTypes: true });
	let count = 0;
	for (const e of entries) {
		if (!e.isFile()) continue;
		const ext = path.extname(e.name).toLowerCase();
		if (![".pdf", ".xlsx", ".xls", ".docx", ".doc"].includes(ext)) continue;
		const filePath = path.join(basePath, e.name);
		const displayName = e.name;
		const resourceId = await uploadDocumentToProject(projectId, orgId, filePath, displayName, "PROJECT_DOCS_ROOT", uploadedById);
		if (resourceId) count++;
	}
	console.log(`[seed] ✅ Seeded ${count} documents`);
	return count;
}

async function grantAdvisorProjectPermissions(projectId: string, advisorId: string): Promise<void> {
	const { error } = await supabaseAdmin.rpc("grant_advisor_project_permissions", {
		p_project_id: projectId,
		p_advisor_id: advisorId,
		p_granted_by_id: advisorId,
	});
	if (error) console.warn("[seed] grant_advisor_project_permissions:", error.message);
}

async function seedTeamMembers(projectId: string, orgId: string, ownerId: string): Promise<void> {
	console.log("[seed] Adding members to borrower org and granting project access...");
	for (const m of MEMBER_USERS) {
		const memberId = await createMemberUser(m.email, MEMBER_PASSWORD, m.name, orgId);
		if (memberId) await grantMemberProjectAccess(projectId, memberId, ownerId);
	}
	console.log("[seed] ✅ Team members seeded");
}

async function createLenderAccount(): Promise<{ userId: string; orgId: string } | null> {
	console.log("[seed] Getting or creating lender (lender@capmatch.com)...");
	const { data: existing } = await supabaseAdmin.from("profiles").select("id, active_org_id").eq("email", LENDER_EMAIL).maybeSingle();
	let userId: string;
	let orgId: string | null = null;
	if (existing) {
		userId = existing.id;
		orgId = existing.active_org_id;
		if (!orgId) {
			const { data: m } = await supabaseAdmin.from("org_members").select("org_id").eq("user_id", userId).eq("role", "owner").maybeSingle();
			if (m) orgId = m.org_id;
		}
		console.log(`[seed] Lender exists: ${LENDER_EMAIL}`);
	} else {
		const result = await onboardUserDirectly(LENDER_EMAIL, LENDER_PASSWORD, LENDER_NAME, "lender");
		if (result.error || !result.user) {
			console.error("[seed] ❌ Lender:", result.error);
			return null;
		}
		userId = result.user.id;
		const { data: p } = await supabaseAdmin.from("profiles").select("active_org_id").eq("id", userId).single();
		orgId = p?.active_org_id ?? null;
		console.log("[seed] ✅ Created lender:", LENDER_EMAIL);
	}
	if (!orgId) {
		console.error("[seed] ❌ Lender org null");
		return null;
	}
	return { userId, orgId };
}

async function grantLenderProjectAccess(projectId: string, lenderOrgId: string, grantedByUserId: string): Promise<boolean> {
	const { error } = await supabaseAdmin.rpc("grant_lender_project_access", {
		p_lender_org_id: lenderOrgId,
		p_project_id: projectId,
		p_granted_by: grantedByUserId,
	});
	if (error) {
		console.warn("[seed] grant_lender_project_access:", error.message);
		return false;
	}
	console.log("[seed] ✅ Granted lender access to project");
	return true;
}

// ============================================================================
// MAIN SEED
// ============================================================================

async function seedMarshallProject(): Promise<void> {
	console.log("🌱 Starting The Marshall St. Louis seed...\n");
	try {
		console.log("📋 Step 1: Advisor (Cody Field)...");
		const advisorInfo = await createAdvisorAccount();
		if (!advisorInfo) return;
		const { userId: advisorId } = advisorInfo;

		console.log("\n📋 Step 2: Borrower owner (param.vora@capmatch.com)...");
		const borrowerInfo = await getOrCreateDemoBorrowerAccount();
		if (!borrowerInfo) return;
		const { userId: borrowerId, orgId: borrowerOrgId } = borrowerInfo;

		console.log("\n📋 Step 3: Create project...");
		const projectId = await createProject(borrowerOrgId, MARSHALL_PROJECT_NAME, advisorId, borrowerId);
		if (!projectId) return;

		console.log("\n📋 Step 4: Advisor permissions + team members...");
		await grantAdvisorProjectPermissions(projectId, advisorId);
		await seedTeamMembers(projectId, borrowerOrgId, borrowerId);

		console.log("\n📋 Step 4.5: Lender account + project access...");
		const lenderInfo = await createLenderAccount();
		if (lenderInfo) {
			await grantLenderProjectAccess(projectId, lenderInfo.orgId, advisorId);
		} else {
			console.warn("[seed] ⚠️ Lender account skip, lender project access not granted");
		}

		console.log("\n📋 Step 5: Project & borrower resumes...");
		await seedProjectResume(projectId, borrowerId);
		await seedBorrowerResume(projectId, borrowerId);

		console.log("\n📋 Step 6: Documents from final-set...");
		await seedDocuments(projectId, borrowerOrgId, borrowerId);

		console.log("\n✅ The Marshall St. Louis seed complete.");
	} catch (err) {
		console.error("[seed] Fatal:", err);
		throw err;
	}
}

// ============================================================================
// CLEANUP
// ============================================================================

async function cleanupMarshall(): Promise<void> {
	console.log("🧹 Cleaning up The Marshall St. Louis...\n");
	const { data: projects } = await supabaseAdmin
		.from("projects")
		.select("id, name, owner_org_id")
		.eq("name", MARSHALL_PROJECT_NAME);

	if (!projects?.length) {
		console.log("[cleanup] No The Marshall St. Louis project found.");
		return;
	}

	const projectIds = projects.map((p) => p.id);
	for (const project of projects) {
		await supabaseAdmin.from("lender_project_access").delete().eq("project_id", project.id);
		const { data: threads } = await supabaseAdmin.from("chat_threads").select("id").eq("project_id", project.id);
		if (threads?.length) {
			const tids = threads.map((t) => t.id);
			await supabaseAdmin.from("chat_thread_participants").delete().in("thread_id", tids);
			await supabaseAdmin.from("chat_threads").delete().eq("project_id", project.id);
		}
		const { data: resources } = await supabaseAdmin.from("resources").select("id").eq("project_id", project.id);
		if (resources?.length) {
			const rids = resources.map((r) => r.id);
			await supabaseAdmin.from("permissions").delete().in("resource_id", rids);
			await supabaseAdmin.from("resources").delete().in("id", rids);
		}
		await supabaseAdmin.from("project_resumes").delete().eq("project_id", project.id);
		await supabaseAdmin.from("borrower_resumes").delete().eq("project_id", project.id);
		await supabaseAdmin.from("om").delete().eq("project_id", project.id);
		await supabaseAdmin.from("project_access_grants").delete().in("project_id", projectIds);
	}
	await supabaseAdmin.from("projects").delete().in("id", projectIds);
	console.log("[cleanup] ✅ Deleted The Marshall St. Louis project(s). Borrower/advisor/lender preserved.");
}

// ============================================================================
// CLI
// ============================================================================

async function main() {
	if (isProduction && !isCleanup) {
		console.log("⚠️  PRODUCTION MODE. Wait 5s to cancel...\n");
		await new Promise((r) => setTimeout(r, 5000));
	}
	if (isProduction && isCleanup) {
		console.log("⚠️  PRODUCTION CLEANUP. Wait 5s to cancel...\n");
		await new Promise((r) => setTimeout(r, 5000));
	}

	if (isCleanup) {
		await cleanupMarshall();
		console.log("\n✨ Cleanup done!");
	} else {
		await seedMarshallProject();
		console.log("\n✨ Done!");
	}
}

if (require.main === module) {
	main()
		.then(() => process.exit(0))
		.catch((err) => {
			console.error(err);
			process.exit(1);
		});
}

export { seedMarshallProject, cleanupMarshall };
