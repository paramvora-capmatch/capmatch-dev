/**
 * Pure calculators for project resume derived fields.
 * Used by useProjectResumeDerivedFields; no React dependencies.
 */
import type { ProjectProfile } from "@/types/enhanced-types";
import { INCENTIVE_LABELS } from "@/components/forms/enhanced-project-form-constants";

const normalizeNumber = (v: unknown): number | null => {
	if (typeof v !== "number" || Number.isNaN(v)) return null;
	return v;
};

/**
 * Returns a partial profile with only derived fields that should be updated.
 * Caller merges with prev and updates state only when result is non-empty.
 */
export function computeDerivedFieldsPatch(
	prev: ProjectProfile,
	lockedFields: Set<string>
): Partial<ProjectProfile> | null {
	const next: Partial<ProjectProfile> = {};
	let changed = false;

	// 1) incentiveStacking
	if (!lockedFields.has("incentiveStacking")) {
		const activeLabels = INCENTIVE_LABELS.filter(({ key }) => {
			const flag = (prev as Record<string, unknown>)[key];
			return flag === true;
		}).map((item) => item.label);
		const derived =
			activeLabels.length > 0 ? activeLabels.join(", ") : null;
		const current = (prev as Record<string, unknown>).incentiveStacking;
		const currentStr =
			Array.isArray(current) && current.length > 0
				? current.join(", ")
				: typeof current === "string"
					? current
					: null;
		if (currentStr !== (derived ?? null)) {
			(next as Record<string, unknown>).incentiveStacking =
				derived === null ? undefined : derived;
			changed = true;
		}
	}

	// 2) targetLtvPercent
	if (!lockedFields.has("targetLtvPercent")) {
		const loanAmt = normalizeNumber(prev.loanAmountRequested);
		const stabilizedVal = normalizeNumber(prev.stabilizedValue);
		const derived =
			loanAmt && stabilizedVal && stabilizedVal !== 0
				? (loanAmt / stabilizedVal) * 100
				: null;
		const current = normalizeNumber(prev.targetLtvPercent);
		if (
			(current === null && derived !== null) ||
			(current !== null && derived === null) ||
			(current !== null &&
				derived !== null &&
				Math.abs(current - derived) > 0.0001)
		) {
			next.targetLtvPercent = derived === null ? undefined : derived;
			changed = true;
		}
	}

	// 3) targetLtcPercent
	if (!lockedFields.has("targetLtcPercent")) {
		const loanAmt = normalizeNumber(prev.loanAmountRequested);
		const tdc = normalizeNumber(prev.totalDevelopmentCost);
		const derived =
			loanAmt && tdc && tdc !== 0 ? (loanAmt / tdc) * 100 : null;
		const current = normalizeNumber(prev.targetLtcPercent);
		if (
			(current === null && derived !== null) ||
			(current !== null && derived === null) ||
			(current !== null &&
				derived !== null &&
				Math.abs(current - derived) > 0.0001)
		) {
			next.targetLtcPercent = derived === null ? undefined : derived;
			changed = true;
		}
	}

	// 4) totalCommercialGRSF
	if (!lockedFields.has("totalCommercialGRSF")) {
		const mix = Array.isArray(prev.commercialSpaceMix)
			? prev.commercialSpaceMix
			: [];
		const sum = mix.reduce((acc, row) => {
			const sf =
				row && typeof row.squareFootage === "number"
					? row.squareFootage
					: 0;
			return acc + (Number.isNaN(sf) ? 0 : sf);
		}, 0);
		const derived = sum > 0 ? sum : null;
		const current = normalizeNumber(prev.totalCommercialGRSF);
		if (
			(current === null && derived !== null) ||
			(current !== null && derived === null) ||
			(current !== null &&
				derived !== null &&
				current !== derived)
		) {
			next.totalCommercialGRSF =
				derived === null ? undefined : derived;
			changed = true;
		}
	}

	// 5) Unit mix counts from residentialUnitMix
	const mix = Array.isArray(prev.residentialUnitMix)
		? prev.residentialUnitMix
		: [];

	const computeUnitsForMatcher = (
		matcher: (unitType: string) => boolean
	): number | null => {
		let total = 0;
		for (const row of mix) {
			if (!row || typeof row.unitType !== "string") continue;
			const name = row.unitType.toLowerCase();
			if (!matcher(name)) continue;
			const count =
				typeof row.unitCount === "number" &&
					!Number.isNaN(row.unitCount)
					? row.unitCount
					: 1;
			total += count;
		}
		return total > 0 ? total : null;
	};

	const isStudio = (name: string) => name.includes("studio");
	const isOneBed = (name: string) =>
		name.includes("1br") ||
		name.includes("1 br") ||
		name.includes("one bed") ||
		name.includes("1-bed") ||
		name.includes("1 bed");
	const isTwoBed = (name: string) =>
		name.includes("2br") ||
		name.includes("2 br") ||
		name.includes("two bed") ||
		name.includes("2-bed") ||
		name.includes("2 bed");
	const isThreeBed = (name: string) =>
		name.includes("3br") ||
		name.includes("3 br") ||
		name.includes("three bed") ||
		name.includes("3-bed") ||
		name.includes("3 bed");

	const derivedStudio = computeUnitsForMatcher(isStudio);
	const derivedOne = computeUnitsForMatcher(isOneBed);
	const derivedTwo = computeUnitsForMatcher(isTwoBed);
	const derivedThree = computeUnitsForMatcher(isThreeBed);

	const countFields = [
		"studioCount",
		"oneBedCount",
		"twoBedCount",
		"threeBedCount",
	] as const;
	const derivedCounts = [derivedStudio, derivedOne, derivedTwo, derivedThree];
	countFields.forEach((fieldId, i) => {
		if (lockedFields.has(fieldId)) return;
		const derived = derivedCounts[i];
		const current = normalizeNumber((prev as Record<string, unknown>)[fieldId]);
		if (
			(current === null && derived !== null) ||
			(current !== null && derived === null) ||
			(current !== null &&
				derived !== null &&
				current !== derived)
		) {
			(next as Record<string, unknown>)[fieldId] =
				derived === null ? undefined : derived;
			changed = true;
		}
	});

	return changed ? next : null;
}
