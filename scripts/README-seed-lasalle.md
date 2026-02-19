# 300 East LaSalle (Matthews LLC) Seed Script

Seeds **users**, **project**, **borrower resume**, **project resume**, **documents**, and **lender access** for the 300 East LaSalle deal. No chat messages, underwriting docs, or images.

- **Advisor:** Cody Field (`cody.field@capmatch.com`) — same as Hoque seed
- **Borrower (owner):** Param Vora (`param.vora@capmatch.com`) — same account as Hoque/demo; owns the project and org
- **Members:** Same four as Hoque — Aryan Jain, Sarthak Karandikar, Kabeer Merchant, Vatsal Hariramani — added to Param’s org as **member** and granted project access
- **Lender:** Capital Lending Group (`lender@capmatch.com`) — get or create; granted access to the project (same as Hoque)
- **Project:** 300 East LaSalle

Same permission model as `seed-hoque-project.ts`: advisor gets full project access; owner (Param) has edit via project access grant; members get edit on Project Resume, Project Docs, Borrower Resume, Borrower Docs; lender gets access via `grant_lender_project_access`.

## Usage

### Local

```bash
npx tsx scripts/seed-lasalle-project.ts
```

### Production

```bash
npx tsx scripts/seed-lasalle-project.ts --prod
```

The script waits 5 seconds before proceeding in production so you can cancel with Ctrl+C.

### Cleanup

```bash
# Local
npx tsx scripts/seed-lasalle-project.ts cleanup

# Production
npx tsx scripts/seed-lasalle-project.ts --prod cleanup
```

Cleanup deletes the **300 East LaSalle** project and all related data (resources, resumes, chat, access, lender_project_access). It does **not** delete the borrower (Param Vora), members, advisor, or lender (same behavior as Hoque).

## Prerequisites

- **Local:** `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- **Production:** `.env.production` with the same variables (and a `https://` Supabase URL)

## Document path

The script looks for the `final-set` folder in this order:

1. **`LASALLE_DOCS_PATH`** (if set in `.env.local` or `.env.production`)
2. `{cwd}/Deals/LaSalle/300 E, Lasalle/300 E, Lasalle/final-set`
3. `{cwd}/../Deals/LaSalle/300 E, Lasalle/300 E, Lasalle/final-set`
4. `D:\Career\Technology\Job\CapMatch\Deals\LaSalle\300 E, Lasalle\300 E, Lasalle\final-set`

All `.pdf`, `.xlsx`, `.xls`, `.docx`, `.doc` files in that folder are uploaded as **project documents**. If the folder is missing, the script logs a warning and continues without documents.

## What gets created

- **Advisor** (if missing): Cody Field, CapMatch Advisors org
- **Borrower (owner):** Param Vora (`param.vora@capmatch.com`) — get or create; project and org owned by this account (shared with Hoque/demo)
- **Members:** Aryan Jain, Sarthak Karandikar, Kabeer Merchant, Vatsal Hariramani (same as Hoque) — created if missing, added to Param’s org with role **member**, and granted project access (edit on resumes and doc roots)
- **Lender:** Capital Lending Group (`lender@capmatch.com`) — created if missing; granted access to the project via `grant_lender_project_access` (advisor grants)
- **Project:** 300 East LaSalle, assigned to Cody Field
- **Project resume:** Populated from the Project Resume data extraction (key fields)
- **Borrower resume:** Populated from the Borrower Resume data extraction
- **Documents:** One FILE resource per file in `final-set`, under PROJECT_DOCS_ROOT
- **Permissions:** Advisor full access; owner (Param) has project access; each member gets edit on PROJECT_RESUME, PROJECT_DOCS_ROOT, BORROWER_RESUME, BORROWER_DOCS_ROOT; lender gets project access via lender_project_access

## Notes

- Run with `npx tsx` (not `tsc`).
- Default password for seeded users: `password`.
- Resumes use the same rich format and completion logic as the app; locked fields and completeness are set from the extracted data.
