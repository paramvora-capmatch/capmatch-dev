"use server";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Missing SUPABASE configuration. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set."
  );
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

interface SnapshotRequestBody {
  projectId?: string;
  userId?: string | null;
}

export async function POST(request: Request) {
  console.log("[API] Project resume save-version called");
  const rawBody = await request.text();
  let payload: SnapshotRequestBody = {};
  if (rawBody) {
    try {
      payload = JSON.parse(rawBody);
    } catch (error) {
      console.error("[API] Failed to parse save-version request body:", error);
      return NextResponse.json(
        { error: "Invalid request body. Expected JSON." },
        { status: 400 }
      );
    }
  }

  const { projectId, userId } = payload;
  console.log("[API] Saving version for project:", projectId, "user:", userId);
  if (!projectId) {
    return NextResponse.json(
      { error: "projectId is required" },
      { status: 400 }
    );
  }

  const { data: resource, error: resourceError } = await supabaseAdmin
    .from("resources")
    .select("id, current_version_id")
    .eq("project_id", projectId)
    .eq("resource_type", "PROJECT_RESUME")
    .maybeSingle();

  if (resourceError) {
    return NextResponse.json(
      { error: resourceError.message },
      { status: 500 }
    );
  }

  if (!resource?.id) {
    return NextResponse.json(
      { error: "Project resume resource not found" },
      { status: 404 }
    );
  }

  let resumeRow: {
    content: Record<string, unknown> | null;
    locked_fields: Record<string, boolean> | null;
    locked_sections: Record<string, boolean> | null;
  } | null = null;

  if (resource.current_version_id) {
    const { data, error: resumeError } = await supabaseAdmin
      .from("project_resumes")
      .select("content, locked_fields, locked_sections")
      .eq("id", resource.current_version_id)
      .maybeSingle();
    if (resumeError) {
      return NextResponse.json(
        { error: resumeError.message },
        { status: 500 }
      );
    }
    resumeRow = data;
  }

  if (!resumeRow) {
    const { data, error: latestError } = await supabaseAdmin
      .from("project_resumes")
      .select("content, locked_fields, locked_sections")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latestError) {
      return NextResponse.json(
        { error: latestError.message },
        { status: 500 }
      );
    }
    resumeRow = data;
  }

  if (!resumeRow) {
    return NextResponse.json(
      { error: "No resume data found for project" },
      { status: 404 }
    );
  }

  await supabaseAdmin
    .from("project_resumes")
    .update({ status: "superseded" })
    .eq("project_id", projectId);

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("project_resumes")
    .insert({
      project_id: projectId,
      content: resumeRow.content || {},
      locked_fields: resumeRow.locked_fields || {},
      locked_sections: resumeRow.locked_sections || {},
      created_by: userId ?? null,
    })
    .select("id, version_number")
    .single();

  if (insertError || !inserted) {
    return NextResponse.json(
      { error: insertError?.message || "Failed to snapshot resume" },
      { status: 500 }
    );
  }

  const { error: updateResourceError } = await supabaseAdmin
    .from("resources")
    .update({ current_version_id: inserted.id })
    .eq("id", resource.id);

  if (updateResourceError) {
    console.error("[API] Failed to update resource pointer:", updateResourceError);
    return NextResponse.json(
      { error: updateResourceError.message },
      { status: 500 }
    );
  }

  console.log("[API] Successfully saved project resume version:", {
    versionId: inserted.id,
    versionNumber: inserted.version_number,
    projectId,
  });

  return NextResponse.json({
    ok: true,
    versionId: inserted.id,
    versionNumber: inserted.version_number,
  });
}

