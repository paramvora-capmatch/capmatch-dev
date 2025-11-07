# Seeding Production Database

This guide explains how to run the demo data seeding script against your **production Supabase database**.

## ⚠️ Important Warnings

1. **This will create real users and data in production**
2. **The script creates users with default passwords** (`password`)
3. **Make sure you have backups** before running
4. **Test in staging first** if possible
5. **The script is idempotent** - safe to run multiple times, but will update existing data

## Prerequisites

1. Access to your production Supabase project
2. Production Service Role Key (from Supabase Dashboard)
3. Production Supabase URL

## Getting Production Credentials

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your **production project**
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** (this is your `NEXT_PUBLIC_SUPABASE_URL`)
   - **service_role key** (this is your `SUPABASE_SERVICE_ROLE_KEY`) - ⚠️ Keep this secret!

## Method 1: Using Environment Variables (Recommended)

### Option A: Create a temporary `.env.production.local` file

```bash
# Create the file (DO NOT commit this to git!)
cat > .env.production.local << EOF
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
EOF

# Run the seed script
npx tsx scripts/seed-demo-data.ts

# Delete the file after use (for security)
rm .env.production.local
```

### Option B: Export environment variables in your terminal

```bash
# Set production environment variables
export NEXT_PUBLIC_SUPABASE_URL="https://your-project-ref.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"

# Run the seed script
npx tsx scripts/seed-demo-data.ts

# Unset after use (optional, for security)
unset NEXT_PUBLIC_SUPABASE_URL
unset SUPABASE_SERVICE_ROLE_KEY
```

## Method 2: Using the Helper Script

We've created a helper script that prompts for production credentials:

```bash
npx tsx scripts/seed-production.ts
```

This script will:
- Prompt you for production URL and service role key
- Verify the connection
- Ask for confirmation before proceeding
- Run the seed script with production credentials

## Method 3: One-liner (Quick but less secure)

```bash
NEXT_PUBLIC_SUPABASE_URL="https://your-project-ref.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here" \
npx tsx scripts/seed-demo-data.ts
```

## What Gets Created

The script will create:

- **Advisor User**: `cody.field@capmatch.com` (password: `password`)
- **Borrower User**: `borrower@org.com` (password: `password`)
- **2 Demo Projects** with full data
- **Organizations, permissions, and all related data**

## Verification

After running, verify the data was created:

1. Check Supabase Dashboard → **Authentication** → **Users**
2. Check **Table Editor** → `projects` table
3. Try logging in with the created credentials

## Cleanup (if needed)

If you need to remove the demo data:

```bash
# Using environment variables
NEXT_PUBLIC_SUPABASE_URL="https://your-project-ref.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here" \
npx tsx scripts/seed-demo-data.ts cleanup
```

Or use the helper script:

```bash
npx tsx scripts/seed-production.ts cleanup
```

## Troubleshooting

### "Missing SUPABASE_URL"
- Make sure you've set the environment variable correctly
- Check that you're using the production URL (starts with `https://`)

### "Missing SUPABASE_SERVICE_ROLE_KEY"
- Get the service role key from Supabase Dashboard → Settings → API
- Make sure you're using the **service_role** key, not the **anon** key

### "Permission denied" or "Row Level Security" errors
- Make sure you're using the **service_role** key (bypasses RLS)
- The anon key won't work for this script

### "Edge function not found"
- Make sure the `onboard-borrower` edge function is deployed to production
- Check Supabase Dashboard → Edge Functions

### Connection errors
- Verify your production URL is correct
- Check if your IP is allowed (if you have IP restrictions)
- Verify the service role key is correct

## Security Best Practices

1. **Never commit** `.env.production.local` or production keys to git
2. **Delete** temporary environment files after use
3. **Use the helper script** for better security (doesn't store keys in files)
4. **Rotate service role keys** if they're accidentally exposed
5. **Change default passwords** after seeding (users have password: `password`)

## Next Steps

After seeding:

1. **Change user passwords** - The default password is `password`
2. **Verify data** - Check that all projects and data were created correctly
3. **Test login** - Try logging in with the created accounts
4. **Clean up** - Remove the demo data if it was just for testing

