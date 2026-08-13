/**
 * SLA source of truth.
 *
 * Layer A — RPM contract (SYSPRO Support & AMS Rev 5.0, Aug 2026).
 *   Ticket clocks in Business Hours. No uptime %. Targets, not guarantees.
 *
 * Layer B — Operational posture for RMM / Cove / EPP.
 *   Industry-typical measures we can compute from live collect.
 *   These are NOT in the RPM SYSPRO+AMS contract (clauses 5.1, 11.2).
 */

export const RPM_SLA_REVISION = "5.0";
export const RPM_SLA_DATE = "August 2026";
export const RPM_SLA_TITLE = "SYSPRO Support & Application Management Services";

/** 08:00–17:00 local = 8 Business Hours per Business Day. */
export const RPM_BH_PER_DAY = 8;

export type RpmPriority = "P1" | "P2" | "P3" | "P4";

export type RpmContractClock = {
  priority: RpmPriority;
  name: string;
  definition: string;
  acknowledge: string;
  remote: string;
  restore: string;
  acknowledgeMins: number;
  remoteMins: number;
  /** Business-hour minutes; null = by agreement */
  restoreMins: number | null;
};

export const RPM_CONTRACT_CLOCKS: RpmContractClock[] = [
  {
    priority: "P1",
    name: "Critical",
    definition: "System unavailable, or a core process stopped for multiple users, no workaround.",
    acknowledge: "30 minutes",
    remote: "1 Business Hour",
    restore: "8 Business Hours",
    acknowledgeMins: 30,
    remoteMins: 60,
    restoreMins: 8 * 60,
  },
  {
    priority: "P2",
    name: "High",
    definition: "Major function significantly impaired; workaround difficult or impractical.",
    acknowledge: "30 minutes",
    remote: "2 Business Hours",
    restore: "2 Business Days",
    acknowledgeMins: 30,
    remoteMins: 2 * 60,
    restoreMins: 2 * RPM_BH_PER_DAY * 60,
  },
  {
    priority: "P3",
    name: "Medium",
    definition: "Function impaired for one or a small number of users; workaround available.",
    acknowledge: "2 Business Hours",
    remote: "8 Business Hours",
    restore: "5 Business Days",
    acknowledgeMins: 2 * 60,
    remoteMins: 8 * 60,
    restoreMins: 5 * RPM_BH_PER_DAY * 60,
  },
  {
    priority: "P4",
    name: "Low",
    definition: "Minor issue, general query or cosmetic, little or no business impact.",
    acknowledge: "4 Business Hours",
    remote: "2 Business Days",
    restore: "By agreement",
    acknowledgeMins: 4 * 60,
    remoteMins: 2 * RPM_BH_PER_DAY * 60,
    restoreMins: null,
  },
];

export const RPM_SECURITY_ADMIN = [
  { task: "User creation", target: "2 Business Days" },
  { task: "User modification (roles, permissions, licences)", target: "2 Business Days" },
  {
    task: "User termination or deactivation",
    target: "1 Business Day — same day if received before 12:00 and marked urgent",
  },
] as const;

export const RPM_CONTRACT_RULES = {
  businessHours: "08:00–17:00 on a Business Day, local to the jurisdiction in Schedule 3.",
  measuredAs: "Monthly average across qualifying tickets. Restoration includes a reasonable workaround.",
  notGuarantees:
    "Targets, not guarantees (clause 7.5). No service credits, set-off, or termination right for missing a target.",
  noUptimePct: "This contract has no availability percentage.",
  scope:
    "SYSPRO Support + AMS only. Backups, infrastructure, OS, AD and cybersecurity are excluded (clauses 5.1 and 11.2).",
} as const;

export type IndustryPillarKey = "rmm" | "cove" | "epp";

export type IndustryMeasure = {
  pillar: IndustryPillarKey;
  label: string;
  metric: string;
  /** Numeric target when the measure is a percentage we can score against. */
  targetPct: number;
  targetLabel: string;
  howWeMeasure: string;
  source: string;
};

/**
 * Industry-typical operational targets we can measure from current collect.
 * Used for RMM / Cove / EPP posture — never printed as the RPM SYSPRO contract.
 */
export const INDUSTRY_MEASURES: Record<IndustryPillarKey, IndustryMeasure> = {
  rmm: {
    pillar: "rmm",
    label: "RMM (Pulseway)",
    metric: "Managed-server availability",
    targetPct: 99.9,
    targetLabel: "99.9% servers online",
    howWeMeasure:
      "(servers online ÷ classified servers) × 100, minus 12 points per open critical alert (cap −40). Workstations are excluded.",
    source:
      "MSP infrastructure practice: 99.9% server availability is the common managed-server target. CompTIA / NOC-style SLAs emphasise MTTR by priority; we cannot measure ticket MTTR until a helpdesk feed exists.",
  },
  cove: {
    pillar: "cove",
    label: "Cloud Backup (Cove)",
    metric: "Backup success vs 24h RPO",
    targetPct: 99.5,
    targetLabel: "99.5% success · 24h RPO",
    howWeMeasure:
      "Healthy latest collect = 100. Failed or stale (older than 24h RPO) = 35. Devices with unknown status = 70.",
    source:
      "Enterprise backup SLAs typically set ≥99.5% monthly job success (industry backup practice). RPO/RTO are the NIST SP 800-34 language; 24h is the measurable daily-estate RPO from last successful backup.",
  },
  epp: {
    pillar: "epp",
    label: "EPP (Bitdefender)",
    metric: "Agent coverage of mapped endpoints",
    targetPct: 95,
    targetLabel: "95% endpoints managed",
    howWeMeasure:
      "managed ÷ mapped endpoints when both counts exist; otherwise mapped-only scores 95 (on target) and empty cover scores 80 (awaiting rows).",
    source:
      "Endpoint-security KPIs treat agent coverage as the leading indicator. 95% coverage is the common industry benchmark; 100% is the stretch (unmanaged devices are the gap).",
  },
};

export function vsIndustryTone(
  pct: number | null | undefined,
  targetPct: number,
): "green" | "amber" | "red" | "default" {
  if (pct == null || Number.isNaN(pct)) return "default";
  if (pct >= targetPct) return "green";
  if (pct >= targetPct - 5) return "amber";
  return "red";
}
