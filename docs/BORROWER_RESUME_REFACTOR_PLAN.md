# Borrower Resume Refactor — Commit-by-Commit Plan

**Context:** This refactor is done on the **existing** `project-resume-optimization` branch (no new branch). It mirrors the project-resume refactor: domain / hooks / components / editors under `src/features/borrower-resume/`.

**Target:** Shrink `BorrowerResumeForm.tsx` from ~3.5k lines to ~500–1.2k lines.

---

**Pre-fix (do first):** In `BorrowerResumeForm.tsx` around lines 383–384 there is a duplicate `await supabase`; remove the extra line so the update runs once.

---

## Commit 0: Characterization tests (no new branch)

**Goal:** Tests that lock current behavior before moving code. No branch creation — continue on `project-resume-optimization`.

**Actions:**

1. Add `src/features/borrower-resume/__tests__/` with:
   - **Fixtures:** `borrowerProfile.ts` — minimal `BorrowerResumeContent` (or `Partial<…>`) and sample `_metadata` / `_lockedFields` for tests.
   - **Tests:**
     - `isBorrowerValueProvided.test.ts` — test `isValueProvided` (current logic in form ~174–181: null/undefined, string trim, array length, number NaN, boolean).
     - `sanitizeBorrowerProfile.test.ts` — test `sanitizeBorrowerProfile`: boolean→null for configured fields, `_metadata` normalization, default `user_input` source.
     - Optional: `completion.test.ts` — call `computeBorrowerCompletion` with fixture data and assert percent (or required-field behavior) so completion logic isn’t broken later.

**Snippet (isBorrowerValueProvided):**

```ts
// __tests__/isBorrowerValueProvided.test.ts
import { isBorrowerValueProvided } from "../domain/isBorrowerValueProvided";

describe("isBorrowerValueProvided", () => {
  it("returns false for null/undefined", () => {
    expect(isBorrowerValueProvided(null)).toBe(false);
    expect(isBorrowerValueProvided(undefined)).toBe(false);
  });
  it("returns false for empty string", () => {
    expect(isBorrowerValueProvided("")).toBe(false);
    expect(isBorrowerValueProvided("   ")).toBe(false);
  });
  it("returns true for non-empty string", () => {
    expect(isBorrowerValueProvided("a")).toBe(true);
  });
  it("returns true for non-empty array", () => {
    expect(isBorrowerValueProvided([1])).toBe(true);
  });
  it("returns false for empty array", () => {
    expect(isBorrowerValueProvided([])).toBe(false);
  });
  // number, boolean cases...
});
```

Run tests after each later commit to ensure nothing regresses.

---

## Commit 1: Extract constants

**Goal:** Move all option arrays out of the form into a single feature constants module.

**New file:** `src/features/borrower-resume/constants.ts`

**Move from form (lines ~88–173):**

- `entityStructureOptions`
- `experienceRangeOptions`
- `dealValueRangeOptions`
- `creditScoreRangeOptions`
- `netWorthRangeOptions`
- `liquidityRangeOptions`
- `principalRoleOptions`
- `assetClassOptions`
- `geographicMarketsOptions`

**Snippet:**

```ts
// src/features/borrower-resume/constants.ts
import type { PrincipalRole } from "@/types/enhanced-types";

export const entityStructureOptions = [
  "LLC", "LP", "S-Corp", "C-Corp", "Sole Proprietorship", "Trust", "Other",
] as const;

export const experienceRangeOptions = ["0-2", "3-5", "6-10", "11-15", "16+"] as const;
// ... etc.

export const principalRoleOptions: PrincipalRole[] = [
  "Managing Member", "General Partner", "Developer", "Sponsor",
  "Key Principal", "Guarantor", "Limited Partner", "Other",
];
// ... assetClassOptions, geographicMarketsOptions
```

**Form change:** Replace inline option arrays with imports from `@/features/borrower-resume/constants`.

**Check:** Form still renders; dropdowns/options unchanged.

---

## Commit 2: Extract domain helpers (value-provided, sanitize, hasCompletePrincipals)

**Goal:** Pure domain logic in `features/borrower-resume/domain/`, form imports it.

**New files:**

1. **`domain/isBorrowerValueProvided.ts`** — Move current `isValueProvided` (form lines 174–181); export as `isBorrowerValueProvided`.

2. **`domain/hasCompletePrincipals.ts`** — Move `hasCompletePrincipals` (form lines 184–191). Type the principal shape instead of `any` where possible.

3. **`domain/sanitizeBorrowerProfile.ts`** — Move `sanitizeBorrowerProfile` (form lines 194–261). Import `borrowerResumeFieldMetadata` from `@/lib/borrower-resume-field-metadata`.

