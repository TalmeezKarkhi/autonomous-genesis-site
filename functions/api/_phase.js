// Mint schedule (no WL phase). Public opens at MINT_START (UTC) for PUBLIC_HOURS (default 12).
// During public, the first FREE_CAP mints (contract freeMintCap, 500) are free (1 per wallet, wlMint lane),
// then paid publicMint. Default start: 2026-10-31 18:30 UTC.
// Manual override: MINT_PHASE = stop (kill switch) | public. Anything else (off/auto/unset) follows the schedule.
export const DEFAULT_START = "2026-10-31T18:30:00Z";
// Mint permanently closed on-chain 2026-11-01 (maxSupply reduced to totalMinted). Site always reports "ended".
export const MINT_CLOSED = true;
export function getPhase(env, now = Math.floor(Date.now() / 1000)) {
  if (MINT_CLOSED) return { phase: "ended", endsAt: null };
  const manual = (env.MINT_PHASE || "").toLowerCase();
  if (manual === "stop") return { phase: "off", endsAt: null };
  if (manual === "public") return { phase: "public", endsAt: null };
  const start = Math.floor(Date.parse(env.MINT_START || DEFAULT_START) / 1000);
  if (!start) return { phase: "off", endsAt: null };
  const pubEnd = start + Number(env.PUBLIC_HOURS || 12) * 3600;
  const sched = { startsAt: start, publicEndsAt: pubEnd };
  if (now < start) return { phase: "off", endsAt: null, ...sched };
  if (now < pubEnd) return { phase: "public", endsAt: pubEnd, ...sched };
  return { phase: "ended", endsAt: null, ...sched };
}
