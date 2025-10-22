// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, thread_id, project_id, topic, participant_ids } =
      await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get the current user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization header required");
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      throw new Error("Invalid authentication");
    }

    if (action === "create") {
      if (!project_id) {
        throw new Error("project_id is required for creating threads");
      }

      // Verify user has access to the project
      const { data: project, error: projectError } = await supabaseAdmin
        .from("projects")
        .select("id, owner_org_id, assigned_advisor_id")
        .eq("id", project_id)
        .single();

      if (projectError) {
        throw new Error(
          `Failed to verify project access: ${projectError.message}`
        );
      }

      // Check if user can access this project (owner or advisor)
      const isOwner = await supabaseAdmin.rpc("is_org_owner", {
        p_org_id: project.owner_org_id,
        p_user_id: user.id,
      });

      const isAdvisor = project.assigned_advisor_id === user.id;

      if (!isOwner.data && !isAdvisor) {
        throw new Error(
          "You don't have permission to create threads for this project"
        );
      }

      // Create the thread
      const { data: thread, error: threadError } = await supabaseAdmin
        .from("chat_threads")
        .insert({
          project_id,
          topic: topic || null,
        })
        .select()
        .single();

      if (threadError) {
        throw new Error(`Failed to create thread: ${threadError.message}`);
      }

      // Add current user as participant
      const { error: currentUserError } = await supabaseAdmin
        .from("chat_thread_participants")
        .insert({
          thread_id: thread.id,
          user_id: user.id,
        });

      if (currentUserError) {
        throw new Error(
          `Failed to add current user as participant: ${currentUserError.message}`
        );
      }

      // Add additional participants if provided
      if (participant_ids && participant_ids.length > 0) {
        const participantInserts = participant_ids.map((pid) => ({
          thread_id: thread.id,
          user_id: pid,
        }));

        const { error: participantsError } = await supabaseAdmin
          .from("chat_thread_participants")
          .insert(participantInserts);

        if (participantsError) {
          console.warn(
            `Failed to add some participants: ${participantsError.message}`
          );
          // Don't fail the entire operation for participant errors
        }
      }

      return new Response(
        JSON.stringify({
          thread_id: thread.id,
          message: "Thread created successfully",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } else if (action === "add_participant") {
      if (!thread_id || !participant_ids || participant_ids.length === 0) {
        throw new Error("thread_id and participant_ids are required");
      }

      // Verify user has permission to add participants to this thread
      const { data: thread, error: threadError } = await supabaseAdmin
        .from("chat_threads")
        .select(
          "id, project_id, projects!inner(owner_org_id, assigned_advisor_id)"
        )
        .eq("id", thread_id)
        .single();

      if (threadError) {
        throw new Error(`Failed to get thread: ${threadError.message}`);
      }

      const project = thread.projects;
      const isOwner = await supabaseAdmin.rpc("is_org_owner", {
        p_org_id: project.owner_org_id,
        p_user_id: user.id,
      });

      const isAdvisor = project.assigned_advisor_id === user.id;

      if (!isOwner.data && !isAdvisor) {
        throw new Error(
          "You don't have permission to add participants to this thread"
        );
      }

      // Add participants
      const participantInserts = participant_ids.map((pid) => ({
        thread_id,
        user_id: pid,
      }));

      const { error: participantsError } = await supabaseAdmin
        .from("chat_thread_participants")
        .insert(participantInserts);

      if (participantsError) {
        throw new Error(
          `Failed to add participants: ${participantsError.message}`
        );
      }

      return new Response(
        JSON.stringify({
          message: "Participants added successfully",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } else if (action === "remove_participant") {
      if (!thread_id || !participant_ids || participant_ids.length === 0) {
        throw new Error("thread_id and participant_ids are required");
      }

      // Verify user has permission to remove participants from this thread
      const { data: thread, error: threadError } = await supabaseAdmin
        .from("chat_threads")
        .select(
          "id, project_id, projects!inner(owner_org_id, assigned_advisor_id)"
        )
        .eq("id", thread_id)
        .single();

      if (threadError) {
        throw new Error(`Failed to get thread: ${threadError.message}`);
      }

      const project = thread.projects;
      const isOwner = await supabaseAdmin.rpc("is_org_owner", {
        p_org_id: project.owner_org_id,
        p_user_id: user.id,
      });

      const isAdvisor = project.assigned_advisor_id === user.id;

      if (!isOwner.data && !isAdvisor) {
        throw new Error(
          "You don't have permission to remove participants from this thread"
        );
      }

      // Remove participants
      const { error: participantsError } = await supabaseAdmin
        .from("chat_thread_participants")
        .delete()
        .eq("thread_id", thread_id)
        .in("user_id", participant_ids);

      if (participantsError) {
        throw new Error(
          `Failed to remove participants: ${participantsError.message}`
        );
      }

      return new Response(
        JSON.stringify({
          message: "Participants removed successfully",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } else if (action === "get_thread") {
      if (!project_id) {
        throw new Error("project_id is required for getting threads");
      }

      // Get existing thread(s) for this project
      const { data: thread, error: threadError } = await supabaseAdmin
        .from("chat_threads")
        .select("*")
        .eq("project_id", project_id);

      if (threadError) {
        throw new Error(`Failed to get thread: ${threadError.message}`);
      }

      return new Response(
        JSON.stringify({
          thread,
          message: "Thread retrieved successfully",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } else {
      throw new Error(
        "Invalid action. Supported actions: create, get_thread, add_participant, remove_participant"
      );
    }
  } catch (error) {
    console.error("[manage-chat-thread] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
