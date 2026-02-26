/**
 * POST /api/documents/upload
 * Server-side document upload: creates resource + version, uploads to storage,
 * updates DB. Compensating cleanup on failure.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { verifyProjectAccess } from "@/lib/verify-project-access";
import { checkRateLimit, getRateLimitId, GENERAL_RATE_LIMIT } from "@/lib/rate-limit";
import {
  sanitizeFilename,
  ALLOWED_DOCUMENT_MIME_TYPES,
  MAX_DOCUMENT_SIZE_BYTES,
} from "@/utils/fileUploadValidation";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing SUPABASE configuration.");
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const STORAGE_SUBDIR: Record<string, string> = {
  project: "project-docs",
  borrower: "borrower-docs",
  underwriting: "underwriting-docs",
};

const ROOT_RESOURCE_TYPE: Record<string, string> = {
  project: "PROJECT_DOCS_ROOT",
  borrower: "BORROWER_DOCS_ROOT",
  underwriting: "UNDERWRITING_DOCS_ROOT",
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rlId = getRateLimitId(request, user.id);
    const rl = checkRateLimit(rlId, GENERAL_RATE_LIMIT, "documents-upload");
    if (!rl.allowed) return rl.response;

    const formData = await request.formData();
    const projectId = formData.get("projectId") as string | null;
    const folderId = formData.get("folderId") as string | null;
    const context = (formData.get("context") as string) || "project";
    const file = formData.get("file") as File | null;

    if (!projectId?.trim()) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    const hasAccess = await verifyProjectAccess(supabase, projectId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const safeName = sanitizeFilename(file.name);
    if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File exceeds ${MAX_DOCUMENT_SIZE_BYTES / (1024 * 1024)}MB limit` },
        { status: 400 }
      );
    }
    if (ALLOWED_DOCUMENT_MIME_TYPES.length && !ALLOWED_DOCUMENT_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
    }

    const rootType = ROOT_RESOURCE_TYPE[context] || "PROJECT_DOCS_ROOT";
    const { data: root, error: rootError } = await supabaseAdmin
      .from("resources")
      .select("id")
      .eq("project_id", projectId)
      .eq("resource_type", rootType)
      .maybeSingle();

    if (rootError || !root?.id) {
      return NextResponse.json({ error: "Project docs root not found" }, { status: 404 });
    }

    const parentId = folderId?.trim() || root.id;
    const orgId = (await supabaseAdmin.from("projects").select("owner_org_id").eq("id", projectId).single()).data?.owner_org_id;
    if (!orgId) {
      return NextResponse.json({ error: "Project org not found" }, { status: 404 });
    }

    const { data: resource, error: resourceError } = await supabaseAdmin
      .from("resources")
      .insert({
        org_id: orgId,
        project_id: projectId,
        parent_id: parentId,
        resource_type: "FILE",
        name: safeName,
      })
      .select("id")
      .single();

    if (resourceError || !resource?.id) {
      return NextResponse.json({ error: "Failed to create resource" }, { status: 500 });
    }
    const resourceId = resource.id;

    const { data: version, error: versionError } = await supabaseAdmin
      .from("document_versions")
      .insert({
        resource_id: resourceId,
        created_by: user.id,
        storage_path: "placeholder",
      })
      .select("id, version_number")
      .single();

    if (versionError || !version?.id) {
      await supabaseAdmin.from("resources").delete().eq("id", resourceId);
      return NextResponse.json({ error: "Failed to create version" }, { status: 500 });
    }

    const subdir = STORAGE_SUBDIR[context] || "project-docs";
    const fileFolder = `${projectId}/${subdir}/${resourceId}`;
    const finalStoragePath = `${fileFolder}/v${version.version_number}_user${user.id}_${safeName}`;

    const buf = await file.arrayBuffer();
    const { error: uploadError } = await supabaseAdmin.storage
      .from(orgId)
      .upload(finalStoragePath, buf, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      await supabaseAdmin.from("document_versions").delete().eq("id", version.id);
      await supabaseAdmin.from("resources").delete().eq("id", resourceId);
      return NextResponse.json({ error: "Storage upload failed" }, { status: 500 });
    }

    const { error: updateVersionError } = await supabaseAdmin
      .from("document_versions")
      .update({ storage_path: finalStoragePath })
      .eq("id", version.id);

    if (updateVersionError) {
      await supabaseAdmin.storage.from(orgId).remove([finalStoragePath]);
      await supabaseAdmin.from("document_versions").delete().eq("id", version.id);
      await supabaseAdmin.from("resources").delete().eq("id", resourceId);
      return NextResponse.json({ error: "Failed to update version path" }, { status: 500 });
    }

    const { error: updateResourceError } = await supabaseAdmin
      .from("resources")
      .update({ current_version_id: version.id })
      .eq("id", resourceId);

    if (updateResourceError) {
      await supabaseAdmin.storage.from(orgId).remove([finalStoragePath]);
      await supabaseAdmin.from("document_versions").delete().eq("id", version.id);
      await supabaseAdmin.from("resources").delete().eq("id", resourceId);
      return NextResponse.json({ error: "Failed to link version to resource" }, { status: 500 });
    }

    await supabaseAdmin.rpc("insert_document_uploaded_event", {
      p_actor_id: user.id,
      p_project_id: projectId,
      p_resource_id: resourceId,
      p_payload: { fileName: safeName, size: file.size, mimeType: file.type },
    });

    return NextResponse.json({
      resourceId,
      versionId: version.id,
      versionNumber: version.version_number,
      storagePath: finalStoragePath,
    });
  } catch (err) {
    console.error("[API] Document upload error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
