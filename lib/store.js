import { randomBytes } from "crypto";
import { promises as fs } from "fs";
import path from "path";

/**
 * Tiny key-value store.
 * - On Vercel: Upstash Redis / Vercel KV over REST (set KV_REST_API_URL + KV_REST_API_TOKEN,
 *   or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN).
 * - Locally with neither set: a JSON file at .data/db.json.
 */
const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const useRedis = Boolean(REDIS_URL && REDIS_TOKEN);

async function redis(cmd) {
  const res = await fetch(REDIS_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  const json = await res.json();
  if (json.error) throw new Error(`Redis: ${json.error}`);
  return json.result;
}

const FILE = path.join(process.cwd(), ".data", "db.json");
async function readFile() {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch {
    return { apps: {}, order: [] };
  }
}
async function writeFile(db) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(db, null, 2));
}

/* ---------------- public API ---------------- */

export const STATUSES = ["draft", "sent", "viewed", "replied", "interview"];

export function newId() {
  return randomBytes(6).toString("base64url");
}

export async function getApp(id) {
  if (!/^[\w-]{4,20}$/.test(id)) return null;
  if (useRedis) {
    const raw = await redis(["GET", `app:${id}`]);
    return raw ? JSON.parse(raw) : null;
  }
  return (await readFile()).apps[id] || null;
}

export async function saveApp(app, { isNew = false } = {}) {
  app.updatedAt = new Date().toISOString();
  if (useRedis) {
    await redis(["SET", `app:${app.id}`, JSON.stringify(app)]);
    if (isNew) await redis(["LPUSH", "apps", app.id]);
    return app;
  }
  const db = await readFile();
  db.apps[app.id] = app;
  if (isNew) db.order.unshift(app.id);
  await writeFile(db);
  return app;
}

export async function listApps() {
  if (useRedis) {
    const ids = await redis(["LRANGE", "apps", 0, 199]);
    if (!ids?.length) return [];
    const raws = await redis(["MGET", ...ids.map((id) => `app:${id}`)]);
    return raws.filter(Boolean).map((r) => JSON.parse(r));
  }
  const db = await readFile();
  return db.order.map((id) => db.apps[id]).filter(Boolean);
}

/** Record a click/open. A click on a draft or sent application moves it to "viewed". */
export async function logEvent(id, type, req) {
  const app = await getApp(id);
  if (!app) return null;
  app.events = app.events || [];
  app.events.push({
    type,
    at: new Date().toISOString(),
    ua: (req.headers.get("user-agent") || "").slice(0, 160),
  });
  if (type === "click" && (app.status === "draft" || app.status === "sent")) {
    app.status = "viewed";
  }
  await saveApp(app);
  return app;
}

/** Light version for list views (no full CV). */
export function summarise(app) {
  const clicks = (app.events || []).filter((e) => e.type === "click");
  const opens = (app.events || []).filter((e) => e.type === "open");
  const last = (app.events || []).at(-1);
  return {
    id: app.id,
    company: app.company,
    role: app.role,
    status: app.status,
    fitScore: app.fitScore,
    createdAt: app.createdAt,
    sentAt: app.sentAt,
    updatedAt: app.updatedAt,
    clicks: clicks.length,
    opens: opens.length,
    lastEventAt: last?.at || null,
    events: app.events || [],
    email: app.email,
    followUp: app.followUp || null,
  };
}

export function baseUrl(req) {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, "");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
