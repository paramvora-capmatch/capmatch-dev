import { NextResponse } from "next/server";
import { useMockData, getBackendUrl } from "@/lib/apiConfig";
import { extractBorrowerFields } from "@/services/mockBorrowerFieldExtraction";
import { createClient } from "@supabase/supabase-js";

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

		// Check if we should use mock data
		if (useMockData()) {
			console.log("[API] Using mock data for borrower-resume autofill");

			// Use mock data - extract fields and save directly
			try {
				// Add a delay to simulate processing time and allow animation to play
				await new Promise((resolve) => setTimeout(resolve, 2000));

				// Extract fields using mock service
				const extractedFields = await extractBorrowerFields(
					project_id,
					document_paths
				);

				// Convert extracted fields to the format expected by save function
				const resumeData: any = {};
				const metadata: any = {};

				for (const [fieldId, fieldData] of Object.entries(
					extractedFields
				)) {
					if (
						fieldData &&
						typeof fieldData === "object" &&
						"value" in fieldData
					) {
						// Rich format with metadata
						resumeData[fieldId] = fieldData.value;
						metadata[fieldId] = {
							value: fieldData.value,
							source: fieldData.source || null,
							original_source: fieldData.source || null,
							original_value: fieldData.value,
							warnings: fieldData.warnings || [],
						};
					} else {
						// Flat format
						resumeData[fieldId] = fieldData;
					}
				}

				// Check for existing resource pointer
				const { data: resource, error: resourceError } =
					await supabaseAdmin
						.from("resources")
						.select("id, current_version_id")
						.eq("project_id", project_id)
						.eq("resource_type", "BORROWER_RESUME")
						.maybeSingle();

				if (resourceError && resourceError.code !== "PGRST116") {
					console.warn(
						"[saveProjectBorrowerResume] Failed to read resource pointer:",
						resourceError
					);
				}

				// Prepare final content (merge with metadata structure)
				const finalContent: any = {};
				for (const key in resumeData) {
					if (key === "_metadata") continue;

					const currentValue = resumeData[key];
					const meta = metadata[key];

					if (meta) {
						finalContent[key] = {
							value: currentValue,
							source: meta.source,
							warnings: meta.warnings,
						};
					} else {
						finalContent[key] = currentValue;
					}
				}

				if (resource?.current_version_id) {
					// Update existing resume
					const { error } = await supabaseAdmin
						.from("borrower_resumes")
						.update({ content: finalContent })
						.eq("id", resource.current_version_id);

					if (error) {
						throw new Error(
							`Failed to update borrower resume: ${error.message}`
						);
					}
				} else {
					// Insert new resume
					const { data: inserted, error: insertError } =
						await supabaseAdmin
							.from("borrower_resumes")
							.insert({
								project_id,
								content: finalContent,
							})
							.select("id")
							.single();

					if (insertError) {
						throw new Error(
							`Failed to create borrower resume: ${insertError.message}`
						);
					}

					// Update/create resource pointer
					if (resource?.id) {
						const { error: pointerError } = await supabaseAdmin
							.from("resources")
							.update({ current_version_id: inserted.id })
							.eq("id", resource.id);

						if (pointerError) {
							console.warn(
								"[saveProjectBorrowerResume] Failed to update resource pointer:",
								pointerError
							);
						}
					} else {
						const { error: resourceError } = await supabaseAdmin
							.from("resources")
							.upsert(
								{
									project_id,
									resource_type: "BORROWER_RESUME",
									current_version_id: inserted.id,
								},
								{ onConflict: "project_id,resource_type" }
							);

						if (resourceError) {
							console.warn(
								"[saveProjectBorrowerResume] Failed to create resource pointer:",
								resourceError
							);
						}
					}
				}

				// Return success response
				const response: AnalysisResponse = {
					status: "processing",
					message: "Mock autofill completed",
					project_id,
				};

				return NextResponse.json(response, { status: 202 });
			} catch (error) {
				console.error("Mock autofill error:", error);
				return NextResponse.json(
					{ error: "Failed to process mock autofill" },
					{ status: 500 }
				);
			}
		} else {
			// Use real backend API
			console.log(
				"[API] Proxying to backend for borrower-resume autofill"
			);
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
					{
						error: `Backend analysis failed: ${backendResponse.statusText}`,
					},
					{ status: backendResponse.status }
				);
			}

			const backendData: AnalysisResponse = await backendResponse.json();
			return NextResponse.json(backendData, { status: 202 });
		}
	} catch (error) {
		console.error("Autofill API error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
