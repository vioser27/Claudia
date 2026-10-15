import { logEvent } from "@/lib/store";

export const dynamic = "force-dynamic";

// 1x1 transparent GIF
const PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

/**
 * Open-tracking pixel. Unreliable by nature (Apple Mail preloads images,
 * many clients block them), so the UI labels these "maybe opened".
 */
export async function GET(req, { params }) {
  const { id } = await params;
  try {
    await logEvent(id.replace(/\.gif$/, ""), "open", req);
  } catch (e) {
    console.error("open log failed", e);
  }
  return new Response(PIXEL, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    },
  });
}
