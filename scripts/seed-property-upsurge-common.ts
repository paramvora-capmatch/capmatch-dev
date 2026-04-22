import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { existsSync } from "fs";
import { resolve } from "path";

type AppRole = "advisor" | "borrower" | "lender";

export interface PropertyUpsurgeSeedConfig {
	projectName: string;
	sourceJsonFile: string;
	projectResume: Record<string, unknown>;
	borrowerResume: Record<string, unknown>;
}

interface OnboardResponse {
	user?: {
		id: string;
		email: string;
	};
	error?: string;
}

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
		console.warn("   Create .env.production with production credentials.\n");
	}
} else {
	config({ path: resolve(process.cwd(), ".env.local") });
	config({ path: resolve(process.cwd(), ".env") });
}

const supabaseUrl =
	process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
	const envFile = isProduction ? ".env.production" : ".env.local";
	console.error("\n❌ Missing SUPABASE_URL environment variable");
	console.error(
		`   Please set NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL in ${envFile}`
	);
	process.exit(1);
}

if (!serviceRoleKey) {
	const envFile = isProduction ? ".env.production" : ".env.local";
	console.error(
		"\n❌ Missing SUPABASE_SERVICE_ROLE_KEY environment variable"
	);
	console.error(`   Please add SUPABASE_SERVICE_ROLE_KEY to ${envFile}`);
	process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
	auth: {
		autoRefreshToken: false,
		persistSession: false,
	},
});

const TEAM_MEMBERS = [
	{ email: "aryan.jain@capmatch.com", name: "Aryan Jain" },
	{ email: "sarthak.karandikar@capmatch.com", name: "Sarthak Karandikar" },
	{ email: "kabeer.merchant@capmatch.com", name: "Kabeer Merchant" },
	{ email: "vatsal.hariramani@capmatch.com", name: "Vatsal Hariramani" },
];

const hasMeaningfulValue = (value: unknown): boolean => {
	if (value === undefined || value === null) return false;
	if (typeof value === "string") return value.trim().length > 0;
	if (typeof value === "number") return !Number.isNaN(value);
	if (typeof value === "boolean") return true;
	if (Array.isArray(value)) return value.length > 0;
	if (typeof value === "object") return Object.keys(value).length > 0;
	return false;
};

const buildLockedFields = (
	content: Record<string, unknown>
): Record<string, boolean> => {
	const lockedFields: Record<string, boolean> = {};

	for (const [key, value] of Object.entries(content)) {
		if (key.startsWith("_") || key === "completenessPercent") {
			continue;
		}

		if (hasMeaningfulValue(value)) {
			lockedFields[key] = true;
		}
	}

	return lockedFields;
};

const convertToRichFormat = (
	content: Record<string, unknown>
): Record<string, unknown> => {
	const richFormat: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(content)) {
		if (key.startsWith("_") || key === "completenessPercent") {
			richFormat[key] = value;
			continue;
		}

		if (
			value &&
			typeof value === "object" &&
			!Array.isArray(value) &&
			"value" in value &&
			("source" in value || "sources" in value)
		) {
			richFormat[key] = value;
			continue;
		}

		richFormat[key] = {
			value,
			source: { type: "user_input" },
			warnings: [],
			other_values: [],
		};
	}

	return richFormat;
};

async function seedProjectResume(
	projectId: string,
	createdById: string,
	projectResume: Record<string, unknown>
): Promise<boolean> {
	const lockedFields = buildLockedFields(projectResume);
	const { computeProjectCompletion } = await import(
		"../src/utils/resumeCompletion"
	);
	const completenessPercent = computeProjectCompletion(
		projectResume,
		lockedFields
	);
	const richContent = convertToRichFormat(projectResume);

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
		console.error("[seed] Project resume insert failed:", error);
		return false;
	}

	const { error: resourceError } = await supabaseAdmin
		.from("resources")
		.update({ current_version_id: newResume.id })
		.eq("project_id", projectId)
		.eq("resource_type", "PROJECT_RESUME");

	if (resourceError) {
		console.error("[seed] Failed to update PROJECT_RESUME resource:", resourceError);
		return false;
	}

	console.log("[seed] ✅ Project resume seeded");
	return true;
}

