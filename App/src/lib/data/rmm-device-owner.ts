/** Hostname prefix -> customer. Wins over Pulseway org / vendor partner id. */
const NAME_RULES: { re: RegExp; code: string }[] = [
  { re: /^SBS[-_]/i, code: "SBS" },
  { re: /^SBSPROD/i, code: "SBS" },
  { re: /^SIMPLY/i, code: "SBS" },
  { re: /^SIRZA/i, code: "SIRF" },
  { re: /^SIRF[-_]/i, code: "SIRF" },
  { re: /^SIRFRUIT/i, code: "SIRF" },
  { re: /^AHIC[-_]/i, code: "AHIC" },
  { re: /^AHI[-_]/i, code: "AHIC" },
  { re: /^RSR[-_]/i, code: "RSR" },
  { re: /^REDSUN/i, code: "RSR" },
  { re: /^UVSS[-_]/i, code: "UVSS" },
  { re: /^UVSS/i, code: "UVSS" },
  { re: /^RSS[-_]/i, code: "RSS" },
  { re: /^HYDRA/i, code: "HYDRA" },
  { re: /^ABLE[-_]/i, code: "ABLE" },
  { re: /^AT[-_]/i, code: "ABLE" },
  { re: /^METSI/i, code: "METSI" },
  { re: /^YLJ[-_]/i, code: "YLJ" },
  { re: /^MEDIPOS/i, code: "MEDIPOS" },
  { re: /^BHF[-_]/i, code: "BHF" },
  { re: /^PCNS/i, code: "BHF" },
  { re: /^PNCS/i, code: "BHF" },
  { re: /^VAULT/i, code: "VAULT" },
  { re: /^IB[-_]/i, code: "IB" },
  { re: /^INTERBRAND/i, code: "IB" },
  { re: /^RPM[-_]/i, code: "RPMINT" },
];

/** Vendor / Pulseway org / Cove product / EPP company -> customer. */
const ORG_RULES: { re: RegExp; code: string }[] = [
  { re: /remote\s*site/i, code: "RSS" },
  { re: /\brss\b/i, code: "RSS" },
  { re: /ahi\s*carrier/i, code: "AHIC" },
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
  if (fromHost) return fromHost.toUpperCase() === want;
  const fromOrg = tenantCodeFromOrgName(asset.org);
  if (fromOrg) return fromOrg.toUpperCase() === want;
  if (asset.stamped && String(asset.stamped).trim()) {
    return String(asset.stamped).trim().toUpperCase() === want;
  }
  return false;
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
