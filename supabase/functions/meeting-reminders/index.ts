import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

interface MeetingNeedingReminder {
  meeting_id: string;
  participant_id: string;
  meeting_title: string;
  start_time: string;
  meeting_link: string | null;
  project_id: string | null;
}

serve(async (req) => {
  try {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      console.error("[meeting-reminders] Missing Supabase environment variables");
      return new Response(
        JSON.stringify({ error: "Missing environment variables" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Get meetings that need 30-minute reminders
    const { data: meetings, error: meetingsError } = await supabaseAdmin
      .rpc("get_meetings_needing_reminders", { p_minutes_before: 30 });

    if (meetingsError) {
      console.error("[meeting-reminders] Error fetching meetings:", meetingsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch meetings" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!meetings || meetings.length === 0) {
      console.log("[meeting-reminders] No meetings need reminders");
      return new Response(
        JSON.stringify({ processed: 0, message: "No reminders to send" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`[meeting-reminders] Found ${meetings.length} participants needing reminders`);

    let successCount = 0;
    let errorCount = 0;

    // Process each participant
    for (const meeting of meetings as MeetingNeedingReminder[]) {
      try {
        // Create domain event for reminder
        const { data: eventId, error: eventError } = await supabaseAdmin.rpc(
          "insert_meeting_reminder_event",
          {
            p_meeting_id: meeting.meeting_id,
            p_user_id: meeting.participant_id,
            p_reminder_minutes: 30,
          }
        );

        if (eventError) {
          console.error(`[meeting-reminders] Error creating event for participant ${meeting.participant_id}:`, eventError);
          errorCount++;
          continue;
        }

        // Invoke notify-fan-out to create the notification
        const { error: invokeError } = await supabaseAdmin.functions.invoke(
          "notify-fan-out",
          {
            body: { eventId },
            headers: {
              Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
            },
          }
        );

        if (invokeError) {
          console.error(`[meeting-reminders] Error invoking notify-fan-out:`, invokeError);
          errorCount++;
          continue;
        }

        // Mark reminder as sent
        const { error: insertError } = await supabaseAdmin
          .from("meeting_reminders_sent")
          .insert({
            meeting_id: meeting.meeting_id,
            user_id: meeting.participant_id,
            reminder_type: "30min",
          });

        if (insertError) {
          console.error(`[meeting-reminders] Error marking reminder as sent:`, insertError);
          // Don't increment error count - notification was sent successfully
        }

        successCount++;
      } catch (error) {
        console.error(`[meeting-reminders] Unexpected error processing reminder:`, error);
        errorCount++;
      }
    }

    console.log(`[meeting-reminders] Completed: ${successCount} sent, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        processed: meetings.length,
        success: successCount,
        errors: errorCount,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[meeting-reminders] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
