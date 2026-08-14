/** Shared vendor-name matching for Cove / EPP (all customers). */

export function normVendorName(s: string | null | undefined): string {
  return (s || "")
    .toLowerCase()
    .replace(/\(pty\)\s*ltd|pty\s*ltd|limited|inc\.?|llc/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function vendorNameTokens(s: string | null | undefined): string[] {
  return normVendorName(s)
    .split(" ")
    .filter((t) => t.length >= 4);
}

/** True when a live product/company/host belongs to a mapped customer. */
export function vendorNameHits(
  live: string | null | undefined,
  mapped: string | null | undefined,
): boolean {
  const a = normVendorName(live);
  const b = normVendorName(mapped);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length >= 6 && b.length >= 6 && (a.includes(b) || b.includes(a))) return true;
  const ta = vendorNameTokens(a);
  const tb = vendorNameTokens(b);
  if (!ta.length || !tb.length) return false;
  const overlap = ta.filter((t) => tb.includes(t));
  return overlap.length >= 2 || (overlap.length === 1 && overlap[0].length >= 6);
}
