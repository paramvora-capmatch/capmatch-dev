// scripts/seed-lasalle-project.ts
// Seed script for 300 East LaSalle: param.vora (owner), Cody (advisor), members, lender, project, resumes, documents.
// Run with: npx tsx scripts/seed-lasalle-project.ts [--prod] [cleanup]

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

const LASALLE_PROJECT_NAME = "300 East LaSalle";

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
	...(process.env.LASALLE_DOCS_PATH ? [process.env.LASALLE_DOCS_PATH] : []),
	resolve(process.cwd(), "Deals", "LaSalle", "300 E, Lasalle", "300 E, Lasalle", "final-set"),
	resolve(process.cwd(), "..", "Deals", "LaSalle", "300 E, Lasalle", "300 E, Lasalle", "final-set"),
	"D:\\Career\\Technology\\Job\\CapMatch\\Deals\\LaSalle\\300 E, Lasalle\\300 E, Lasalle\\final-set",
];

// ============================================================================
// BORROWER RESUME (from Borrower Resume Data Extraction)
// ============================================================================

const lasalleBorrowerResumeBase: Record<string, unknown> = {
	fullLegalName: "Matthews 350 E LaSalle LLC",
	primaryEntityName: "Matthews, LLC (Sponsor) / Matthews 350 E LaSalle LLC (Borrower)",
	primaryEntityStructure: "Indiana limited liability company",
	contactEmail: "david@MatthewsLLC.com",
	contactPhone: "(574) 500-2520",
	contactAddress: "401 E Colfax Ave, Suite 277, South Bend, IN 46617",
	yearsCREExperienceRange: "15+ (Implied based on project history starting 2007)",
	activeProjects: "156 residential units, ~700,000 sq ft office/retail",
	totalDealValueClosedRange: ">$150,000,000",
	assetClassesExperience: "Mixed-use, residential, commercial, recreational",
	geographicMarketsExperience: "South Bend, Indiana",
	existingLenderRelationships: "KeyBank NA, Freddie Mac",
	bioNarrative: "Matthews, LLC is a real estate development firm based in South Bend, Indiana... specialized in mixed-use projects... founded by David Matthews.",
	trackRecord: "Completed >$150MM in developments. Projects: Ivy Quad ($35MM), East Bank Townhomes ($3MM), River Race Townhomes ($5.5MM), 300 East LaSalle ($45MM valuation).",
	totalAssets: "$46,735,436.22",
	totalLiabilities: "$35,364,404.08",
	netWorth: "$11,371,032.14 (Total Capital/Equity of SPE)",
	totalLiquidAssets: "($94,201.92) (Cash Checking negative balance)",
	assets: "CIP ($51.8M), Accounts Receivable ($105k), Fixed Assets",
	liabilities: "Key Bank Loan ($32.6M), Accounts Payable ($2.4M)",
	foreclosureHistory: "The Commerce Center was acquired out of foreclosure in 2015 (Prior history, not sponsor default)",
	scheduleOfRealEstateOwned: "156 residential units, 700k sq ft office/retail",
	sreoProperties: "Buffalo Street, 701 Niles, River Race Flats, 521 Jefferson, The Emporium Building, The Commerce Center",
	websiteUrl: "www.MatthewsLLC.com",
	principalLegalName: "David Matthews",
	principalRoleDefault: "Managing Member / Principal",
	principalEmail: "david@MatthewsLLC.com",
	ownershipPercentage: "100% (Implied in Appraisal context, though partners exist in BS)",
	principalBio: "Experienced developer and entrepreneur with strong background in engineering and urban planning. Degrees from Purdue, studied at Bath and Notre Dame. Former Walt Disney and Dept of Defense engineer.",
	principalSpecialties: "Engineering, Urban Planning, Mixed-use development",
	principalAchievements: "Revitalizing urban neighborhoods in Northern Indiana; Boards of South Bend Museum of Art and Venue Parks & Arts Foundation.",
	principalEducation: "Purdue University, University of Bath, Notre Dame",
	references: "KeyBank NA (Existing Lender)",
};

// ============================================================================
// PROJECT RESUME (from Project Resume Data Extraction)
// ============================================================================

