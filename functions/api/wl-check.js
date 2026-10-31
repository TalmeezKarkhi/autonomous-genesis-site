// GET /api/wl-check?wallet=0x... -> { status: "approved" | "pending" | "none" }
// Reveals only the status for that wallet, never the X username or agent ID.
import { ensure, json } from "./_db.js";
export async function onRequestGet({ request, env }) {
  const wallet = (new URL(request.url).searchParams.get("wallet") || "").trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(wallet)) return json({ ok: false, error: "Enter a valid wallet address (0x + 40 hex characters)." }, 400);
  if (!env.DB) return json({ ok: false, error: "Checker is offline. Try again soon." }, 503);
  await ensure(env.DB);
  const row = await env.DB.prepare("SELECT status FROM wl_entries WHERE lower(agent_address)=lower(?)").bind(wallet).first();
  const status = !row ? "none" : row.status === "approved" ? "approved" : row.status === "pending" ? "pending" : "none";
  return json({ ok: true, status });
}
