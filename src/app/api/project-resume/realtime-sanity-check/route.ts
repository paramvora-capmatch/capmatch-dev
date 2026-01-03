import { NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/apiConfig";

const backendUrl = getBackendUrl();

export async function POST(request: Request) {
	try {
		const body = await request.json();

		if (!backendUrl) {
			return NextResponse.json(
				{ error: "Backend URL not configured" },
				{ status: 500 }
			);
		}

		// Extract auth token
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
			const errorText = await response.text();
			return NextResponse.json(
				{ error: errorText || "Realtime sanity check failed" },
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

