# Field Structures Documentation

This document preserves the current field structures for borrower, principal, and project resumes during the migration to org-scoped storage.

## Current Borrower Profile Fields (Legacy BorrowerProfile)

**Basic Information:**
- `id`: string - Profile ID
- `userId`: string - User ID
- `fullLegalName`: string - Full legal name of the entity
- `primaryEntityName`: string - Primary entity name
- `primaryEntityStructure`: EntityStructure - LLC, LP, S-Corp, etc.
- `contactEmail`: string - Contact email
- `contactPhone`: string - Contact phone
- `contactAddress`: string - Contact address
- `bioNarrative`: string - Bio narrative
- `linkedinUrl`: string - LinkedIn URL
- `websiteUrl`: string - Website URL

**Experience & Background:**
- `yearsCREExperienceRange`: ExperienceRange - 0-2, 3-5, 6-10, 11-15, 16+
- `assetClassesExperience`: string[] - Multifamily, Office, Retail, etc.
- `geographicMarketsExperience`: string[] - Northeast, West Coast, etc.
- `totalDealValueClosedRange`: DealValueRange - <$10M, $10M-$50M, etc.
- `existingLenderRelationships`: string - Existing lender relationships

**Financial Information:**
- `creditScoreRange`: CreditScoreRange - <600, 600-649, etc.
- `netWorthRange`: NetWorthRange - <$1M, $1M-$5M, etc.
- `liquidityRange`: LiquidityRange - <$100k, $100k-$500k, etc.
- `bankruptcyHistory`: boolean - Bankruptcy history
- `foreclosureHistory`: boolean - Foreclosure history
- `litigationHistory`: boolean - Litigation history

**Progress & Metadata:**
- `completenessPercent`: number - Completion percentage
- `createdAt`: string - Creation timestamp
- `updatedAt`: string - Update timestamp
- `entityId`: string - Entity ID (maps to active_org_id)
- `masterProfileId`: string | null - Master profile ID
- `lastSyncedAt`: string - Last sync timestamp
- `customFields`: string[] - Custom fields

## Current Project Resume Fields (ProjectResumeContent)

**Basic Project Info:**
- `projectName`: string - Project name
- `assetType`: string - Asset type
- `projectStatus`: string - Project status

**Address Fields:**
- `propertyAddressStreet`: string - Street address
- `propertyAddressCity`: string - City
- `propertyAddressState`: string - State
- `propertyAddressCounty`: string - County
- `propertyAddressZip`: string - ZIP code

**Project Details:**
- `projectDescription`: string - Project description
- `projectPhase`: string - Project phase

**Financial Fields:**
- `loanAmountRequested`: number - Loan amount requested
- `loanType`: string - Loan type
- `targetLtvPercent`: number - Target LTV percentage
- `targetLtcPercent`: number - Target LTC percentage
- `amortizationYears`: number - Amortization years
- `interestOnlyPeriodMonths`: number - Interest only period
- `interestRateType`: string - Interest rate type
- `targetCloseDate`: string - Target close date
- `useOfProceeds`: string - Use of proceeds
- `recoursePreference`: string - Recourse preference
- `purchasePrice`: number - Purchase price
- `totalProjectCost`: number - Total project cost
- `capexBudget`: number - CapEx budget
- `propertyNoiT12`: number - Property NOI T12
- `stabilizedNoiProjected`: number - Stabilized NOI projected
- `exitStrategy`: string - Exit strategy
- `businessPlanSummary`: string - Business plan summary
- `marketOverviewSummary`: string - Market overview summary
- `equityCommittedPercent`: number - Equity committed percentage

**Progress Tracking:**
- `completenessPercent`: number - Completion percentage
- `internalAdvisorNotes`: string - Internal advisor notes
- `borrowerProgress`: number - Borrower progress
- `projectProgress`: number - Project progress

**Legacy Fields:**
- `projectSections`: any - Project sections
- `borrowerSections`: any - Borrower sections

## Current Borrower Resume Fields (BorrowerResumeContent)

**Basic Borrower Info:**
- `fullLegalName`: string - Full legal name
- `primaryEntityName`: string - Primary entity name
- `primaryEntityStructure`: string - Entity structure
- `contactPhone`: string - Contact phone
- `contactAddress`: string - Contact address
- `bioNarrative`: string - Bio narrative
- `linkedinUrl`: string - LinkedIn URL
- `websiteUrl`: string - Website URL

**Experience Fields:**
- `yearsCREExperienceRange`: string - Experience range
- `assetClassesExperience`: string[] - Asset classes experience
- `geographicMarketsExperience`: string[] - Geographic markets experience
- `totalDealValueClosedRange`: string - Deal value range
- `existingLenderRelationships`: string - Lender relationships

**Financial Fields:**
- `creditScoreRange`: string - Credit score range
- `netWorthRange`: string - Net worth range
- `liquidityRange`: string - Liquidity range
- `bankruptcyHistory`: boolean - Bankruptcy history
- `foreclosureHistory`: boolean - Foreclosure history
- `litigationHistory`: boolean - Litigation history

**RBAC Fields:**
- `orgId`: string - Organization ID
- `masterProfileId`: string - Master profile ID
- `lastSyncedAt`: string - Last sync timestamp
- `customFields`: any[] - Custom fields

## Migration Notes

- BorrowerProfile fields will be split between Profile (core identity) and BorrowerResumeContent (detailed org info)
- ProjectResumeContent remains unchanged (project-scoped)
- BorrowerResumeContent will be enhanced to match BorrowerProfile fields
- Principal resume fields will be defined separately (user-scoped marketing profile)
