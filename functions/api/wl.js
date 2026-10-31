import { ensure, json } from "./_db.js";
export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "not configured" }, 503);
  let b; try { b = await request.json(); } catch { return json({ ok: false, error: "bad json" }, 400); }
  const x = String(b.xUsername || "").trim().replace(/^@+/, "");
  const id = String(b.agentId || "").trim();
  const addr = String(b.agentAddress || "").trim();
  if (!/^[A-Za-z0-9_]{1,15}$/.test(x)) return json({ ok: false, error: "Invalid X username" }, 400);
  if (id.length < 2 || id.length > 100) return json({ ok: false, error: "Invalid agent ID" }, 400);
  if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) return json({ ok: false, error: "Invalid wallet address" }, 400);
  await ensure(env.DB);
  try {
    await env.DB.prepare("INSERT INTO wl_entries (x_username, agent_id, agent_address, ip_country, created_at) VALUES (?,?,?,?,?)")
      .bind(x, id, addr, request.headers.get("cf-ipcountry") || "", new Date().toISOString()).run();
  } catch (e) {
    if (String(e).includes("UNIQUE")) return json({ ok: true, duplicate: true });
    return json({ ok: false, error: "save failed" }, 500);
  }
  return json({ ok: true });
}
