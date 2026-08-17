/**
 * SLA source of truth.
 *
 * Layer A — RPM contract (SYSPRO Support & AMS Rev 5.0, Aug 2026).
 *   Ticket clocks in Business Hours. No uptime %. Targets, not guarantees.
 *
 * Layer B — Operational posture for RMM / RPM Cloud Backup / EPP.
 *   Industry measures from RMM SLA Metrics Recommendations (14 Aug 2026).
 *   These are NOT in the RPM SYSPRO+AMS contract (clauses 5.1, 11.2).
 */

export const RPM_SLA_REVISION = "5.0";
export const RPM_SLA_DATE = "August 2026";
export const RPM_SLA_TITLE = "SYSPRO Support & Application Management Services";
export const INDUSTRY_SLA_DOC = "RMM SLA Metrics Recommendations · 14 August 2026";

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

export type IndustrySlaLineDef = {
  id: string;
  metric: string;
  targetPct: number | null;
  targetLabel: string;
  contractual: boolean;
  measurable: boolean;
  how: string;
};

/** Headline industry targets used on Exco tiles. */
export const INDUSTRY_MEASURES: Record<IndustryPillarKey, IndustryMeasure> = {
  rmm: {
    pillar: "rmm",
    label: "RPM Remote Management",
    metric: "Server uptime (standard tier)",
    targetPct: 99.9,
    targetLabel: "99.9% monthly uptime",
    howWeMeasure:
      "From RPM RMM OfflineHours30d when present: (43,200 − offline minutes) / 43,200. Otherwise snapshot servers online ÷ classified servers. Critical alerts deduct 12 pts each (cap −40). Workstations excluded.",
    source: INDUSTRY_SLA_DOC,
  },
  cove: {
    pillar: "cove",
    label: "RPM Cloud Backup",
    metric: "Backup success vs 24h RPO",
    targetPct: 99.5,
    targetLabel: "99.5% success · 24h RPO",
    howWeMeasure:
      "Success = OK jobs ÷ (OK + failed). RPO met = devices whose last success is within 24h. Restore success = passed tests ÷ (passed + failed).",
    source: INDUSTRY_SLA_DOC,
  },
  epp: {
    pillar: "epp",
    label: "RPM EndPoint Protection",
    metric: "Protection coverage",
    targetPct: 98,
    targetLabel: "98% endpoints managed",
    howWeMeasure:
      "managed ÷ (managed + unmanaged) from RPM EndPoint Protection. Open critical incidents pull the score down. Detection-efficacy is not contractual.",
    source: INDUSTRY_SLA_DOC,
  },
};

