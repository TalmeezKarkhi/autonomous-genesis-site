// Live mint count: reads totalSupply() and maxSupply-ish from the contract.
const RPC = { "56": ["https://bsc-dataseed.bnbchain.org","https://bsc-dataseed1.defibit.io","https://bsc-rpc.publicnode.com"],
              "97": ["https://bsc-testnet-rpc.publicnode.com","https://data-seed-prebsc-2-s1.bnbchain.org:8545"] };
export async function onRequestGet({ env }) {
  const h = { "content-type": "application/json", "cache-control": "public, max-age=8", "access-control-allow-origin": "*" };
  const addr = env.CONTRACT_ADDRESS, chain = String(env.CHAIN_ID || "56");
  if (!addr) return new Response(JSON.stringify({ minted: 0, max: 662 }), { headers: h });
  for (const url of (RPC[chain] || RPC["56"])) {
    try {
      const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to: addr, data: "0x18160ddd" }, "latest"] }) });
      const j = await r.json();
      if (j.result) return new Response(JSON.stringify({ minted: parseInt(j.result, 16), max: 662, chainId: Number(chain) }), { headers: h });
    } catch (e) {}
  }
  return new Response(JSON.stringify({ minted: null, max: 662 }), { status: 502, headers: h });
}
