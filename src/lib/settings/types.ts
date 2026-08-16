export type SqlConnectionConfig = {
  id: string;
  name: string;
  /** Use as app primary data connection */
  isPrimary: boolean;
  server: string;
  port: number;
  database: string;
  user: string;
  /** Empty on load = leave unchanged on save. Never store mask in this field client-side. */
  password: string;
  /** Server-only hint for UI */
  passwordConfigured?: boolean;
  trustServerCertificate: boolean;
  encrypt: boolean;
  dataMode: "auto" | "live" | "demo";
};

export type SmtpConfig = {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  fromEmail: string;
  fromName: string;
  replyTo: string;
  /** Semicolon/comma-separated weekly report recipients */
  reportTo: string;
};

export type ReportScheduleSlot = "daily" | "weekly" | "monthly";

export type ReportScheduleConfig = {
  enabled: boolean;
  /** Blank = SMTP reportTo */
  to: string;
  dayEnd: boolean;
  weeklyDigest: boolean;
  monthlyAms: boolean;
  rmmWeekly: boolean;
  coveWeekly: boolean;
  eppWeekly: boolean;
  /** Friday: full assurance pack (includes patch compliance) for every active customer */
  fullPackWeekly: boolean;
  /** Friday: dedicated patch compliance pack for RMM-cover customers */
  patchPackWeekly: boolean;
  lastRunAt?: string | null;
  lastSlot?: string | null;
  lastResult?: string | null;
};

export const DEFAULT_REPORT_SCHEDULE: ReportScheduleConfig = {
  enabled: true,
  to: "",
  dayEnd: true,
  weeklyDigest: true,
  monthlyAms: true,
  rmmWeekly: true,
  coveWeekly: true,
  eppWeekly: true,
  fullPackWeekly: true,
  patchPackWeekly: true,
  lastRunAt: null,
  lastSlot: null,
  lastResult: null,
};

/**
 * HTTPS / reverse-proxy settings for the app host.
 * Certificates are stored as files (never returned to the browser after upload).
 */
export type SslConfig = {
  /** disabled | letsencrypt (Caddy auto) | custom (own PEM cert + key) */
  mode: "disabled" | "letsencrypt" | "custom";
  /** Public hostname, e.g. assure.rpmresources.co.za */
  hostname: string;
  /** Upstream app bind host (usually 127.0.0.1) */
  appHost: string;
  /** Upstream app port (default 8081) */
  appPort: number;
  /** Optional email for Let's Encrypt expiry notices */
  letsEncryptEmail: string;
  /** Send HSTS header when HTTPS is on */
  hsts: boolean;
  /** When saving, also set BETTER_AUTH_URL / VITE_APP_URL to https://hostname */
  patchAuthUrls: boolean;
  /** Last time Caddyfile was written from this UI (ISO) */
  lastAppliedAt?: string | null;
  /** Original filename hints (metadata only) */
  certFileName?: string | null;
  keyFileName?: string | null;
};

/** Portfolio health RAG — stored in settings, no code deploy to retune */
export type RagThresholdConfig = {
  /** Job errors at or above → Red (default 10) */
  jobErrorsRedAt: number;
  /** Job errors from this up to red-1 → Amber (default 1) */
  jobErrorsAmberFrom: number;
  /** FinSight out-of-balance lines > 0 → Amber when jobs clean (default true) */
  dtrVarianceIsAmber: boolean;
  /** Out of Balance lines at or above → force Red even if jobs below red (default 0 = off) */
  dtrVarianceRedAt: number;
  /** No operator snapshot → Amber (default true) */
  noOperatorsIsAmber: boolean;
  /** Collect older than this many hours adds stale note (default 48) */
  collectStaleHours: number;
};

/** Email alert rules — evaluated on demand or from Collect inventory page */
export type AlertRulesConfig = {
  enabled: boolean;
  /** Recipients; blank = SMTP reportTo / fromEmail */
  emailTo: string;
  /** Fire when any active customer is Red */
  alertOnRed: boolean;
  /** Min job errors to fire (0 = off) */
  jobErrorMin: number;
  /** Collect older than hours to fire (0 = off) */
  collectStaleHours: number;
  minIntervalMinutes: number;
  lastFiredAt?: string | null;
};

