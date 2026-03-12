# Borrower Resume Refactor — Commit Log

Branch: `project-resume-optimization` (from `main`)

Use this log to roll back to a previous state: `git checkout <commit-hash>`.

| # | Commit (short) | Description |
|---|----------------|-------------|
| 0 | refactor(borrower-resume): characterization tests + domain | Jest + fixtures; isBorrowerValueProvided, hasCompletePrincipals, sanitizeBorrowerProfile in domain/; tests for value-provided, sanitize, principals. |
| 1 | refactor(borrower-resume): extract constants | Option arrays (entityStructure, experienceRange, dealValue, creditScore, netWorth, liquidity, principalRole, assetClass, geographicMarkets) in constants.ts. |
| 2 | refactor(borrower-resume): form uses domain helpers | Form imports isBorrowerValueProvided, hasCompletePrincipals, sanitizeBorrowerProfile from domain. |
| 3 | refactor(borrower-resume): lock and field-state selectors | lockSelectors (isFieldLocked, isSubsectionFullyLocked), fieldStateSelectors (isFieldBlue, isFieldGreen, isFieldWhite, isFieldRed); form builds context and uses selectors. |
| 4 | refactor(borrower-resume): subsection badge state | getSubsectionBadgeState in domain; form replaces inline badge block with helper. |
| 5 | refactor(borrower-resume): schema selectors | buildFieldLabelMap, mapWarningsToLabels in domain; form uses them. |
| 6 | refactor(borrower-resume): validation dependencies | BORROWER_FIELD_DEPENDENCIES in domain; form uses constant. |
| 7 | refactor(borrower-resume): useBorrowerResumePersistence | Hook: setBaselineSnapshot, hasUnsavedChanges, saveToDatabase, stateRef; form wires hook and removes inline persistence refs/effects. |
| 8 | refactor(borrower-resume): useBorrowerResumeDraft | Hook: localStorage restore + debounced draft save; form uses hook for isRestoring and removes restore/save effects. |
| 9 | refactor(borrower-resume): useBorrowerResumeValidation | Hook: sanity checker ref, handleBlur, dependency revalidation effect; form uses hook. |
| 10 | refactor(borrower-resume): BorrowerFieldLockButton, BorrowerFieldLabelRow | Feature components for lock button and label row; form uses them. |
| 11 | refactor(borrower-resume): BorrowerResumeSubsection, BorrowerResumeWizard | Subsection accordion + lock + badges; wizard wraps FormWizard; form uses both. |
| 12 | refactor(borrower-resume): PrincipalsEditor | editors/PrincipalsEditor (value, onChange, table: Name, Role, Email, Ownership %, Bio); form replaces principals block. |
| 13 | refactor(borrower-resume): TrackRecordEditor | editors/TrackRecordEditor (value, onChange, table: Project, Year, Units, IRR, Market, Type); form replaces track-record block. |
| 14 | refactor(borrower-resume): ReferencesEditor | editors/ReferencesEditor (value, onChange, table: Firm, Relationship, Years, Contact); form replaces lender-references block. |
| 15 | refactor(borrower-resume): thin shell + cleanup | Form composes domain/hooks/components/editors; dead code removed; tsc and lint pass. |
| 16 | (manual) | Regression + docs: fill/save/lock/autofill/copy; run borrower-resume tests; this commit log. |