**Form:** Remove in-form implementations; import from `@/features/borrower-resume/domain/...`.

**Tests:** Commit 0 tests should call the domain modules (update imports). Add/expand tests in `sanitizeBorrowerProfile.test.ts` and optionally for `hasCompletePrincipals`.

---

## Commit 3: Extract lock and field-state selectors

**Goal:** Centralize lock and field-state logic so the form only calls selectors.

**New files:**

1. **`domain/lockSelectors.ts`** — Context type + `isFieldLocked`, `isSubsectionFullyLocked` (mirror project-resume’s `lockSelectors`).

2. **`domain/fieldStateSelectors.ts`** — `isFieldBlue`, `isFieldGreen`, `isFieldWhite` using formData and fieldMetadata (and optionally sectionId).

**Form:** Replace inline implementations with imports and a small context object passed into selectors.

**Tests:** Add `__tests__/lockSelectors.test.ts` (and optionally `fieldStateSelectors.test.ts`).

---

## Commit 4: Extract subsection badge state

**Goal:** One place that computes Error / Needs Input / Complete and subsection lock button state.

**New file:** `domain/subsectionBadgeState.ts` — Mirror project-resume: take context + field IDs; return `{ showError, showNeedsInput, showComplete, subsectionLocked, subsectionLockDisabled, subsectionLockTitle }`. Use lock and field-state selectors and `isBorrowerValueProvided`.

**Form:** Replace inline badge computation in the step builder with `getSubsectionBadgeState(ctx, allFieldIds)`.

---

## Commit 5: Extract schema selectors (field labels, mapWarningsToLabels)

**Goal:** Field labels and warning mapping live in domain.

**New file:** `domain/schemaSelectors.ts` — `buildFieldLabelMap(formSchema)`, `mapWarningsToLabels(warnings, fieldLabelMap)`. Can reuse project-resume pattern or add borrower-specific helpers.

**Form:** Replace `fieldLabelMap` useMemo and `mapWarningsToLabels` useCallback with these helpers.

---

## Commit 6: Extract validation dependencies

**Goal:** Dependency map for revalidation lives in domain.

**New file:** `domain/validationDependencies.ts` — Export `BORROWER_FIELD_DEPENDENCIES` (current form lines 814–833).

**Form:** Replace useMemo for `fieldDependencies` with import of `BORROWER_FIELD_DEPENDENCIES`.

---

## Commit 7: Extract persistence hook (useBorrowerResumePersistence)

**Goal:** Dirty tracking, save, refs, and “has unsaved changes” in a hook.

**New file:** `hooks/useBorrowerResumePersistence.ts` — Refs, `hasUnsavedChanges()`, `saveToDatabase(finalData, createNewVersion)`, optional `setBaselineSnapshot`. Draft localStorage can stay in form for this commit or move in Commit 8.

**Form:** Call the hook; replace inline `hasUnsavedChanges` and `saveToDatabase` with hook return values. `handleFormSubmit` and unload/onRegisterSave use the hook.

---

## Commit 8: Extract draft hook (useBorrowerResumeDraft) — optional

**Goal:** LocalStorage restore and debounced draft save in one hook.

**New file:** `hooks/useBorrowerResumeDraft.ts` — Move draft restore effect and debounced draft-save effect from form.

**Form:** Remove those effects; use hook.

---

## Commit 9: Extract validation hook (useBorrowerResumeValidation)

**Goal:** Sanity checker setup, handleBlur, and dependency revalidation in a hook.

**New file:** `hooks/useBorrowerResumeValidation.ts` — Sanity checker ref, `handleBlur`, dependency-revalidation effect. Return `{ handleBlur }`.

**Form:** Use `useBorrowerResumeValidation({ ... })` and pass `handleBlur` into field/editor handlers. Remove in-form sanity ref, handleBlur, and dependency effect.

---

## Commit 10: Extract field UI primitives (BorrowerFieldLockButton, BorrowerFieldLabelRow)

**Goal:** Reusable lock button and label row for borrower fields.

**New files:**

1. **`components/BorrowerFieldLockButton.tsx`** — Props: fieldId, sectionId?, locked, disabled, onClick, className. Mirror project-resume’s lock button.

2. **`components/BorrowerFieldLabelRow.tsx`** — Props: fieldId, labelText, required, hasWarnings, warningMessages, fieldWrapperRef, fieldMetadataItem, onAskAI, lockButton. Use `fieldMetadataItem ?? undefined` for FieldHelpTooltip.

**Form:** Replace inline lock button and label rows with these components.

---

## Commit 11: Extract BorrowerResumeSubsection and BorrowerResumeWizard

**Goal:** Subsection chrome and wizard shell in feature components.

**New files:**

