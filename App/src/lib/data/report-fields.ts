/**
 * Custom report field catalog — groups & fields available for pack building.
 * Values are resolved server-side from CustomerDetailPayload / PortfolioPayload.
 */

export type ReportFieldGroupId =
  | "estate"
  | "syspro"
  | "finsight"
  | "rmm"
  | "cove"
  | "epp"
  | "csp"
  | "assurance";

export type ReportFieldDef = {
  id: string;
  label: string;
  blurb: string;
  group: ReportFieldGroupId;
  /** Default on for new custom packs */
  defaultOn?: boolean;
};

export type ReportFieldGroup = {
  id: ReportFieldGroupId;
  label: string;
  blurb: string;
};

export const REPORT_FIELD_GROUPS: ReportFieldGroup[] = [
  {
    id: "estate",
    label: "Customer health",
    blurb: "RAG, collect freshness, cover strip",
  },
  {
    id: "syspro",
    label: "SYSPRO Deployment",
    blurb: "Jobs, operators, licence, hotfixes, SQL backups",
  },
  {
    id: "finsight",
    label: "FinSight",
    blurb: "Control matrix and out-of-balance exceptions",
  },
  {
    id: "rmm",
    label: "RPM Remote Management",
    blurb: "Servers, workstations, patches, alerts, offline",
  },
  {
    id: "cove",
    label: "RPM Cloud Backup",
    blurb: "Backup status, recovery testing, retention",
  },
  {
    id: "epp",
    label: "RPM End Point Protection",
    blurb: "Endpoints, managed status, license",
  },
  {
    id: "csp",
    label: "Microsoft 365 Tenant",
    blurb: "Seats, Secure Score, MFA (when collected)",
  },
  {
    id: "assurance",
    label: "RPM Assure ops",
    blurb: "Risks, priorities, incidents, SLA",
  },
];

export const REPORT_FIELDS: ReportFieldDef[] = [
  // Estate
  {
    id: "health_rag",
    label: "Health RAG + summary",
    blurb: "Overall health colour and one-line summary",
    group: "estate",
    defaultOn: true,
  },
  {
    id: "collect_freshness",
    label: "Collect freshness",
    blurb: "Last import time and age",
    group: "estate",
    defaultOn: true,
  },
  {
    id: "cover_strip",
    label: "Module cover",
    blurb: "Which pillars are on cover for this customer",
    group: "estate",
    defaultOn: true,
  },
  {
    id: "assurance_score",
    label: "Operational assurance score",
    blurb: "Score % and short narrative",
    group: "estate",
    defaultOn: true,
  },

  // SYSPRO
  {
    id: "syspro_jobs",
    label: "Job errors",
    blurb: "Error count and top programs",
    group: "syspro",
    defaultOn: true,
  },
  {
    id: "syspro_operators",
    label: "Operators / active users",
    blurb: "Active vs total operators",
    group: "syspro",
    defaultOn: true,
  },
  {
    id: "syspro_license",
    label: "Licence & version",
    blurb: "Product, version, users, expiry",
    group: "syspro",
    defaultOn: true,
  },
  {
    id: "syspro_hotfixes",
    label: "Hotfixes installed",
    blurb: "Recent installed KBs",
    group: "syspro",
  },
  {
    id: "syspro_hotfix_gap",
    label: "Hotfix gap (mandatory)",
    blurb: "Missing mandatory hotfixes when tracked",
    group: "syspro",
  },
  {
    id: "syspro_sql_backups",
    label: "SQL script backup status",
    blurb: "Last full backup per database",
    group: "syspro",
    defaultOn: true,
  },

  // FinSight
  {
    id: "finsight_matrix",
    label: "Control matrix (L1)",
    blurb: "Sub-ledger vs GL by module",
    group: "finsight",
    defaultOn: true,
  },
  {
    id: "finsight_exceptions",
    label: "Exception register",
    blurb: "Out-of-balance modules only",
    group: "finsight",
    defaultOn: true,
  },

  // RMM
  {
    id: "rmm_fleet",
    label: "Fleet overview",
    blurb: "Devices, online/offline, servers vs workstations",
    group: "rmm",
    defaultOn: true,
  },
  {
    id: "rmm_alerts",
    label: "Server alerts",
    blurb: "Critical / elevated notification pressure",
    group: "rmm",
    defaultOn: true,
  },
  {
    id: "rmm_patches",
    label: "Outstanding patches",
    blurb: "Missing updates — servers and workstations",
    group: "rmm",
    defaultOn: true,
  },
  {
    id: "rmm_patch_table",
    label: "Patch backlog table",
    blurb: "Per-device outstanding list (top offenders)",
    group: "rmm",
    defaultOn: true,
  },
  {
    id: "rmm_disks",
    label: "Disk capacity",
    blurb: "Fleet disk used / free / high volumes",
    group: "rmm",
  },
  {
    id: "rmm_offline",
    label: "Offline devices",
    blurb: "Currently offline agents",
    group: "rmm",
    defaultOn: true,
  },
  {
    id: "rmm_reboot",
    label: "Reboot age",
    blurb: "Max / avg days since reboot",
    group: "rmm",
  },

  // Cove
  {
    id: "cove_summary",
    label: "Backup summary",
    blurb: "OK / failed / stale device counts",
    group: "cove",
    defaultOn: true,
  },
  {
    id: "cove_recovery",
    label: "Recovery testing",
    blurb: "Plan counts and last test posture",
    group: "cove",
    defaultOn: true,
  },
  {
    id: "cove_devices",
    label: "Devices on cloud backup",
    blurb: "Per-device last success / status (sample)",
    group: "cove",
  },

  // EPP
  {
    id: "epp_summary",
    label: "EPP endpoints",
    blurb: "Managed endpoints and license slots",
    group: "epp",
    defaultOn: true,
  },
  {
    id: "epp_incidents",
    label: "Incidents / quarantine note",
    blurb: "Counts when collect provides them",
    group: "epp",
  },

  // CSP
  {
    id: "csp_summary",
    label: "M365 tenant snapshot",
    blurb: "Users, seats, Secure Score, MFA %",
    group: "csp",
    defaultOn: true,
  },

  // Assurance
  {
    id: "ams_risks",
    label: "Open risks",
    blurb: "Tracked risks for the customer",
    group: "assurance",
    defaultOn: true,
  },
  {
    id: "ams_priorities",
    label: "Priorities",
    blurb: "Open priorities / actions",
    group: "assurance",
    defaultOn: true,
  },
  {
    id: "ams_incidents",
    label: "Incidents & SLA",
    blurb: "Incident counts and availability SLA",
    group: "assurance",
  },
];

export function defaultCustomFieldIds(): string[] {
  return REPORT_FIELDS.filter((f) => f.defaultOn).map((f) => f.id);
}

export function fieldsByGroup(group: ReportFieldGroupId): ReportFieldDef[] {
  return REPORT_FIELDS.filter((f) => f.group === group);
}

export function resolveFieldIds(raw: string[] | string | null | undefined): string[] {
  let ids: string[] = [];
  if (Array.isArray(raw)) ids = raw.map(String);
  else if (typeof raw === "string" && raw.trim()) {
    ids = raw.split(/[,;|]/).map((s) => s.trim()).filter(Boolean);
  }
  if (!ids.length) return defaultCustomFieldIds();
  const known = new Set(REPORT_FIELDS.map((f) => f.id));
  const out = ids.filter((id) => known.has(id));
  return out.length ? out : defaultCustomFieldIds();
}
