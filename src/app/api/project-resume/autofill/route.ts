import { NextResponse } from "next/server";
import { useMockData, getBackendUrl } from "@/lib/apiConfig";
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
		if (useMockData()) {
			console.log("[API] Using mock data for project-resume autofill");
			
			// Use mock data - extract fields and save directly
			try {
				// Add a delay to simulate processing time and allow animation to play
				await new Promise(resolve => setTimeout(resolve, 2000));
				
				// Extract fields using mock service
				const extractedFields = await extractProjectFields(
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

				// Find the latest existing row for this project
				const { data: existing } = await supabaseAdmin
					.from('project_resumes')
					.select('id, content')
					.eq('project_id', project_id)
					.order('created_at', { ascending: false })
					.limit(1)
					.maybeSingle();

				// Extract metadata and prepare final content
				const finalContent: any = {};
				
				// Iterate over fields to construct the JSONB object
				for (const key in resumeData) {
					if (key === '_metadata') continue; // Skip metadata container
					
					const currentValue = resumeData[key];
					const meta = metadata[key];
					
					if (meta) {
						// If we have metadata, save the full structure
						finalContent[key] = {
							value: currentValue,
							source: meta.source,
							warnings: meta.warnings
						};
					} else {
						// Check if existing content has rich format for this field
						const existingItem = existing?.content?.[key];
						if (existingItem && typeof existingItem === 'object' && 'source' in existingItem) {
							// Preserve existing metadata structure if no new metadata provided
							finalContent[key] = {
								value: currentValue,
								source: existingItem.source,
								warnings: existingItem.warnings || []
							};
						} else {
							// Save flat value if no metadata exists
							finalContent[key] = currentValue;
						}
					}
				}

				if (existing) {
					// Update in Place: Modify the current version directly
					const mergedContent = { ...existing.content, ...finalContent };
					
					const { error } = await supabaseAdmin
						.from('project_resumes')
						.update({ content: mergedContent as any })
						.eq('id', existing.id);

					if (error) {
						throw new Error(`Failed to update project resume: ${error.message}`);
					}
				} else {
					// Insert New: Brand new project resume
					const { data: newResume, error } = await supabaseAdmin
						.from('project_resumes')
						.insert({ 
							project_id, 
							content: finalContent as any 
						})
						.select('id')
						.single();

					if (error) {
						throw new Error(`Failed to create project resume: ${error.message}`);
					}

					// Update/create the resource pointer
					const { error: resourceError } = await supabaseAdmin
						.from('resources')
						.upsert({
							project_id,
							resource_type: 'PROJECT_RESUME',
							current_version_id: newResume.id
						}, { onConflict: 'project_id,resource_type' });
						
					if (resourceError) {
						console.warn('Failed to update resource pointer:', resourceError.message);
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

