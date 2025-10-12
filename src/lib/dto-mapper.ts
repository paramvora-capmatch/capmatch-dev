// src/lib/dto-mapper.ts
import {
	ProjectMessage,
	BorrowerProfile,
	Principal,
	ProjectProfile,
} from "@/types/enhanced-types";

/**
 * Maps a project object from the database (snake_case) to the application's ProjectProfile model (camelCase).
 * @param dbProject - The project data object from Supabase.
 * @returns A ProjectProfile object.
 */
export const dbProjectToProjectProfile = (dbProject: any): ProjectProfile => {
  return {
    id: dbProject.id,
    borrowerProfileId: dbProject.owner_id, // Map owner_id to borrowerProfileId
    entityId: dbProject.entity_id, // Map entity_id to entityId
    assignedAdvisorUserId: dbProject.assigned_advisor_user_id,
    projectName: dbProject.project_name,
    propertyAddressStreet: dbProject.property_address_street,
    propertyAddressCity: dbProject.property_address_city,
    propertyAddressState: dbProject.property_address_state,
    propertyAddressCounty: dbProject.property_address_county,
    propertyAddressZip: dbProject.property_address_zip,
    assetType: dbProject.asset_type,
    projectDescription: dbProject.project_description,
    projectPhase: dbProject.project_phase,
    loanAmountRequested: dbProject.loan_amount_requested,
    loanType: dbProject.loan_type,
    targetLtvPercent: dbProject.target_ltv_percent,
    targetLtcPercent: dbProject.target_ltc_percent,
    amortizationYears: dbProject.amortization_years,
    interestOnlyPeriodMonths: dbProject.interest_only_period_months,
    interestRateType: dbProject.interest_rate_type,
    targetCloseDate: dbProject.target_close_date,
    useOfProceeds: dbProject.use_of_proceeds,
    recoursePreference: dbProject.recourse_preference,
    purchasePrice: dbProject.purchase_price,
    totalProjectCost: dbProject.total_project_cost,
    capexBudget: dbProject.capex_budget,
    propertyNoiT12: dbProject.property_noi_t12,
    stabilizedNoiProjected: dbProject.stabilized_noi_projected,
    exitStrategy: dbProject.exit_strategy,
    businessPlanSummary: dbProject.business_plan_summary,
    marketOverviewSummary: dbProject.market_overview_summary,
    equityCommittedPercent: dbProject.equity_committed_percent,
    projectStatus: dbProject.project_status,
    completenessPercent: dbProject.completeness_percent,
    internalAdvisorNotes: dbProject.internal_advisor_notes,
    borrowerProgress: dbProject.borrower_progress,
    projectProgress: dbProject.project_progress,
    createdAt: dbProject.created_at,
    updatedAt: dbProject.updated_at,
    // Add missing fields from type with default values for consistency
    projectSections: {},
    borrowerSections: {},
  };
};

/**
 * Maps a borrower object from the database to the application's BorrowerProfile model.
 * @param dbBorrower - The borrower data from Supabase.
 * @param user - The authenticated user object containing email.
 * @returns A BorrowerProfile object.
 */
export const dbBorrowerToBorrowerProfile = (
	dbBorrower: any,
	user: { email: string; name?: string }
): BorrowerProfile => {
	return {
		id: dbBorrower.id,
		userId: user.email,
		contactEmail: user.email,
		fullLegalName: dbBorrower.full_legal_name || user.name || "",
		primaryEntityName: dbBorrower.primary_entity_name || "",
		primaryEntityStructure: dbBorrower.primary_entity_structure || "LLC",
		contactPhone: dbBorrower.contact_phone || "",
		contactAddress: dbBorrower.contact_address || "",
		bioNarrative: dbBorrower.bio_narrative || "",
		linkedinUrl: dbBorrower.linkedin_url || "",
		websiteUrl: dbBorrower.website_url || "",
		yearsCREExperienceRange: dbBorrower.years_cre_experience_range || "0-2",
		assetClassesExperience: dbBorrower.asset_classes_experience || [],
		geographicMarketsExperience: dbBorrower.geographic_markets_experience || [],
		totalDealValueClosedRange: dbBorrower.total_deal_value_closed_range || "N/A",
		existingLenderRelationships: dbBorrower.existing_lender_relationships || "",
		creditScoreRange: dbBorrower.credit_score_range || "N/A",
		netWorthRange: dbBorrower.net_worth_range || "<$1M",
		liquidityRange: dbBorrower.liquidity_range || "<$100k",
		bankruptcyHistory: dbBorrower.bankruptcy_history || false,
		foreclosureHistory: dbBorrower.foreclosure_history || false,
		litigationHistory: dbBorrower.litigation_history || false,
		createdAt: dbBorrower.created_at,
		updatedAt: dbBorrower.updated_at,
		completenessPercent: 0, // Will be recalculated
		// RBAC additions
		entityId: dbBorrower.entity_id,
		masterProfileId: dbBorrower.master_profile_id,
		lastSyncedAt: dbBorrower.last_synced_at,
		customFields: dbBorrower.custom_fields || [],
	};
};

/**
 * Maps a principal object from the database to the application's Principal model.
 * @param dbPrincipal - The principal data from Supabase.
 * @returns A Principal object.
 */
export const dbPrincipalToPrincipal = (dbPrincipal: any): Principal => {
	return {
		id: dbPrincipal.id,
		borrowerProfileId: dbPrincipal.borrower_profile_id,
		principalLegalName: dbPrincipal.principal_legal_name,
		principalRoleDefault: dbPrincipal.principal_role_default,
		principalBio: dbPrincipal.principal_bio,
		principalEmail: dbPrincipal.principal_email,
		ownershipPercentage: dbPrincipal.ownership_percentage,
		creditScoreRange: dbPrincipal.credit_score_range,
		netWorthRange: dbPrincipal.net_worth_range,
		liquidityRange: dbPrincipal.liquidity_range,
		bankruptcyHistory: dbPrincipal.bankruptcy_history,
		foreclosureHistory: dbPrincipal.foreclosure_history,
		pfsDocumentId: dbPrincipal.pfs_document_id,
		createdAt: dbPrincipal.created_at,
		updatedAt: dbPrincipal.updated_at,
	};
};

/**
 * Maps a message object from the database to the application's ProjectMessage model.
 * Expects a joined `sender:profiles(...)` object.
 * @param dbMessage - The message data object from Supabase.
 * @returns A ProjectMessage object.
 */
export const dbMessageToProjectMessage = (dbMessage: any): ProjectMessage => {
	const senderType =
		dbMessage.sender?.role === "advisor"
			? "Advisor"
			: dbMessage.sender?.role === "borrower"
			? "Borrower"
			: "System";

	return {
		id: dbMessage.id,
		projectId: dbMessage.project_id,
		senderId: dbMessage.sender_id,
		senderType: senderType,
		message: dbMessage.message,
		createdAt: dbMessage.created_at,
	};
};
