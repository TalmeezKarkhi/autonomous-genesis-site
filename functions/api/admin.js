import { ensure, json, authed } from "./_db.js";
export async function onRequestGet({ request, env }) {
  if (!authed(request, env)) return json({ ok: false, error: "unauthorized" }, 401);
  if (!env.DB) return json({ ok: false, error: "not configured" }, 503);
  await ensure(env.DB);
  const { results } = await env.DB.prepare("SELECT * FROM wl_entries ORDER BY id DESC").all();
  return json({ ok: true, entries: results });
}
export async function onRequestPost({ request, env }) {
  if (!authed(request, env)) return json({ ok: false, error: "unauthorized" }, 401);
  await ensure(env.DB);
  const b = await request.json().catch(() => ({}));
  const ids = (b.ids || []).map(Number).filter(Boolean);
  if ((!b.delete && !["pending", "approved", "rejected"].includes(b.status)) || !ids.length) return json({ ok: false, error: "bad request" }, 400);
  if (b.delete) {
    await env.DB.prepare(`DELETE FROM wl_entries WHERE id IN (${ids.map(() => "?").join(",")})`).bind(...ids).run();
  } else {
    await env.DB.prepare(`UPDATE wl_entries SET status=? WHERE id IN (${ids.map(() => "?").join(",")})`).bind(b.status, ...ids).run();
  }
  return json({ ok: true });
}
