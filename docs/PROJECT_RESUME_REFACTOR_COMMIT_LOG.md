# Project Resume Refactor — Commit Log

Branch: `project-resume-optimization` (from `main`)

Use this log to roll back to a previous state: `git checkout <commit-hash>`.

| # | Commit (short) | Description |
|---|----------------|-------------|
| 0 | (branch point) | Branch created from main. |
| 1 | refactor(project-resume): add characterization tests and harness | Jest + fixtures + domain copies for isProjectValueProvided, sanitizeProjectProfile; completion tests. |
| 2 | refactor(project-resume): extract pure domain helpers | Form imports isProjectValueProvided, sanitizeProjectProfile; lockSelectors, fieldStateSelectors, subsectionBadgeState, schemaSelectors; tests for lock/field-state. |
| 3 | (pending) | Extract schema and field registries. |
| 4 | refactor(project-resume): extract persistence and draft hooks | useProjectResumeDraft (localStorage restore + debounce), useProjectResumePersistence (dirty tracking, save, unmount, beforeunload). |
| 5 | refactor(project-resume): extract validation hook | useProjectResumeValidation (sanity checker, handleBlur, fieldDependencies, batch revalidation). |
| 6 | refactor(project-resume): extract derived-field engine | derivedFieldCalculators.ts + useProjectResumeDerivedFields (incentiveStacking, targetLtv/Ltc, totalCommercialGRSF, unit counts). |
| 7 | refactor(project-resume): extract generic field UI primitives | ProjectFieldLockButton, ProjectFieldLabelRow; form uses them for lock button and label/help/warnings/Ask AI row. |
| 8 | refactor(project-resume): extract subsection and wizard view layer | ProjectResumeSubsection (accordion row + badges + lock); ProjectResumeWizard (wraps FormWizard with tabs + bottom nav). Form uses both; subsection list key fix. |
| 9 | refactor(project-resume): extract ProjectMediaUpload | editors/ProjectMediaUpload.tsx; form imports from feature. |
| 10 | (in progress) | Extract high-volume custom editors: ResidentialUnitMix, CommercialSpaceMix, DrawSchedule, RentComps, MajorEmployers, DeliveryByQuarter, T12Financial, FiveYearCashFlow, ReturnsBreakdown, QuarterlyDeliverySchedule (via DeliveryByQuarterEditor), SensitivityAnalysis, CapitalUseTiming, Risk (RiskListEditor×3) done; RentRoll, T12MonthlyData optional remaining. |
| 11 | (done in prior commits) | Form is thin shell; composes hooks and components; public API unchanged. |
| 12 | (manual) | Run full regression checklist (see Validation Matrix in plan) before merge. |
