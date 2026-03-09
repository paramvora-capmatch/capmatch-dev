/**
 * Whether all principal rows have required fields filled (name + role).
 */
export function hasCompletePrincipals(principals: unknown): boolean {
	if (!Array.isArray(principals) || principals.length === 0) return false;
	return principals.every((p: { principalLegalName?: string; principalRoleDefault?: string }) => {
		const name = (p?.principalLegalName || "").trim();
		const role = (p?.principalRoleDefault || "").trim();
		return name.length > 0 && role.length > 0;
	});
}
