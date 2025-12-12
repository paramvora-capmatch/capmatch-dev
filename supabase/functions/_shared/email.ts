import { corsHeaders } from "./cors.ts";

type SendEmailArgs = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
};

type SendEmailResult =
  | { ok: true; provider: "resend"; id?: string }
  | { ok: false; provider: "none"; error: string; skipped: true }
  | { ok: false; provider: "resend"; error: string };

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const DEFAULT_FROM = Deno.env.get("RESUME_NUDGES_FROM_EMAIL") ?? "CapMatch <noreply@capmatch.ai>";

/**
 * Minimal email sender.
 * - If RESEND_API_KEY isn't configured, we skip sending (but still allow in-app nudges).
 * - Keeps implementation simple and provider-swappable.
 */
export async function sendEmail(args: SendEmailArgs): Promise<SendEmailResult> {
  if (!RESEND_API_KEY) {
    console.log("[email] RESEND_API_KEY not set; skipping email send");
    return { ok: false, provider: "none", skipped: true, error: "missing_resend_api_key" };
  }

  const payload = {
    from: args.from ?? DEFAULT_FROM,
    to: [args.to],
    subject: args.subject,
    html: args.html,
    text: args.text,
  };

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
      ...corsHeaders,
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    return { ok: false, provider: "resend", error: `resend_failed:${resp.status}:${errText}` };
  }

  const data = (await resp.json().catch(() => ({}))) as { id?: string };
  return { ok: true, provider: "resend", id: data?.id };
}



