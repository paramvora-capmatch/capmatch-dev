// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// Removed section grouping utilities - storage is now always flat format

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
      // Use pointer logic to get the current resume (same as getProjectWithResume)
      const { data: resource } = await supabase
        .from("resources")
        .select("current_version_id")
        .eq("resource_type", "PROJECT_RESUME")
        .eq("project_id", project_id)
        .maybeSingle();

      let existing: { content: Record<string, unknown> } | null = null;
      let fetchError = null;

      if (resource?.current_version_id) {
        // Pointer exists: Fetch that specific version
        const result = await supabase
          .from("project_resumes")
          .select("id, content")
          .eq("id", resource.current_version_id)
          .single();
        existing = result.data;
        fetchError = result.error;
      } else {
        // No pointer: Fallback to fetching the latest by date
        const result = await supabase
          .from("project_resumes")
          .select("id, content")
          .eq("project_id", project_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        existing = result.data;
        fetchError = result.error;
      }

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw new Error(`Failed to read resume: ${fetchError.message}`);
      }

      let existingContent = (existing?.content ?? {}) as Record<string, unknown>;
      
      // Content is always flat now, no conversion needed
      
      // Handle rich data format merging
      // If resume_updates contains _metadata, convert it to rich format
      const metadata = (resume_updates as any)._metadata;
      let finalContentFlat: Record<string, unknown> = { ...existingContent };
      const rootKeys: Record<string, unknown> = {};
      
      // Helper to normalize any legacy `source`/`sources`/string into a single
      // SourceMetadata-like object. The backend schema uses:
      //   { value, source: { type, name?, derivation? }, warnings, other_values }
      const toSourceObject = (input: any): any => {
        if (!input) return { type: "user_input" };

        // Already a SourceMetadata-like object
        if (typeof input === "object" && input !== null && "type" in input) {
          return input;
        }

        // Legacy array form – pick the first entry
        if (Array.isArray(input) && input.length > 0) {
          const first = input[0];
          if (typeof first === "object" && first !== null && "type" in first) {
            return first;
          }
          if (typeof first === "string") {
            const normalized = first.toLowerCase().trim();
            if (normalized === "user_input" || normalized === "user input") {
              return { type: "user_input" };
            }
            return { type: "document", name: first };
          }
        }

        // Legacy string source
        if (typeof input === "string") {
          const normalized = input.toLowerCase().trim();
          if (normalized === "user_input" || normalized === "user input") {
            return { type: "user_input" };
          }
          return { type: "document", name: input };
        }

        return { type: "user_input" };
      };
      
      if (metadata) {
        // Convert metadata to rich format and merge
        for (const key in resume_updates) {
          if (key === '_metadata') continue;

          // Reserved root-level keys (e.g. _lockedFields / _lockedSections) should stay at the top level
          // Note: _lockedFields is now stored in locked_fields column, not content
          if (key.startsWith('_') || key === 'projectSections' || key === 'borrowerSections') {
            rootKeys[key] = resume_updates[key];
            continue;
          }
          
          const value = resume_updates[key];
          const meta = metadata[key];
          
          if (meta) {
            // Save in rich format using single `source` object and optional other_values
            const metaAny: any = meta;
            const existingItem = existingContent[key];

            const primarySourceInput =
              metaAny.source !== undefined
                ? metaAny.source
                : Array.isArray(metaAny.sources) && metaAny.sources.length > 0
                ? metaAny.sources[0]
                : undefined;

            finalContentFlat[key] = {
              value,
              source: toSourceObject(primarySourceInput),
              warnings: metaAny.warnings || [],
              other_values: metaAny.other_values || [],
            };
          } else {
            // Check if existing content has rich format for this field
            const existingItem = existingContent[key];
            if (
              existingItem &&
              typeof existingItem === "object" &&
              ("value" in existingItem || "source" in existingItem || "sources" in existingItem)
            ) {
              const existingObj = existingItem as any;
              const existingPrimarySourceInput =
                "source" in existingObj
                  ? existingObj.source
                  : Array.isArray(existingObj.sources) && existingObj.sources.length > 0
                  ? existingObj.sources[0]
                  : undefined;
      
              // Preserve existing metadata structure, update value, and normalize to new schema
              finalContentFlat[key] = {
                value,
                source: toSourceObject(existingPrimarySourceInput),
                warnings: existingObj.warnings || [],
                other_values: existingObj.other_values || [],
              };
            } else {
              // Convert to rich format - this is user input without existing rich format
              finalContentFlat[key] = {
                value,
                source: toSourceObject(null),
                warnings: [],
                other_values: [],
              };
            }
          }
        }
      } else {
        // No metadata - merge flat values, but preserve existing rich format
        for (const key in resume_updates) {
          if (key === '_metadata') continue;

          if (key.startsWith('_') || key === 'projectSections' || key === 'borrowerSections') {
            rootKeys[key] = resume_updates[key];
            continue;
          }
          
          const value = resume_updates[key];
          const existingItem = existingContent[key];
          
          if (
            existingItem &&
            typeof existingItem === "object" &&
            ("value" in existingItem || "source" in existingItem || "sources" in existingItem)
          ) {
            const existingObj = existingItem as any;
            const existingPrimarySourceInput =
              "source" in existingObj
                ? existingObj.source
                : Array.isArray(existingObj.sources) && existingObj.sources.length > 0
                ? existingObj.sources[0]
                : undefined;
      
            // Preserve existing rich format, update value, normalize to new schema
            finalContentFlat[key] = {
              value,
              source: toSourceObject(existingPrimarySourceInput),
              warnings: existingObj.warnings || [],
              other_values: existingObj.other_values || [],
            };
          } else {
            // Convert to rich format - this is user input without existing rich format
            finalContentFlat[key] = {
              value,
              source: toSourceObject(null),
              warnings: [],
              other_values: [],
            };
          }
        }
      }
      
      // Ensure all fields are in rich format (safety check)
      // Convert any remaining flat values to rich format
      for (const key in finalContentFlat) {
        const item = finalContentFlat[key];
        // Ensure objects with `value` are normalized to { value, source, warnings, other_values }
        if (item !== null && typeof item === "object" && "value" in item) {
          const obj = item as any;
          const primarySourceInput =
            obj.source !== undefined
              ? obj.source
              : Array.isArray(obj.sources) && obj.sources.length > 0
              ? obj.sources[0]
              : undefined;

          const normalized: any = {
            value: obj.value,
            source: toSourceObject(primarySourceInput),
            warnings: obj.warnings || [],
            other_values: obj.other_values || [],
          };
          finalContentFlat[key] = normalized;
        } else if (
          item !== null &&
          item !== undefined &&
          typeof item !== "object"
        ) {
          // Flat value - convert to rich format
          finalContentFlat[key] = {
            value: item,
            source: toSourceObject(null),
            warnings: [],
            other_values: [],
          };
        }
      }
      
      // Extract _lockedFields from rootKeys (now stored in locked_fields column, not content)
      const lockedFields = (rootKeys._lockedFields as Record<string, boolean> | undefined) || {};
      const { _lockedFields, ...rootKeysWithoutLockedFields } = rootKeys;
      
      // Save flat content directly - no grouping needed
      const finalContent = {
        ...rootKeysWithoutLockedFields,
        ...finalContentFlat,
      };

      // Extract completenessPercent from resume_updates if present (stored in column, not content)
      const completenessPercent = (resume_updates as any).completenessPercent;
      
      // Prepare update payload
      const updatePayload: { 
        content: Record<string, unknown>;
        locked_fields?: Record<string, boolean>;
        completeness_percent?: number;
      } = {
        content: finalContent
      };
      
      // Add locked_fields to payload
      if (lockedFields && Object.keys(lockedFields).length > 0) {
        updatePayload.locked_fields = lockedFields;
      }
      
      // Add completeness_percent to payload if provided
      if (completenessPercent !== undefined && typeof completenessPercent === 'number') {
        updatePayload.completeness_percent = completenessPercent;
      }

      // Update the existing row (update in place, don't create new version)
      if (existing?.id) {
        const { error: updateError } = await supabase
          .from("project_resumes")
          .update(updatePayload)
          .eq("id", existing.id);
        if (updateError) throw new Error(`Failed to save resume: ${updateError.message}`);
      } else {
        // No existing resume - create new one
        const insertPayload: { 
          project_id: string; 
          content: Record<string, unknown>;
          locked_fields?: Record<string, boolean>;
          completeness_percent?: number;
        } = {
          project_id,
          content: finalContent
        };
        
        // Add locked_fields to insert payload
        if (lockedFields && Object.keys(lockedFields).length > 0) {
          insertPayload.locked_fields = lockedFields;
        }
        
        // Add completeness_percent to insert payload if provided
        if (completenessPercent !== undefined && typeof completenessPercent === 'number') {
          insertPayload.completeness_percent = completenessPercent;
        }
        
        const { error: insertError } = await supabase
          .from("project_resumes")
          .insert(insertPayload);
        if (insertError) throw new Error(`Failed to create resume: ${insertError.message}`);
      }
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


