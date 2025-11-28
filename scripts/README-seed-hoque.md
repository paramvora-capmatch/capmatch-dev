# Hoque (SoGood Apartments) Complete Account Seed Script

Comprehensive TypeScript seed script that creates a complete account setup for the Hoque Global / SoGood Apartments project:
- ✅ **Advisor account** (Cody Field - cody@capmatch.com)
- ✅ **Borrower account** (Hoque Global - info@hoqueglobal.com)
- ✅ **Team member accounts** (4 team members)
- ✅ **SoGood Apartments project** (assigned to Cody Field)
- ✅ **Project resume** (100% complete)
- ✅ **Borrower resume** (100% complete)
- ✅ **Documents** (uploads from `../../CapMatch-Extra/SoGood/`)
- ✅ **Chat messages** (realistic conversations referencing documents across multiple threads)

## Usage

### Basic Usage

```bash
# Seed complete Hoque account setup
npx tsx scripts/seed-hoque-project.ts
```

**Note**: Use `npx tsx` (not `npx tsc`). The `tsx` command runs TypeScript files directly.

### Cleanup

```bash
# Remove all seeded accounts and data
npx tsx scripts/seed-hoque-project.ts cleanup
```

This will delete:
- All created user accounts (advisor, borrower, team members)
- The SoGood Apartments project and all associated data
- All documents, chat threads, and messages
- The borrower org (but preserves advisor org if it has other members)

## Prerequisites

1. **Environment Variables**: Make sure your `.env.local` has:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321  # or your Supabase URL
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

2. **Documents (Optional)**: The script looks for documents in these locations (in order):
   - `../../CapMatch-Extra/SoGood/` (primary location)
   - `../CapMatch-Extra/SoGood/`
   - `../SampleLoanPackage/SoGood/`
   - `./hoque-docs/`
   - `../hoque-docs/`

   **Actual files that will be seeded** (from `../../CapMatch-Extra/SoGood/`):
   - `Northmarq Hoque Loan Request Package - SoGood - 5.6.25.pdf` → "Loan Request Package"
   - `SoGood 2021_05_18_SoGood.pdf` → "SoGood Master Plan - Concept"
   - `Concept Combined (1).pdf` → "Building B - Concept Drawings"
   - `SoGood Tracts (2).pdf` → "Site Plan - SoGood Tracts"
   - `SoGood Building B - Pro Forma.xlsx` → "Building B - Pro Forma"
   - `SGCMMD - PFC Memorandum (SoGood) 4874-2859-9225 v.2.pdf` → "PFC Memorandum - SoGood"
   - `HB 2071 Summary.pdf` → "HB 2071 Summary - PFC Legislation"

   The script will automatically upload all matching files and create chat conversations that reference them.

## What Gets Created

### Accounts Created

**Advisor Account:**
- Email: `cody@capmatch.com`
- Password: `password123`
- Name: Cody Field
- Org: CapMatch Advisors (created if it doesn't exist)

**Borrower Account:**
- Email: `info@hoqueglobal.com`
- Password: `password123`
- Name: Hoque Global
- Org: Hoque Global (auto-created during onboarding)

**Team Member Accounts:**
- `joel.heikenfeld@acara.com` - Joel Heikenfeld (ACARA Managing Director)
- `mike.hoque@hoqueglobal.com` - Mike Hoque (Hoque Global CEO)
- `sarah.martinez@hoqueglobal.com` - Sarah Martinez (Project Manager)
- `david.kim@acara.com` - David Kim (Financial Analyst)

All team members have password: `password123` and are added to the project with appropriate permissions.

### Project Details

**SoGood Apartments:**
- **Location**: 2300 Hickory St, Dallas, TX 75215
- **Type**: Ground-up mixed-use (116 residential units + 49,569 SF commercial)
- **Loan Request**: $18M construction loan (60% LTC, 44% LTV at stabilization)
- **Timeline**: Groundbreaking August 2025, completion September 2027
- **Assigned Advisor**: Cody Field
- **Special Features**: PFC tax exemption, Opportunity Zone, 50% workforce housing (≤80% AMI), 30,000 SF Innovation Center pre-leased

### Project Resume

Complete project details including:
- Full project specifications (116 units, mixed-use)
- Financial details and development budget
- Market context and demographics
- Timeline and milestones
- Special sections: timeline, scenario returns, capital stack, market metrics, certifications, amenities, commercial program

### Borrower Resume

Complete borrower information:
- Hoque Global / ACARA PFC JV entity details
- Track record (5 previous projects)
- Principals (Mike Hoque, Joel Heikenfeld) with bios
- Lender references (Frost Bank, Citi Community Capital, Dallas HFC)

### Chat Messages

Chat messages are created across multiple threads with realistic conversations:

- **General thread**: Main project discussion covering:
  - Project kickoff with Loan Request Package reference
  - PFC structure discussion (references PFC Memorandum and HB 2071 Summary)
  - Financial overview (references Building B Pro Forma)
  - Design and site discussion (references Concept Drawings and Site Plan)
  - Innovation Center pre-lease discussion
  - Timeline and next steps

- **Construction & Timeline thread**: Construction updates and milestones (references Concept Drawings and Site Plan)

- **Financing & Lender Outreach thread**: Lender strategy discussion (references Loan Request Package, PFC Memorandum, and Pro Forma)

All team members and the advisor are participants in these conversations.

## Differences from SQL Script

The original `seed-hoque-project.sql` only seeded project and borrower resumes to an existing project. This TypeScript script:
- Creates complete account setup (no existing project needed)
- Creates advisor account if it doesn't exist
- Creates borrower account and org
- Creates multiple team member accounts
- Creates the project from scratch
- Uploads documents automatically
- Creates realistic chat conversations across multiple threads
- Better error handling and progress logging
- Comprehensive cleanup functionality

## Notes

- The script is idempotent - you can run it multiple times safely (will reuse existing accounts)
- If documents don't exist, the script will skip them with a warning
- Chat messages reference documents if they were uploaded
- All seeded users have default password: `password123` (change in production!)
- The advisor account is created first, then the project is assigned to it

## Troubleshooting

### Error: "Unknown compiler option '--project-id'"

**Problem**: You're using `npx tsc` instead of `npx tsx`.

**Solution**: Use `npx tsx` to run the script:
```bash
npx tsx scripts/seed-hoque-project.ts
```

The `tsc` command is for TypeScript compilation, while `tsx` runs TypeScript files directly.

### Documents Not Found

If you see warnings about documents not being found, check:
1. The files are in `../../CapMatch-Extra/SoGood/` (relative to the `scripts/` directory)
2. File names match exactly (including spaces and special characters)
3. Files have correct extensions (.pdf or .xlsx)

The script will continue even if some documents are missing - chat messages will simply not reference those documents.

### Account Already Exists

If accounts already exist from a previous seed run, the script will:
- Reuse existing accounts (won't create duplicates)
- Update project and resume data
- Add new documents if they weren't there before
- Create new chat messages (may result in duplicates if run multiple times)

To start fresh, run cleanup first:
```bash
npx tsx scripts/seed-hoque-project.ts cleanup
```
