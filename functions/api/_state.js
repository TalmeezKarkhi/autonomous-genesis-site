// Reads the live mint state straight from the AUTOG contract (one batch of eth_calls).
// Returns null when the chain can't be read, so callers never guess.
import { ethCall, ethCallMany, addrArg } from "./_chain.js";
const SEL = { wlActive: "0x48575bfa", publicActive: "0x3f2981cf", paused: "0x5c975abb", price: "0xa035b1fe",
  maxPerWallet: "0x453c2310", maxFreePerWallet: "0xa7027357", totalMinted: "0xa2309ff8", maxSupply: "0xd5abeb01",
  freeMinted: "0xd10a1a2b", freeMintCap: "0xb6a0b783", signer: "0x238ac933" };
export function fmtBNB(wei) {
  wei = BigInt(wei); const w = wei / 10n ** 18n, f = (wei % 10n ** 18n).toString().padStart(18, "0").replace(/0+$/, "");
  return f ? w + "." + f : w.toString();
}
export async function readState(chainId, addr, wallet) {
  const keys = Object.keys(SEL), datas = keys.map((k) => SEL[k]);
  if (wallet) datas.push("0xdd4d2233" + addrArg(wallet), "0x3cef28d2" + addrArg(wallet));
  let r = await ethCallMany(chainId, addr, datas);
  if (!r) { r = await Promise.all(datas.map((d) => ethCall(chainId, addr, d))); if (r.some((x) => x == null)) return null; }
  const n = (i) => BigInt(r[i]), s = {};
  keys.forEach((k, i) => { s[k] = k === "signer" ? "0x" + r[i].slice(-40) : n(i); });
  const out = { wlActive: s.wlActive === 1n, publicActive: s.publicActive === 1n, paused: s.paused === 1n,
    priceWei: s.price.toString(), priceBNB: fmtBNB(s.price), maxPerWallet: Number(s.maxPerWallet),
    maxFreePerWallet: Number(s.maxFreePerWallet), totalMinted: Number(s.totalMinted), maxSupply: Number(s.maxSupply),
    freeMinted: Number(s.freeMinted), freeCap: Number(s.freeMintCap), contractSigner: s.signer };
  if (wallet) { out.walletFree = Number(n(keys.length)); out.walletPaid = Number(n(keys.length + 1)); }
  return out;
}
