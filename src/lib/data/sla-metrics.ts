/**
 * SLA source of truth.
 *
 * Layer A — RPM contract (SYSPRO Support & AMS Rev 5.0, Aug 2026).
 *   Ticket clocks in Business Hours. No uptime %. Targets, not guarantees.
 *
 * Layer B — Operational posture for RMM / RPM Cloud Backup / EPP / M365.
 *   Industry measures from RMM SLA Metrics Recommendations (14 Aug 2026).
 *   Shown as live posture. NOT scored as SLA until a matching ticket is in Assure.
 *
 * Golden clock rule: SLA counters start only when an amber/red item has a ticket
 * in Assure. Telemetry without a ticket is live status, not an SLA miss.
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

export const SLA_CLOCK_STARTS =
  "SLA clocks start when an amber/red alert has a ticket in Assure. Clock start = ticket opened time, not first collect blip.";

export const RPM_CONTRACT_RULES = {
  businessHours: "08:00–17:00 on a Business Day, local to the jurisdiction in Schedule 3.",
  measuredAs: "Monthly average across qualifying tickets. Restoration includes a reasonable workaround.",
  notGuarantees:
    "Targets, not guarantees (clause 7.5). No service credits, set-off, or termination right for missing a target.",
  noUptimePct: "This contract has no availability percentage.",
  scope:
    "SYSPRO Support + AMS only. Backups, infrastructure, OS, AD and cybersecurity are excluded (clauses 5.1 and 11.2).",
} as const;

export type IndustryPillarKey = "rmm" | "cove" | "epp" | "syspro" | "csp" | "tickets";

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
      "Ticket-gated. Server down / critical RMM alerts start an SLA clock only after a matching ticket exists in Assure. 99.9% uptime is posture, not a miss on its own. Workstations excluded from availability.",
    source: INDUSTRY_SLA_DOC,
  },
  cove: {
    pillar: "cove",
    label: "RPM Cloud Backup",
    metric: "Backup success vs 24h RPO",
    targetPct: 99.5,
    targetLabel: "99.5% success · 24h RPO",
    howWeMeasure:
      "Ticket-gated. Failed / stale backups start an SLA clock only after a matching ticket exists in Assure. Job success and 24h RPO are live posture. Recovery tests are posture unless ticketed.",
    source: INDUSTRY_SLA_DOC,
  },
  epp: {
    pillar: "epp",
    label: "RPM EndPoint Protection",
    metric: "Definitions current and last scan",
    targetPct: 95,
    targetLabel: "95% current · scan ≤ 24h",
    howWeMeasure:
      "Ticket-gated. Outdated signatures or scan older than 24h start an SLA clock only after a matching ticket exists in Assure. Coverage and update % are live posture.",
    source: INDUSTRY_SLA_DOC,
  },
  syspro: {
    pillar: "syspro",
    label: "SYSPRO",
    metric: "Application health",
    targetPct: 90,
    targetLabel: "90% jobs clean · FinSight in control",
    howWeMeasure:
      "Job errors and FinSight out-of-balance lines. Zero of each is 100%. Ticket clocks sit on Customer Tickets.",
    source: RPM_SLA_TITLE,
  },
  csp: {
    pillar: "csp",
    label: "Microsoft 365",
    metric: "Platform incidents (ticket-gated)",
    targetPct: 90,
    targetLabel: "90% ticket ack / restore · Microsoft platform 99.9% excluded",
    howWeMeasure:
      "RPM SLA is ticket clocks for M365 issues logged in Assure (mailbox, Teams, SharePoint, identity). Microsoft's own 99.9% service-health SLA is Microsoft's, not RPM's. Secure Score and MFA stay posture — they do not start a clock.",
    source: "Ticket-gated · Microsoft 365 platform",
  },
  tickets: {
    pillar: "tickets",
    label: "RPM Service Desk",
    metric: "Response and restore",
    targetPct: 90,
    targetLabel: "90% response · 90% restore (SAST BH)",
    howWeMeasure:
      "Freshdesk first-response and resolve vs signed P1–P4 clocks in 08:00–17:00 SAST. Open clocks are not misses.",
    source: RPM_SLA_TITLE,
  },
};

/** Full PDF line items — shown on each service SLA page. */
export const INDUSTRY_SLA_LINES: Record<IndustryPillarKey, IndustrySlaLineDef[]> = {
  rmm: [
    {
      id: "rmm-ticket",
      metric: "Ticketed server availability",
      targetPct: 90,
      targetLabel: "≥ 90% ack / restore on ticketed down events",
      contractual: true,
      measurable: true,
      how: "Clock starts when a server is amber/red AND a matching RMM ticket exists in Assure. Start = ticket opened time. Offline with no ticket is live status, not a miss. P1–P4 clocks from Freshdesk / signed contract.",
    },
    {
      id: "rmm-uptime",
      metric: "Server uptime / availability (posture)",
      targetPct: 99.9,
      targetLabel: "99.9% (standard) · posture only",
      contractual: false,
      measurable: true,
      how: "Unplanned downtime minutes vs period from RPM RMM 30-day offline hours, else current online/offline snapshot. Servers only. Does not fail SLA until a ticket is in Assure.",
    },
    {
      id: "rmm-coverage",
      metric: "Agent / monitoring coverage",
      targetPct: 99,
      targetLabel: "≥ 99% in-scope servers reporting",
      contractual: false,
      measurable: true,
      how: "Classified servers with a reporting RPM RMM agent (online or last-seen within 15 minutes).",
    },
    {
      id: "rmm-patch",
      metric: "Server patch compliance",
      targetPct: 95,
      targetLabel: "≥ 95% servers with no outstanding critical/important",
      contractual: false,
      measurable: true,
      how: "Servers with zero outstanding updates ÷ classified servers that report a patch count. Posture — ticket starts the clock.",
    },
    {
      id: "rmm-disk",
      metric: "Disk pressure",
      targetPct: 100,
      targetLabel: "0 servers at ≥85% used",
      contractual: false,
      measurable: true,
      how: "Servers with a disk at or above 85% used. Live posture only.",
    },
  ],
  cove: [
    {
      id: "cove-ticket",
      metric: "Ticketed backup / restore",
      targetPct: 90,
      targetLabel: "≥ 90% ack / restore on ticketed backup fails",
      contractual: true,
      measurable: true,
      how: "Clock starts when a backup is failed/stale (amber/red) AND a matching Cloud Backup ticket exists in Assure. Start = ticket opened time.",
    },
    {
      id: "cove-success",
      metric: "Backup success rate (posture)",
      targetPct: 99.5,
      targetLabel: "99% – 99.9%+ of scheduled jobs",
      contractual: false,
      measurable: true,
      how: "OK jobs ÷ (OK + failed) on latest Cloud Backup collect. Does not fail SLA until a ticket is in Assure.",
    },
    {
      id: "cove-rpo",
      metric: "RPO — standard servers / files (posture)",
      targetPct: 100,
      targetLabel: "4–24 hours (we score 24h)",
      contractual: false,
      measurable: true,
      how: "Devices whose last successful backup is within 24 hours. Posture — ticket starts the clock.",
    },
    {
      id: "cove-recover",
      metric: "Successful recoveries (posture)",
      targetPct: 95,
      targetLabel: "≥ 95% of completed recovery tests pass",
      contractual: false,
      measurable: true,
      how: "Passed recovery tests ÷ (passed + failed). Ticketed failed recoveries start an SLA clock.",
    },
  ],
  epp: [
    {
      id: "epp-ticket",
      metric: "Ticketed protection / scan",
      targetPct: 90,
      targetLabel: "≥ 90% ack / restore on ticketed outdated or not-scanning",
      contractual: true,
      measurable: true,
      how: "Clock starts when an endpoint is outdated or not scanning (amber/red) AND a matching EPP ticket exists in Assure. Infected devices are P1 when ticketed.",
    },
    {
      id: "epp-coverage",
      metric: "Protection coverage / agent deployment",
      targetPct: 98,
      targetLabel: "≥ 98–100% of in-scope endpoints",
      contractual: false,
      measurable: true,
      how: "RPM EndPoint Protection managed ÷ (managed + unmanaged). Posture.",
    },
    {
      id: "epp-update",
      metric: "Definitions current and last scan (posture)",
      targetPct: 95,
      targetLabel: "≥ 95% current · last scan ≤ 24 hours",
      contractual: false,
      measurable: true,
      how: "Product/signature outdated flags and last successful scan age. Does not fail SLA until a ticket is in Assure.",
    },
    {
      id: "epp-open",
      metric: "Open critical incidents",
      targetPct: 100,
      targetLabel: "0 open criticals",
      contractual: false,
      measurable: true,
      how: "RPM EndPoint Protection incidents currently open at critical / high. Operational.",
    },
  ],
  syspro: [
    {
      id: "syspro-ticket",
      metric: "Ticketed SYSPRO incidents",
      targetPct: 90,
      targetLabel: "≥ 90% ack / restore on ticketed SYSPRO alerts",
      contractual: true,
      measurable: true,
      how: "Clock starts when a SYSPRO amber/red item has a matching ticket in Assure. Job errors and FinSight OOB without a ticket are live status, not a miss.",
    },
    {
      id: "syspro-jobs",
      metric: "Job logging (posture)",
      targetPct: 100,
      targetLabel: "0 failed / error jobs on last collect",
      contractual: false,
      measurable: true,
      how: "SYSPRO job error count. Posture — ticket starts the clock.",
    },
    {
      id: "syspro-finsight",
      metric: "FinSight control (posture)",
      targetPct: 100,
      targetLabel: "0 out-of-balance recon lines",
      contractual: false,
      measurable: true,
      how: "Open FinSight OOB lines. Posture — ticket starts the clock.",
    },
    {
      id: "syspro-collect",
      metric: "Collect freshness",
      targetPct: 100,
      targetLabel: "Last collect within 24 hours",
      contractual: false,
      measurable: true,
      how: "Hours since last SYSPRO import. Green ≤ 24h, amber ≤ 48h.",
    },
  ],
  csp: [
    {
      id: "csp-ticket",
      metric: "Ticketed Microsoft 365 platform",
      targetPct: 90,
      targetLabel: "≥ 90% ack / restore on ticketed M365 issues",
      contractual: true,
      measurable: true,
      how: "Clock starts when an M365 ticket exists in Assure (mailbox, Teams, SharePoint, identity). Microsoft service-health outages are Microsoft's 99.9% SLA, excluded. Secure Score and MFA do not start a clock.",
    },
    {
      id: "csp-score",
      metric: "Secure Score",
      targetPct: null,
      targetLabel: "Posture — not a clock",
      contractual: false,
      measurable: false,
      how: "Shown from Graph collect. Does not paint Red/Amber and does not start an SLA clock.",
    },
    {
      id: "csp-mfa",
      metric: "MFA registration",
      targetPct: null,
      targetLabel: "Posture — not a clock",
      contractual: false,
      measurable: false,
      how: "Shown from Graph collect. Does not start an SLA clock.",
    },
    {
      id: "csp-seats",
      metric: "Licence assignment",
      targetPct: null,
      targetLabel: "Posture — not a clock",
      contractual: false,
      measurable: false,
      how: "Assigned seats ÷ purchased seats. Visibility only.",
    },
  ],
  tickets: [
    {
      id: "tickets-response",
      metric: "Acknowledge / first response",
      targetPct: 90,
      targetLabel: "≥ 90% within signed clock",
      contractual: true,
      measurable: true,
      how: "Freshdesk first-response vs P1–P4 acknowledge minutes in SAST business hours. Last 30 days.",
    },
    {
      id: "tickets-restore",
      metric: "Restore / resolve",
      targetPct: 90,
      targetLabel: "≥ 90% within signed restore",
      contractual: true,
      measurable: true,
      how: "Resolved tickets vs P1–P3 restore clocks. P4 restore is by agreement and is not scored.",
    },
    {
      id: "tickets-open",
      metric: "Open tickets",
      targetPct: 100,
      targetLabel: "Owned and inside clock",
      contractual: false,
      measurable: true,
      how: "Open count. 0 open = 100%. Each open ticket deducts 5 points (floor 40) — operational, not a miss on restore.",
    },
  ],
};