/** Full PDF line items — shown on each service SLA page. */
export const INDUSTRY_SLA_LINES: Record<IndustryPillarKey, IndustrySlaLineDef[]> = {
  rmm: [
    {
      id: "rmm-uptime",
      metric: "Server uptime / availability",
      targetPct: 99.9,
      targetLabel: "99.9% (standard) · 99.95% important · 99.99% HA",
      contractual: true,
      measurable: true,
      how: "Unplanned downtime minutes vs period. RPM RMM 30-day offline hours, else current online/offline snapshot. Servers only.",
    },
    {
      id: "rmm-coverage",
      metric: "Agent / monitoring coverage",
      targetPct: 99,
      targetLabel: "≥ 99% in-scope servers reporting",
      contractual: true,
      measurable: true,
      how: "Classified servers with a reporting RPM RMM agent (online or last-seen within 15 minutes).",
    },
    {
      id: "rmm-mttd",
      metric: "Mean time to detect (critical)",
      targetPct: null,
      targetLabel: "< 5–15 minutes",
      contractual: false,
      measurable: false,
      how: "Requires real-time RMM alerting clocks. Not scored until a helpdesk feed timestamps detection.",
    },
    {
      id: "rmm-mttr-p1",
      metric: "MTTR P1 — full server / service outage",
      targetPct: null,
      targetLabel: "Response 15–30 min · restore 2–4 hours",
      contractual: false,
      measurable: false,
      how: "Ticket clocks. Not scored until a helpdesk feed exists.",
    },
    {
      id: "rmm-mttr-p2",
      metric: "MTTR P2 — significant degradation",
      targetPct: null,
      targetLabel: "Response 30–60 min · restore 4–8 hours",
      contractual: false,
      measurable: false,
      how: "Ticket clocks. Not scored until a helpdesk feed exists.",
    },
  ],
  cove: [
    {
      id: "cove-success",
      metric: "Backup success rate",
      targetPct: 99.5,
      targetLabel: "99% – 99.9%+ of scheduled jobs",
      contractual: true,
      measurable: true,
      how: "OK jobs ÷ (OK + failed) on latest Cloud Backup collect. Warnings that still meet RPO count as OK.",
    },
    {
      id: "cove-rpo",
      metric: "RPO — standard servers / files",
      targetPct: 100,
      targetLabel: "4–24 hours (we score 24h)",
      contractual: true,
      measurable: true,
      how: "Devices whose last successful backup is within 24 hours. Stale devices miss RPO.",
    },
    {
      id: "cove-restore",
      metric: "Restore / recoverability success",
      targetPct: 95,
      targetLabel: "≥ 95–99% of test restores",
      contractual: true,
      measurable: true,
      how: "Cove recovery tests passed ÷ (passed + failed). Unknown / not-in-plan are excluded from the rate.",
    },
    {
      id: "cove-test-freq",
      metric: "Test restore frequency",
      targetPct: 100,
      targetLabel: "Monthly (critical) / quarterly (others)",
      contractual: true,
      measurable: true,
      how: "Last recovery test age. Green ≤ 31 days, amber ≤ 93 days, red if never or older.",
    },
    {
      id: "cove-rto",
      metric: "RTO — standard",
      targetPct: null,
      targetLabel: "4–12 hours or next business day",
      contractual: false,
      measurable: false,
      how: "Requires timed restore clocks. Not scored from collect.",
    },
  ],
  epp: [
    {
      id: "epp-coverage",
      metric: "Protection coverage / agent deployment",
      targetPct: 98,
      targetLabel: "≥ 98–100% of in-scope endpoints",
      contractual: true,
      measurable: true,
      how: "RPM EndPoint Protection managed ÷ (managed + unmanaged).",
    },
    {
      id: "epp-update",
      metric: "Definition / content update compliance",
      targetPct: 95,
      targetLabel: "≥ 95–99% within 24 hours",
      contractual: true,
      measurable: true,
      how: "Endpoints whose product and signatures are current, or last successful scan within 24 hours. Missing flags on a managed endpoint count as current.",
    },
    {
      id: "epp-mttd",
      metric: "MTTD (critical threats)",
      targetPct: 100,
      targetLabel: "Under 15–30 minutes",
      contractual: false,
      measurable: true,
      how: "Detection freshness: median last-scan age on managed endpoints (target 30 min). If scans are missing, P1 ticket first-response is used as the detect clock.",
    },
    {
      id: "epp-respond",
      metric: "Mean time to respond / triage (critical)",
      targetPct: 100,
      targetLabel: "15 min acknowledgment · containment 1–4 h",
      contractual: false,
      measurable: true,
      how: "Freshdesk P1 / critical first-response vs 15 business minutes. Containment uses resolve clock vs 4 business hours.",
    },
    {
      id: "epp-open",
      metric: "Open critical incidents",
      targetPct: 100,
      targetLabel: "0 open criticals",
      contractual: false,
      measurable: true,
      how: "RPM EndPoint Protection incidents currently open at critical / high. Operational, not a contractual nines target.",
    },
  ],
};

export const INDUSTRY_SLA_EXCLUSIONS: Record<IndustryPillarKey, string[]> = {
  rmm: [
    "Planned maintenance with 48–72 hours’ notice (except emergency security patches).",
    "Force majeure, client-caused issues, power or ISP failures outside RPM control.",
    "Third-party cloud platform outages.",
    "Workstations are excluded from the uptime commitment.",
    "No Cover for Devices: 0 servers or 0 workstations are not scored in SLA.",
  ],
  cove: [
    "Long-term offline devices, full disks, and application locks not remediated by the client.",
    "Extreme bandwidth constraints outside RPM control.",
    "A job that fails then succeeds inside the RPO window is still compliant.",
    "No Cover for Devices: customers with 0 backup devices are not scored in SLA.",
  ],
  epp: [
    "Detection-efficacy percentages are not contractual (threat novelty).",
    "Unmanaged devices the client has not approved for deployment.",
    "Endpoints offline longer than the update window are excluded from update compliance.",
    "No Cover for Devices: 0 endpoints are not scored in SLA.",
  ],
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
