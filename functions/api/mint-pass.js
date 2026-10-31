// GET /api/mint-pass?wallet=0x...  -> signed mint pass for an agent wallet.
// Cloudflare env: SIGNER_KEY (encrypted secret), CONTRACT_ADDRESS, CHAIN_ID (97 testnet / 56 mainnet),
// MINT_PHASE = off | wl | public | both. Until these are set it answers "not live".
import { ensure, json } from "./_db.js";
import { signMintPass } from "./_sign.js";

const PRICE_BNB = "0.00022";
const PASS_MINUTES = 15;

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const wallet = (url.searchParams.get("wallet") || "").trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(wallet)) return json({ eligible: false, reason: "Send a valid agent wallet address (0x...)." }, 400);
  const phase = (env.MINT_PHASE || "off").toLowerCase();
  if (!env.SIGNER_KEY || !env.CONTRACT_ADDRESS || !env.CHAIN_ID || phase === "off")
    return json({ eligible: false, reason: "Mint is not live yet. Times are announced in UTC on x.com/Autonomousgen." });

  const deadline = Math.floor(Date.now() / 1000) + PASS_MINUTES * 60;
  const base = { eligible: true, contract: env.CONTRACT_ADDRESS, chainId: Number(env.CHAIN_ID), wallet, deadline,
                 validUntilUTC: new Date(deadline * 1000).toISOString().replace(".000Z", " UTC") };

  if (phase === "wl" || phase === "both") {
    let approved = false;
    if (env.DB) {
      await ensure(env.DB);
      const row = await env.DB.prepare("SELECT status FROM wl_entries WHERE lower(agent_address)=lower(?)").bind(wallet).first();
      approved = !!row && row.status === "approved";
    }
    if (approved) {
      const signature = signMintPass(env.SIGNER_KEY, env.CHAIN_ID, env.CONTRACT_ADDRESS, wallet, 1, deadline);
      return json({ ...base, type: "WL", function: "wlMint(deadline, signature)", quantity: 1, priceBNB: "0", signature });
    }
    if (phase === "wl") return json({ eligible: false, reason: "This agent wallet is not on the approved whitelist. Public mint opens later." });
  }
  // public (phase public or both)
  const signature = signMintPass(env.SIGNER_KEY, env.CHAIN_ID, env.CONTRACT_ADDRESS, wallet, 2, deadline);
  return json({ ...base, type: "PUBLIC", function: "publicMint(quantity, deadline, signature)", maxQuantity: 3,
                priceBNB: PRICE_BNB, note: "Send exactly 0.00022 BNB per NFT. Max 3 per wallet.", signature });
}
