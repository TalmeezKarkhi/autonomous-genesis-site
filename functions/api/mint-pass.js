// GET /api/mint-pass?wallet=0x...  -> signed mint pass for an agent wallet.
// Gated by the schedule AND the live contract state: never issues a pass the contract would reject.
// First 500 mints (freeMintCap) are free, 1 per wallet (wlMint). Then paid publicMint at the on-chain price.
// ?type=paid skips the free lane.
import { json } from "./_db.js";
import { signMintPass } from "./_sign.js";
import { getPhase } from "./_phase.js";
import { readState } from "./_state.js";
const PASS_MINUTES = 15;
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const wallet = (url.searchParams.get("wallet") || "").trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(wallet)) return json({ eligible: false, reason: "Send a valid agent wallet address (0x...)." }, 400);
  const { phase, endsAt } = getPhase(env);
  if (phase === "ended") return json({ eligible: false, reason: "Mint has ended." });
  if (!env.SIGNER_KEY || !env.CONTRACT_ADDRESS || !env.CHAIN_ID || phase !== "public")
    return json({ eligible: false, reason: "Mint is not live yet. It opens 2026-10-31 18:30 UTC. Updates on x.com/Autonomousgen." });
  const st = await readState(env.CHAIN_ID, env.CONTRACT_ADDRESS, wallet);
  if (!st) return json({ eligible: false, retry: true, reason: "Network busy reading BNB Chain. Wait 10 seconds and request the pass again." }, 503);
  if (st.totalMinted >= st.maxSupply) return json({ eligible: false, reason: "Sold out." });
  if (st.paused) return json({ eligible: false, reason: "Mint is paused. Updates on x.com/Autonomousgen." });

  let deadline = Math.floor(Date.now() / 1000) + PASS_MINUTES * 60;
  if (endsAt && endsAt < deadline) deadline = endsAt;
  const base = { eligible: true, contract: env.CONTRACT_ADDRESS, chainId: Number(env.CHAIN_ID), wallet, deadline,
                 validUntilUTC: new Date(deadline * 1000).toISOString().replace(".000Z", " UTC") };
  const freeLeft = Math.max(0, st.freeCap - st.freeMinted);
  const wantPaid = (url.searchParams.get("type") || "").toLowerCase() === "paid";
  if (!wantPaid && st.wlActive && freeLeft > 0 && st.walletFree < st.maxFreePerWallet) {
    const signature = signMintPass(env.SIGNER_KEY, env.CHAIN_ID, env.CONTRACT_ADDRESS, wallet, 1, deadline);
    return json({ ...base, type: "FREE", function: "wlMint(deadline, signature)", quantity: 1, priceBNB: "0", valueWei: "0",
                  freeLeft, note: "Free mint (gas only), 1 per wallet, while the first 500 free last. Send value 0.", signature });
  }
  if (!st.publicActive) return json({ eligible: false, reason: freeLeft > 0 ? "This wallet already claimed its free mint." : "Paid mint is not open on the contract right now. Updates on x.com/Autonomousgen." });
  const room = st.maxPerWallet - st.walletPaid;
  if (room <= 0) return json({ eligible: false, reason: "This wallet already minted the maximum " + st.maxPerWallet + " paid NFTs." });
  const signature = signMintPass(env.SIGNER_KEY, env.CHAIN_ID, env.CONTRACT_ADDRESS, wallet, 2, deadline);
  return json({ ...base, type: "PUBLIC", function: "publicMint(quantity, deadline, signature)", maxQuantity: room,
                priceBNB: st.priceBNB, priceWei: st.priceWei,
                note: "Paid mint: send exactly " + st.priceBNB + " BNB (" + st.priceWei + " wei) per NFT. This wallet can mint up to " + room + " more.", signature });
}
