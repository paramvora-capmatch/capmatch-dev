"use client";

import { useEffect } from "react";
import type { ProjectProfile } from "@/types/enhanced-types";
import { computeDerivedFieldsPatch } from "../domain/derivedFieldCalculators";

export interface UseProjectResumeDerivedFieldsParams {
	formData: ProjectProfile;
	lockedFields: Set<string>;
	setFormData: React.Dispatch<React.SetStateAction<ProjectProfile>>;
}

/**
 * Syncs derived fields (incentiveStacking, targetLtvPercent, targetLtcPercent,
 * totalCommercialGRSF, studioCount, oneBedCount, twoBedCount, threeBedCount)
 * from their sources. Locked derived fields are not updated.
 */
export function useProjectResumeDerivedFields({
	formData,
	lockedFields,
	setFormData,
}: UseProjectResumeDerivedFieldsParams): void {
	useEffect(() => {
		const patch = computeDerivedFieldsPatch(formData, lockedFields);
		if (patch) {
			setFormData((prev) => ({ ...prev, ...patch }));
		}
		// Intentionally depend on specific formData fields to avoid loops; formData identity changes on every setFormData.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		lockedFields,
		formData.loanAmountRequested,
		formData.stabilizedValue,
		formData.totalDevelopmentCost,
		formData.commercialSpaceMix,
		formData.residentialUnitMix,
		formData.opportunityZone,
		formData.taxExemption,
		formData.tifDistrict,
		formData.taxAbatement,
		formData.paceFinancing,
		formData.historicTaxCredits,
		formData.newMarketsCredits,
		formData.incentiveStacking,
		formData.targetLtvPercent,
		formData.targetLtcPercent,
		formData.totalCommercialGRSF,
		formData.studioCount,
		formData.oneBedCount,
		formData.twoBedCount,
		formData.threeBedCount,
		setFormData,
	]);
}
