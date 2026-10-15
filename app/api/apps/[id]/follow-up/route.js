import { getApp, saveApp, summarise } from "@/lib/store";
import { draftFollowUp } from "@/lib/claude";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req, { params }) {
  const { id } = await params;
  const app = await getApp(id);
  if (!app) return Response.json({ error: "Not found" }, { status: 404 });

  try {
    app.followUp = { ...(await draftFollowUp(app)), draftedAt: new Date().toISOString() };
    await saveApp(app);
    return Response.json(summarise(app));
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
