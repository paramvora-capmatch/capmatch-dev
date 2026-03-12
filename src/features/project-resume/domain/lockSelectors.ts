/**
 * Pure selectors for project resume lock state.
 * Used by EnhancedProjectForm; no React dependencies.
 */

export interface LockSelectorContext {
	lockedFields: Set<string>;
	unlockedFields: Set<string>;
	fieldMetadata: Record<string, { warnings?: string[]; sources?: unknown[]; source?: unknown }>;
}

/** Fields with warnings must remain editable (red), never locked. */
export function isFieldLocked(
	ctx: LockSelectorContext,
	fieldId: string
): boolean {
	const { fieldMetadata, lockedFields, unlockedFields } = ctx;
	const meta = fieldMetadata[fieldId];
	const hasWarnings = meta?.warnings && meta.warnings.length > 0;
	if (hasWarnings) return false;
	if (unlockedFields.has(fieldId)) return false;
	if (lockedFields.has(fieldId)) return true;
	return false;
}

/** True when all given fields are locked (and not explicitly unlocked). */
export function isSubsectionFullyLocked(
	ctx: LockSelectorContext,
	fieldIds: string[]
): boolean {
	if (fieldIds.length === 0) return false;
	return fieldIds.every(
		(fieldId) =>
			!ctx.unlockedFields.has(fieldId) && ctx.lockedFields.has(fieldId)
	);
}
