import { NextResponse } from "next/server";
import { shouldUseMockData, getBackendUrl } from "@/lib/apiConfig";
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
		if (shouldUseMockData()) {
			console.log("[API] Using mock data for borrower-resume autofill");

			// Use mock data - extract fields and save directly
			try {
				// Add a delay to simulate processing time and allow animation to play
				await new Promise((resolve) => setTimeout(resolve, 2000));

				// Extract fields using mock service (now returns section-wise format)
				const extractedFields = await extractBorrowerFields(
					project_id,
					document_paths
				);

				// Keep section-wise structure - don't flatten
				// Format: { section_1: { fieldId: { value, sources, warnings, original_value } } }
				// Convert to database format (still section-wise, but ensure all fields have proper structure)
				const finalContent: any = {};

				// Iterate through sections
				for (const [sectionId, sectionFields] of Object.entries(
					extractedFields
				)) {
					finalContent[sectionId] = {};

					// Iterate through fields in each section
					for (const [fieldId, fieldData] of Object.entries(
						sectionFields
					)) {
						if (
							fieldData &&
							typeof fieldData === "object" &&
							"value" in fieldData
						) {
							// Rich format with metadata - ensure sources is always an array
							const sources = Array.isArray(fieldData.sources)
								? fieldData.sources
								: fieldData.sources
								? [fieldData.sources]
								: [];

							finalContent[sectionId][fieldId] = {
								value: fieldData.value,
								sources: sources, // Only sources array, no source field
								warnings: fieldData.warnings || [],
								original_value:
									fieldData.original_value ?? fieldData.value,
							};
						} else {
							// Flat format (shouldn't happen with new schema, but handle gracefully)
							finalContent[sectionId][fieldId] = fieldData;
						}
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

				// finalContent is already in section-wise format, ready to save

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
