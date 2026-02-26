/**
 * DELETE /api/projects/[id]
 * Deletes a project and all related data.
 * Storage files are removed first (best-effort), then DB cascade handles the rest.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { verifyProjectAccess } from "@/lib/verify-project-access";
import { checkRateLimit, getRateLimitId, GENERAL_RATE_LIMIT } from "@/lib/rate-limit";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing SUPABASE configuration.");
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Recursively list all file paths under a storage prefix (files only). */
async function listAllFilesRecursively(
  supabase: SupabaseClient,
  bucket: string,
  prefix: string
): Promise<string[]> {
  const allFiles: string[] = [];
  const stack: string[] = [prefix];
  const limit = 1000;

  while (stack.length > 0) {
    const currentPrefix = stack.pop()!;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(currentPrefix, {
          limit,
          offset,
          sortBy: { column: "name", order: "asc" },
        });

      if (error) {
        if (error.message?.includes("not found")) {
          hasMore = false;
          continue;
        }
        throw error;
      }

      if (!data || data.length === 0) {
        hasMore = false;
        continue;
      }

      for (const item of data) {
        const fullPath = currentPrefix ? `${currentPrefix}/${item.name}` : item.name;
        if (item.id && typeof item.id === "string") {
          allFiles.push(fullPath);
        } else {
          stack.push(fullPath);
        }
      }

      if (data.length < limit) {
        hasMore = false;
      } else {
        offset += limit;
      }
    }
  }

  return allFiles;
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rlId = getRateLimitId(_request, user.id);
    const rl = checkRateLimit(rlId, GENERAL_RATE_LIMIT, "project-delete");
    if (!rl.allowed) return rl.response;

    const hasAccess = await verifyProjectAccess(supabase, projectId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("id, owner_org_id")
      .eq("id", projectId)
      .maybeSingle();

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const bucketId = project.owner_org_id;
    const projectPrefix = `${projectId}/`;

    try {
      const filesToDelete = await listAllFilesRecursively(
        supabaseAdmin,
        bucketId,
        projectPrefix
      );

      if (filesToDelete.length > 0) {
        const chunkSize = 1000;
        for (let i = 0; i < filesToDelete.length; i += chunkSize) {
          const chunk = filesToDelete.slice(i, i + chunkSize);
          const { error: storageError } = await supabaseAdmin.storage
            .from(bucketId)
            .remove(chunk);
          if (storageError) {
            console.error("[API] Project delete: storage chunk error", storageError);
          }
        }
      }
    } catch (storageErr) {
      console.error("[API] Project delete: storage cleanup error", storageErr);
    }

    const { error: deleteError } = await supabaseAdmin
      .from("projects")
      .delete()
      .eq("id", projectId);

    if (deleteError) {
      console.error("[API] Project delete failed:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete project" },
        { status: 500 }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[API] Project delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
