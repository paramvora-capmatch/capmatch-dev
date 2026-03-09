/**
 * Pure selectors for borrower resume lock state.
 * Used by BorrowerResumeForm; no React dependencies.
 */

export interface BorrowerLockSelectorContext {
	lockedFields: Set<string>;
	unlockedFields: Set<string>;
	fieldMetadata: Record<string, { warnings?: string[]; sources?: unknown[]; source?: unknown }>;
}

/** Fields with warnings must remain editable (red), never locked. */
export function isFieldLocked(
	ctx: BorrowerLockSelectorContext,
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
	ctx: BorrowerLockSelectorContext,
	fieldIds: string[]
): boolean {
	if (fieldIds.length === 0) return false;
	return fieldIds.every(
		(fieldId) =>
			!ctx.unlockedFields.has(fieldId) && ctx.lockedFields.has(fieldId)
	);
}