/**
 * Configurable Exco Insight + customer workspace dashboard layout.
 * Stored in rpma-settings.json — no code deploy to retune.
 */
export type DashboardConfig = {
  /** Top chrome title (default Exco Insight) */
  estateTitle: string;
  /** Page subtitle under Exco Insight */
  estateSubtitle: string;
  /** Show multitenant pattern help banner */
  showMultitenantHint: boolean;
  /** Hours within which collect is labelled Fresh (display only) */
  collectFreshHours: number;
  /** License expiry window for KPI expiring (days) */
  licenseExpiringDays: number;

  // KPI strip cards
  kpiCustomers: boolean;
  kpiAttention: boolean;
  kpiAssurance: boolean;
  kpiRefresh: boolean;
  kpiRisks: boolean;
  kpiLicenses: boolean;
  kpiRmm: boolean;
  kpiHotfixes: boolean;

  // Estate panels
  panelPortfolioTable: boolean;
  panelRmmHealth: boolean;
  panelDataRefresh: boolean;
  panelAttention: boolean;
  panelAssuranceChart: boolean;
  panelHealthChart: boolean;
  panelSla: boolean;
  panelLicenses: boolean;
  panelRisks: boolean;
  panelBackups: boolean;

  // Customer workspace defaults
  /** Where customer switcher lands: executive brief, SYSPRO hub, or RPM Assure hub */
  customerLanding: "exec" | "syspro" | "ams";
  /** Show charts on Customer Ecosystem */
  customerShowCharts: boolean;
  /** Show FinSight module strip when Out of Balance exists */
  customerShowDtr: boolean;
  /** Show compact priorities / risks lists */
  customerShowLists: boolean;
  /**
   * Exco Insight auto-refresh interval in seconds.
   * 0 = off. Default 120 (2 min). Clamped 0 or 30–3600.
   */
  excoAutoRefreshSec: number;
};


/**
 * Configurable display names for pillars, packs, and chrome.
 * Stored in rpma-settings.json — change without a code deploy.
 */
export type UiLabelsConfig = {
  /** Product short name in chrome */
  productName: string;
  /** Cover strip heading */
  servicesOnCover: string;
  /** Customer landing / ecosystem pillar */
  ecosystem: string;
  ecosystemShort: string;
  /** Pillars (long = tabs, short = compact) */
  syspro: string;
  sysproShort: string;
  rmm: string;
  rmmShort: string;
  cove: string;
  coveShort: string;
  epp: string;
  eppShort: string;
  csp: string;
  cspShort: string;
  /** Service pack (was AMS) */
  assurePack: string;
  assurePackShort: string;
  /** Exco Insight default title (dashboard.estateTitle can override) */
  excoTitle: string;
  /** Cover "No Cover" chip text */
  noCover: string;
  coverOn: string;
};

export const DEFAULT_UI_LABELS: UiLabelsConfig = {
  productName: "RPM Assure",
  servicesOnCover: "RPM Services",
  ecosystem: "Customer Eco-System",
  ecosystemShort: "Eco-System",
  syspro: "SYSPRO EcoSystem",
  sysproShort: "SYSPRO",
  rmm: "RPM RMM",
  rmmShort: "RMM",
  cove: "RPM Cloud Backup",
  coveShort: "Backup",
  epp: "Endpoint Security",
  eppShort: "EPP",
  csp: "Microsoft CSP",
  cspShort: "M365",
  assurePack: "Customer Assurance",
  assurePackShort: "Assurance",
  excoTitle: "Customer Eco-System",
  noCover: "No Cover",
  coverOn: "Covered",
};