async function seedBorrowerResume(
	projectId: string,
	createdById: string,
	borrowerResume: Record<string, unknown>
): Promise<boolean> {
	const { error: borrowerRootError } = await supabaseAdmin.rpc(
		"ensure_project_borrower_roots",
		{ p_project_id: projectId }
	);

	if (borrowerRootError) {
		console.warn(
			"[seed] Warning ensuring borrower root resources:",
			borrowerRootError.message
		);
	}

	const lockedFields = buildLockedFields(borrowerResume);
	const { computeBorrowerCompletion } = await import(
		"../src/utils/resumeCompletion"
	);
	const completenessPercent = computeBorrowerCompletion(
		borrowerResume,
		lockedFields
	);
	const richContent = convertToRichFormat(borrowerResume);

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
		console.error("[seed] Borrower resume insert failed:", error);
		return false;
	}

	const { error: resourceError } = await supabaseAdmin
		.from("resources")
		.update({ current_version_id: newResume.id })
		.eq("project_id", projectId)
		.eq("resource_type", "BORROWER_RESUME");

	if (resourceError) {
		console.error(
			"[seed] Failed to update BORROWER_RESUME resource:",
			resourceError
		);
		return false;
	}

	console.log("[seed] ✅ Borrower resume seeded");
	return true;
}

async function onboardUserDirectly(
	email: string,
	password: string,
	fullName: string,
	appRole: AppRole
): Promise<OnboardResponse> {
	console.log(`[seed] Onboarding ${appRole} directly: ${email}...`);

	try {
		const { data: authData, error: authError } =
			await supabaseAdmin.auth.admin.createUser({
				email,
				password,
				email_confirm: true,
				user_metadata: { full_name: fullName },
			});

		let userId: string;

		if (authError) {
			const errMsg =
				typeof authError.message === "string"
					? authError.message
					: JSON.stringify(authError);
			const { data: existingProfile } = await supabaseAdmin
				.from("profiles")
				.select("id")
				.eq("email", email)
				.maybeSingle();

			if (existingProfile) {
				console.log("[seed] Found existing profile, reusing:", existingProfile.id);
				return { user: { id: existingProfile.id, email } };
			}

			const { data: listData } = await supabaseAdmin.auth.admin.listUsers({
				perPage: 1000,
			});
			const authUsers = (listData?.users ?? []) as Array<{
				id: string;
				email?: string | null;
			}>;
			const existingAuthUser = authUsers.find(
				(user) => user.email?.toLowerCase() === email.toLowerCase()
			);

			if (existingAuthUser) {
				console.log(
					"[seed] Found existing auth user, ensuring profile/org:",
					existingAuthUser.id
				);
				userId = existingAuthUser.id;
			} else {
				console.error("[seed] Auth creation failed:", errMsg || authError);
				return { error: errMsg || "Auth creation failed" };
			}
		} else {
			userId = authData.user.id;
		}

		const { error: profileError } = await supabaseAdmin
			.from("profiles")
			.upsert(
				{
					id: userId,
					full_name: fullName,
					email,
					app_role: appRole,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				},
				{ onConflict: "id" }
			);

		if (profileError) {
			console.error("[seed] Profile creation failed:", profileError.message);
			return { error: profileError.message };
		}

		let orgId: string;

		if (appRole === "borrower") {
			const { data: orgData, error: orgError } = await supabaseAdmin
				.from("orgs")
				.insert({
					name: `${fullName}'s Organization`,
					entity_type: "borrower",
				})
				.select()
				.single();

			if (orgError) return { error: orgError.message };
			orgId = orgData.id;

			await supabaseAdmin.from("org_members").insert({
				org_id: orgId,
				user_id: userId,
				role: "owner",
			});

			const { error: bucketError } = await supabaseAdmin.storage.createBucket(
				orgId,
				{
					public: false,
					fileSizeLimit: 50 * 1024 * 1024,
				}
			);

			if (
				bucketError &&
				!bucketError.message.toLowerCase().includes("already exists")
			) {
				console.error(
					`[seed] Failed to create storage bucket: ${bucketError.message}`
				);
			}
		} else if (appRole === "advisor") {
			const { data: existingOrg } = await supabaseAdmin
				.from("orgs")
				.select("id")
				.eq("entity_type", "advisor")
				.limit(1)
				.maybeSingle();

			if (existingOrg) {
				orgId = existingOrg.id;
			} else {
				const { data: newOrg, error: orgError } = await supabaseAdmin
					.from("orgs")
					.insert({
						name: "CapMatch Advisors",
						entity_type: "advisor",
					})
					.select()
					.single();

				if (orgError) return { error: orgError.message };
				orgId = newOrg.id;
			}

			await supabaseAdmin.from("org_members").upsert(
				{
					org_id: orgId,
					user_id: userId,
					role: "owner",
				},
				{ onConflict: "org_id,user_id" }
			);
		} else if (appRole === "lender") {
			const { data: orgData, error: orgError } = await supabaseAdmin
				.from("orgs")
				.insert({
					name: `${fullName}'s Organization`,
					entity_type: "lender",
				})
				.select()
				.single();

			if (orgError) return { error: orgError.message };
			orgId = orgData.id;

			await supabaseAdmin.from("org_members").insert({
				org_id: orgId,
				user_id: userId,
				role: "owner",
			});
		} else {
			return { error: `Unsupported app_role: ${appRole}` };
		}

		await supabaseAdmin
			.from("profiles")
			.update({ active_org_id: orgId })
			.eq("id", userId);

		return { user: { id: userId, email } };
	} catch (error) {
		console.error("[seed] Unexpected onboarding error:", error);
		return { error: String(error) };
	}
}

