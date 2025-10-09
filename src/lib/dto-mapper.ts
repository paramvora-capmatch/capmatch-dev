// src/lib/dto-mapper.ts
import { ProjectProfile } from '@/types/enhanced-types';

/**
 * Maps a project object from the database (snake_case) to the application's ProjectProfile model (camelCase).
 * @param dbProject - The project data object from Supabase.
 * @returns A ProjectProfile object.
 */
export const dbProjectToProjectProfile = (dbProject: any): ProjectProfile => {
  return {
    id: dbProject.id,
    borrowerProfileId: dbProject.owner_id, // Map owner_id to borrowerProfileId
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