/** Form meta for Settings → Labels (order = display order) */
export const UI_LABEL_FIELDS: {
  key: keyof UiLabelsConfig;
  label: string;
  help: string;
  group: string;
}[] = [
  { key: "productName", label: "Product Name", help: "Shown in About and browser chrome.", group: "Brand" },
  { key: "excoTitle", label: "Main Page Title", help: "Default heading on Customer Eco-System.", group: "Brand" },
  { key: "servicesOnCover", label: "Services Heading", help: "Heading above customer service modules.", group: "Brand" },
  { key: "noCover", label: "No Cover Text", help: "Status when a service has no mapped data.", group: "Brand" },
  { key: "coverOn", label: "Cover Text", help: "Status when a service is in scope.", group: "Brand" },
  { key: "ecosystem", label: "Customer Eco-System", help: "Customer landing page and first service.", group: "Customer Services" },
  { key: "ecosystemShort", label: "Customer Eco-System (Short)", help: "Compact nav on narrow screens.", group: "Customer Services" },
  { key: "syspro", label: "SYSPRO EcoSystem", help: "SYSPRO service name in the customer rail.", group: "Customer Services" },
  { key: "sysproShort", label: "SYSPRO (Short)", help: "Compact service label.", group: "Customer Services" },
  { key: "rmm", label: "RPM RMM", help: "Remote management service name.", group: "Customer Services" },
  { key: "rmmShort", label: "RPM RMM (Short)", help: "Compact service label.", group: "Customer Services" },
  { key: "cove", label: "RPM Cloud Backup", help: "Cloud backup service name.", group: "Customer Services" },
  { key: "coveShort", label: "Cloud Backup (Short)", help: "Compact service label.", group: "Customer Services" },
  { key: "epp", label: "Endpoint Security", help: "Endpoint protection service name.", group: "Customer Services" },
  { key: "eppShort", label: "Endpoint Security (Short)", help: "Compact service label.", group: "Customer Services" },
  { key: "csp", label: "Microsoft CSP", help: "Microsoft 365 / CSP service name.", group: "Customer Services" },
  { key: "cspShort", label: "Microsoft CSP (Short)", help: "Compact service label.", group: "Customer Services" },
  { key: "assurePack", label: "Customer Assurance", help: "Incidents, SLA, and risks pack.", group: "Customer Services" },
  { key: "assurePackShort", label: "Customer Assurance (Short)", help: "Compact service label.", group: "Customer Services" },
];

export type AppSettingsFile = {
  version: 1;
  updatedAt: string;
  sqlConnections: SqlConnectionConfig[];
  smtp: SmtpConfig;
  ssl?: SslConfig;
  rag?: RagThresholdConfig;
  alerts?: AlertRulesConfig;
  dashboard?: DashboardConfig;
  /** Display names for modules / cover strip */
  labels?: UiLabelsConfig;
  /**
   * Shared secret for /api/cron/weekly-report (Task Scheduler).
   * Prefer env RPM_ASSURE_CRON_SECRET in production.
   */
  cronSecret?: string;
  lastWeeklyReportAt?: string | null;
  reportSchedule?: ReportScheduleConfig;
};

export const DEFAULT_SMTP: SmtpConfig = {
  enabled: false,
  host: "",
  port: 587,
  secure: false,
  user: "",
  password: "",
  fromEmail: "",
  fromName: "RPM Assure",
  replyTo: "",
  reportTo: "",
};

export const DEFAULT_SSL: SslConfig = {
  mode: "letsencrypt",
  hostname: "assure.rpmresources.co.za",
  appHost: "127.0.0.1",
  appPort: 8081,
  letsEncryptEmail: "",
  hsts: true,
  patchAuthUrls: true,
  lastAppliedAt: null,
  certFileName: null,
  keyFileName: null,
};

export const DEFAULT_RAG: RagThresholdConfig = {
  jobErrorsRedAt: 10,
  jobErrorsAmberFrom: 1,
  dtrVarianceIsAmber: true,
  dtrVarianceRedAt: 0,
  noOperatorsIsAmber: true,
  collectStaleHours: 48,
};

export const DEFAULT_ALERTS: AlertRulesConfig = {
  enabled: false,
  emailTo: "",
  alertOnRed: true,
  jobErrorMin: 0,
  collectStaleHours: 0,
  minIntervalMinutes: 60,
  lastFiredAt: null,
};

