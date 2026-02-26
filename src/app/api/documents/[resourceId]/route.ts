/**
 * DELETE /api/documents/[resourceId]
 * Deletes a document resource and its storage files. Verifies project access.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { verifyProjectAccess } from "@/lib/verify-project-access";
import { checkRateLimit, getRateLimitId, GENERAL_RATE_LIMIT } from "@/lib/rate-limit";

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

async function listAllFilesInPrefix(
  supabase: SupabaseClient,
  bucket: string,
  prefix: string
): Promise<string[]> {
  const out: string[] = [];
  const stack: string[] = [prefix];
  const limit = 1000;

  while (stack.length > 0) {
    const current = stack.pop()!;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(current, { limit, offset, sortBy: { column: "name", order: "asc" } });

      if (error) {
        if (error.message?.includes("not found")) break;
        throw error;
      }
      if (!data?.length) break;

      for (const item of data) {
        const path = current ? `${current}/${item.name}` : item.name;
        if (item.id != null) {
          out.push(path);
        } else {
          stack.push(path);
        }
      }
      if (data.length < limit) hasMore = false;
      else offset += limit;
    }
  }
  return out;
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ resourceId: string }> }
) {
  try {
    const { resourceId } = await params;

    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rlId = getRateLimitId(_request, user.id);
    const rl = checkRateLimit(rlId, GENERAL_RATE_LIMIT, "documents-delete");
    if (!rl.allowed) return rl.response;

    const { data: resource, error: resError } = await supabaseAdmin
      .from("resources")
      .select("id, project_id, org_id, resource_type")
      .eq("id", resourceId)
      .maybeSingle();

    if (resError || !resource?.project_id) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    const hasAccess = await verifyProjectAccess(supabase, resource.project_id);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const bucketId = resource.org_id;
    const { data: versions } = await supabaseAdmin
      .from("document_versions")
      .select("storage_path")
      .eq("resource_id", resourceId);

    const folderPaths = new Set<string>();
    if (versions?.length) {
      for (const v of versions) {
        if (v.storage_path && v.storage_path !== "placeholder") {
          const parts = v.storage_path.split("/");
          if (parts.length >= 3) {
            folderPaths.add(parts.slice(0, 3).join("/"));
          }
        }
      }
    }
    for (const ctx of ["project", "borrower", "underwriting"]) {
      folderPaths.add(`${resource.project_id}/${STORAGE_SUBDIR[ctx]}/${resourceId}`);
    }

    for (const folderPath of folderPaths) {
      try {
        const files = await listAllFilesInPrefix(supabaseAdmin, bucketId, folderPath);
        if (files.length > 0) {
          for (let i = 0; i < files.length; i += 1000) {
            const chunk = files.slice(i, i + 1000);
            await supabaseAdmin.storage.from(bucketId).remove(chunk);
          }
        }
      } catch (e) {
        console.error("[API] Document delete storage cleanup:", e);
      }
    }

    const { error: deleteError } = await supabaseAdmin
      .from("resources")
      .delete()
      .eq("id", resourceId);

    if (deleteError) {
      return NextResponse.json({ error: "Failed to delete resource" }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[API] Document delete error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
