// Login gate for /admin/ and /deploy/ (HTTP Basic Auth).
// Username from env var ADMIN_USER (optional), password from encrypted env var ADMIN_PASSWORD (falls back to ADMIN_KEY).
function same(a, b) {
  if (a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
const CANON = "autonomousgenesis.xyz";
const ALIASES = ["www.autonomousgenesis.xyz", "autonomousgenesis.pages.dev"];
export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  const path = url.pathname;
  // Send visitors on www and pages.dev to the main domain (pages only; API calls keep working on any host).
  if (ALIASES.includes(url.hostname) && (request.method === "GET" || request.method === "HEAD") && !path.startsWith("/api/")) {
    url.hostname = CANON; url.protocol = "https:"; url.port = "";
    return Response.redirect(url.toString(), 301);
  }
  if (!/^\/(admin|deploy)(\/|$)/.test(path)) return next();
  const pass = env.ADMIN_PASSWORD || env.ADMIN_KEY;
  const deny = () => new Response("Password required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="AUTOG private", charset="UTF-8"', "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });
  if (!pass) return deny();
  const h = request.headers.get("authorization") || "";
  if (!h.startsWith("Basic ")) return deny();
  let user = "", given = "";
  try { const raw = atob(h.slice(6)); const i = raw.indexOf(":"); user = raw.slice(0, i); given = raw.slice(i + 1); } catch { return deny(); }
  const userOk = env.ADMIN_USER ? same(user, env.ADMIN_USER) : true;
  return (same(given, pass) & userOk) ? next() : deny();
}
