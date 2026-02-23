
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Fix __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../.env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function verify() {
  console.log("🔍 Verifying SoGood Apartments seed data...\n");

  // 1. Get Project
  const { data: project } = await supabaseAdmin
    .from("projects")
    .select("id, owner_org_id")
    .eq("name", "SoGood Apartments")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!project) {
    console.error("❌ Project 'SoGood Apartments' not found.");
    return;
  }
  console.log(`✅ Project Found: ${project.id}`);

  // 2. Get Advisor (Cody)
  const { data: advisor } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("email", "cody.field@capmatch.com")
    .single();

  if (!advisor) {
    console.error("❌ Advisor Cody Field not found.");
    return;
  }
  console.log(`✅ Advisor Found: ${advisor.id}`);

  // 3. Check Roots
  const { data: uDocsRoot } = await supabaseAdmin
    .from("resources")
    .select("id")
    .eq("project_id", project.id)
    .eq("resource_type", "UNDERWRITING_DOCS_ROOT")
    .single();

  if (!uDocsRoot) {
    console.error("❌ UNDERWRITING_DOCS_ROOT not found.");
  } else {
    console.log(`✅ UNDERWRITING_DOCS_ROOT Found: ${uDocsRoot.id}`);
    
    // Check Permission on Root
    const { data: perm } = await supabaseAdmin
      .from("permissions")
      .select("*")
      .eq("resource_id", uDocsRoot.id)
      .eq("user_id", advisor.id);
      
    if (perm && perm.length > 0) {
       console.log(`   ✅ Advisor has explicit permission on Root: ${perm[0].permission}`);
    } else {
       console.error(`   ❌ Advisor MISSING permission on Root!`);
    }
  }

  // 4. Check Files under Root
  const { data: files } = await supabaseAdmin
    .from("resources")
    .select("id, name, current_version_id")
    .eq("parent_id", uDocsRoot?.id);

  console.log(`\n📂 Finding files under UNDERWRITING_DOCS_ROOT (${files?.length || 0} found):`);
  
  if (files) {
      for (const f of files) {
          console.log(`   - ${f.name} (${f.id})`);
          // Check version
          if (f.current_version_id) {
               console.log(`     ✅ Has current_version_id: ${f.current_version_id}`);
          } else {
               console.error(`     ❌ MISSING current_version_id`);
          }
           // Check Permission
            const { data: fPerm } = await supabaseAdmin
              .from("permissions")
              .select("*")
              .eq("resource_id", f.id)
              .eq("user_id", advisor.id);
            if (fPerm && fPerm.length > 0) {
                 console.log(`     ℹ️  Has explicit permission: ${fPerm[0].permission}`);
            } else {
                 console.log(`     ℹ️  No explicit permission (relying on inheritance)`);
            }
      }
  }
  
  // 5. [REMOVED] Templates root check — templates are no longer used

}

verify().catch(console.error);
