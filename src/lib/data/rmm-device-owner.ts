/** Hostname prefix -> customer. Wins over Pulseway org (SBS-PROD is Simply Bright, not RPM). */
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

export function rmmCodeFromDeviceName(name?: string | null): string | null {
  const n = String(name ?? "").trim();
  if (!n) return null;
  for (const rule of NAME_RULES) {
    if (rule.re.test(n)) return rule.code;
  }
  return null;
}

export function rmmDeviceBelongsToCustomer(
  customerCode: string,
  deviceName?: string | null,
  stampedCode?: string | null,
): boolean {
  const want = customerCode.trim().toUpperCase();
  const fromName = rmmCodeFromDeviceName(deviceName);
  if (fromName) return fromName.toUpperCase() === want;
  if (stampedCode && String(stampedCode).trim()) {
    return String(stampedCode).trim().toUpperCase() === want;
  }
  return true;
}
