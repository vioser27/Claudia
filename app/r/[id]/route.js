import { logEvent } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Tracked CV link: log the click, then show the hosted CV. */
export async function GET(req, { params }) {
  const { id } = await params;
  // Skip link-preview bots (Slack, LinkedIn, etc.) so they don't count as views.
  const ua = req.headers.get("user-agent") || "";
  const isBot = /bot|crawler|spider|preview|slackbot|facebookexternalhit|linkedinbot|whatsapp/i.test(ua);
  if (!isBot) {
    try {
      await logEvent(id, "click", req);
    } catch (e) {
      console.error("click log failed", e);
    }
  }
  return Response.redirect(new URL(`/cv/${id}`, req.url), 302);
}
