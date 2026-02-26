"use server";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { saveVersionBodySchema, validationErrorResponse, safeErrorResponse } from "@/lib/api-validation";
import { verifyProjectAccess } from "@/lib/verify-project-access";
import { checkRateLimit, getRateLimitId, GENERAL_RATE_LIMIT } from "@/lib/rate-limit";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
	throw new Error(
		"Missing SUPABASE configuration. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set."
	);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
	auth: { persistSession: false, autoRefreshToken: false },
});

export async function POST(request: Request) {
	const supabase = await createServerClient();
	const { data: { user }, error: authError } = await supabase.auth.getUser();
	if (authError || !user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const rlId = getRateLimitId(request, user.id);
	const rl = checkRateLimit(rlId, GENERAL_RATE_LIMIT, "borrower-resume-save-version");
	if (!rl.allowed) return rl.response;

	console.log("[API] Borrower resume save-version called");
	const rawBody = await request.text();
	let payload: unknown = {};
	if (rawBody) {
		try {
			payload = JSON.parse(rawBody);
		} catch (error) {
			console.error(
				"[API] Failed to parse save-version request body:",
				error
			);
			return NextResponse.json(
				{ error: "Invalid request body. Expected JSON." },
				{ status: 400 }
			);
		}
	}

	const parsed = saveVersionBodySchema.safeParse(payload);
	if (!parsed.success) {
		return validationErrorResponse("Validation failed", parsed.error.issues);
	}
	const { projectId, userId } = parsed.data;
	if (!projectId) {
		return NextResponse.json({ error: "projectId is required" }, { status: 400 });
	}
	console.log(
		"[API] Saving borrower resume version for project:",
		projectId,
		"user:",
		userId
	);

	const hasAccess = await verifyProjectAccess(supabase, projectId);
	if (!hasAccess) {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	const { data: resource, error: resourceError } = await supabaseAdmin
		.from("resources")
		.select("id, current_version_id")
		.eq("project_id", projectId)
		.eq("resource_type", "BORROWER_RESUME")
		.maybeSingle();

	if (resourceError) {
		return safeErrorResponse(resourceError, "Failed to save version", 500);
	}

	if (!resource?.id) {
		return NextResponse.json(
			{ error: "Borrower resume resource not found" },
			{ status: 404 }
		);
	}

	let resumeRow: {
		content: Record<string, unknown> | null;
	} | null = null;

	let completenessPercent: number | undefined;
	if (resource.current_version_id) {
		const { data, error: resumeError } = await supabaseAdmin
			.from("borrower_resumes")
			.select("content, completeness_percent")
			.eq("id", resource.current_version_id)
			.maybeSingle();
		if (resumeError) {
			return safeErrorResponse(resumeError, "Failed to load resume", 500);
		}
		resumeRow = data;
		completenessPercent = data?.completeness_percent;
	}

	if (!resumeRow) {
		const { data, error: latestError } = await supabaseAdmin
			.from("borrower_resumes")
			.select("content, completeness_percent")
			.eq("project_id", projectId)
			.order("created_at", { ascending: false })
			.limit(1)
			.maybeSingle();
		if (latestError) {
			return safeErrorResponse(latestError, "Failed to load resume", 500);
		}
		resumeRow = data;
		completenessPercent = data?.completeness_percent;
	}

	if (!resumeRow) {
		return NextResponse.json(
			{ error: "No resume data found for project" },
			{ status: 404 }
		);
	}

	// Create new version snapshot
	const { data: inserted, error: insertError } = await supabaseAdmin
		.from("borrower_resumes")
		.insert({
			project_id: projectId,
			content: resumeRow.content || {},
			completeness_percent: completenessPercent ?? 0,
			created_by: user.id,
		})
		.select("id, version_number")
		.single();

	if (insertError || !inserted) {
		return safeErrorResponse(insertError, "Failed to snapshot resume", 500);
	}

	// Update resource pointer to the new version
	const { error: updateResourceError } = await supabaseAdmin
		.from("resources")
		.update({ current_version_id: inserted.id })
		.eq("id", resource.id);

	if (updateResourceError) {
		return safeErrorResponse(updateResourceError, "Failed to update version", 500);
	}

	console.log("[API] Successfully saved borrower resume version:", {
		versionId: inserted.id,
		versionNumber: inserted.version_number,
		projectId,
	});

	return NextResponse.json({
		ok: true,
		versionId: inserted.id,
		versionNumber: inserted.version_number,
	});
}
