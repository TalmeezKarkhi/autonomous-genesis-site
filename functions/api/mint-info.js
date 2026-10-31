// GET /api/mint-info -> public mint config for the agent prompt on the Mint section.
// Reads CONTRACT_ADDRESS, CHAIN_ID, MINT_PHASE from Cloudflare env. Never exposes secrets
// (signer is the PUBLIC address derived from SIGNER_KEY, used to confirm it matches the contract).
import { json } from "./_db.js";
import { signerAddress } from "./_sign.js";
import { ethCall } from "./_chain.js";
import { getPhase } from "./_phase.js";
export async function onRequestGet({ env }) {
  const addr = /^0x[0-9a-fA-F]{40}$/.test(env.CONTRACT_ADDRESS || "") ? env.CONTRACT_ADDRESS : null;
  const chainId = Number(env.CHAIN_ID || 56);
  let signer = null, contractSigner = null;
  try { if (env.SIGNER_KEY) signer = signerAddress(env.SIGNER_KEY); } catch (e) {}
  if (addr) { const r = await ethCall(chainId, addr, "0x238ac933"); if (r) contractSigner = "0x" + r.slice(-40); }
  const signerOk = !!signer && !!contractSigner && signer.toLowerCase() === contractSigner.toLowerCase();
  return json({ contract: addr, chainId, ...getPhase(env), priceBNB: "0.00022", signerOk });
}
