-- scripts/seed-hoque-project.sql
-- ---------------------------------------------------------------------------
-- Seeds the borrower and project resumes for an existing project with the
-- Hoque (SoGood Apartments) dataset.
--
-- Usage:
--   1. Update v_target_project_id with the UUID of an existing project.
--   2. Run with psql:
--        psql postgresql://postgres:postgres@127.0.0.1:54322/postgres \
--          -f scripts/seed-hoque-project.sql
--
-- Notes:
--   • The script upserts both project_resumes and borrower_resumes rows.
--   • It also ensures borrower root resources exist via
--     public.ensure_project_borrower_roots().
--   • Feel free to tweak narrative fields before running.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_target_project_id uuid := '00000000-0000-0000-0000-000000000000'; -- 👈 UPDATE ME
  v_project record;

  v_project_overview text := $overview$Ground-up development of Building B within the SoGood master plan, delivering 116 units over activated ground-floor innovation space between the Dallas Farmers Market and Deep Ellum.$overview$;
  v_business_plan text := $biz$Execute a Dallas PFC-backed workforce housing program (50% of units ≤80% AMI) inside a 6-story mixed-use podium with 30,000 SF of pre-leased Innovation Center space. The plan funds land acquisition, hard/soft costs, and reserves for a 24-month build schedule plus two 6-month extensions, targeting a refinancing or sale upon stabilization in 2027.$biz$;
  v_market_summary text := $market$Site sits between the Dallas Farmers Market, Deep Ellum, and the CBD—walking distance to 5,000+ jobs, DART rail, and the I-30/I-45 interchange. Three-mile demographics show $85K+ median income, 6.9% population growth, and 76% renter share. The submarket has <6,000 units delivering over the next 24 months, keeping occupancy above 94%.$market$;
  v_borrower_bio text := $bio$Hoque Global is a Dallas-based master developer delivering catalytic mixed-use districts and workforce housing through public-private partnerships, including PFC structures with the City of Dallas. ACARA serves as capital partner, structuring Opportunity Zone-aligned investments with a $950M+ track record across Texas.$bio$;

  v_timeline jsonb;
  v_scenario_returns jsonb;
  v_capital_stack jsonb;
  v_market_metrics jsonb;
  v_certifications jsonb;
  v_amenities jsonb;
  v_commercial_spaces jsonb;
  v_track_record jsonb;
  v_references jsonb;
  v_principals jsonb;

  v_project_resume jsonb;
  v_borrower_resume jsonb;