const lasalleProjectResumeBase: Record<string, unknown> = {
	projectName: "300 East LaSalle",
	propertyAddressStreet: "300 East LaSalle Avenue",
	propertyAddressCity: "South Bend",
	propertyAddressState: "IN",
	propertyAddressZip: "46617",
	propertyAddressCounty: "St. Joseph",
	dealStatus: "Stabilized / Refinance",
	masterPlanName: "Commerce Center Mixed-Use Development",
	assetType: "Multifamily / Mixed-Use",
	constructionType: "Steel frame above concrete podium, precast concrete panels",
	projectPhase: "Completed / Stabilized",
	projectDescription: "144-unit apartment community with 29,000 SF commercial space, 10 stories.",
	parcelNumber: "71-08-12-129-024.000-026",
	zoningDesignation: "CBD, Central Business District",
	totalResidentialUnits: 144,
	totalResidentialNRSF: 131310,
	averageUnitSize: 912,
	totalCommercialGRSF: 29007,
	grossBuildingArea: 297003,
	numberOfStories: 10,
	buildingType: "Mid/High Rise",
	residentialUnitMix: "Studio (24), 1 Bed (54), 2 Bed (55), 3 Bed (11)",
	commercialSpaceMix: "Retail (Grocery): 14,507 SF; Office: 14,323 SF (or 14,500 per lease)",
	parkingSpaces: 500,
	parkingRatio: 3.47,
	parkingType: "Surface & Covered (Garage)",
	amenityList: ["Gym", "Restaurant", "Coworking", "Farmers Market", "Jazz Club", "Pharmacy", "Grocery", "EV Charging", "10' ceilings", "balconies"],
	studioCount: 24,
	oneBedCount: 54,
	twoBedCount: 55,
	threeBedCount: 11,
	targetMarket: "Professionals, Faculty, Graduate Students",
	loanAmountRequested: 29000000,
	loanType: "Refinance",
	requestedTerm: "3-5 years",
	amortizationYears: 30,
	interestRate: 5.85,
	underwritingRate: 5.92,
	targetLtvPercent: 64.4,
	allInRate: 5.92,
	useOfProceeds: "Refinance existing debt",
	purchasePrice: 45000000,
	totalDevelopmentCost: 44529349,
	capRate: 5.19,
	stabilizedValue: 45000000,
	debtYield: 8.1,
	dscr: 1.36,
	noiYear1: 3126957,
	propertyNoiT12: 2225157.92,
	stabilizedNoiProjected: 2337399,
	completionDate: "2022",
	msaName: "South Bend-Mishawaka, IN-MI",
	submarketName: "Central Submarket",
	totalSiteAcreage: 0.788,
	buildableAcreage: 0.788,
	floodZone: "Zone X (Unshaded)",
	utilityAvailability: "Yes (Water, Sewer, Gas, Electric, Telephone)",
	sponsorEntityName: "Matthews, LLC",
	sponsorStructure: "Limited Liability Company",
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

		if (authError) {
			if (authError.message.includes("already registered") || authError.message.includes("unique")) {
				const { data: existing } = await supabaseAdmin.from("profiles").select("id").eq("email", email).maybeSingle();
				if (existing) return { user: { id: existing.id, email } };
			}
			return { error: authError.message };
		}
		const userId = authData!.user.id;

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
		if (authError || !authUser?.user) {
			console.error("[seed] Failed to create member:", email, authError);
			return null;
		}
		userId = authUser.user.id;
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
		metadata: { size: fileBuffer.length, mimeType: contentType, source: "seed-lasalle-project" },
	}).eq("id", version.id);
	await supabaseAdmin.from("resources").update({ current_version_id: version.id }).eq("id", resourceId);
	console.log("[seed] ✅ Uploaded:", fileName);
	return resourceId;
}

async function seedProjectResume(projectId: string, createdById: string): Promise<boolean> {
	const { computeProjectCompletion } = await import("../src/utils/resumeCompletion");
	const lockedFields: Record<string, boolean> = {};
	for (const k of Object.keys(lasalleProjectResumeBase)) {
		if (lasalleProjectResumeBase[k] !== undefined && lasalleProjectResumeBase[k] !== "" && lasalleProjectResumeBase[k] !== null) lockedFields[k] = true;
	}
	const completenessPercent = computeProjectCompletion(lasalleProjectResumeBase as Record<string, unknown>, lockedFields);
	const richContent = convertToRichFormat(lasalleProjectResumeBase);

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
	for (const k of Object.keys(lasalleBorrowerResumeBase)) {
		if (lasalleBorrowerResumeBase[k] !== undefined && lasalleBorrowerResumeBase[k] !== "" && lasalleBorrowerResumeBase[k] !== null) lockedFields[k] = true;
	}
	const { computeBorrowerCompletion } = await import("../src/utils/resumeCompletion");
	const completenessPercent = computeBorrowerCompletion(lasalleBorrowerResumeBase, lockedFields);
	const richContent = convertToRichFormat(lasalleBorrowerResumeBase);

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

async function seedLasalleProject(): Promise<void> {
	console.log("🌱 Starting 300 East LaSalle seed...\n");
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
		const projectId = await createProject(borrowerOrgId, LASALLE_PROJECT_NAME, advisorId, borrowerId);
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

		console.log("\n✅ 300 East LaSalle seed complete.");
	} catch (err) {
		console.error("[seed] Fatal:", err);
		throw err;
	}
}

// ============================================================================
// CLEANUP
// ============================================================================

async function cleanupLasalle(): Promise<void> {
	console.log("🧹 Cleaning up 300 East LaSalle...\n");
	const { data: projects } = await supabaseAdmin
		.from("projects")
		.select("id, name, owner_org_id")
		.eq("name", LASALLE_PROJECT_NAME);

	if (!projects?.length) {
		console.log("[cleanup] No 300 East LaSalle project found.");
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
	console.log("[cleanup] ✅ Deleted 300 East LaSalle project(s). Borrower/advisor/lender preserved.");
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
		await cleanupLasalle();
		console.log("\n✨ Cleanup done!");
	} else {
		await seedLasalleProject();
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

export { seedLasalleProject, cleanupLasalle };
