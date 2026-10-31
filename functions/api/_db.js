export async function ensure(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS wl_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    x_username TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    agent_address TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    ip_country TEXT,
    created_at TEXT NOT NULL
  )`).run();
  await db.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS wl_x ON wl_entries(lower(x_username))`).run();
  await db.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS wl_addr ON wl_entries(lower(agent_address))`).run();
}
export const json = (o, s = 200) => new Response(JSON.stringify(o), {
  status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });
export function authed(request, env) {
  const h = request.headers.get("authorization") || "";
  const key = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!env.ADMIN_KEY || key.length !== env.ADMIN_KEY.length) return false;
  let d = 0; for (let i = 0; i < key.length; i++) d |= key.charCodeAt(i) ^ env.ADMIN_KEY.charCodeAt(i);
  return d === 0;
}
