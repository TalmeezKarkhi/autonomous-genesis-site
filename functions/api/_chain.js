// Read-only eth_call helpers with several RPC fallbacks (batch first, to keep request count low).
const RPC = { "56": ["https://bsc-dataseed.bnbchain.org","https://bsc-dataseed1.bnbchain.org","https://bsc-dataseed2.bnbchain.org",
                     "https://bsc-rpc.publicnode.com","https://bsc-dataseed1.defibit.io","https://bsc.drpc.org","https://1rpc.io/bnb","https://bsc-dataseed3.bnbchain.org"],
              "97": ["https://bsc-testnet-rpc.publicnode.com","https://data-seed-prebsc-2-s1.bnbchain.org:8545"] };
const H = { "content-type": "application/json", "user-agent": "Mozilla/5.0 (autonomousgenesis.xyz)" };
const ok = (x) => typeof x === "string" && /^0x[0-9a-fA-F]+$/.test(x) && x !== "0x";
export async function ethCall(chainId, to, data) {
  for (const url of (RPC[String(chainId)] || RPC["56"])) {
    try {
      const r = await fetch(url, { method: "POST", headers: H,
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to, data }, "latest"] }) });
      const j = await r.json();
      if (ok(j.result)) return j.result;
    } catch (e) {}
  }
  return null;
}
// All-or-nothing batch: returns an array of results in order, or null.
export async function ethCallMany(chainId, to, datas) {
  const body = JSON.stringify(datas.map((data, i) => ({ jsonrpc: "2.0", id: i + 1, method: "eth_call", params: [{ to, data }, "latest"] })));
  for (const url of (RPC[String(chainId)] || RPC["56"])) {
    try {
      const r = await fetch(url, { method: "POST", headers: H, body });
      const j = await r.json();
      if (!Array.isArray(j) || j.length !== datas.length) continue;
      const out = new Array(datas.length);
      for (const x of j) out[x.id - 1] = x.result;
      if (out.every(ok)) return out;
    } catch (e) {}
  }
  return null;
}
export const addrArg = (a) => a.toLowerCase().replace(/^0x/, "").padStart(64, "0");
