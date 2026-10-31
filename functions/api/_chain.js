// Minimal read-only eth_call helper with RPC fallbacks.
const RPC = { "56": ["https://bsc-dataseed.bnbchain.org","https://bsc-rpc.publicnode.com","https://bsc-dataseed1.defibit.io"],
              "97": ["https://bsc-testnet-rpc.publicnode.com","https://data-seed-prebsc-2-s1.bnbchain.org:8545"] };
export async function ethCall(chainId, to, data) {
  for (const url of (RPC[String(chainId)] || RPC["56"])) {
    try {
      const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to, data }, "latest"] }) });
      const j = await r.json();
      if (j.result && j.result !== "0x") return j.result;
    } catch (e) {}
  }
  return null;
}
export const addrArg = (a) => a.toLowerCase().replace(/^0x/, "").padStart(64, "0");
