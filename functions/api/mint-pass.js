// GET /api/mint-pass?wallet=0x...  -> signed mint pass for an agent wallet.
// Public mint for all agent wallets. The first 500 mints (contract freeMintCap) are free:
// 1 free per wallet via wlMint (contract wlActive must be on). After that, paid publicMint.
// ?type=paid skips the free lane.
import { json } from "./_db.js";
import { signMintPass } from "./_sign.js";
import { ethCall, addrArg } from "./_chain.js";
import { getPhase } from "./_phase.js";

const PRICE_BNB = "0.00022";
const PASS_MINUTES = 15;

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const wallet = (url.searchParams.get("wallet") || "").trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(wallet)) return json({ eligible: false, reason: "Send a valid agent wallet address (0x...)." }, 400);
  const { phase, endsAt } = getPhase(env);
  if (phase === "ended") return json({ eligible: false, reason: "Mint has ended." });
  if (!env.SIGNER_KEY || !env.CONTRACT_ADDRESS || !env.CHAIN_ID || phase !== "public")
    return json({ eligible: false, reason: "Mint is not live yet. It opens 2026-10-31 18:30 UTC. Updates on x.com/Autonomousgen." });

  let deadline = Math.floor(Date.now() / 1000) + PASS_MINUTES * 60;
  if (endsAt && endsAt < deadline) deadline = endsAt;
  const base = { eligible: true, contract: env.CONTRACT_ADDRESS, chainId: Number(env.CHAIN_ID), wallet, deadline,
                 validUntilUTC: new Date(deadline * 1000).toISOString().replace(".000Z", " UTC") };

  const wantPaid = (url.searchParams.get("type") || "").toLowerCase() === "paid";
  if (!wantPaid) {
    const [minted, cap, used] = await Promise.all([
      ethCall(env.CHAIN_ID, env.CONTRACT_ADDRESS, "0xd10a1a2b"),
      ethCall(env.CHAIN_ID, env.CONTRACT_ADDRESS, "0xb6a0b783"),
      ethCall(env.CHAIN_ID, env.CONTRACT_ADDRESS, "0xdd4d2233" + addrArg(wallet)),
    ]);
    const freeLeft = cap ? parseInt(cap, 16) - (minted ? parseInt(minted, 16) : 0) : 0;
    const walletUsed = used ? parseInt(used, 16) : 0;
    if (freeLeft > 0 && walletUsed < 1) {
      const signature = signMintPass(env.SIGNER_KEY, env.CHAIN_ID, env.CONTRACT_ADDRESS, wallet, 1, deadline);
      return json({ ...base, type: "FREE", function: "wlMint(deadline, signature)", quantity: 1, priceBNB: "0",
                    freeLeft, note: "Free mint (gas only), 1 per wallet, while the first 500 free last. Send value 0.", signature });
    }
  }
  const signature = signMintPass(env.SIGNER_KEY, env.CHAIN_ID, env.CONTRACT_ADDRESS, wallet, 2, deadline);
  return json({ ...base, type: "PUBLIC", function: "publicMint(quantity, deadline, signature)", maxQuantity: 5,
                priceBNB: PRICE_BNB, note: "Paid mint: send exactly 0.00022 BNB per NFT. Max 5 paid per wallet.", signature });
}
