import { NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/apiConfig";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getRateLimitId, GENERAL_RATE_LIMIT } from "@/lib/rate-limit";
import { safeErrorResponse } from "@/lib/api-validation";
import { unauthorized, internalError } from "@/lib/api-errors";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
	try {
		const supabase = await createClient();
		const { data: { user }, error: authError } = await supabase.auth.getUser();
		if (authError || !user) {
			return unauthorized();
		}

		const rlId = getRateLimitId(request, user.id);
		const rl = checkRateLimit(rlId, GENERAL_RATE_LIMIT, "project-realtime-sanity");
		if (!rl.allowed) return rl.response;

		const body = await request.json();
		const backendUrl = getBackendUrl();

		if (!backendUrl) {
			return internalError("Backend URL not configured");
		}

		const authHeader = request.headers.get("Authorization");

		const response = await fetch(
			`${backendUrl}/api/v1/project-resume/realtime-sanity-check`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(authHeader && { "Authorization": authHeader }),
				},
				body: JSON.stringify(body),
			}
		);

		if (!response.ok) {
			await response.text(); // consume body
			return NextResponse.json(
				{ error: "Realtime check failed" },
				{ status: response.status }
			);
		}

		const data = await response.json();
		return NextResponse.json(data);
	} catch (error: unknown) {
		logger.error({ err: error }, "Realtime sanity check error");
		return safeErrorResponse(error, "Internal server error");
	}
}

