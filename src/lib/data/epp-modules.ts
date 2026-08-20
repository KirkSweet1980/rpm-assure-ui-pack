/** Canonical GravityZone / RPM EndPoint Protection module catalog.
 *  Every customer menu and Policies page lists this full set.
 *  Assigned / enabled = On. Missing from collect = Off (not hidden).
 */
export const EPP_MODULE_CATALOG: { id: string; label: string }[] = [
  { id: "antimalware", label: "Antimalware" },
  { id: "advancedThreatControl", label: "Advanced Threat Control" },
  { id: "hyperDetect", label: "HyperDetect" },
  { id: "firewall", label: "Firewall" },
  { id: "contentControl", label: "Content Control" },
  { id: "deviceControl", label: "Device Control" },
  { id: "edrSensor", label: "EDR" },
  { id: "networkSandboxing", label: "Sandbox Analyzer" },
  { id: "networkAttackDefense", label: "Network Attack Defense" },
  { id: "networkMonitor", label: "Network Monitor" },
  { id: "encryption", label: "Disk Encryption" },
  { id: "patchManagement", label: "Patch Management" },
  { id: "integrityMonitor", label: "Integrity Monitor" },
  { id: "indicatorsOfRisk", label: "Risk Management" },
  { id: "exchange", label: "Exchange Protection" },
  { id: "storageProtection", label: "Storage Protection" },
  { id: "liveSearch", label: "Live Search" },
  { id: "PHASR", label: "PHASR" },
  { id: "relay", label: "Relay" },
];

export type EppModuleFlag = { id: string; label: string; enabled: boolean };

export function withFullEppModules(modules: EppModuleFlag[] | null | undefined): EppModuleFlag[] {
  const list = modules ?? [];
  const byId = new Map(list.map((m) => [m.id.toLowerCase(), m]));
  const byLabel = new Map(list.map((m) => [m.label.toLowerCase(), m]));
  return EPP_MODULE_CATALOG.map((c) => {
    const hit = byId.get(c.id.toLowerCase()) ?? byLabel.get(c.label.toLowerCase());
    return { id: c.id, label: c.label, enabled: Boolean(hit?.enabled) };
  });
}
