-- =============================================================================
-- Recompute completeness_percent on project_resumes and borrower_resumes
-- INSERT/UPDATE so the DB is the single source of truth.
-- Formula: (count of required fields that are locked) / total_required * 100.
-- Required fields are stored in a config table; keep in sync with form schema.
-- =============================================================================

-- Config table for required field IDs (project and borrower)
CREATE TABLE IF NOT EXISTS public.required_resume_fields (
    resume_type TEXT NOT NULL,
    field_id TEXT NOT NULL,
    PRIMARY KEY (resume_type, field_id)
);

-- Project required fields (from enhanced-project-form.schema.json)
INSERT INTO public.required_resume_fields (resume_type, field_id) VALUES
('project','projectName'),('project','propertyAddressStreet'),('project','propertyAddressCity'),('project','propertyAddressState'),('project','propertyAddressZip'),('project','propertyAddressCounty'),('project','assetType'),('project','projectPhase'),('project','projectDescription'),('project','constructionType'),('project','groundbreakingDate'),('project','completionDate'),('project','dealStatus'),('project','parcelNumber'),('project','zoningDesignation'),('project','loanAmountRequested'),('project','loanType'),('project','targetLtvPercent'),('project','amortizationYears'),('project','targetCloseDate'),('project','recoursePreference'),('project','totalDevelopmentCost'),('project','exitStrategy'),('project','requestedTerm'),('project','businessPlanSummary'),('project','realEstateTaxes'),('project','insurance'),('project','utilitiesCosts'),('project','repairsAndMaintenance'),('project','managementFee'),('project','generalAndAdmin'),('project','payroll'),('project','reserves'),('project','marketingLeasing'),('project','noiYear1'),('project','yieldOnCost'),('project','capRate'),('project','stabilizedValue'),('project','ltv'),('project','debtYield'),('project','dscr'),('project','expectedHoldPeriod'),('project','totalResidentialUnits'),('project','totalResidentialNRSF'),('project','averageUnitSize'),('project','grossBuildingArea'),('project','numberOfStories'),('project','parkingSpaces'),('project','parkingRatio'),('project','buildingEfficiency'),('project','buildingType'),('project','adaCompliantPercent'),('project','landAcquisition'),('project','baseConstruction'),('project','contingency'),('project','aeFees'),('project','constructionFees'),('project','thirdPartyReports'),('project','legalAndOrg'),('project','titleAndRecording'),('project','taxesDuringConstruction'),('project','loanFees'),('project','developerFee'),('project','interestReserve'),('project','sponsorEquity'),('project','interestRate'),('project','underwritingRate'),('project','permTakeoutPlanned'),('project','allInRate'),('project','submarketName'),('project','population3Mi'),('project','medianHHIncome'),('project','renterOccupiedPercent'),('project','msaName'),('project','projGrowth202429'),('project','unemploymentRate'),('project','submarketAbsorption'),('project','monthsOfSupply'),('project','captureRate'),('project','affordableHousing'),('project','taxExemption'),('project','opportunityZone'),('project','firstOccupancy'),('project','stabilization'),('project','entitlements'),('project','permitsIssued'),('project','landAcqClose'),('project','finalPlans'),('project','verticalStart'),('project','absorptionProjection'),('project','totalSiteAcreage'),('project','currentSiteStatus'),('project','buildableAcreage'),('project','allowableFAR'),('project','wetlandsPresent'),('project','seismicRisk'),('project','phaseIESAFinding'),('project','utilityAvailability'),('project','easements'),('project','adjacentLandUse'),('project','topography'),('project','floodZone'),('project','sponsorEntityName'),('project','sponsorStructure'),('project','contactInfo'),('project','syndicationStatus'),('project','sponsorExperience'),('project','netWorth'),('project','guarantorLiquidity'),('project','ownershipType')
ON CONFLICT (resume_type, field_id) DO NOTHING;

-- Borrower required fields (from borrower-resume-form.schema.json)
INSERT INTO public.required_resume_fields (resume_type, field_id) VALUES
('borrower','fullLegalName'),('borrower','primaryEntityName'),('borrower','primaryEntityStructure'),('borrower','contactEmail'),('borrower','contactPhone'),('borrower','contactAddress'),('borrower','yearsCREExperienceRange')
ON CONFLICT (resume_type, field_id) DO NOTHING;

-- Function: compute completeness_percent from locked_fields (JSONB) and required_resume_fields
CREATE OR REPLACE FUNCTION public.recompute_completeness_percent(
    p_resume_type TEXT,
    p_locked_fields JSONB
) RETURNS INT
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
    v_total INT;
    v_count INT;
    v_pct INT;
BEGIN
    IF p_locked_fields IS NULL THEN
        RETURN 0;
    END IF;
    SELECT count(*) INTO v_total
    FROM public.required_resume_fields
    WHERE resume_type = p_resume_type;
    IF v_total = 0 THEN
        RETURN 0;
    END IF;
    SELECT count(*) INTO v_count
    FROM public.required_resume_fields r
    WHERE r.resume_type = p_resume_type
      AND (p_locked_fields -> r.field_id)::text = 'true';
    v_pct := round((v_count::numeric / v_total) * 100);
    RETURN greatest(0, least(100, v_pct));
END;
$$;

COMMENT ON FUNCTION public.recompute_completeness_percent IS 'Returns (required-and-locked count / total required) * 100 for project or borrower resume.';

-- Trigger on project_resumes: set completeness_percent before insert/update
CREATE OR REPLACE FUNCTION public.set_project_resume_completeness()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.completeness_percent := public.recompute_completeness_percent('project', NEW.locked_fields);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_project_resume_completeness ON public.project_resumes;
CREATE TRIGGER trigger_set_project_resume_completeness
    BEFORE INSERT OR UPDATE OF content, locked_fields
    ON public.project_resumes
    FOR EACH ROW
    EXECUTE FUNCTION public.set_project_resume_completeness();

-- Trigger on borrower_resumes: set completeness_percent before insert/update
CREATE OR REPLACE FUNCTION public.set_borrower_resume_completeness()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.completeness_percent := public.recompute_completeness_percent('borrower', NEW.locked_fields);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_borrower_resume_completeness ON public.borrower_resumes;
CREATE TRIGGER trigger_set_borrower_resume_completeness
    BEFORE INSERT OR UPDATE OF content, locked_fields
    ON public.borrower_resumes
    FOR EACH ROW
    EXECUTE FUNCTION public.set_borrower_resume_completeness();
