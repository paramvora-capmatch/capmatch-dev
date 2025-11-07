#!/usr/bin/env node
// scripts/seed-production.ts
// Interactive script to seed production database with demo data
// Run with: npx tsx scripts/seed-production.ts

import * as readline from 'readline';
import { spawn } from 'child_process';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load any existing .env files (won't override command-line args)
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

// Prompt without echoing the input (for secrets like keys)
function questionHidden(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rli: any = rl;
    const originalWrite = rli._writeToOutput;
    rli._writeToOutput = function (_stringToWrite: string) {
      // mask input
      rli.output.write('*');
    };
    rl.question(prompt, (answer) => {
      rli._writeToOutput = originalWrite;
      rli.output.write('\n');
      resolve(answer);
    });
  });
}

async function main() {
  console.log('🌱 Production Database Seeding Script\n');
  console.log('⚠️  WARNING: This will create real users and data in PRODUCTION!\n');

  // Get production URL - only use env var if it's a valid production URL
  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  
  // If env var exists but is not a production URL (e.g., localhost), ignore it and prompt
  if (supabaseUrl && !supabaseUrl.startsWith('https://')) {
    console.log(`⚠️  Found local/development URL in environment: ${supabaseUrl}`);
    console.log('   Ignoring it and prompting for production URL...\n');
    supabaseUrl = undefined;
  }
  
  // Prompt if no valid production URL found
  if (!supabaseUrl) {
    supabaseUrl = await question('Enter your production Supabase URL: ');
  }

  // Validate the URL
  if (!supabaseUrl || !supabaseUrl.startsWith('https://')) {
    console.error('\n❌ Invalid Supabase URL. Must start with https://');
    console.error('   Example: https://your-project-ref.supabase.co');
    process.exit(1);
  }

  // Always prompt for service role key (input hidden). If left blank, fallback to env var
  const enteredKey = await questionHidden('Enter your production SUPABASE_SERVICE_ROLE_KEY: ');
  let serviceRoleKey = enteredKey && enteredKey.trim() !== ''
    ? enteredKey.trim()
    : (process.env.SUPABASE_SERVICE_ROLE_KEY || '');

  if (!serviceRoleKey || serviceRoleKey.trim() === '') {
    console.error('\n❌ Service role key is required');
    console.error('   Get it from: Supabase Dashboard → Settings → API → service_role key');
    process.exit(1);
  }

  // Verify connection
  console.log('\n🔍 Verifying connection to production database...');
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const testClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Try a simple query to verify connection
    const { error } = await testClient.from('profiles').select('id').limit(1);
    if (error && !error.message.includes('permission') && !error.message.includes('relation')) {
      throw error;
    }
    console.log('✅ Connection verified!\n');
  } catch (error) {
    console.error('\n❌ Failed to connect to production database');
    console.error('   Error:', error instanceof Error ? error.message : String(error));
    try {
      // Attempt to print the full error object for better debugging
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const asAny: any = error;
      console.error('   Raw error object:', JSON.stringify(asAny, null, 2));
    } catch {}
    console.error('\n   Please verify:');
    console.error('   - Your Supabase URL is correct');
    console.error('   - Your service role key is correct');
    console.error('   - Your IP is allowed (if you have IP restrictions)');
    const proceed = await question('\n⚠️  Verification failed. Proceed anyway? (yes/no): ');
    if (proceed.toLowerCase() !== 'yes' && proceed.toLowerCase() !== 'y') {
      process.exit(1);
    } else {
      console.log('\n➡️  Continuing despite verification failure...');
    }
  }

  // Confirm action
  const args = process.argv.slice(2);
  const isCleanup = args.includes('cleanup') || args.includes('--cleanup') || args.includes('-c');
  const action = isCleanup ? 'CLEANUP (delete demo data)' : 'SEED (create demo data)';

  console.log('📋 Summary:');
  console.log(`   Action: ${action}`);
  console.log(`   Database: ${supabaseUrl}`);
  console.log(`   Service Role Key: ${serviceRoleKey.substring(0, 20)}...`);

  const confirm = await question('\n⚠️  Are you sure you want to proceed? (yes/no): ');

  if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
    console.log('\n❌ Operation cancelled');
    process.exit(0);
  }

  // Run the seed script with production environment variables
  console.log('\n🚀 Running seed script with production credentials...\n');

  const env = {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    SUPABASE_URL: supabaseUrl,
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
  };

  const scriptArgs = isCleanup ? ['cleanup'] : [];
  const child = spawn('npx', ['tsx', 'scripts/seed-demo-data.ts', ...scriptArgs], {
    env,
    stdio: 'inherit',
    shell: true,
  });

  child.on('close', (code) => {
    rl.close();
    if (code === 0) {
      console.log('\n✅ Operation completed successfully!');
      if (!isCleanup) {
        console.log('\n📝 Next steps:');
        console.log('   1. Change user passwords (default is "password")');
        console.log('   2. Verify data in Supabase Dashboard');
        console.log('   3. Test login with created accounts');
      }
    } else {
      console.error(`\n❌ Operation failed with exit code ${code}`);
      process.exit(code || 1);
    }
  });

  child.on('error', (error) => {
    console.error('\n❌ Failed to run seed script:', error);
    rl.close();
    process.exit(1);
  });
}

main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  rl.close();
  process.exit(1);
});

