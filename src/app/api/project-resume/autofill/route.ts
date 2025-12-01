import { NextResponse } from "next/server";
import { shouldUseMockData, getBackendUrl } from "@/lib/apiConfig";
import { extractProjectFields } from "@/services/mockProjectFieldExtraction";
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
			console.log("[API] Using mock data for project-resume autofill");

			// Use mock data - extract fields and save directly
			try {
				// Add a delay to simulate processing time and allow animation to play
				await new Promise((resolve) => setTimeout(resolve, 2000));

				// Check for existing resource pointer and load existing content
				const { data: resource, error: resourceError } =
					await supabaseAdmin
						.from("resources")
						.select("id, current_version_id")
						.eq("project_id", project_id)
						.eq("resource_type", "PROJECT_RESUME")
						.maybeSingle();

				if (resourceError && resourceError.code !== "PGRST116") {
					console.warn(
						"[saveProjectResume] Failed to read resource pointer:",
						resourceError
					);
				}

				// Load existing resume content to get locked fields
				let existingContent: any = {};
				let lockedFields: Record<string, boolean> = {};
				let lockedSections: Record<string, boolean> = {};

				if (resource?.current_version_id) {
					const { data: existingResume, error: fetchError } =
						await supabaseAdmin
							.from("project_resumes")
							.select("content")
							.eq("id", resource.current_version_id)
							.single();

					if (!fetchError && existingResume?.content) {
						existingContent = existingResume.content;
						lockedFields = (existingContent._lockedFields as Record<string, boolean>) || {};
						lockedSections = (existingContent._lockedSections as Record<string, boolean>) || {};
					}
				}

				// Extract fields using mock service (now returns section-wise format)
				const extractedFields = await extractProjectFields(
					project_id,
					document_paths
				);

				// Helper function to check if a field is locked
				const isFieldLocked = (fieldId: string, sectionId: string): boolean => {
					// Check if field is explicitly locked
					if (lockedFields[fieldId] === true) {
						return true;
					}
					// Check if field belongs to a locked section
					// Map section keys (section_1, section_2, etc.) to section IDs (basic-info, property-specs, etc.)
					const sectionIdMap: Record<string, string> = {
						section_1: "basic-info",
						section_2: "property-specs",
						section_3: "dev-budget",
						section_3_1: "dev-budget",
						section_3_2: "loan-info",
						section_3_3: "financials",
						section_4: "market-context",
						section_5: "special-considerations",
						section_6: "timeline",
						section_7: "site-context",
						section_8: "sponsor-info",
					};
					const mappedSectionId = sectionIdMap[sectionId] || sectionId;
					if (lockedSections[mappedSectionId] === true) {
						return true;
					}
					return false;
				};

				// Keep section-wise structure - don't flatten
				// Format: { section_1: { fieldId: { value, sources, warnings, original_value } } }
				// Convert to database format (still section-wise, but ensure all fields have proper structure)
				const finalContent: any = {};

				// Start with existing content structure (preserve existing fields)
				if (existingContent) {
					for (const [key, value] of Object.entries(existingContent)) {
						// Skip metadata keys - we'll handle them separately
						if (key === "_lockedFields" || key === "_lockedSections" || key === "_fieldStates" || key === "_metadata") {
							continue;
						}
						// Preserve existing section structure
						if (typeof value === "object" && value !== null && !Array.isArray(value)) {
							finalContent[key] = { ...value };
						} else {
							finalContent[key] = value;
						}
					}
				}

				// Iterate through sections from extracted fields
				for (const [sectionId, sectionFields] of Object.entries(
					extractedFields
				)) {
					// Initialize section if it doesn't exist
					if (!finalContent[sectionId]) {
						finalContent[sectionId] = {};
					}

					// Iterate through fields in each section
					for (const [fieldId, fieldData] of Object.entries(
						sectionFields
					)) {
						// Check if field is locked - if so, preserve existing value
						if (isFieldLocked(fieldId, sectionId)) {
							console.log(`[Autofill] Field '${fieldId}' is locked, preserving existing value`);
							// Preserve existing field value if it exists
							if (finalContent[sectionId][fieldId]) {
								// Keep existing value but merge warnings if needed
								const existingField = finalContent[sectionId][fieldId];
								if (typeof existingField === "object" && existingField !== null && "value" in existingField) {
									const newWarnings = (fieldData as any)?.warnings || [];
									const existingWarnings = existingField.warnings || [];
									const combinedWarnings = Array.from(new Set([...existingWarnings, ...newWarnings]));
									finalContent[sectionId][fieldId] = {
										...existingField,
										warnings: combinedWarnings,
									};
								}
								// If not in rich format, keep as-is
							}
							// If field doesn't exist, skip it (locked field with no value)
							continue;
						}

						// Field is not locked - apply extracted value
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

				// Preserve locked fields and locked sections metadata
				finalContent._lockedFields = lockedFields;
				finalContent._lockedSections = lockedSections;

				// Save the updated content
				if (resource?.current_version_id) {
					// Update existing resume
					const { error } = await supabaseAdmin
						.from("project_resumes")
						.update({ content: finalContent })
						.eq("id", resource.current_version_id);

					if (error) {
						throw new Error(
							`Failed to update project resume: ${error.message}`
						);
					}
				} else {
					// Insert new resume (no existing locked fields for new resumes)
					// Ensure _lockedFields and _lockedSections are initialized
					if (!finalContent._lockedFields) {
						finalContent._lockedFields = {};
					}
					if (!finalContent._lockedSections) {
						finalContent._lockedSections = {};
					}

					const { data: inserted, error: insertError } =
						await supabaseAdmin
							.from("project_resumes")
							.insert({
								project_id,
								content: finalContent,
							})
							.select("id")
							.single();

					if (insertError) {
						throw new Error(
							`Failed to create project resume: ${insertError.message}`
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
								"[saveProjectResume] Failed to update resource pointer:",
								pointerError
							);
						}
					} else {
						const { error: resourceError } = await supabaseAdmin
							.from("resources")
							.upsert(
								{
									project_id,
									resource_type: "PROJECT_RESUME",
									current_version_id: inserted.id,
								},
								{ onConflict: "project_id,resource_type" }
							);

						if (resourceError) {
							console.warn(
								"[saveProjectResume] Failed to create resource pointer:",
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
			console.log("[API] Proxying to backend for project-resume autofill");
			const backendUrl = getBackendUrl();
			const backendResponse = await fetch(
				`${backendUrl}/api/v1/project-resume/autofill`,
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
		}
	} catch (error) {
		console.error("Autofill API error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

