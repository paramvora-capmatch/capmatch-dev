// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

type CoreUpdates = {
  name?: string;
  assigned_advisor_id?: string | null;
};

type ResumeUpdates = Record<string, unknown>;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization header required");
    const jwt = authHeader.replace("Bearer ", "");

    const { project_id, core_updates, resume_updates } = (await req.json()) as {
      project_id: string;
      core_updates?: CoreUpdates;
      resume_updates?: ResumeUpdates;
    };

    if (!project_id) throw new Error("project_id is required");

    // Use a client authenticated as the caller so RLS enforces permissions
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: `Bearer ${jwt}` } } }
    );

    // Optionally verify user session
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) throw new Error("Authentication failed");

    // 1) Update core project fields (if any)
    if (core_updates && Object.keys(core_updates).length > 0) {
      const { error: projectError } = await supabase
        .from("projects")
        .update(core_updates)
        .eq("id", project_id);
      if (projectError) throw new Error(`Failed to update project: ${projectError.message}`);
    }

    // 2) Update resume JSONB (merge existing with incoming partial)
    if (resume_updates && Object.keys(resume_updates).length > 0) {
      const { data: existing, error: fetchError } = await supabase
        .from("project_resumes")
        .select("content")
        .eq("project_id", project_id)
        .maybeSingle();
      if (fetchError) throw new Error(`Failed to read resume: ${fetchError.message}`);

      const merged = { ...(existing?.content ?? {}), ...resume_updates } as Record<string, unknown>;

      const { error: upsertError } = await supabase
        .from("project_resumes")
        .upsert({ project_id, content: merged }, { onConflict: "project_id" });
      if (upsertError) throw new Error(`Failed to save resume: ${upsertError.message}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[update-project] Error:", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});


