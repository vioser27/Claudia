import { listApps, summarise } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const apps = await listApps();
  return Response.json(apps.map(summarise));
}