export const DEFAULT_DASHBOARD: DashboardConfig = {
  estateTitle: "Exco Insight",
  estateSubtitle: "",
  showMultitenantHint: false,
  collectFreshHours: 24,
  licenseExpiringDays: 90,
  kpiCustomers: true,
  kpiAttention: true,
  kpiAssurance: true,
  kpiRefresh: true,
  kpiRisks: true,
  kpiLicenses: true,
  kpiRmm: true,
  kpiHotfixes: true,
  panelPortfolioTable: true,
  panelRmmHealth: true,
  panelDataRefresh: true,
  panelAttention: true,
  panelAssuranceChart: true,
  panelHealthChart: true,
  panelSla: true,
  panelLicenses: true,
  panelRisks: true,
  panelBackups: true,
  customerLanding: "exec",
  customerShowCharts: true,
  customerShowDtr: true,
  customerShowLists: true,
  excoAutoRefreshSec: 120,
};

/** Named layout presets for Settings → Dashboard */
export const DASHBOARD_PRESETS: Record<
  string,
  { label: string; help: string; patch: Partial<DashboardConfig> }
> = {
  full: {
    label: "Full Operations",
    help: "All KPI tiles and estate panes.",
    patch: { ...DEFAULT_DASHBOARD },
  },
  exco: {
    label: "Executive Board",
    help: "Assurance, attention, RMM, and portfolio. Fewer technical charts.",
    patch: {
      estateTitle: "Exco Insight",
      estateSubtitle: "Board view — health, attention, and RMM posture.",
      kpiCustomers: true,
      kpiAttention: true,
      kpiAssurance: true,
      kpiRefresh: false,
      kpiRisks: true,
      kpiLicenses: true,
      kpiRmm: true,
      kpiHotfixes: false,
      panelPortfolioTable: true,
      panelRmmHealth: true,
      panelDataRefresh: false,
      panelAttention: true,
      panelAssuranceChart: true,
      panelHealthChart: false,
      panelSla: false,
      panelLicenses: true,
      panelRisks: true,
      panelBackups: false,
      showMultitenantHint: false,
    },
  },
  rmm: {
    label: "RMM Focus",
    help: "Pulseway health first, with portfolio and attention.",
    patch: {
      estateTitle: "Exco Insight",
      estateSubtitle: "RMM estate — devices, offline agents, critical alerts.",
      kpiCustomers: true,
      kpiAttention: true,
      kpiAssurance: true,
      kpiRefresh: true,
      kpiRisks: false,
      kpiLicenses: false,
      kpiRmm: true,
      kpiHotfixes: false,
      panelPortfolioTable: true,
      panelRmmHealth: true,
      panelDataRefresh: true,
      panelAttention: true,
      panelAssuranceChart: false,
      panelHealthChart: true,
      panelSla: false,
      panelLicenses: false,
      panelRisks: false,
      panelBackups: false,
    },
  },
  syspro: {
    label: "SYSPRO / Assurance",
    help: "Jobs, FinSight, licenses, and backups. Hides RMM panes.",
    patch: {
      estateTitle: "Exco Insight",
      estateSubtitle: "SYSPRO / RPM Assure — operators, jobs, licenses, and backups.",
      kpiCustomers: true,
      kpiAttention: true,
      kpiAssurance: true,
      kpiRefresh: true,
      kpiRisks: true,
      kpiLicenses: true,
      kpiRmm: false,
      kpiHotfixes: true,
      panelPortfolioTable: true,
      panelRmmHealth: false,
      panelDataRefresh: true,
      panelAttention: true,
      panelAssuranceChart: true,
      panelHealthChart: true,
      panelSla: true,
      panelLicenses: true,
      panelRisks: true,
      panelBackups: true,
    },
  },
};

export function emptySqlConnection(
  partial?: Partial<SqlConnectionConfig>,
): SqlConnectionConfig {
  return {
    id: partial?.id ?? "",
    name: partial?.name ?? "Primary",
    isPrimary: partial?.isPrimary ?? true,
    server: partial?.server ?? "",
    port: partial?.port ?? 14333,
    database: partial?.database ?? "RPMAssure_App",
    user: partial?.user ?? "",
    password: partial?.password ?? "",
    passwordConfigured: partial?.passwordConfigured,
    trustServerCertificate: partial?.trustServerCertificate ?? true,
    encrypt: partial?.encrypt ?? false,
    dataMode: partial?.dataMode ?? "auto",
  };
}
