import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve, join } from "path";
import { readFileSync, existsSync } from "fs";

// Load env
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
});

const TEMPLATES_DIR = resolve(process.cwd(), "../Backend/storage/templates");

const TEMPLATES = [
    {
        name: "Sources & Uses Model",
        filename: "sources_uses_template.xlsx",
        description: "Standard Sources & Uses Excel Template"
    },
    {
        name: "Schedule of Real Estate Owned (SREO)",
        filename: "sreo_template.xlsx",
        description: "SREO Template"
    },
    {
        name: "T12 Financial Statement",
        filename: "t12_template.xlsx",
        description: "T12 Financial Template"
    },
    {
        name: "Current Rent Roll",
        filename: "rent_roll_template.xlsx",
        description: "Rent Roll Template"
    },
    {
        name: "Personal Financial Statement",
        filename: "pfs_template.xlsx",
        description: "Personal Financial Statement Template"
    }
];

async function seedTemplates() {
    console.log("🌱 Seeding Underwriting Templates...");

    // 1. Fetch Advisor Org (to own templates)
    let orgId = null;
    let ownerId = null;

    const { data: orgs } = await supabase.from("orgs").select("id, name").ilike("name", "%Advisor%").limit(1);
    if (orgs && orgs.length > 0) {
        orgId = orgs[0].id;
        console.log(`Found Advisor Org: ${orgs[0].name} (${orgId})`);
    } else {
        // Fallback to any org
        const { data: anyOrg } = await supabase.from("orgs").select("id").limit(1).single();
        if (anyOrg) orgId = anyOrg.id;
    }

    if (!orgId) {
        console.error("❌ No Organization found. Run seed-hoque or seed-demo first.");
        return;
    }

    // Get Owner (first member of org)
    const { data: members } = await supabase.from("org_members").select("user_id").eq("org_id", orgId).limit(1);
    if (members && members.length > 0) ownerId = members[0].user_id;

    // Ensure bucket exists (Org ID is bucket name usually)
    const BUCKET_NAME = orgId;
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets.find(b => b.name === BUCKET_NAME)) {
        await supabase.storage.createBucket(BUCKET_NAME, { public: false, fileSizeLimit: 52428800 });
    }

    // 3. Process Templates
    for (const template of TEMPLATES) {
        const filePath = join(TEMPLATES_DIR, template.filename);
        if (!existsSync(filePath)) {
            console.warn(`⚠️ Template file not found: ${filePath}, skipping.`);
            continue;
        }

        const fileContent = readFileSync(filePath);
        // Store in a 'templates' folder within the org bucket
        const storagePath = `templates/${template.filename}`;

        // Upload to Storage
        console.log(`Uploading ${template.filename} to ${BUCKET_NAME}...`);
        const { error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(storagePath, fileContent, {
                contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                upsert: true
            });

        if (uploadError) {
            console.error(`Failed to upload ${template.filename}:`, uploadError);
            continue;
        }

        // Register in DB
        let resourceId = null;

        const { data: existingResources } = await supabase
            .from("resources")
            .select("id")
            .eq("name", template.name)
            .eq("org_id", orgId)
            .eq("resource_type", "FILE")
            .single();

        if (existingResources) {
            resourceId = existingResources.id;
            console.log(`Resource exists: ${template.name} (${resourceId})`);
        } else {
            console.log(`Creating Resource: ${template.name}`);
            const { data: newResource, error: insertError } = await supabase
                .from("resources")
                .insert({
                    name: template.name, // Display Name
                    resource_type: "FILE",
                    org_id: orgId,
                    // No project_id for global templates, or maybe assign to a 'Templates' project?
                    // Leaving project_id null implies global/org level resource.
                    parent_id: null // Root of org or similar
                })
                .select()
                .single();

            if (insertError) {
                console.error(`Failed to create resource for ${template.name}:`, insertError);
                continue;
            }
            resourceId = newResource.id;
        }

        // Create Version
        const { count } = await supabase
            .from("document_versions")
            .select("*", { count: "exact", head: true })
            .eq("resource_id", resourceId);

        const versionNumber = (count || 0) + 1;

        console.log(`Creating Version ${versionNumber}...`);

        const fileMetadata = {
            size: fileContent.length,
            mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            bucket: BUCKET_NAME
        };

        const { data: version, error: verError } = await supabase
            .from("document_versions")
            .insert({
                resource_id: resourceId,
                version_number: versionNumber,
                storage_path: storagePath,
                status: "active",
                created_by: ownerId,
                metadata: fileMetadata
            })
            .select()
            .single();

        if (verError) {
            console.error(`Failed to create version:`, verError);
        } else {
            // Update resource current version
            await supabase
                .from("resources")
                .update({ current_version_id: version.id })
                .eq("id", resourceId);
        }
    }

    console.log("✅ Template Seeding Complete");
}

seedTemplates().catch(console.error);