async function ensureStorageBucket(orgId: string): Promise<void> {
	try {
		const { error } = await supabaseAdmin.storage.createBucket(orgId, {
			public: false,
			fileSizeLimit: 50 * 1024 * 1024,
		});

		if (error && !error.message.toLowerCase().includes("already exists")) {
			console.error("[seed] Failed to ensure storage bucket:", error.message);
		}
	} catch (error) {
		console.error("[seed] Exception ensuring storage bucket:", error);
	}
}

async function createAdvisorAccount(): Promise<{
	userId: string;
	orgId: string;
} | null> {
	const advisorEmail = "cody.field@capmatch.com";
	const advisorPassword = "password";
	const advisorName = "Cody Field";

	const { data: existingProfile } = await supabaseAdmin
		.from("profiles")
		.select("id, active_org_id")
		.eq("email", advisorEmail)
		.maybeSingle();

	let advisorUserId: string;
	let advisorOrgId: string | null = null;

	if (existingProfile) {
		advisorUserId = existingProfile.id;
		advisorOrgId = existingProfile.active_org_id;
		console.log(
			`[seed] Advisor already exists: ${advisorEmail} (${advisorUserId})`
		);
	} else {
		const advisorResult = await onboardUserDirectly(
			advisorEmail,
			advisorPassword,
			advisorName,
			"advisor"
		);

		if (advisorResult.error || !advisorResult.user) {
			console.error("[seed] Failed to create advisor:", advisorResult.error);
			return null;
		}

		advisorUserId = advisorResult.user.id;
	}

	const { data: existingOrg } = await supabaseAdmin
		.from("orgs")
		.select("id")
		.eq("entity_type", "advisor")
		.limit(1)
		.maybeSingle();

	if (existingOrg) {
		advisorOrgId = existingOrg.id;
	} else {
		const { data: orgData, error: orgError } = await supabaseAdmin
			.from("orgs")
			.insert({
				name: "CapMatch Advisors",
				entity_type: "advisor",
			})
			.select()
			.single();

		if (orgError) {
			console.error("[seed] Failed to create advisor org:", orgError);
			return null;
		}

		advisorOrgId = orgData.id;
	}

	await supabaseAdmin.from("org_members").upsert(
		{
			org_id: advisorOrgId,
			user_id: advisorUserId,
			role: "owner",
		},
		{ onConflict: "org_id,user_id" }
	);

	await supabaseAdmin
		.from("profiles")
		.update({ active_org_id: advisorOrgId })
		.eq("id", advisorUserId);

	return { userId: advisorUserId, orgId: advisorOrgId };
}

