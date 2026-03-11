/**
 * Pure selectors for borrower resume field display state (red/blue/white/green).
 * Depends on lock selectors and isBorrowerValueProvided.
 */
import { isBorrowerValueProvided } from "./isBorrowerValueProvided";
import {
	isFieldLocked,
	type BorrowerLockSelectorContext,
} from "./lockSelectors";

export interface BorrowerFieldStateContext extends BorrowerLockSelectorContext {
	formData: Record<string, unknown>;
}

function hasSource(meta: { source?: unknown; sources?: unknown[] } | undefined): boolean {
	if (!meta) return false;
	if (meta.source) return true;
	if (Array.isArray(meta.sources) && meta.sources.length > 0) return true;
	return false;
}

function hasWarnings(meta: { warnings?: string[] } | undefined): boolean {
	return !!(meta?.warnings && meta.warnings.length > 0);
}

/** Blue: has value or source, not locked, no warnings. */
export function isFieldBlue(
	ctx: BorrowerFieldStateContext,
	fieldId: string
): boolean {
	const value = ctx.formData[fieldId];
	const hasValue = isBorrowerValueProvided(value);
	const locked = isFieldLocked(ctx, fieldId);
	const meta = ctx.fieldMetadata[fieldId];
	const metaHasSource = hasSource(meta);
	const metaHasWarnings = hasWarnings(meta);

	if (locked) return false;
	if (metaHasWarnings) return false;
	if (!hasValue) return metaHasSource;
	return true;
}

/** White: no value and no source. */
export function isFieldWhite(
	ctx: BorrowerFieldStateContext,
	fieldId: string
): boolean {
	const value = ctx.formData[fieldId];
	const hasValue = isBorrowerValueProvided(value);
	const meta = ctx.fieldMetadata[fieldId];
	return !hasValue && !hasSource(meta);
}

/** Green: locked (regardless of warnings). */
export function isFieldGreen(
	ctx: BorrowerFieldStateContext,
	fieldId: string
): boolean {
	return isFieldLocked(ctx, fieldId);
}

/** Red: has warnings and not locked. */
export function isFieldRed(
	ctx: BorrowerFieldStateContext,
	fieldId: string
): boolean {
	const locked = isFieldLocked(ctx, fieldId);
	const meta = ctx.fieldMetadata[fieldId];
	return hasWarnings(meta) && !locked;
}
