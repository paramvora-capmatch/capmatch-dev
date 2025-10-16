// src/lib/dto-mapper.ts
import {
	ProjectMessage,
	BorrowerProfile,
	Principal,
	ProjectProfile,
	BorrowerEntityMember,
	// New schema types
	Profile,
	Entity,
	EntityMember,
	Invite,
	Project,
	DocumentPermission,
	LenderDocumentAccess,
	ChatThread,
	ChatThreadParticipant,
	ProjectMessage as NewProjectMessage,
	MessageAttachment,
	Notification,
} from "@/types/enhanced-types";

/**
 * Maps a project object from the database (snake_case) to the application's ProjectProfile model (camelCase).
 * @param dbProject - The project data object from Supabase.
 * @returns A ProjectProfile object.
 */
export const dbProjectToProjectProfile = (dbProject: any): ProjectProfile => {
  return {
    id: dbProject.id,
    borrowerProfileId: undefined, // No longer used - projects owned by entities
    entityId: dbProject.owner_entity_id, // Map owner_entity_id to entityId
    assignedAdvisorUserId: dbProject.assigned_advisor_id, // Map assigned_advisor_id
    projectName: dbProject.name, // Map name to projectName
    propertyAddressStreet: dbProject.property_address_street || "",
    propertyAddressCity: dbProject.property_address_city || "",
    propertyAddressState: dbProject.property_address_state || "",
    propertyAddressCounty: dbProject.property_address_county || "",
    propertyAddressZip: dbProject.property_address_zip || "",
    assetType: dbProject.asset_type || "",
    projectDescription: dbProject.project_description || "",
    projectPhase: dbProject.project_phase,
    loanAmountRequested: dbProject.loan_amount_requested,
    loanType: dbProject.loan_type || "",
    targetLtvPercent: dbProject.target_ltv_percent,
    targetLtcPercent: dbProject.target_ltc_percent,
    amortizationYears: dbProject.amortization_years,
    interestOnlyPeriodMonths: dbProject.interest_only_period_months,
    interestRateType: dbProject.interest_rate_type || "Not Specified",
    targetCloseDate: dbProject.target_close_date,
    useOfProceeds: dbProject.use_of_proceeds || "",
    recoursePreference: dbProject.recourse_preference || "Flexible",
    purchasePrice: dbProject.purchase_price,
    totalProjectCost: dbProject.total_project_cost,
    capexBudget: dbProject.capex_budget,
    propertyNoiT12: dbProject.property_noi_t12,
    stabilizedNoiProjected: dbProject.stabilized_noi_projected,
    exitStrategy: dbProject.exit_strategy,
    businessPlanSummary: dbProject.business_plan_summary || "",
    marketOverviewSummary: dbProject.market_overview_summary || "",
    equityCommittedPercent: dbProject.equity_committed_percent,
    projectStatus: dbProject.project_status || "Draft",
    completenessPercent: dbProject.completeness_percent || 0,
    internalAdvisorNotes: dbProject.internal_advisor_notes || "",
    borrowerProgress: dbProject.borrower_progress || 0,
    projectProgress: dbProject.project_progress || 0,
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
	return {
		id: dbMessage.id,
		thread_id: dbMessage.thread_id,
		user_id: dbMessage.user_id,
		content: dbMessage.content,
		created_at: dbMessage.created_at,
	};
};

/**
 * Maps a borrower entity member object from the database (snake_case) to the application's BorrowerEntityMember model (camelCase).
 * @param dbMember - The member data object from Supabase.
 * @returns A BorrowerEntityMember object.
 */
export const dbMemberToBorrowerEntityMember = (dbMember: any): BorrowerEntityMember => {
	return {
		id: dbMember.id,
		entityId: dbMember.entity_id,
		userId: dbMember.user_id,
		role: dbMember.role,
		invitedBy: dbMember.invited_by,
		invitedAt: dbMember.invited_at,
		inviteToken: dbMember.invite_token,
		inviteExpiresAt: dbMember.invite_expires_at,
		acceptedAt: dbMember.accepted_at,
		status: dbMember.status,
		userEmail: dbMember.user_email,
		userName: dbMember.user_name,
		projectPermissions: dbMember.project_permissions,
		invitedEmail: dbMember.invited_email,
		inviterEmail: dbMember.inviter_email,
		inviterName: dbMember.inviter_name,
	};
};

// New Schema DTO Mappers

/**
 * Maps a profile object from the database to the application's Profile model.
 * @param dbProfile - The profile data from Supabase.
 * @returns A Profile object.
 */
export const dbProfileToProfile = (dbProfile: any): Profile => {
	return {
		id: dbProfile.id,
		created_at: dbProfile.created_at,
		updated_at: dbProfile.updated_at,
		full_name: dbProfile.full_name,
		app_role: dbProfile.app_role,
		active_entity_id: dbProfile.active_entity_id,
	};
};

/**
 * Maps an entity object from the database to the application's Entity model.
 * @param dbEntity - The entity data from Supabase.
 * @returns An Entity object.
 */
export const dbEntityToEntity = (dbEntity: any): Entity => {
	return {
		id: dbEntity.id,
		created_at: dbEntity.created_at,
		updated_at: dbEntity.updated_at,
		name: dbEntity.name,
		entity_type: dbEntity.entity_type,
	};
};

/**
 * Maps an entity member object from the database to the application's EntityMember model.
 * @param dbMember - The member data from Supabase.
 * @returns An EntityMember object.
 */
export const dbEntityMemberToEntityMember = (dbMember: any): EntityMember => {
	return {
		entity_id: dbMember.entity_id,
		user_id: dbMember.user_id,
		role: dbMember.role,
		created_at: dbMember.created_at,
	};
};

/**
 * Maps an invite object from the database to the application's Invite model.
 * @param dbInvite - The invite data from Supabase.
 * @returns An Invite object.
 */
export const dbInviteToInvite = (dbInvite: any): Invite => {
	return {
		id: dbInvite.id,
		entity_id: dbInvite.entity_id,
		invited_by: dbInvite.invited_by,
		invited_email: dbInvite.invited_email,
		role: dbInvite.role,
		token: dbInvite.token,
		status: dbInvite.status,
		initial_permissions: dbInvite.initial_permissions,
		expires_at: dbInvite.expires_at,
		accepted_at: dbInvite.accepted_at,
		created_at: dbInvite.created_at,
	};
};

/**
 * Maps a project object from the database to the application's Project model.
 * @param dbProject - The project data from Supabase.
 * @returns A Project object.
 */
export const dbProjectToProject = (dbProject: any): Project => {
	return {
		id: dbProject.id,
		created_at: dbProject.created_at,
		updated_at: dbProject.updated_at,
		name: dbProject.name,
		owner_entity_id: dbProject.owner_entity_id,
		assigned_advisor_id: dbProject.assigned_advisor_id,
	};
};

/**
 * Maps a document permission object from the database to the application's DocumentPermission model.
 * @param dbPermission - The permission data from Supabase.
 * @returns A DocumentPermission object.
 */
export const dbDocumentPermissionToDocumentPermission = (dbPermission: any): DocumentPermission => {
	return {
		id: dbPermission.id,
		project_id: dbPermission.project_id,
		user_id: dbPermission.user_id,
		document_path: dbPermission.document_path,
		created_at: dbPermission.created_at,
	};
};

/**
 * Maps a lender document access object from the database to the application's LenderDocumentAccess model.
 * @param dbAccess - The access data from Supabase.
 * @returns A LenderDocumentAccess object.
 */
export const dbLenderDocumentAccessToLenderDocumentAccess = (dbAccess: any): LenderDocumentAccess => {
	return {
		id: dbAccess.id,
		project_id: dbAccess.project_id,
		lender_entity_id: dbAccess.lender_entity_id,
		document_path: dbAccess.document_path,
		granted_by: dbAccess.granted_by,
		created_at: dbAccess.created_at,
	};
};

/**
 * Maps a chat thread object from the database to the application's ChatThread model.
 * @param dbThread - The thread data from Supabase.
 * @returns A ChatThread object.
 */
export const dbChatThreadToChatThread = (dbThread: any): ChatThread => {
	return {
		id: dbThread.id,
		project_id: dbThread.project_id,
		topic: dbThread.topic,
		created_at: dbThread.created_at,
	};
};

/**
 * Maps a chat thread participant object from the database to the application's ChatThreadParticipant model.
 * @param dbParticipant - The participant data from Supabase.
 * @returns A ChatThreadParticipant object.
 */
export const dbChatThreadParticipantToChatThreadParticipant = (dbParticipant: any): ChatThreadParticipant => {
	return {
		thread_id: dbParticipant.thread_id,
		user_id: dbParticipant.user_id,
		created_at: dbParticipant.created_at,
	};
};

/**
 * Maps a project message object from the database to the application's ProjectMessage model.
 * @param dbMessage - The message data from Supabase.
 * @returns A ProjectMessage object.
 */
export const dbProjectMessageToProjectMessage = (dbMessage: any): NewProjectMessage => {
	return {
		id: dbMessage.id,
		thread_id: dbMessage.thread_id,
		user_id: dbMessage.user_id,
		content: dbMessage.content,
		created_at: dbMessage.created_at,
	};
};

/**
 * Maps a message attachment object from the database to the application's MessageAttachment model.
 * @param dbAttachment - The attachment data from Supabase.
 * @returns A MessageAttachment object.
 */
export const dbMessageAttachmentToMessageAttachment = (dbAttachment: any): MessageAttachment => {
	return {
		id: dbAttachment.id,
		message_id: dbAttachment.message_id,
		document_path: dbAttachment.document_path,
		created_at: dbAttachment.created_at,
	};
};

/**
 * Maps a notification object from the database to the application's Notification model.
 * @param dbNotification - The notification data from Supabase.
 * @returns A Notification object.
 */
export const dbNotificationToNotification = (dbNotification: any): Notification => {
	return {
		id: dbNotification.id,
		user_id: dbNotification.user_id,
		content: dbNotification.content,
		read_at: dbNotification.read_at,
		link_url: dbNotification.link_url,
		created_at: dbNotification.created_at,
	};
};
