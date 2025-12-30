/**
 * API client for realtime sanity checks
 * Used when user edits a field to validate the input in realtime
 */

import { supabase } from "@/lib/supabaseClient";

export interface RealtimeSanityCheckRequest {
	fieldId: string;
	value: any;
	resumeType: "project" | "borrower";
	context?: Record<string, any>;
	existingFieldData?: Record<string, any>;
	authToken?: string;
}

export interface RealtimeSanityCheckResponse {
	field_id: string;
	value: any;
	warnings: string[];
	is_valid: boolean;
}

/**
 * Check realtime sanity for a field value
 */
export async function checkRealtimeSanity(
	request: RealtimeSanityCheckRequest
): Promise<RealtimeSanityCheckResponse> {
	const endpoint =
		request.resumeType === "project"
			? "/api/project-resume/realtime-sanity-check"
			: "/api/borrower-resume/realtime-sanity-check";

	const session = await supabase.auth.getSession();
	const token = session.data.session?.access_token;

	if (!token) {
		console.warn("realtimeSanityCheck: No access token found in session");
	}

	const response = await fetch(endpoint, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...(token ? { Authorization: `Bearer ${token}` } : {}),
		},
		body: JSON.stringify({
			field_id: request.fieldId,
			value: request.value,
			resume_type: request.resumeType,
			context: request.context,
			existing_field_data: request.existingFieldData,
		}),
	});

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({ error: response.statusText }));
		throw new Error(errorData.error || `Realtime sanity check failed: ${response.statusText}`);
	}

	return response.json();
}