export const INDUSTRY_SLA_EXCLUSIONS: Record<IndustryPillarKey, string[]> = {
  rmm: [
    "SLA clock starts only when an amber/red RMM alert has a ticket in Assure.",
    "Planned maintenance with 48–72 hours’ notice (except emergency security patches).",
    "Force majeure, client-caused issues, power or ISP failures outside RPM control.",
    "Third-party cloud platform outages.",
    "Workstations are excluded from the uptime commitment.",
    "No Cover for Devices: 0 servers or 0 workstations are not scored in SLA.",
  ],
  cove: [
    "SLA clock starts only when a failed/stale backup has a ticket in Assure.",
    "Long-term offline devices, full disks, and application locks not remediated by the client.",
    "Extreme bandwidth constraints outside RPM control.",
    "A job that fails then succeeds inside the RPO window is still compliant.",
    "No Cover for Devices: customers with 0 backup devices are not scored in SLA.",
  ],
  epp: [
    "SLA clock starts only when outdated / not-scanning / infected has a ticket in Assure.",
    "Detection-efficacy percentages are not contractual (threat novelty).",
    "Unmanaged devices the client has not approved for deployment.",
    "Endpoints offline longer than the update window are excluded from update compliance.",
    "No Cover for Devices: 0 endpoints are not scored in SLA.",
  ],
  syspro: [
    "SLA clock starts only when a SYSPRO amber/red item has a ticket in Assure.",
    "Demo or deferred companies are not scored until collect is enabled.",
    "Hotfixes and SQL instance health are visibility, not this score.",
  ],
  csp: [
    "Microsoft's 99.9% Exchange / Teams / SharePoint SLA is Microsoft's, not RPM's.",
    "RPM SLA is ticket clocks for M365 issues logged in Assure.",
    "Secure Score, MFA and Global Admins stay posture — they never start a clock and never paint Red/Amber.",
    "Clock start = ticket opened time in Assure.",
  ],
  tickets: [
    "Open clocks are not scored as a miss until the clock expires.",
    "P4 restore is by agreement.",
    "Unmapped Freshdesk companies do not land on a customer.",
  ],
};

export function vsIndustryTone(
  pct: number | null | undefined,
  targetPct: number,
): "green" | "amber" | "red" | "default" {
  if (pct == null || Number.isNaN(pct)) return "default";
  if (pct >= targetPct) return "green";
  return "red";
}
