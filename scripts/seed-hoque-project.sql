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
  v_om_content jsonb;
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

  -- Build project resume in sections to avoid 100-argument limit
  v_project_resume := 
    -- Section 1: Project Identification & Basic Info
    jsonb_build_object(
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
      'projectPhase', 'Construction'
    ) ||
    -- Section 2: Property Specifications
    jsonb_build_object(
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
      )
    ) ||
    -- Section 3: Financial Details - Development Budget
    jsonb_build_object(
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
      'interestReserve', 1147500
    ) ||
    -- Section 3.2 & 3.3: Sources of Funds & Loan Terms
    jsonb_build_object(
      'seniorLoanAmount', 18000000,
      'sponsorEquity', 11800000,
      'interestRate', 8.00,
      'underwritingRate', 8.00,
      'amortization', 'Interest-Only for Construction',
      'prepaymentTerms', 'Minimum interest',
      'recourse', 'Partial Recourse',
      'permTakeoutPlanned', true
    ) ||
    -- Section 3.5 & 3.6: Operating Expenses & Investment Metrics
    jsonb_build_object(
      'realEstateTaxes', 34200,
      'insurance', 92800,
      'utilities', 23200,
      'repairsAndMaintenance', 46400,
      'managementFee', 85000,
      'generalAndAdmin', 40600,
      'payroll', 174000,
      'reserves', 23200,
      'noiYear1', 2268000,
      'yieldOnCost', 7.6,
      'capRate', 5.50,
      'stabilizedValue', 41200000,
      'ltv', 44,
      'debtYield', 12.6,
      'dscr', 1.25
    ) ||
    -- Section 2: Loan Info (existing fields)
    jsonb_build_object(
      'loanAmountRequested', 18000000,
      'loanType', 'Senior Construction Loan',
      'targetLtvPercent', 44,
      'targetLtcPercent', 60,
      'amortizationYears', 30,
      'interestOnlyPeriodMonths', 24,
      'interestRateType', 'Floating',
      'targetCloseDate', '2025-08-15',
      'useOfProceeds', 'Land acquisition, vertical construction, soft costs, and financing reserves for Building B within the SoGood master plan.',
      'recoursePreference', 'Partial Recourse'
    ) ||
    -- Section 3: Financials (existing fields)
    jsonb_build_object(
      'purchasePrice', 6000000,
      'totalProjectCost', 29807800,
      'capexBudget', 16950000,
      'propertyNoiT12', 0,
      'stabilizedNoiProjected', 2268000,
      'exitStrategy', 'Refinance',
      'businessPlanSummary', v_business_plan,
      'marketOverviewSummary', v_market_summary,
      'equityCommittedPercent', 39.6
    ) ||
    -- Section 4: Market Context
    jsonb_build_object(
      'submarketName', 'Downtown Dallas',
      'population3Mi', 174270,
      'popGrowth201020', 23.3,
      'projGrowth202429', 6.9,
      'medianHHIncome', 85906,
      'renterOccupiedPercent', 76.7,
      'bachelorsDegreePercent', 50.2
    ) ||
    -- Section 5: Special Considerations
    jsonb_build_object(
      'opportunityZone', true,
      'affordableHousing', true,
      'affordableUnitsNumber', 58,
      'amiTargetPercent', 80,
      'taxExemption', true,
      'taxAbatement', true,
      'paceFinancing', false,
      'historicTaxCredits', false,
      'newMarketsCredits', false
    ) ||
    -- Section 6 & 7: Timeline & Milestones & Site & Context
    jsonb_build_object(
      'firstOccupancy', '2027-10-15',
      'stabilization', '2028-03-31',
      'preLeasedSF', 30000,
      'entitlements', 'Approved',
      'permitsIssued', 'Issued',
      'totalSiteAcreage', 2.5,
      'currentSiteStatus', 'Vacant',
      'siteAccess', 'Hickory St, Ferris St',
      'proximityShopping', 'Farmers Market, Deep Ellum nearby'
    ) ||
    -- Section 8: Sponsor Information & Metadata
    jsonb_build_object(
      'sponsorEntityName', 'Hoque Global',
      'sponsorStructure', 'General Partner',
      'equityPartner', 'ACARA',
      'contactInfo', 'Cody Field (415.202.3258), Joel Heikenfeld (972.455.1943)',
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
    'borrowerSections', jsonb_build_object(
      'principals', v_principals,
      'trackRecord', v_track_record,
      'references', v_references
    )
  );

  -- Build OM JSON using the same structure as src/services/mockOMData.ts,
  -- but also include the flat field IDs that the dashboard reads via getOMValue.
  v_om_content := jsonb_build_object(
    'projectName', 'SoGood Apartments',
    'loanAmountRequested', 18000000,
    'ltv', 44,
    'totalResidentialUnits', 116,
    'grossBuildingArea', 127406,
    'parkingRatio', 1.55,
    'affordableUnitsNumber', 58,
    'popGrowth201020', 23.3,
    'projGrowth202429', 6.9
  ) || jsonb_build_object(
    'projectOverview', jsonb_build_object(
      'projectName', 'SoGood Apartments',
      'masterPlan', jsonb_build_object(
        'name', 'SoGood Master Planned Development',
        'phase', 'Building B'
      ),
      'address', jsonb_build_object(
        'street', '2300 Hickory St',
        'city', 'Dallas',
        'state', 'TX',
        'zip', '75215',
        'county', 'Dallas County'
      ),
      'propertyStats', jsonb_build_object(
        'totalResidentialUnits', 116,
        'affordableUnits', 58,
        'totalResidentialNRSF', 59520,
        'totalCommercialGRSF', 49569,
        'grossBuildingArea', 127406,
        'averageUnitSize', 513,
        'parkingSpaces', 180,
        'parkingRatio', 1.55,
        'stories', 6,
        'buildingType', 'Mid-rise / Podium',
        'constructionType', 'Ground-Up',
        'totalDevelopmentCost', 29807800,
        'loanAmountRequested', 18000000,
        'yieldOnCost', 7.6,
        'capRate', 5.5,
        'stabilizedValue', 41200000,
        'dscr', 1.25,
        'debtYield', 12.6,
        'noiYear1', 2268000
      ),
      'schedule', jsonb_build_object(
        'groundbreaking', '2025-08-01',
        'completion', '2027-09-30',
        'firstOccupancy', '2027-10-15',
        'stabilization', '2028-03-31'
      ),
      'narrativeHighlights', jsonb_build_array(
        'Phase B of the mixed-use SoGood master plan adjacent to Dallas Farmers Market and Deep Ellum.',
        '30,000 SF Innovation Center is pre-leased to GSV Holdings, anchoring the commercial program.',
        'Workforce housing covenant dedicates 50% of units to households earning ≤80% AMI under a Dallas PFC lease structure.'
      ),
      'contacts', jsonb_build_object(
        'sponsor', 'Hoque Global',
        'equityPartner', 'ACARA',
        'primaryContacts', jsonb_build_array(
          jsonb_build_object('name', 'Cody Field', 'phone', '415.202.3258'),
          jsonb_build_object('name', 'Joel Heikenfeld', 'phone', '972.455.1943')
        )
      )
    ),
    'scenarioData', jsonb_build_object(
      'base', jsonb_build_object(
        'loanAmount', 18000000,
        'ltv', 44,
        'ltc', 60,
        'dscr', 1.25,
        'debtYield', 12.6,
        'irr', 17.5,
        'equityMultiple', 1.95,
        'rentGrowth', 3.0,
        'exitCap', 5.5,
        'constructionCost', 29807800,
        'vacancy', 7,
        'noi', 2268000
      ),
      'upside', jsonb_build_object(
        'loanAmount', 18500000,
        'ltv', 46,
        'ltc', 62,
        'dscr', 1.35,
        'debtYield', 13.8,
        'irr', 21.2,
        'equityMultiple', 2.3,
        'rentGrowth', 4.2,
        'exitCap', 5.25,
        'constructionCost', 30200000,
        'vacancy', 5,
        'noi', 2420000
      ),
      'downside', jsonb_build_object(
        'loanAmount', 17000000,
        'ltv', 42,
        'ltc', 58,
        'dscr', 1.15,
        'debtYield', 11.0,
        'irr', 13.4,
        'equityMultiple', 1.6,
        'rentGrowth', 2.0,
        'exitCap', 5.85,
        'constructionCost', 30500000,
        'vacancy', 10,
        'noi', 2050000
      )
    ),
    'timelineData', jsonb_build_array(
      jsonb_build_object('phase', 'Term Sheet Circulation', 'date', '2024-11-15', 'status', 'completed'),
      jsonb_build_object('phase', 'Due Diligence', 'date', '2025-02-28', 'status', 'completed'),
      jsonb_build_object('phase', 'Groundbreaking', 'date', '2025-08-01', 'status', 'current'),
      jsonb_build_object('phase', 'Topping Out', 'date', '2026-11-15', 'status', 'upcoming'),
      jsonb_build_object('phase', 'Substantial Completion', 'date', '2027-09-30', 'status', 'upcoming')
    ),
    'unitMixData', jsonb_build_array(
      jsonb_build_object('type', 'Studios', 'units', 84, 'avgSF', 385, 'avgRent', 1499),
      jsonb_build_object('type', '1BR', 'units', 24, 'avgSF', 759, 'avgRent', 1777),
      jsonb_build_object('type', '2BR', 'units', 8, 'avgSF', 1120, 'avgRent', 2572)
    ),
    'marketComps', jsonb_build_array(
      jsonb_build_object('name', 'The Hamilton', 'yearBuilt', 2020, 'units', 329, 'rentPSF', 3.05, 'capRate', 4.9),
      jsonb_build_object('name', 'The Gabriella', 'yearBuilt', 2020, 'units', 364, 'rentPSF', 3.10, 'capRate', 4.7),
      jsonb_build_object('name', 'Broadstone Ambrose', 'yearBuilt', 2021, 'units', 171, 'rentPSF', 2.95, 'capRate', 5.1),
      jsonb_build_object('name', 'Novel Deep Ellum', 'yearBuilt', 2022, 'units', 231, 'rentPSF', 3.25, 'capRate', 4.8),
      jsonb_build_object('name', 'The Academic', 'yearBuilt', 2023, 'units', 365, 'rentPSF', 3.35, 'capRate', 4.6)
    ),
    'employerData', jsonb_build_array(
      jsonb_build_object('name', 'AT&T Discovery District', 'employees', 5200, 'growth', 6),
      jsonb_build_object('name', 'Baylor Univ. Medical Center', 'employees', 7800, 'growth', 3),
      jsonb_build_object('name', 'Dallas County Government', 'employees', 4200, 'growth', 1),
      jsonb_build_object('name', 'JP Morgan Chase Regional HQ', 'employees', 5100, 'growth', 5),
      jsonb_build_object('name', 'Pegasus Park BioLabs', 'employees', 3400, 'growth', 8)
    ),
    'sponsorDeals', jsonb_build_array(
      jsonb_build_object('project', 'Farmers Market Tower', 'year', 2022, 'size', 38000000, 'irr', 21.0, 'multiple', 2.0),
      jsonb_build_object('project', 'Dallas Innovation Lofts', 'year', 2020, 'size', 31000000, 'irr', 19.3, 'multiple', 1.9),
      jsonb_build_object('project', 'Deep Ellum Gateway', 'year', 2019, 'size', 26500000, 'irr', 23.5, 'multiple', 2.2),
      jsonb_build_object('project', 'Cedars Junction', 'year', 2021, 'size', 29000000, 'irr', 20.5, 'multiple', 2.0),
      jsonb_build_object('project', 'South Dallas Workforce Portfolio', 'year', 2018, 'size', 24000000, 'irr', 24.0, 'multiple', 2.4)
    ),
    'dealSnapshotDetails', jsonb_build_object(
      'keyTerms', jsonb_build_object(
        'loanType', 'Senior Construction Loan',
        'rate', '8.00% (SOFR + ~275 bps)',
        'floor', '4.50%',
        'term', '24 months',
        'extension', 'Two 6-month options',
        'recourse', 'Partial recourse / completion guaranty',
        'origination', '1.00%',
        'exitFee', '0.50%',
        'prepayment', 'Minimum interest make-whole',
        'lenderReserves', jsonb_build_object(
          'interest', '12 months',
          'taxInsurance', 'Funded quarterly',
          'capEx', '$250,000'
        ),
        'covenants', jsonb_build_object(
          'minDSCR', '1.20x',
          'maxLTV', '60% LTC / 44% LTV',
          'minLiquidity', '$2,000,000',
          'completionGuaranty', 'Full completion guaranty'
        )
      ),
      'milestones', jsonb_build_array(
        jsonb_build_object('phase', 'Site Control & PFC Approval', 'date', '2024-07-12', 'status', 'completed', 'duration', 30),
        jsonb_build_object('phase', 'Design Development Complete', 'date', '2024-11-01', 'status', 'completed', 'duration', 45),
        jsonb_build_object('phase', 'Debt Marketing / DD', 'date', '2025-02-28', 'status', 'completed', 'duration', 60),
        jsonb_build_object('phase', 'Groundbreaking', 'date', '2025-08-01', 'status', 'current', 'duration', 60),
        jsonb_build_object('phase', 'Topping Out', 'date', '2026-11-15', 'status', 'upcoming', 'duration', 45),
        jsonb_build_object('phase', 'Substantial Completion', 'date', '2027-09-30', 'status', 'upcoming', 'duration', 60)
      ),
      'riskMatrix', jsonb_build_object(
        'high', jsonb_build_array(),
        'medium', jsonb_build_array(
          jsonb_build_object(
            'risk', 'Construction Cost Escalation',
            'mitigation', 'GMP contract with 5% contingency and periodic buy-out audits',
            'probability', '28%'
          ),
          jsonb_build_object(
            'risk', 'Lease-Up Velocity',
            'mitigation', '50% workforce units paired with committed Innovation Center tenancy',
            'probability', '22%'
          ),
          jsonb_build_object(
            'risk', 'Capital Stack Timing',
            'mitigation', 'LP equity soft-circled; closing concurrent with PFC ground lease',
            'probability', '18%'
          )
        ),
        'low', jsonb_build_array(
          jsonb_build_object(
            'risk', 'Entitlement / Permitting',
            'mitigation', 'PD-317 approvals and building permits in hand',
            'probability', '5%'
          ),
          jsonb_build_object(
            'risk', 'Market Demand',
            'mitigation', 'Downtown Dallas rent growth 6.9% 5-yr; 30k SF pre-leased',
            'probability', '12%'
          ),
          jsonb_build_object(
            'risk', 'Environmental / OZ Compliance',
            'mitigation', 'Phase I clean, OZ counsel engaged for structure oversight',
            'probability', '8%'
          )
        )
      ),
      'specialPrograms', jsonb_build_array(
        jsonb_build_object(
          'name', 'Opportunity Zone',
          'description', 'Site sits in Downtown Dallas OZ census tract; QOF equity eligible for capital gains deferral.'
        ),
        jsonb_build_object(
          'name', 'Public Facility Corporation Lease',
          'description', 'Dallas Housing Finance Corp lease provides a 100% property tax exemption in exchange for workforce housing.'
        ),
        jsonb_build_object(
          'name', 'Workforce Covenant',
          'description', '58 units restricted to households earning ≤80% AMI for the term of the PFC arrangement.'
        )
      )
    ),
    'assetProfileDetails', jsonb_build_object(
      'sitePlan', jsonb_build_object(
        'lotSize', '2.5 acres (108,900 SF)',
        'buildingFootprint', '92,000 SF',
        'parkingSpaces', 180,
        'greenSpace', '35% of site',
        'zoningDetails', jsonb_build_object(
          'current', 'PD-317 (SoGood Planned Development)',
          'allowedFAR', '4.0',
          'usedFAR', '3.3',
          'heightLimit', '240 feet',
          'actualHeight', '78 feet',
          'setbacks', jsonb_build_object(
            'front', '20ft',
            'side', '15ft',
            'rear', '20ft'
          )
        )
      ),
      'amenityDetails', jsonb_build_array(
        jsonb_build_object('name', 'Resort-Style Pool', 'size', '3,200 SF', 'description', 'Heated saltwater pool with cabanas overlooking the courtyard.'),
        jsonb_build_object('name', 'Fitness Center', 'size', '2,500 SF', 'description', '24/7 performance studio with functional training and Peloton bikes.'),
        jsonb_build_object('name', 'Sky Lounge', 'size', '1,800 SF', 'description', 'Rooftop terrace with downtown skyline views and indoor/outdoor bar.'),
        jsonb_build_object('name', 'Co-Working Space', 'size', '1,200 SF', 'description', 'Private focus rooms, conference space, and creators lab.'),
        jsonb_build_object('name', 'Pet Spa', 'size', '400 SF', 'description', 'Wash stations plus on-site grooming and micro retail.'),
        jsonb_build_object('name', 'Package Concierge', 'size', '300 SF', 'description', 'Smart lockers with cold storage for meal and grocery delivery.')
      ),
      'commercialSpaces', jsonb_build_array(
        jsonb_build_object('name', 'Innovation Center (GSV Holdings)', 'size', '30,000 SF', 'use', 'Education / Flex Office', 'status', 'Pre-leased'),
        jsonb_build_object('name', 'Office Suite 1', 'size', '6,785 SF', 'use', 'Creative Office', 'status', 'Marketed'),
        jsonb_build_object('name', 'Office Suite 2', 'size', '5,264 SF', 'use', 'Professional Services', 'status', 'Marketed'),
        jsonb_build_object('name', 'Retail Bay', 'size', '745 SF', 'use', 'Food & Beverage', 'status', 'Targeting local operator')
      ),
      'unitMixDetails', jsonb_build_object(
        'studios', jsonb_build_object('count', 84, 'avgSF', 385, 'rentRange', '$1,450-$1,575', 'deposit', '$500'),
        'oneBed', jsonb_build_object('count', 24, 'avgSF', 759, 'rentRange', '$1,700-$1,875', 'deposit', '$750'),
        'twoBed', jsonb_build_object('count', 8, 'avgSF', 1120, 'rentRange', '$2,450-$2,650', 'deposit', '$1,000')
      ),
      'detailedUnitMix', jsonb_build_array(
        jsonb_build_object('code', 'S1', 'type', 'Studio', 'units', 48, 'avgSF', 374),
        jsonb_build_object('code', 'S2', 'type', 'Studio', 'units', 28, 'avgSF', 380),
        jsonb_build_object('code', 'S3', 'type', 'Studio', 'units', 8, 'avgSF', 470),
        jsonb_build_object('code', 'A1', 'type', '1BR', 'units', 8, 'avgSF', 720),
        jsonb_build_object('code', 'A2', 'type', '1BR', 'units', 8, 'avgSF', 736),
        jsonb_build_object('code', 'A3', 'type', '1BR', 'units', 8, 'avgSF', 820),
        jsonb_build_object('code', 'B1', 'type', '2BR', 'units', 8, 'avgSF', 1120)
      ),
      'comparableDetails', jsonb_build_array(
        jsonb_build_object(
          'name', 'The Hamilton',
          'address', '2525 Elm St, Dallas, TX 75201',
          'distance', '0.4 miles',
          'yearBuilt', 2020,
          'units', 329,
          'occupancy', '95%',
          'avgRent', '$3.05 PSF',
          'lastSale', jsonb_build_object('date', 'Oct 2023', 'price', '$118M', 'capRate', '4.7%')
        ),
        jsonb_build_object(
          'name', 'Novel Deep Ellum',
          'address', '2900 Canton St, Dallas, TX 75226',
          'distance', '0.6 miles',
          'yearBuilt', 2022,
          'units', 231,
          'occupancy', '93%',
          'avgRent', '$3.25 PSF',
          'lastSale', jsonb_build_object('date', 'Jan 2024', 'price', '$105M', 'capRate', '4.8%')
        ),
        jsonb_build_object(
          'name', 'The Gabriella',
          'address', '2400 Main St, Dallas, TX 75201',
          'distance', '0.8 miles',
          'yearBuilt', 2020,
          'units', 364,
          'occupancy', '94%',
          'avgRent', '$3.10 PSF',
          'lastSale', jsonb_build_object('date', 'Mar 2023', 'price', '$132M', 'capRate', '4.7%')
        )
      )
    ),
    'marketContextDetails', jsonb_build_object(
      'demographicProfile', jsonb_build_object(
        'oneMile', jsonb_build_object('population', 38500, 'medianIncome', 72000, 'medianAge', 32),
        'threeMile', jsonb_build_object('population', 174270, 'medianIncome', 85906, 'medianAge', 33),
        'fiveMile', jsonb_build_object('population', 410000, 'medianIncome', 79500, 'medianAge', 34),
        'growthTrends', jsonb_build_object(
          'populationGrowth5yr', '6.9%',
          'incomeGrowth5yr', '8.4%',
          'jobGrowth5yr', '12.1%'
        ),
        'renterShare', '76.7% (3-mi)',
        'bachelorsShare', '50.2% (3-mi)'
      ),
      'majorEmployers', jsonb_build_array(
        jsonb_build_object('name', 'AT&T Discovery District', 'employees', 5200, 'growth', '+6%', 'distance', '0.6 miles'),
        jsonb_build_object('name', 'Baylor Univ. Medical Center', 'employees', 7800, 'growth', '+3%', 'distance', '1.1 miles'),
        jsonb_build_object('name', 'Dallas County Government Campus', 'employees', 4200, 'growth', '+1%', 'distance', '0.8 miles'),
        jsonb_build_object('name', 'JP Morgan Chase Regional HQ', 'employees', 5100, 'growth', '+5%', 'distance', '1.8 miles'),
        jsonb_build_object('name', 'Pegasus Park BioLabs', 'employees', 3400, 'growth', '+8%', 'distance', '3.5 miles')
      ),
      'supplyAnalysis', jsonb_build_object(
        'currentInventory', 12850,
        'underConstruction', 2750,
        'planned24Months', 4100,
        'averageOccupancy', '94.2%',
        'deliveryByQuarter', jsonb_build_array(
          jsonb_build_object('quarter', 'Q4 2024', 'units', 620),
          jsonb_build_object('quarter', 'Q1 2025', 'units', 880),
          jsonb_build_object('quarter', 'Q3 2025', 'units', 950),
          jsonb_build_object('quarter', 'Q1 2026', 'units', 760),
          jsonb_build_object('quarter', 'Q3 2026', 'units', 890)
        ),
        'marketNotes', 'Downtown Dallas submarket shows strong fundamentals with <6,000 units delivering over next 24 months, keeping occupancy above 94%. Limited new supply in Deep Ellum/Farmers Market corridor supports rent growth.'
      )
    ),
    'financialDetails', jsonb_build_object(
      'sourcesUses', jsonb_build_object(
        'sources', jsonb_build_array(
          jsonb_build_object('type', 'Senior Loan', 'amount', 18000000, 'percentage', 60.4),
          jsonb_build_object('type', 'Sponsor / PFC Equity', 'amount', 11807800, 'percentage', 39.6)
        ),
        'uses', jsonb_build_array(
          jsonb_build_object('type', 'Land Acquisition', 'amount', 6000000, 'percentage', 20.1),
          jsonb_build_object('type', 'Base Construction (Hard)', 'amount', 16950000, 'percentage', 56.9),
          jsonb_build_object('type', 'Contingency', 'amount', 847500, 'percentage', 2.8),
          jsonb_build_object('type', 'FF&E', 'amount', 580000, 'percentage', 1.9),
          jsonb_build_object('type', 'Construction Fees', 'amount', 174000, 'percentage', 0.6),
          jsonb_build_object('type', 'Architecture & Engineering', 'amount', 859800, 'percentage', 2.9),
          jsonb_build_object('type', 'Third Party Reports', 'amount', 50000, 'percentage', 0.2),
          jsonb_build_object('type', 'Legal & Organization', 'amount', 50000, 'percentage', 0.2),
          jsonb_build_object('type', 'Title & Recording', 'amount', 75000, 'percentage', 0.3),
          jsonb_build_object('type', 'Taxes During Construction', 'amount', 20000, 'percentage', 0.1),
          jsonb_build_object('type', 'Working Capital', 'amount', 1900000, 'percentage', 6.4),
          jsonb_build_object('type', 'Developer Fee', 'amount', 678000, 'percentage', 2.3),
          jsonb_build_object('type', 'PFC Structuring Fee', 'amount', 116000, 'percentage', 0.4),
          jsonb_build_object('type', 'Financing Costs', 'amount', 360000, 'percentage', 1.2),
          jsonb_build_object('type', 'Interest Reserve', 'amount', 1147500, 'percentage', 3.9)
        )
      ),
      'sponsorProfile', jsonb_build_object(
        'firmName', 'Hoque Global',
        'yearFounded', 2008,
        'totalDeveloped', '$950M+',
        'totalUnits', 3150,
        'activeProjects', 5,
        'principals', jsonb_build_array(
          jsonb_build_object(
            'name', 'Mike Hoque',
            'role', 'Chief Executive Officer',
            'experience', '22 years',
            'bio', 'Founder of Hoque Global with a focus on catalytic mixed-use districts across Dallas. Led delivery of five projects within the SoGood master plan.',
            'education', 'BBA, University of Texas at Dallas',
            'specialties', jsonb_build_array('Master Planning', 'Public / Private Partnerships', 'Mixed-Use'),
            'photo', '/api/placeholder/150/150/2563eb/FFFFFF?text=MH',
            'achievements', jsonb_build_array(
              'Downtown Dallas Inc. Stakeholder Award',
              'Delivered 1M+ SF of adaptive reuse',
              'Chair, Dallas Regional Chamber Urban Taskforce'
            )
          ),
          jsonb_build_object(
            'name', 'Joel Heikenfeld',
            'role', 'Managing Director, ACARA',
            'experience', '18 years',
            'bio', 'Leads capital structuring for ACARA with an emphasis on PFC-backed workforce housing investments across Texas.',
            'education', 'MBA, SMU Cox School of Business',
            'specialties', jsonb_build_array('Capital Markets', 'Workforce Housing', 'PFC Structures'),
            'photo', '/api/placeholder/150/150/10B981/FFFFFF?text=JH',
            'achievements', jsonb_build_array(
              'Structured $300M+ of tax-exempt executions',
              'Board Member, Dallas Housing Finance Corp',
              'ULI North Texas Housing Council'
            )
          )
        ),
        'trackRecord', jsonb_build_array(
          jsonb_build_object('project', 'SoGood Phase A', 'year', 2023, 'units', 190, 'irr', '21.5%', 'status', 'Completed', 'market', 'Dallas CBD', 'type', 'Mixed-Use'),
          jsonb_build_object('project', 'Hamilton Station Lofts', 'year', 2021, 'units', 165, 'irr', '20.3%', 'status', 'Completed', 'market', 'Deep Ellum', 'type', 'Multifamily'),
          jsonb_build_object('project', 'South Side Flats', 'year', 2020, 'units', 230, 'irr', '22.8%', 'status', 'Completed', 'market', 'The Cedars', 'type', 'Multifamily'),
          jsonb_build_object('project', 'Farmers Market West', 'year', 2019, 'units', 210, 'irr', '19.7%', 'status', 'Completed', 'market', 'Farmers Market', 'type', 'Mixed-Use'),
          jsonb_build_object('project', 'Lamar Urban Lofts', 'year', 2018, 'units', 150, 'irr', '24.0%', 'status', 'Completed', 'market', 'Downtown Dallas', 'type', 'Adaptive Reuse')
        ),
        'references', jsonb_build_array(
          jsonb_build_object('firm', 'Frost Bank', 'contact', 'Construction lending team, available upon request', 'relationship', 'Construction Lender', 'years', '6+ years'),
          jsonb_build_object('firm', 'Citi Community Capital', 'contact', 'Available upon request', 'relationship', 'Permanent / Agency Lender', 'years', '4+ years'),
          jsonb_build_object('firm', 'Dallas Housing Finance Corp', 'contact', 'Board liaison', 'relationship', 'PFC Partner', 'years', '5+ years')
        )
      ),
      'returnProjections', jsonb_build_object(
        'base', jsonb_build_object('irr', 17.5, 'multiple', 1.95, 'profitMargin', 27),
        'upside', jsonb_build_object('irr', 21.2, 'multiple', 2.3, 'profitMargin', 33),
        'downside', jsonb_build_object('irr', 13.4, 'multiple', 1.6, 'profitMargin', 18)
      )
    ),
    'certifications', jsonb_build_object(
      'badges', jsonb_build_array(
        jsonb_build_object('name', 'Opportunity Zone', 'status', 'Qualified', 'icon', 'shield-check'),
        jsonb_build_object('name', 'Dallas PFC Tax Exemption', 'status', 'Executed', 'icon', 'building'),
        jsonb_build_object('name', 'Workforce Housing Covenant', 'status', '50% ≤80% AMI', 'icon', 'users')
      )
    ),
    'capitalStackData', jsonb_build_object(
      'base', jsonb_build_object(
        'totalCapitalization', 29807800,
        'sources', jsonb_build_array(
          jsonb_build_object('type', 'Senior Construction Loan', 'amount', 18000000, 'percentage', 60.4, 'rate', 'SOFR + 275 bps', 'term', '24 + 2x6 months'),
          jsonb_build_object('type', 'Sponsor / PFC Equity', 'amount', 11807800, 'percentage', 39.6, 'contribution', 'Cash & ground lease', 'timing', 'Upfront')
        ),
        'uses', jsonb_build_array(
          jsonb_build_object('type', 'Land Acquisition', 'amount', 6000000, 'percentage', 20.1, 'timing', 'Month 0'),
          jsonb_build_object('type', 'Hard Costs', 'amount', 16950000, 'percentage', 56.9, 'timing', 'Months 1-24'),
          jsonb_build_object('type', 'Soft Costs', 'amount', 5350300, 'percentage', 18.0, 'timing', 'Months 1-24'),
          jsonb_build_object('type', 'Financing & Reserves', 'amount', 1507500, 'percentage', 5.1, 'timing', 'Month 0')
        ),
        'debtTerms', jsonb_build_object(
          'loanType', 'Senior Construction Loan',
          'lender', 'National Bank (indicative)',
          'rate', '8.00% floating',
          'floor', '4.50%',
          'term', '24 months',
          'extension', 'Two 6-month extensions',
          'recourse', 'Partial / completion',
          'origination', '1.00%',
          'exitFee', '0.50%',
          'reserves', jsonb_build_object(
            'interest', '12 months funded',
            'taxInsurance', 'Funded quarterly',
            'capEx', '$250,000'
          )
        )
      )
    )
  );

  -- Reset any existing seeded resumes for this project and insert a fresh versioned snapshot
  DELETE FROM public.project_resumes WHERE project_id = v_target_project_id;
  DELETE FROM public.borrower_resumes WHERE project_id = v_target_project_id;

  -- Insert project resume (versioning triggers will assign version_number/status)
  INSERT INTO public.project_resumes (project_id, content, completeness_percent)
  VALUES (v_target_project_id, v_project_resume, 100);

  -- Insert borrower resume (versioning triggers will assign version_number/status)
  INSERT INTO public.borrower_resumes (project_id, content, completeness_percent)
  VALUES (v_target_project_id, v_borrower_resume, 100);

  -- Ensure borrower root resources exist for this project
  PERFORM public.ensure_project_borrower_roots(v_target_project_id);

  -- Insert/update OM row for this project (single row per project, no versioning)
  INSERT INTO public.om (project_id, content)
  VALUES (v_target_project_id, v_om_content)
  ON CONFLICT (project_id) DO UPDATE SET
    content = EXCLUDED.content,
    updated_at = now();

  RAISE NOTICE '✅ Hoque data (resume + borrower + OM) seeded for project "%" (%).', v_project.name, v_target_project_id;
END $$;

