// Mint schedule. MINT_PHASE=auto + MINT_START (UTC, e.g. 2026-11-04T12:00:00Z) runs:
//   WL only for WL_MINUTES (default 60), then public only for PUBLIC_HOURS (default 12), then ended.
// Any other MINT_PHASE value (off | wl | public | both) is a manual override with no end time.
export function getPhase(env, now = Math.floor(Date.now() / 1000)) {
  const manual = (env.MINT_PHASE || "off").toLowerCase();
  if (manual !== "auto") return { phase: manual, endsAt: null };
  const start = Math.floor(Date.parse(env.MINT_START || "") / 1000);
  if (!start) return { phase: "off", endsAt: null };
  const wlEnd = start + Number(env.WL_MINUTES || 60) * 60;
  const pubEnd = wlEnd + Number(env.PUBLIC_HOURS || 12) * 3600;
  const sched = { startsAt: start, wlEndsAt: wlEnd, publicEndsAt: pubEnd };
  if (now < start) return { phase: "off", endsAt: null, ...sched };
  if (now < wlEnd) return { phase: "wl", endsAt: wlEnd, ...sched };
  if (now < pubEnd) return { phase: "public", endsAt: pubEnd, ...sched };
  return { phase: "ended", endsAt: null, ...sched };
}
