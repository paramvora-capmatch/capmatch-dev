# Demo Data Seed Script

This script seeds the database with demo data for client demonstrations.

## What it creates

- **Advisor**: `cody.field@capmatch.com` (password: `password`)
- **Borrower**: `borrower@org.com` (password: `password`)
  - **Complete Project**: "Downtown Highrise Acquisition" (fully filled out with OM data)
  - **Partial Project**: "Warehouse Development" (partially filled out)

## Prerequisites

1. Supabase must be running (local or remote)
2. Environment variables must be set:
   - `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

## Running the script

### Option 1: Using tsx (recommended)

```bash
npx tsx scripts/seed-demo-data.ts
```

### Option 2: Using ts-node

```bash
npx ts-node scripts/seed-demo-data.ts
```

### Option 3: Compile and run

```bash
npx tsc scripts/seed-demo-data.ts --esModuleInterop --skipLibCheck
node scripts/seed-demo-data.js
```

## Environment Variables

The script reads from:
- `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (get from `supabase status` for local)

For local development:
```bash
export SUPABASE_URL="http://localhost:54321"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"
```

## Idempotency

The script is idempotent - it's safe to run multiple times. It will:
- Skip creating users that already exist
- Update existing data if needed
- Create missing projects and data

## What the script does

1. Creates advisor user (`cody.field@capmatch.com`) via `onboard-borrower` edge function
2. Creates advisor organization and sets up membership
3. Creates borrower user (`borrower@org.com`) via `onboard-borrower` edge function
4. Deletes the default "My First Project" created during onboarding
5. Updates borrower resume with complete demo data
6. Creates "Downtown Highrise Acquisition" project (complete)
7. Creates "Warehouse Development" project (partial)
8. Updates both project resumes with demo data
9. Assigns advisor to both projects
10. Sets up all necessary permissions and resources

## Troubleshooting

- **"Missing SUPABASE_URL"**: Make sure environment variables are set
- **"Missing SUPABASE_SERVICE_ROLE_KEY"**: Get your service role key from `supabase status` (local) or Supabase dashboard (remote)
- **"User already exists"**: This is normal - the script will use existing users
- **Permission errors**: Make sure you're using the service role key, not the anon key