async function getOrCreateDemoBorrowerAccount(): Promise<{
	userId: string;
	orgId: string;
} | null> {
	const borrowerEmail = "param.vora@capmatch.com";
	const borrowerPassword = "password";
	const borrowerName = "Param Vora";

	const { data: existingProfile } = await supabaseAdmin
		.from("profiles")
		.select("id, active_org_id")
		.eq("email", borrowerEmail)
		.maybeSingle();

	let borrowerUserId: string;
	let borrowerOrgId: string | null = null;

	if (existingProfile) {
		borrowerUserId = existingProfile.id;
		borrowerOrgId = existingProfile.active_org_id;

		if (!borrowerOrgId) {
			const { data: memberData } = await supabaseAdmin
				.from("org_members")
				.select("org_id")
				.eq("user_id", borrowerUserId)
				.eq("role", "owner")
				.limit(1)
				.maybeSingle();

			borrowerOrgId = memberData?.org_id ?? null;
		}
	} else {
		const borrowerResult = await onboardUserDirectly(
			borrowerEmail,
			borrowerPassword,
			borrowerName,
			"borrower"
		);

		if (borrowerResult.error || !borrowerResult.user) {
			console.error("[seed] Failed to create borrower:", borrowerResult.error);
			return null;
		}

		borrowerUserId = borrowerResult.user.id;

		const { data: borrowerProfile } = await supabaseAdmin
			.from("profiles")
			.select("active_org_id")
			.eq("id", borrowerUserId)
			.single();

		borrowerOrgId = borrowerProfile?.active_org_id ?? null;
	}

	if (!borrowerOrgId) {
		console.error("[seed] Borrower org not found");
		return null;
	}

	await ensureStorageBucket(borrowerOrgId);
	return { userId: borrowerUserId, orgId: borrowerOrgId };
}

async function createLenderAccount(): Promise<{
	userId: string;
	orgId: string;
} | null> {
	const lenderEmail = "lender@capmatch.com";
	const lenderPassword = "password";
	const lenderName = "Capital Lending Group";

	const { data: existingProfile } = await supabaseAdmin
		.from("profiles")
		.select("id, active_org_id")
		.eq("email", lenderEmail)
		.maybeSingle();

	let lenderUserId: string;
	let lenderOrgId: string | null = null;

	if (existingProfile) {
		lenderUserId = existingProfile.id;
		lenderOrgId = existingProfile.active_org_id;

		if (!lenderOrgId) {
			const { data: memberData } = await supabaseAdmin
				.from("org_members")
				.select("org_id")
				.eq("user_id", lenderUserId)
				.eq("role", "owner")
				.limit(1)
				.maybeSingle();

			lenderOrgId = memberData?.org_id ?? null;
		}
	} else {
		const lenderResult = await onboardUserDirectly(
			lenderEmail,
			lenderPassword,
			lenderName,
			"lender"
		);

		if (lenderResult.error || !lenderResult.user) {
			console.error("[seed] Failed to create lender:", lenderResult.error);
			return null;
		}

		lenderUserId = lenderResult.user.id;

		const { data: lenderProfile } = await supabaseAdmin
			.from("profiles")
			.select("active_org_id")
			.eq("id", lenderUserId)
			.single();

		lenderOrgId = lenderProfile?.active_org_id ?? null;
	}

	if (!lenderOrgId) {
		console.error("[seed] Lender org not found");
		return null;
	}

	return { userId: lenderUserId, orgId: lenderOrgId };
}

async function ensureJeffRichmondOwner(borrowerOrgId: string): Promise<void> {
	const jeffEmail = "jeff.richmond@capmatch.com";
	const jeffPassword = "password";
	const jeffName = "Jeff Richmond";

	const { data: existingProfile } = await supabaseAdmin
		.from("profiles")
		.select("id")
		.eq("email", jeffEmail)
		.maybeSingle();

	let jeffUserId: string | null = existingProfile?.id ?? null;

	if (!jeffUserId) {
		const { data: authUser, error: authError } =
			await supabaseAdmin.auth.admin.createUser({
				email: jeffEmail,
				password: jeffPassword,
				email_confirm: true,
				user_metadata: { full_name: jeffName },
			});

		if (authError || !authUser.user) {
			console.warn("[seed] Failed to create Jeff Richmond:", authError);
		} else {
			jeffUserId = authUser.user.id;

			const { error: profileError } = await supabaseAdmin
				.from("profiles")
				.insert({
					id: jeffUserId,
					email: jeffEmail,
					full_name: jeffName,
					app_role: "borrower",
					active_org_id: borrowerOrgId,
				});

			if (profileError) {
				console.warn("[seed] Failed to create Jeff Richmond profile:", profileError);
				await supabaseAdmin.auth.admin.deleteUser(jeffUserId);
				jeffUserId = null;
			}
		}
	}

	if (!jeffUserId) return;

	await supabaseAdmin.from("org_members").upsert(
		{
			org_id: borrowerOrgId,
			user_id: jeffUserId,
			role: "owner",
		},
		{ onConflict: "org_id,user_id" }
	);

	await supabaseAdmin
		.from("profiles")
		.update({ active_org_id: borrowerOrgId })
		.eq("id", jeffUserId);
}

