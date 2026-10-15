import { getApp, saveApp, summarise, STATUSES } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Update an application's status (e.g. dragged on the board, or "Mark as sent"). */
export async function PATCH(req, { params }) {
  const { id } = await params;
  const app = await getApp(id);
  if (!app) return Response.json({ error: "Not found" }, { status: 404 });

  const { status } = await req.json();
  if (!STATUSES.includes(status)) return Response.json({ error: "Bad status" }, { status: 400 });

  app.status = status;
  if (status === "sent" && !app.sentAt) app.sentAt = new Date().toISOString();
  await saveApp(app);
  return Response.json(summarise(app));
}
