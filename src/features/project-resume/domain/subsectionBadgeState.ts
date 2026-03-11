/**
 * Pure helper to compute subsection badge and lock-button state.
 */
import { isProjectValueProvided } from "./isProjectValueProvided";
import type { FieldStateContext } from "./fieldStateSelectors";
import {
	isFieldLocked,
	isSubsectionFullyLocked,
} from "./lockSelectors";
import { isFieldBlue, isFieldGreen, isFieldWhite } from "./fieldStateSelectors";

export interface SubsectionBadgeState {
	showError: boolean;
	showNeedsInput: boolean;
	showComplete: boolean;
	subsectionLocked: boolean;
	hasEmptyField: boolean;
	subsectionLockDisabled: boolean;
	subsectionLockTitle: string;
}

export function getSubsectionBadgeState(
	ctx: FieldStateContext,
	allFieldIds: string[]
): SubsectionBadgeState {
	const subsectionLocked = isSubsectionFullyLocked(ctx, allFieldIds);

	const fieldStates =
		allFieldIds.length > 0
			? allFieldIds.map((fieldId) => {
					const meta = ctx.fieldMetadata[fieldId];
					const hasWarnings =
						meta?.warnings && meta.warnings.length > 0;
					return {
						isBlue: isFieldBlue(ctx, fieldId),
						isGreen: isFieldGreen(ctx, fieldId),
						isWhite: isFieldWhite(ctx, fieldId),
						hasValue: isProjectValueProvided(ctx.formData[fieldId]),
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
