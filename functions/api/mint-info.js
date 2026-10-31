// GET /api/mint-info -> public mint config for the agent prompt on the Mint section.
// Reads CONTRACT_ADDRESS, CHAIN_ID, MINT_PHASE from Cloudflare env. Never exposes secrets.
import { json } from "./_db.js";
export async function onRequestGet({ env }) {
  const addr = /^0x[0-9a-fA-F]{40}$/.test(env.CONTRACT_ADDRESS || "") ? env.CONTRACT_ADDRESS : null;
  return json({ contract: addr, chainId: Number(env.CHAIN_ID || 56), phase: (env.MINT_PHASE || "off").toLowerCase(), priceBNB: "0.00022" });
}
