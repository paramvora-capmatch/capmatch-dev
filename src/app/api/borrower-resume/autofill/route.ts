import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/apiConfig";
import { validateBody, autofillBodySchema } from "@/lib/api-validation";
import { checkRateLimit, getRateLimitId, AUTOFILL_RATE_LIMIT } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { verifyProjectAccess } from "@/lib/verify-project-access";
import { unauthorized, validationError, forbidden } from "@/lib/api-errors";
import { logger } from "@/lib/logger";

interface AnalysisResponse {
	status: string;
	message: string;
	project_id: string;
	job_id?: string;
}

export async function POST(request: NextRequest) {
	try {
		const supabase = await createClient();
		const { data: { user }, error: authError } = await supabase.auth.getUser();
		if (authError || !user) {
			return unauthorized();
		}

		const [err, body] = await validateBody(request, autofillBodySchema);
		if (err) return err;
		if (!body) return validationError("Validation failed");

		const { project_id, project_address, document_paths } = body;

		const hasAccess = await verifyProjectAccess(supabase, project_id);
		if (!hasAccess) {
			return forbidden();
		}

		const rlId = getRateLimitId(request, user.id);
		const rl = checkRateLimit(rlId, AUTOFILL_RATE_LIMIT, 'borrower-resume-autofill');
		if (!rl.allowed) return rl.response;

		// Always proxy to backend - backend will decide whether to use mock or real extraction
		logger.info("[API] Proxying to backend for borrower-resume autofill");
		const backendUrl = getBackendUrl();
		
		// Extract auth token
		const authHeader = request.headers.get("Authorization");
		
		const backendResponse = await fetch(
			`${backendUrl}/api/v1/borrower-resume/autofill`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(authHeader && { "Authorization": authHeader }),
				},
				body: JSON.stringify({
					project_id,
					project_address,
					document_paths,
					user_id: user.id,
				}),
			}
		);

		if (!backendResponse.ok) {
			const errorText = await backendResponse.text();
			logger.error({ errorText, status: backendResponse.status }, "Backend error");
			return NextResponse.json(
				{ error: "Analysis request failed. Please try again." },
				{ status: backendResponse.status }
			);
		}

		const backendData: AnalysisResponse = await backendResponse.json();
		return NextResponse.json(backendData, { status: 202 });
	} catch (error) {
		logger.error({ err: error }, "Autofill API error");
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