BEGIN
  IF v_target_project_id = '00000000-0000-0000-0000-000000000000' THEN
    RAISE EXCEPTION 'Please set v_target_project_id before running this script.';
  END IF;

  SELECT id, name, owner_org_id
  INTO v_project
  FROM public.projects
  WHERE id = v_target_project_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project % not found', v_target_project_id;
  END IF;

  v_timeline := jsonb_build_array(
    jsonb_build_object('phase', 'Site Control & PFC Approval', 'date', '2024-07-12'),
    jsonb_build_object('phase', 'Design Development Complete', 'date', '2024-11-01'),
    jsonb_build_object('phase', 'Debt Marketing & DD', 'date', '2025-02-28'),
    jsonb_build_object('phase', 'Groundbreaking', 'date', '2025-08-01'),
    jsonb_build_object('phase', 'Topping Out', 'date', '2026-11-15'),
    jsonb_build_object('phase', 'Substantial Completion', 'date', '2027-09-30')
  );

  v_scenario_returns := jsonb_build_object(
    'base', jsonb_build_object('irr', 17.5, 'equityMultiple', 1.95, 'debtYield', 12.6, 'exitCap', 5.5),
    'upside', jsonb_build_object('irr', 21.2, 'equityMultiple', 2.30, 'debtYield', 13.8, 'exitCap', 5.25),
    'downside', jsonb_build_object('irr', 13.4, 'equityMultiple', 1.60, 'debtYield', 11.0, 'exitCap', 5.85)
  );

  v_capital_stack := jsonb_build_object(
    'loanAmount', 18000000,
    'totalDevelopmentCost', 29807800,
    'equityRequirement', 11807800,
    'ltv', 44,
    'ltc', 60,
    'notes', 'Senior construction facility with two 6-month extensions and partial recourse completion guaranty.'
  );

  v_market_metrics := jsonb_build_object(
    'oneMile', jsonb_build_object('population', 38500, 'medianIncome', 72000, 'medianAge', 32),
    'threeMile', jsonb_build_object('population', 174270, 'medianIncome', 85906, 'medianAge', 33),
    'fiveMile', jsonb_build_object('population', 410000, 'medianIncome', 79500, 'medianAge', 34),
    'growthTrends', jsonb_build_object('population5yr', '6.9%', 'income5yr', '8.4%', 'job5yr', '12.1%'),
    'renterShare', '76.7%',
    'avgOccupancy', '94.2%',
    'supplyPipeline', jsonb_build_array(
      jsonb_build_object('quarter', 'Q4 2024', 'units', 620),
      jsonb_build_object('quarter', 'Q1 2025', 'units', 880),
      jsonb_build_object('quarter', 'Q3 2025', 'units', 950),
      jsonb_build_object('quarter', 'Q1 2026', 'units', 760),
      jsonb_build_object('quarter', 'Q3 2026', 'units', 890)
    )
  );

  v_certifications := jsonb_build_array(
    jsonb_build_object('name', 'Opportunity Zone', 'status', 'Qualified'),
    jsonb_build_object('name', 'Dallas PFC Tax Exemption', 'status', 'Executed'),
    jsonb_build_object('name', 'Workforce Housing Covenant', 'status', '50% ≤80% AMI')
  );

  v_amenities := jsonb_build_array(
    jsonb_build_object('name', 'Resort-Style Pool', 'size', '3,200 SF', 'description', 'Heated saltwater pool with cabanas overlooking the courtyard.'),
    jsonb_build_object('name', 'Fitness Center', 'size', '2,500 SF', 'description', '24/7 performance studio with functional training + Peloton.'),
    jsonb_build_object('name', 'Sky Lounge', 'size', '1,800 SF', 'description', 'Indoor/outdoor lounge with downtown skyline views.'),
    jsonb_build_object('name', 'Co-Working Space', 'size', '1,200 SF', 'description', 'Private offices, maker space, and conference rooms.'),
    jsonb_build_object('name', 'Pet Spa', 'size', '400 SF', 'description', 'Wash stations with on-site grooming.'),
    jsonb_build_object('name', 'Package Concierge', 'size', '300 SF', 'description', 'Smart lockers with cold storage for meal delivery.')
  );

  v_commercial_spaces := jsonb_build_array(
    jsonb_build_object('name', 'Innovation Center (GSV Holdings)', 'size', '30,000 SF', 'status', 'Pre-leased', 'use', 'Flex / Education'),
    jsonb_build_object('name', 'Office Suite 1', 'size', '6,785 SF', 'status', 'Marketed', 'use', 'Creative Office'),
    jsonb_build_object('name', 'Office Suite 2', 'size', '5,264 SF', 'status', 'Marketed', 'use', 'Professional Services'),
    jsonb_build_object('name', 'Retail Bay', 'size', '745 SF', 'status', 'Targeting local operator', 'use', 'Food & Beverage')
  );

  v_track_record := jsonb_build_array(
    jsonb_build_object('project', 'SoGood Phase A', 'year', 2023, 'units', 190, 'irr', '21.5%', 'type', 'Mixed-Use'),
    jsonb_build_object('project', 'Hamilton Station Lofts', 'year', 2021, 'units', 165, 'irr', '20.3%', 'type', 'Multifamily'),
    jsonb_build_object('project', 'South Side Flats', 'year', 2020, 'units', 230, 'irr', '22.8%', 'type', 'Multifamily'),
    jsonb_build_object('project', 'Farmers Market West', 'year', 2019, 'units', 210, 'irr', '19.7%', 'type', 'Mixed-Use'),
    jsonb_build_object('project', 'Lamar Urban Lofts', 'year', 2018, 'units', 150, 'irr', '24.0%', 'type', 'Adaptive Reuse')
  );

  v_references := jsonb_build_array(
    jsonb_build_object('firm', 'Frost Bank', 'relationship', 'Construction Lender', 'years', '6+'),
    jsonb_build_object('firm', 'Citi Community Capital', 'relationship', 'Permanent / Agency Lender', 'years', '4+'),
    jsonb_build_object('firm', 'Dallas Housing Finance Corp', 'relationship', 'PFC Partner', 'years', '5+')
  );

  v_principals := jsonb_build_array(
    jsonb_build_object(
      'name', 'Mike Hoque',
      'role', 'Chief Executive Officer',
      'experience', '22 years',
      'bio', 'Founder leading Hoque Global’s master plan strategy and public-private initiatives across Dallas.',
      'education', 'BBA, University of Texas at Dallas',
      'specialties', jsonb_build_array('Master Planning', 'Public-Private Partnerships', 'Mixed-Use Development'),
      'achievements', jsonb_build_array('Delivered 1M+ SF of adaptive reuse', 'Dallas Regional Chamber Urban Taskforce Chair')
    ),
    jsonb_build_object(
      'name', 'Joel Heikenfeld',
      'role', 'Managing Director, ACARA',
      'experience', '18 years',
      'bio', 'Capital markets lead for ACARA structuring Opportunity Zone and PFC executions in Texas.',
      'education', 'MBA, SMU Cox School of Business',
      'specialties', jsonb_build_array('Capital Markets', 'Workforce Housing', 'PFC Structures'),
      'achievements', jsonb_build_array('Structured $300M+ in tax-exempt executions', 'Board Member, Dallas HFC')
    )
  );

  v_project_resume := jsonb_build_object(
    -- Section 1: Project Identification & Basic Info
    'projectName', 'SoGood Apartments',
    'assetType', 'Mixed-Use (Retail, Office, Multifamily)',
    'projectStatus', 'Advisor Review',
    'propertyAddressStreet', '2300 Hickory St',
    'propertyAddressCity', 'Dallas',
    'propertyAddressState', 'TX',
    'propertyAddressCounty', 'Dallas County',
    'propertyAddressZip', '75215',
    'parcelNumber', '000472000A01B0100',
    'zoningDesignation', 'PD317',
    'projectType', 'Mixed-Use (Retail, Office and Multifamily)',
    'primaryAssetClass', 'Multifamily',
    'constructionType', 'Ground-Up',
    'groundbreakingDate', '2025-08-01',
    'completionDate', '2027-09-30',
    'totalDevelopmentCost', 29800000,
    'requestedLoanTerm', '2 Years',
    'masterPlanName', 'SoGood Master Planned Development',
    'phaseNumber', 'Building B',
    'projectDescription', v_project_overview,
    'projectPhase', 'Construction',
    
    -- Section 2: Property Specifications
    'totalResidentialUnits', 116,
    'totalResidentialNRSF', 59520,
    'averageUnitSize', 513,
    'totalCommercialGRSF', 49569,
    'grossBuildingArea', 127406,
    'numberOfStories', 6,
    'buildingType', 'Mid-rise / Podium',
    'parkingSpaces', 180,
    'parkingRatio', 1.55,
    'parkingType', 'Structured',
    'amenityList', jsonb_build_array('Fitness center', 'Shared working space', 'Lounge', 'Outdoor terrace', 'Swimming pool'),
    'amenitySF', 35264,
    'residentialUnitMix', jsonb_build_array(
      jsonb_build_object('unitType', 'S1', 'type', 'Studio', 'units', 48, 'avgSF', 374),
      jsonb_build_object('unitType', 'S2', 'type', 'Studio', 'units', 28, 'avgSF', 380),
      jsonb_build_object('unitType', 'S3', 'type', 'Studio', 'units', 8, 'avgSF', 470),
      jsonb_build_object('unitType', 'A1', 'type', '1BR', 'units', 8, 'avgSF', 720),
      jsonb_build_object('unitType', 'A2', 'type', '1BR', 'units', 8, 'avgSF', 736),
      jsonb_build_object('unitType', 'A3', 'type', '1BR', 'units', 8, 'avgSF', 820),
      jsonb_build_object('unitType', 'B1', 'type', '2BR', 'units', 8, 'avgSF', 1120)
    ),
    'commercialSpaceMix', jsonb_build_array(
      jsonb_build_object('spaceType', 'Innovation Center', 'squareFootage', 30000, 'tenant', 'GSV Holdings LLC'),
      jsonb_build_object('spaceType', 'Office 1', 'squareFootage', 6785),
      jsonb_build_object('spaceType', 'Office 2', 'squareFootage', 5264),
      jsonb_build_object('spaceType', 'Retail', 'squareFootage', 745)
    ),
    
    -- Section 3: Financial Details - Development Budget
    'landAcquisition', 6000000,
    'baseConstruction', 16950000,
    'contingency', 847500,
    'ffe', 580000,
    'constructionFees', 174000,
    'aeFees', 859800,
    'thirdPartyReports', 50000,
    'legalAndOrg', 50000,
    'titleAndRecording', 75000,
    'taxesDuringConstruction', 20000,
    'workingCapital', 1900000,
    'developerFee', 678000,
    'pfcStructuringFee', 116000,
    'loanFees', 360000,
    'interestReserve', 1147500,
    
    -- Section 3.2: Sources of Funds
    'seniorLoanAmount', 18000000,
    'sponsorEquity', 11800000,
    
    -- Section 3.3: Loan Terms
    'interestRate', 8.00,
    'underwritingRate', 8.00,
    'amortization', 'Interest-Only for Construction',
    'prepaymentTerms', 'Minimum interest',
    'recourse', 'Partial Recourse',
    'permTakeoutPlanned', true,
    
    -- Section 3.5: Operating Expenses (Proforma Year 1)
    'realEstateTaxes', 34200,
    'insurance', 92800,
    'utilities', 23200,
    'repairsAndMaintenance', 46400,
    'managementFee', 85000,
    'generalAndAdmin', 40600,
    'payroll', 174000,
    'reserves', 23200,
    
    -- Section 3.6: Investment Metrics
    'noiYear1', 2268000,
    'yieldOnCost', 7.6,
    'capRate', 5.50,
    'stabilizedValue', 41200000,
    'ltv', 44,
    'debtYield', 12.6,
    'dscr', 1.25,
    
    -- Section 2: Loan Info (existing fields)
    'loanAmountRequested', 18000000,
    'loanType', 'Senior Construction Loan',
    'targetLtvPercent', 44,
    'targetLtcPercent', 60,
    'amortizationYears', 30,
    'interestOnlyPeriodMonths', 24,
    'interestRateType', 'Floating',
    'targetCloseDate', '2025-08-15',
    'useOfProceeds', 'Land acquisition, vertical construction, soft costs, and financing reserves for Building B within the SoGood master plan.',
    'recoursePreference', 'Partial Recourse',
    
    -- Section 3: Financials (existing fields)
    'purchasePrice', 6000000,
    'totalProjectCost', 29807800,
    'capexBudget', 16950000,
    'propertyNoiT12', 0,
    'stabilizedNoiProjected', 2268000,
    'exitStrategy', 'Refinance',
    'businessPlanSummary', v_business_plan,
    'marketOverviewSummary', v_market_summary,
    'equityCommittedPercent', 39.6,
    
    -- Section 4: Market Context
    'submarketName', 'Downtown Dallas',
    'population3Mi', 174270,
    'popGrowth201020', 23.3,
    'projGrowth202429', 6.9,
    'medianHHIncome', 85906,
    'renterOccupiedPercent', 76.7,
    'bachelorsDegreePercent', 50.2,
    
    -- Section 5: Special Considerations
    'opportunityZone', true,
    'affordableHousing', true,
    'affordableUnitsNumber', 58,
    'amiTargetPercent', 80,
    'taxExemption', true,
    'taxAbatement', true,
    'paceFinancing', false,
    'historicTaxCredits', false,
    'newMarketsCredits', false,
    
    -- Section 6: Timeline & Milestones
    'firstOccupancy', '2027-10-15',
    'stabilization', '2028-03-31',
    'preLeasedSF', 30000,
    'entitlements', 'Approved',
    'permitsIssued', 'Issued',
    
    -- Section 7: Site & Context
    'totalSiteAcreage', 2.5,
    'currentSiteStatus', 'Vacant',
    'siteAccess', 'Hickory St, Ferris St',
    'proximityShopping', 'Farmers Market, Deep Ellum nearby',
    
    -- Section 8: Sponsor Information
    'sponsorEntityName', 'Hoque Global',
    'sponsorStructure', 'General Partner',
    'equityPartner', 'ACARA',
    'contactInfo', 'Cody Field (415.202.3258), Joel Heikenfeld (972.455.1943)',
    
    -- Metadata
    'completenessPercent', 100,
    'internalAdvisorNotes', 'Seeded via scripts/seed-hoque-project.sql',
    'projectSections', jsonb_build_object(
      'timeline', v_timeline,
      'scenarioReturns', v_scenario_returns,
      'capitalStackHighlights', v_capital_stack,
      'marketMetrics', v_market_metrics,
      'certifications', v_certifications,
      'amenities', v_amenities,
      'commercialProgram', v_commercial_spaces
    )
  );

  v_borrower_resume := jsonb_build_object(
    'fullLegalName', 'Hoque Global',
    'primaryEntityName', 'Hoque Global / ACARA PFC JV',
    'primaryEntityStructure', 'Master Developer + Public Facility Corporation Partnership',
    'contactEmail', 'info@hoqueglobal.com',
    'contactPhone', '972.455.1943',
    'contactAddress', '2300 Hickory St, Dallas, TX 75215',
    'bioNarrative', v_borrower_bio,
    'yearsCREExperienceRange', '20+ years',
    'assetClassesExperience', jsonb_build_array('Mixed-Use', 'Multifamily', 'Office', 'Master-Planned Districts'),
    'geographicMarketsExperience', jsonb_build_array('Dallas-Fort Worth', 'Texas Triangle', 'Southeast US'),
    'totalDealValueClosedRange', '$950M+',
    'existingLenderRelationships', 'Frost Bank; Citi Community Capital; Dallas Housing Finance Corp',
    'creditScoreRange', '720-760',
    'netWorthRange', '$50M+',
    'liquidityRange', '$5M - $10M',
    'bankruptcyHistory', false,
    'foreclosureHistory', false,
    'litigationHistory', false,
    'completenessPercent', 100,
    'borrowerSections', jsonb_build_object(
      'principals', v_principals,
      'trackRecord', v_track_record,
      'references', v_references
    )
  );

  INSERT INTO public.project_resumes (project_id, content)
  VALUES (v_target_project_id, v_project_resume)
  ON CONFLICT (project_id)
  DO UPDATE SET content = EXCLUDED.content, updated_at = now();

  INSERT INTO public.borrower_resumes (project_id, content)
  VALUES (v_target_project_id, v_borrower_resume)
  ON CONFLICT (project_id)
  DO UPDATE SET content = EXCLUDED.content, updated_at = now();

  PERFORM public.ensure_project_borrower_roots(v_target_project_id);

  RAISE NOTICE '✅ Hoque data seeded for project "%" (%).', v_project.name, v_target_project_id;
END $$;

