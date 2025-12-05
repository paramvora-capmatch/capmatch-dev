import { NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/apiConfig";

interface AutofillRequest {
	project_id: string;
	project_address: string;
	document_paths: string[];
	user_id: string;
}

interface AnalysisResponse {
	status: string;
	message: string;
	project_id: string;
}

export async function POST(request: Request) {
	try {
		const body: AutofillRequest = await request.json();
		const { project_id, project_address, document_paths, user_id } = body;

		if (!project_id) {
			return NextResponse.json(
				{ error: "project_id is required" },
				{ status: 400 }
			);
		}

		// Always proxy to backend - backend will decide whether to use mock or real extraction
		console.log("[API] Proxying to backend for borrower-resume autofill");
		const backendUrl = getBackendUrl();
		const backendResponse = await fetch(
			`${backendUrl}/api/v1/borrower-resume/autofill`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					project_id,
					project_address,
					document_paths,
					user_id,
				}),
			}
		);

		if (!backendResponse.ok) {
			const errorText = await backendResponse.text();
			console.error("Backend error:", errorText);
			return NextResponse.json(
				{ error: `Backend analysis failed: ${backendResponse.statusText}` },
				{ status: backendResponse.status }
			);
		}

		const backendData: AnalysisResponse = await backendResponse.json();
		return NextResponse.json(backendData, { status: 202 });
	} catch (error) {
		console.error("Autofill API error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