async function createMemberUser(
	email: string,
	password: string,
	fullName: string,
	orgId: string
): Promise<string | null> {
	const { data: existingProfile } = await supabaseAdmin
		.from("profiles")
		.select("id")
		.eq("email", email)
		.maybeSingle();

	let userId: string;

	if (existingProfile) {
		userId = existingProfile.id;
	} else {
		const { data: authUser, error: authError } =
			await supabaseAdmin.auth.admin.createUser({
				email,
				password,
				email_confirm: true,
				user_metadata: { full_name: fullName },
			});

		if (authError || !authUser.user) {
			console.error("[seed] Failed to create member user:", authError);
			return null;
		}

		userId = authUser.user.id;

		const { error: profileError } = await supabaseAdmin
			.from("profiles")
			.insert({
				id: userId,
				email,
				full_name: fullName,
				app_role: "borrower",
				active_org_id: orgId,
			});

		if (profileError) {
			console.error("[seed] Failed to create member profile:", profileError);
			await supabaseAdmin.auth.admin.deleteUser(userId);
			return null;
		}
	}

	const { error: membershipError } = await supabaseAdmin
		.from("org_members")
		.upsert(
			{
				org_id: orgId,
				user_id: userId,
				role: "member",
			},
			{ onConflict: "org_id,user_id" }
		);

	if (membershipError) {
		console.error("[seed] Failed to add member to org:", membershipError);
		return null;
	}

	await supabaseAdmin
		.from("profiles")
		.update({ active_org_id: orgId })
		.eq("id", userId);

	return userId;
}

async function grantMemberProjectAccess(
	projectId: string,
	memberId: string,
	grantedById: string
): Promise<void> {
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
		console.error("[seed] Failed to grant member project access:", error);
	}
}

async function seedTeamMembers(
	projectId: string,
	orgId: string,
	ownerId: string
): Promise<void> {
	for (const member of TEAM_MEMBERS) {
		const userId = await createMemberUser(
			member.email,
			"password",
			member.name,
			orgId
		);

		if (!userId) continue;

		await grantMemberProjectAccess(projectId, userId, ownerId);

		const { data: generalThread } = await supabaseAdmin
			.from("chat_threads")
			.select("id")
			.eq("project_id", projectId)
			.eq("topic", "General")
			.maybeSingle();

		if (generalThread) {
			await supabaseAdmin.from("chat_thread_participants").upsert(
				{
					thread_id: generalThread.id,
					user_id: userId,
				},
				{ onConflict: "thread_id,user_id" }
			);
		}
	}
}

async function createProject(
	ownerOrgId: string,
	projectName: string,
	assignedAdvisorId: string | null,
	creatorId: string
): Promise<string | null> {
	const { data: project, error: projectError } = await supabaseAdmin
		.from("projects")
		.insert({
			name: projectName,
			owner_org_id: ownerOrgId,
			assigned_advisor_id: assignedAdvisorId,
		})
		.select()
		.single();

	if (projectError || !project) {
		console.error("[seed] Failed to create project record:", projectError);
		return null;
	}

	const projectId = project.id;

	await supabaseAdmin.storage.from(ownerOrgId).upload(
		`${projectId}/.placeholder`,
		new Blob([""], { type: "text/plain" }),
		{ contentType: "text/plain;charset=UTF-8" }
	);
	await supabaseAdmin.storage.from(ownerOrgId).upload(
		`${projectId}/architectural-diagrams/.keep`,
		new Blob([""], { type: "text/plain" }),
		{ contentType: "text/plain;charset=UTF-8" }
	);
	await supabaseAdmin.storage.from(ownerOrgId).upload(
		`${projectId}/site-images/.keep`,
		new Blob([""], { type: "text/plain" }),
		{ contentType: "text/plain;charset=UTF-8" }
	);

	const { data: projectResumeResource } = await supabaseAdmin
		.from("resources")
		.insert({
			org_id: ownerOrgId,
			project_id: projectId,
			resource_type: "PROJECT_RESUME",
			name: `${projectName} Resume`,
		})
		.select()
		.single();

	const { data: projectDocsRootResource } = await supabaseAdmin
		.from("resources")
		.insert({
			org_id: ownerOrgId,
			project_id: projectId,
			resource_type: "PROJECT_DOCS_ROOT",
			name: `${projectName} Documents`,
		})
		.select()
		.single();

	await supabaseAdmin.rpc("ensure_project_borrower_roots", {
		p_project_id: projectId,
	});

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

	const { data: underwritingRoot } = await supabaseAdmin
		.from("resources")
		.insert({
			org_id: ownerOrgId,
			project_id: projectId,
			resource_type: "UNDERWRITING_DOCS_ROOT",
			name: "Underwriting Documents",
		})
		.select()
		.single();

	if (underwritingRoot?.id && assignedAdvisorId) {
		await supabaseAdmin.from("permissions").upsert({
			resource_id: underwritingRoot.id,
			user_id: assignedAdvisorId,
			permission: "edit",
			granted_by: creatorId,
		});
	}

	const { data: chatThread } = await supabaseAdmin
		.from("chat_threads")
		.insert({ project_id: projectId, topic: "General" })
		.select()
		.single();

	if (chatThread) {
		await supabaseAdmin.from("chat_thread_participants").insert([
			{ thread_id: chatThread.id, user_id: creatorId },
			...(assignedAdvisorId
				? [{ thread_id: chatThread.id, user_id: assignedAdvisorId }]
				: []),
		]);
	}

	console.log(`[seed] ✅ Created project: ${projectName} (${projectId})`);
	return projectId;
}

