/**
 * Field dependency map for borrower resume revalidation.
 * When a key field changes, dependent fields (value) are re-validated.
 */
export const BORROWER_FIELD_DEPENDENCIES: Record<string, string[]> = {
	primaryEntityStructure: ["primaryEntityName"],
	primaryEntityName: ["primaryEntityStructure"],
	netWorthRange: ["liquidityRange"],
	liquidityRange: ["netWorthRange"],
	principals: ["ownershipPercentage"],
};
