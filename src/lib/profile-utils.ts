import type { SupabaseClient } from "@supabase/supabase-js";

export interface ProfileBasic {
	id: string;
	full_name?: string | null;
	email?: string | null;
}

/**
 * Batch-fetch profiles by user IDs. Returns a Map for quick lookup.
 * Use in useChatStore, useProjectMembers, and anywhere else that needs id/full_name/email.
 */
export async function fetchProfilesMap(
	supabase: SupabaseClient,
	userIds: string[]
): Promise<Map<string, ProfileBasic>> {
	const map = new Map<string, ProfileBasic>();
	if (userIds.length === 0) return map;
	const { data, error } = await supabase
		.from("profiles")
		.select("id, full_name, email")
		.in("id", userIds);
	if (error) {
		console.error("[profile-utils] Error fetching profiles:", error);
		return map;
	}
	(data || []).forEach((row: ProfileBasic) => {
		map.set(row.id, {
			id: row.id,
			full_name: row.full_name ?? null,
			email: row.email ?? null,
		});
	});
	return map;
}