async function grantAdvisorPermissions(
	projectId: string,
	advisorId: string
): Promise<void> {
	const { error } = await supabaseAdmin.rpc(
		"grant_advisor_project_permissions",
		{
			p_project_id: projectId,
			p_advisor_id: advisorId,
			p_granted_by_id: advisorId,
		}
	);

	if (error) {
		console.warn(
			"[seed] Warning: failed to grant advisor permissions:",
			error.message
		);
	}
}

async function grantLenderAccess(
	projectId: string,
	advisorId: string
): Promise<void> {
	const lenderInfo = await createLenderAccount();
	if (!lenderInfo) {
		console.warn("[seed] Lender account creation failed, skipping lender access");
		return;
	}

	const { userId: lenderUserId, orgId: lenderOrgId } = lenderInfo;
	const { data: accessId, error: grantError } = await supabaseAdmin.rpc(
		"grant_lender_project_access",
		{
			p_lender_org_id: lenderOrgId,
			p_project_id: projectId,
			p_granted_by: advisorId,
		}
	);

	if (grantError) {
		console.error("[seed] Failed to grant lender access:", grantError.message);
		return;
	}

	console.log(
		`[seed] ✅ Granted lender access to project (access_id: ${accessId})`
	);

	const { data: underwritingRoot } = await supabaseAdmin
		.from("resources")
		.select("id")
		.eq("project_id", projectId)
		.eq("resource_type", "UNDERWRITING_DOCS_ROOT")
		.maybeSingle();

	if (!underwritingRoot) return;

	const { error: permissionError } = await supabaseAdmin
		.from("permissions")
		.upsert({
			resource_id: underwritingRoot.id,
			user_id: lenderUserId,
			permission: "view",
			granted_by: advisorId,
		});

	if (permissionError) {
		console.error(
			"[seed] Failed to grant lender underwriting-docs access:",
			permissionError
		);
	}
}