1. **`components/BorrowerResumeSubsection.tsx`** — Props: subsection, sectionId, isExpanded, onToggle, badgeState, onLockClick, children. Accordion row + lock + badges; when expanded render children in wrapper. Clean title (strip “1.1 ” style).

2. **`components/BorrowerResumeWizard.tsx`** — Props: steps, initialStep, onComplete, onStepChange. Render FormWizard with variant="tabs", showBottomNav, allowSkip, showProgressBar=false, showStepIndicators=false, nextButtonLabel="Next".

**Form:** Use `<BorrowerResumeSubsection key={subsectionKey} ...>` for each subsection; replace `<FormWizard ... />` with `<BorrowerResumeWizard ... />`. Pass stable `key={subsectionKey}` in the subsection map.

---

## Commit 12: Extract PrincipalsEditor

**Goal:** All principals table UI and behavior in an editor.

**New file:** `editors/PrincipalsEditor.tsx` — Props: value (Principal[]), onChange, disabled, fieldId, sectionId, title, required, fieldMetadata, lockButton, className. Table: Name, Role, Email, Ownership %, Bio, actions. Add/remove row, cell change (including ownershipPercentage number parsing). Use principalRoleOptions from constants.

**Form:** Replace principals subsection block with `<PrincipalsEditor ... />`. Remove handleRemovePrincipal from form if only used here.

---

## Commit 13: Extract TrackRecordEditor

**Goal:** Track record table in a dedicated editor.

**New file:** `editors/TrackRecordEditor.tsx` — Props: value (TrackRecordItem[]), onChange, disabled, fieldId, sectionId, title, required, fieldMetadata, lockButton, className. Match current table columns and add/remove/change behavior.

**Form:** Replace track-record block with `<TrackRecordEditor ... />`. Remove handleRemoveTrackRecord if only used here.

---

## Commit 14: Extract ReferencesEditor

**Goal:** Lender references table in a dedicated editor.

**New file:** `editors/ReferencesEditor.tsx` — Props: value (ReferenceItem[]), onChange, disabled, fieldId, sectionId, title, required, fieldMetadata, lockButton, className. Match current columns and add/remove/change.

**Form:** Replace references block with `<ReferencesEditor ... />`. Remove handleRemoveReference if only used here.

---

## Commit 15: Thin shell and cleanup

**Goal:** Form is a thin shell: state, one-off effects (realtime hook, autofill, version change), and composition of domain/hooks/components/editors.

**Actions:**

- All domain from `@/features/borrower-resume/domain/`.
- All hooks from `@/features/borrower-resume/hooks/`.
- All subsection/table UI via BorrowerResumeSubsection, BorrowerResumeWizard, and the three editors.
- Remove dead code.
- Keep in form: props, useProjectBorrowerResumeRealtime, useAuth, useAutofill, header (title, Copy, Autofill, Save), progress/dirty callbacks, onRegisterSave, deal-type filtering, step-building useMemo that maps schema to subsections + dynamic fields + editors.
- Run `npx tsc --noEmit` and `npm run lint`; fix any types in new feature files.

---

## Commit 16: (Manual) Regression and docs

**Goal:** Confirm no feature regressions and document the refactor.

**Checklist:**

- Fill and save borrower resume; change principals/track record/references; lock subsection; switch steps; copy profile; autofill; completion % and validation (sanity) unchanged.
- Run borrower-resume and completion tests.
- Add or update `docs/BORROWER_RESUME_REFACTOR_COMMIT_LOG.md` listing commits 0–16 with one-line descriptions (same style as project-resume commit log).

---

## Summary table

| Commit | Focus |
|--------|--------|
| 0 | Characterization tests (value-provided, sanitize, completion); no new branch |
| 1 | Constants |
| 2 | Domain: isBorrowerValueProvided, hasCompletePrincipals, sanitizeBorrowerProfile |
| 3 | Domain: lockSelectors, fieldStateSelectors |
| 4 | Domain: subsectionBadgeState |
| 5 | Domain: schemaSelectors |
| 6 | Domain: validationDependencies |
| 7 | Hook: useBorrowerResumePersistence |
| 8 | Hook: useBorrowerResumeDraft (optional) |
| 9 | Hook: useBorrowerResumeValidation |
| 10 | Components: BorrowerFieldLockButton, BorrowerFieldLabelRow |
| 11 | Components: BorrowerResumeSubsection, BorrowerResumeWizard |
| 12 | Editor: PrincipalsEditor |
| 13 | Editor: TrackRecordEditor |
| 14 | Editor: ReferencesEditor |
| 15 | Form thin shell + cleanup |
| 16 | Regression + docs |

**Branch:** All work stays on the existing `project-resume-optimization` branch (frontend).
