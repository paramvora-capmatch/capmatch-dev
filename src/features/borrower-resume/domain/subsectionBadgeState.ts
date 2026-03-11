/**
 * Pure helper to compute subsection badge and lock-button state.
 */
import { isBorrowerValueProvided } from "./isBorrowerValueProvided";
import { hasCompletePrincipals } from "./hasCompletePrincipals";
import type { BorrowerFieldStateContext } from "./fieldStateSelectors";
import {
	isFieldLocked,
	isSubsectionFullyLocked,
} from "./lockSelectors";
import { isFieldBlue, isFieldGreen, isFieldWhite } from "./fieldStateSelectors";

export interface BorrowerSubsectionBadgeState {
	showError: boolean;
	showNeedsInput: boolean;
	showComplete: boolean;
	subsectionLocked: boolean;
	hasEmptyField: boolean;
	subsectionLockDisabled: boolean;
	subsectionLockTitle: string;
}

export function getSubsectionBadgeState(
	ctx: BorrowerFieldStateContext,
	allFieldIds: string[]
): BorrowerSubsectionBadgeState {
	const subsectionLocked = isSubsectionFullyLocked(ctx, allFieldIds);

	const fieldStates =
		allFieldIds.length > 0
			? allFieldIds.map((fieldId) => {
					const meta = ctx.fieldMetadata[fieldId];
					const hasWarnings =
						meta?.warnings && meta.warnings.length > 0;
					const rawValue = ctx.formData[fieldId];
					const hasValue =
						fieldId === "principals"
							? hasCompletePrincipals(rawValue)
							: isBorrowerValueProvided(rawValue);
					return {
						isBlue: isFieldBlue(ctx, fieldId),
						isGreen: isFieldGreen(ctx, fieldId),
						isWhite: isFieldWhite(ctx, fieldId),
						hasValue,
						isLocked: isFieldLocked(ctx, fieldId),
						hasWarnings,
					};
				})
			: [];

	const allGreen =
		fieldStates.length > 0 &&
		fieldStates.every(
			(s) =>
				s.isGreen && !s.isBlue && !s.isWhite && s.isLocked
		);
	const hasBlue = fieldStates.some((s) => s.isBlue);
	const hasWarnings = fieldStates.some((s) => s.hasWarnings);

	const showError = hasWarnings;
	const showNeedsInput = hasBlue;
	const showComplete =
		allFieldIds.length > 0 && allGreen && !hasBlue && !hasWarnings;

	const hasEmptyField = fieldStates.some((s) => !s.hasValue);
	const subsectionLockDisabled = !subsectionLocked && hasEmptyField;
	const subsectionLockTitle = subsectionLockDisabled
		? "Cannot lock subsection because one or more fields are empty. Please fill in all fields first."
		: subsectionLocked
			? "Unlock subsection"
			: "Lock subsection";

	return {
		showError,
		showNeedsInput,
		showComplete,
		subsectionLocked,
		hasEmptyField,
		subsectionLockDisabled,
		subsectionLockTitle,
	};
}
