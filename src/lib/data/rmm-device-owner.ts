/** Hostname prefix -> customer. Wins over Pulseway org / vendor partner id.
 *  Match concatenated names too (AHICFSDBPRD, RPMWINRM) — not only AHIC- / RPM-.
 */
const NAME_RULES: { re: RegExp; code: string }[] = [
  { re: /^SBS/i, code: "SBS" },
  { re: /^SIMPLY/i, code: "SBS" },
  { re: /^SIRZA/i, code: "SIRF" },
  { re: /^SIRFRUIT/i, code: "SIRF" },
  { re: /^SIRF/i, code: "SIRF" },
  { re: /^AHIC/i, code: "AHIC" },
  { re: /^AHI/i, code: "AHIC" },
  { re: /^RSR/i, code: "RSR" },
  { re: /^REDSUN/i, code: "RSR" },
  { re: /^UVSS/i, code: "UVSS" },
  { re: /^RSS/i, code: "RSS" },
  { re: /^HYDRA/i, code: "HYDRA" },
  { re: /^ABLE/i, code: "ABLE" },
  { re: /^AT[-_]/i, code: "ABLE" },
  { re: /^ATSERVER/i, code: "ABLE" },
  { re: /^METSI/i, code: "METSI" },
  { re: /^YLJ/i, code: "YLJ" },
  { re: /^MEDIPOS/i, code: "MEDIPOS" },
  { re: /^BHF/i, code: "BHF" },
  { re: /^PCNS/i, code: "BHF" },
  { re: /^PNCS/i, code: "BHF" },
  { re: /^VAULT/i, code: "VAULT" },
  { re: /^IB[-_]/i, code: "IB" },
  { re: /^IB(SQL|TS|APP)/i, code: "IB" },
  { re: /^INTERBRAND/i, code: "IB" },
  { re: /^(IRONMAN|THOR|HULK|VISION)\b/i, code: "RPMINT" },
  { re: /^RPM/i, code: "RPMINT" },
];

/** Vendor / Pulseway org / Cove product / EPP company -> customer. */
const ORG_RULES: { re: RegExp; code: string }[] = [
  { re: /remote\s*site/i, code: "RSS" },
  { re: /\brss\b/i, code: "RSS" },
  { re: /ahi\s*carrier|\bahi\b/i, code: "AHIC" },
  { re: /redsun/i, code: "RSR" },
  { re: /hydra/i, code: "HYDRA" },
  { re: /able\s*tracer/i, code: "ABLE" },
  { re: /unique\s*ventilation|\buvss\b/i, code: "UVSS" },
  { re: /sir\s*fruit|\bsirf\b/i, code: "SIRF" },
  { re: /simply\s*bright|\bsbs\s*tanks/i, code: "SBS" },
  { re: /board of health|\bbhf\b|pcns|pncs/i, code: "BHF" },
  { re: /interbrand/i, code: "IB" },
  { re: /metsi/i, code: "METSI" },
  { re: /ylj|oratouch/i, code: "YLJ" },
  { re: /medipos/i, code: "MEDIPOS" },
  { re: /vault/i, code: "VAULT" },
  { re: /rpm\s*(resources|internal)/i, code: "RPMINT" },
];

export function rmmCodeFromDeviceName(name?: string | null): string | null {
  const n = String(name ?? "").trim();
  if (!n) return null;
  for (const rule of NAME_RULES) {
    if (rule.re.test(n)) return rule.code;
  }
  return null;
}

export function tenantCodeFromOrgName(name?: string | null): string | null {
  const n = String(name ?? "").trim();
  if (!n) return null;
  for (const rule of ORG_RULES) {
    if (rule.re.test(n)) return rule.code;
  }
  return null;
}

function compactHost(name?: string | null): string {
  return String(name ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export function tenantAssetBelongs(
  customerCode: string,
  asset: {
    host?: string | null;
    org?: string | null;
    stamped?: string | null;
  },
): boolean {
  const want = customerCode.trim().toUpperCase();
  if (!want) return false;
  const fromHost = rmmCodeFromDeviceName(asset.host);
  const hostKey = compactHost(asset.host);
  const hostPrefix = want.length >= 3 && hostKey.startsWith(want);
  const stamped = String(asset.stamped ?? "").trim().toUpperCase();
  const fromOrg = tenantCodeFromOrgName(asset.org);

  // Hostname of a *different* tenant always wins (RSS-PROD must not land on AHIC).
  if (fromHost && fromHost.toUpperCase() !== want) return false;

  if (fromHost && fromHost.toUpperCase() === want) return true;
  if (hostPrefix) return true;
  if (stamped && stamped === want) return true;
  if (fromOrg && fromOrg.toUpperCase() === want) return true;
  if (stamped && stamped !== want) return false;
  if (fromOrg && fromOrg.toUpperCase() !== want) return false;

  // Already SQL-scoped for this tenant (unstamped file servers, laptops, etc.).
  return true;
}

export function rmmDeviceBelongsToCustomer(
  customerCode: string,
  deviceName?: string | null,
  stampedCode?: string | null,
  organizationName?: string | null,
): boolean {
  return tenantAssetBelongs(customerCode, {
    host: deviceName,
    org: organizationName,
    stamped: stampedCode,
  });
}
