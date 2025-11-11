import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import {
  cloneBorrowerDocuments,
  clearBorrowerDocuments,
} from "../_shared/project-utils.ts";

interface CopyBorrowerProfilePayload {
  source_project_id: string;
  target_project_id: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = (await req.json()) as CopyBorrowerProfilePayload;
    const { source_project_id, target_project_id } = payload || {};

    if (!source_project_id || !target_project_id) {
      throw new Error("source_project_id and target_project_id are required");
    }

    if (source_project_id === target_project_id) {
      throw new Error("Source and target projects must be different");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization header required");
    }
    const jwt = authHeader.replace("Bearer ", "");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: {
            Authorization: `Bearer ${jwt}`,
          },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      throw new Error("Authentication failed");
    }

    const { data: targetProject, error: targetProjectError } = await supabaseAdmin
      .from("projects")
      .select("id, owner_org_id")
      .eq("id", target_project_id)
      .single();

    if (targetProjectError || !targetProject) {
      throw new Error("Target project not found");
    }

    const { data: ownershipResult } = await supabaseAdmin.rpc("is_org_owner", {
      p_org_id: targetProject.owner_org_id,
      p_user_id: user.id,
    });

    let hasEditPermissions = ownershipResult === true;

    const { data: targetRoots, error: targetRootsError } = await supabaseAdmin.rpc(
      "ensure_project_borrower_roots",
      {
        p_project_id: target_project_id,
      }
    );

    if (targetRootsError) {
      throw new Error(`Failed to ensure target borrower resources: ${targetRootsError.message}`);
    }

    const targetBorrowerResumeResourceId =
      targetRoots?.[0]?.borrower_resume_resource_id;
    const targetBorrowerDocsRootId =
      targetRoots?.[0]?.borrower_docs_root_resource_id;

    if (!hasEditPermissions && targetBorrowerResumeResourceId) {
      const { data: explicitPermission } = await supabaseAdmin
        .from("permissions")
        .select("permission")
        .eq("resource_id", targetBorrowerResumeResourceId)
        .eq("user_id", user.id)
        .maybeSingle();

      hasEditPermissions = explicitPermission?.permission === "edit";
    }

    if (!hasEditPermissions) {
      throw new Error("Insufficient permissions to copy borrower profile");
    }

    const { data: sourceRoots, error: sourceRootsError } = await supabaseAdmin.rpc(
      "ensure_project_borrower_roots",
      {
        p_project_id: source_project_id,
      }
    );

    if (sourceRootsError) {
      throw new Error(`Failed to load source borrower resources: ${sourceRootsError.message}`);
    }

    const sourceBorrowerDocsRootId =
      sourceRoots?.[0]?.borrower_docs_root_resource_id;

    const { data: sourceResumeData, error: sourceResumeError } = await supabaseAdmin
      .from("borrower_resumes")
      .select("content")
      .eq("project_id", source_project_id)
      .maybeSingle();

    if (sourceResumeError && sourceResumeError.code !== "PGRST116") {
      throw new Error(`Failed to load source borrower resume: ${sourceResumeError.message}`);
    }

    const sourceResumeContent = sourceResumeData?.content || {};

    await supabaseAdmin
      .from("borrower_resumes")
      .upsert({
        project_id: target_project_id,
        content: sourceResumeContent,
      }, { onConflict: "project_id" });

    if (targetBorrowerDocsRootId) {
      await clearBorrowerDocuments(
        supabaseAdmin,
        target_project_id,
        targetBorrowerDocsRootId,
        targetProject.owner_org_id
      );
    }

    if (sourceBorrowerDocsRootId && targetBorrowerDocsRootId) {
      await cloneBorrowerDocuments({
        supabaseAdmin,
        ownerOrgId: targetProject.owner_org_id,
        sourceProjectId: source_project_id,
        targetProjectId: target_project_id,
        targetDocsRootId: targetBorrowerDocsRootId,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        borrowerResumeContent: sourceResumeContent,
        sourceProjectId: source_project_id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[copy-borrower-profile] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
