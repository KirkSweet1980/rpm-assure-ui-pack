import type { PortfolioPayload } from "./types";

const KEY = "rpma_portfolio_cache_v1";
const TTL_MS = 60_000;

type Box = { at: number; data: PortfolioPayload };

export function readClientPortfolioCache(): PortfolioPayload | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const box = JSON.parse(raw) as Box;
    if (!box?.at || !box?.data) return null;
    if (Date.now() - box.at > TTL_MS) return null;
    return box.data;
  } catch {
    return null;
  }
}

export function writeClientPortfolioCache(data: PortfolioPayload): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    const box: Box = { at: Date.now(), data };
    sessionStorage.setItem(KEY, JSON.stringify(box));
  } catch {
    /* quota */
  }
}
