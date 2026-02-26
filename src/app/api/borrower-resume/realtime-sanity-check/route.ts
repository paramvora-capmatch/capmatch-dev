import { NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/apiConfig";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getRateLimitId, GENERAL_RATE_LIMIT } from "@/lib/rate-limit";

export async function POST(request: Request) {
	try {
		const supabase = await createClient();
		const { data: { user }, error: authError } = await supabase.auth.getUser();
		if (authError || !user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const rlId = getRateLimitId(request, user.id);
		const rl = checkRateLimit(rlId, GENERAL_RATE_LIMIT, "borrower-realtime-sanity");
		if (!rl.allowed) return rl.response;

		const body = await request.json();
		const backendUrl = getBackendUrl();

		if (!backendUrl) {
			return NextResponse.json(
				{ error: "Backend URL not configured" },
				{ status: 500 }
			);
		}

		const authHeader = request.headers.get("Authorization");

		const response = await fetch(
			`${backendUrl}/api/v1/borrower-resume/realtime-sanity-check`,
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
	} catch (error: any) {
		console.error("Realtime sanity check error:", error);
		return NextResponse.json(
			{ error: error.message || "Internal server error" },
			{ status: 500 }
		);
	}
}

