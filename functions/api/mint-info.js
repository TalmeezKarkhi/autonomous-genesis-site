// GET /api/mint-info -> live mint state for the /mint page, read from the contract itself.
// Time window comes from the schedule; everything else (on/off, paused, price, limits, counts) from chain.
import { json } from "./_db.js";
import { signerAddress } from "./_sign.js";
import { getPhase } from "./_phase.js";
import { readState } from "./_state.js";
export async function onRequestGet({ env, request, waitUntil }) {
  const cache = caches.default, key = new Request(new URL("/api/mint-info?c=1", request.url).toString());
  const hit = await cache.match(key); if (hit) return hit;
  const addr = /^0x[0-9a-fA-F]{40}$/.test(env.CONTRACT_ADDRESS || "") ? env.CONTRACT_ADDRESS : null;
  const chainId = Number(env.CHAIN_ID || 56);
  const sched = getPhase(env);
  let signer = null; try { if (env.SIGNER_KEY) signer = signerAddress(env.SIGNER_KEY); } catch (e) {}
  const st = addr ? await readState(chainId, addr) : null;
  const body = { contract: addr, chainId, ...sched, chainOk: !!st };
  if (st) {
    Object.assign(body, st);
    body.signerOk = !!signer && signer.toLowerCase() === st.contractSigner.toLowerCase();
    const freeLeft = Math.max(0, st.freeCap - st.freeMinted), soldOut = st.totalMinted >= st.maxSupply;
    body.freeLeft = freeLeft;
    let mode = null;
    if (sched.phase === "public") {
      if (soldOut) mode = "soldout";
      else if (st.paused || !body.signerOk) mode = "paused";
      else if (st.wlActive && freeLeft > 0) mode = "free";
      else if (st.publicActive) mode = "paid";
      else mode = "paused";
    }
    body.mode = mode;
  }
  const res = new Response(JSON.stringify(body), { headers: { "content-type": "application/json", "cache-control": "public, max-age=0, s-maxage=4" } });
  if (st) waitUntil(cache.put(key, res.clone()));
  return res;
}
