/**
 * Normalize various legacy source shapes into a single SourceMetadata-like object.
 * Used when building rich field values in project-queries (project and borrower resume).
 */
export function toSourceObject(input: unknown): { type: string; name?: string } {
	if (input == null) return { type: "user_input" };

	// Already a SourceMetadata-like object
	if (
		typeof input === "object" &&
		input !== null &&
		"type" in (input as object)
	) {
		return input as { type: string; name?: string };
	}

	// Legacy array form – take first entry
	if (Array.isArray(input) && input.length > 0) {
		const first = input[0];
		if (
			typeof first === "object" &&
			first !== null &&
			"type" in first
		) {
			return first as { type: string; name?: string };
		}
		if (typeof first === "string") {
			const normalized = first.toLowerCase().trim();
			if (
				normalized === "user_input" ||
				normalized === "user input"
			) {
				return { type: "user_input" };
			}
			return { type: "document", name: first };
		}
	}

	// Legacy string source
	if (typeof input === "string") {
		const normalized = input.toLowerCase().trim();
		if (normalized === "user_input" || normalized === "user input") {
			return { type: "user_input" };
		}
		return { type: "document", name: input };
	}

	return { type: "user_input" };
}