export async function runPropertyUpsurgeSeed(
	seedConfig: PropertyUpsurgeSeedConfig
): Promise<void> {
	console.log(
		`🌱 Starting property-upsurge seed for ${seedConfig.projectName}...\n`
	);
	console.log(`[seed] Source data: ${seedConfig.sourceJsonFile}`);
	console.log(
		"[seed] Reusing the shared advisor, borrower, lender, and team-member accounts from the Hoque/demo seed flows.\n"
	);

	const advisorInfo = await createAdvisorAccount();
	if (!advisorInfo) {
		throw new Error("Unable to create advisor account");
	}

	const borrowerInfo = await getOrCreateDemoBorrowerAccount();
	if (!borrowerInfo) {
		throw new Error("Unable to create borrower account");
	}

	const { userId: advisorId } = advisorInfo;
	const { userId: borrowerId, orgId: borrowerOrgId } = borrowerInfo;

	await ensureJeffRichmondOwner(borrowerOrgId);

	const projectId = await createProject(
		borrowerOrgId,
		seedConfig.projectName,
		advisorId,
		borrowerId
	);

	if (!projectId) {
		throw new Error(`Unable to create project ${seedConfig.projectName}`);
	}

	await grantAdvisorPermissions(projectId, advisorId);

	const projectSeeded = await seedProjectResume(
		projectId,
		borrowerId,
		seedConfig.projectResume
	);
	if (!projectSeeded) {
		throw new Error("Unable to seed project resume");
	}

	const borrowerSeeded = await seedBorrowerResume(
		projectId,
		borrowerId,
		seedConfig.borrowerResume
	);
	if (!borrowerSeeded) {
		throw new Error("Unable to seed borrower resume");
	}

	await seedTeamMembers(projectId, borrowerOrgId, borrowerId);
	await grantLenderAccess(projectId, advisorId);

	console.log(
		`\n✅ Property-upsurge seed completed successfully for ${seedConfig.projectName}`
	);
	console.log(`[seed] Project ID: ${projectId}`);
	console.log("[seed] Notes:");
	console.log(
		"  - Hoque-style users/orgs/permissions/team access were preserved."
	);
	console.log(
		"  - Project and borrower resumes were populated from the ATTOM bundle plus a small set of explicit workflow assumptions."
	);
	console.log(
		"  - SoGood-specific docs, images, and chat message fixtures were intentionally not seeded because no matching artifacts were provided."
	);
}

/**
 * Deletes all projects matching `projectName` and related rows (same pattern as
 * seed-marshall-project / seed-lasalle-project). Does not remove shared demo users/orgs.
 */
export async function cleanupPropertyUpsurgeProject(
	projectName: string
): Promise<void> {
	console.log(`🧹 Cleaning up property-upsurge project: ${projectName}...\n`);

	const { data: projects } = await supabaseAdmin
		.from("projects")
		.select("id, name, owner_org_id")
		.eq("name", projectName);

	if (!projects?.length) {
		console.log(`[cleanup] No project found with name "${projectName}".`);
		return;
	}

	const projectIds = projects.map((p) => p.id);

	for (const project of projects) {
		await supabaseAdmin
			.from("lender_project_access")
			.delete()
			.eq("project_id", project.id);

		const { data: threads } = await supabaseAdmin
			.from("chat_threads")
			.select("id")
			.eq("project_id", project.id);

		if (threads?.length) {
			const tids = threads.map((t) => t.id);
			await supabaseAdmin
				.from("chat_thread_participants")
				.delete()
				.in("thread_id", tids);
			await supabaseAdmin.from("chat_threads").delete().eq("project_id", project.id);
		}

		const { data: resources } = await supabaseAdmin
			.from("resources")
			.select("id")
			.eq("project_id", project.id);

		if (resources?.length) {
			const rids = resources.map((r) => r.id);
			await supabaseAdmin.from("permissions").delete().in("resource_id", rids);
			await supabaseAdmin.from("resources").delete().in("id", rids);
		}

		await supabaseAdmin.from("project_resumes").delete().eq("project_id", project.id);
		await supabaseAdmin.from("borrower_resumes").delete().eq("project_id", project.id);
		await supabaseAdmin.from("om").delete().eq("project_id", project.id);
	}

	await supabaseAdmin
		.from("project_access_grants")
		.delete()
		.in("project_id", projectIds);

	await supabaseAdmin.from("projects").delete().in("id", projectIds);

	console.log(
		`[cleanup] ✅ Deleted ${projects.length} project(s) named "${projectName}". Borrower/advisor/lender preserved.`
	);
}

/**
 * CLI entry: `npx tsx scripts/seed-…-project.ts [--prod] [cleanup]`
 */
export async function propertyUpsurgeMain(
	seedConfig: PropertyUpsurgeSeedConfig
): Promise<void> {
	if (isProduction && !isCleanup) {
		console.log("⚠️  PRODUCTION MODE. Wait 5s to cancel...\n");
		await new Promise((r) => setTimeout(r, 5000));
	}
	if (isProduction && isCleanup) {
		console.log("⚠️  PRODUCTION CLEANUP. Wait 5s to cancel...\n");
		await new Promise((r) => setTimeout(r, 5000));
	}

	if (isCleanup) {
		await cleanupPropertyUpsurgeProject(seedConfig.projectName);
		console.log("\n✨ Cleanup done!");
		return;
	}

	await runPropertyUpsurgeSeed(seedConfig);
}
