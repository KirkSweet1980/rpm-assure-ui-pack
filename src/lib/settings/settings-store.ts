import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_ALERTS,
  DEFAULT_DASHBOARD,
  DEFAULT_RAG,
  DEFAULT_REPORT_SCHEDULE,
  DEFAULT_SMTP,
  DEFAULT_SSL,
  DEFAULT_UI_LABELS,
  emptySqlConnection,
  type AlertRulesConfig,
  type AppSettingsFile,
  type DashboardConfig,
  type RagThresholdConfig,
  type ReportScheduleConfig,
  type SmtpConfig,
  type SslConfig,
  type SqlConnectionConfig,
  type UiLabelsConfig,
} from "./types";

const FILE = "rpma-settings.json";

function settingsPath(): string {
  const cwd = process.cwd();
  const dir = path.join(cwd, "data");
  return path.join(dir, FILE);
}

function defaultFile(): AppSettingsFile {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    sqlConnections: [],
    smtp: { ...DEFAULT_SMTP },
    ssl: { ...DEFAULT_SSL },
    rag: { ...DEFAULT_RAG },
    alerts: { ...DEFAULT_ALERTS },
    dashboard: { ...DEFAULT_DASHBOARD },
    labels: { ...DEFAULT_UI_LABELS },
    cronSecret: "",
    lastWeeklyReportAt: null,
    reportSchedule: { ...DEFAULT_REPORT_SCHEDULE },
  };
}

function clampRag(r: Partial<RagThresholdConfig> | undefined): RagThresholdConfig {
  const base = { ...DEFAULT_RAG, ...(r ?? {}) };
  let red = Math.max(1, Math.floor(Number(base.jobErrorsRedAt) || 10));
  let amber = Math.max(0, Math.floor(Number(base.jobErrorsAmberFrom) || 1));
  if (amber > red) amber = Math.max(0, red - 1);
  return {
    jobErrorsRedAt: red,
    jobErrorsAmberFrom: amber,
    dtrVarianceIsAmber: base.dtrVarianceIsAmber !== false,
    dtrVarianceRedAt: Math.max(0, Math.floor(Number(base.dtrVarianceRedAt) || 0)),
    noOperatorsIsAmber: base.noOperatorsIsAmber !== false,
    collectStaleHours: Math.max(1, Math.floor(Number(base.collectStaleHours) || 48)),
  };
}

function clampAlerts(a: Partial<AlertRulesConfig> | undefined): AlertRulesConfig {
  const base = { ...DEFAULT_ALERTS, ...(a ?? {}) };
  return {
    enabled: Boolean(base.enabled),
    emailTo: String(base.emailTo ?? ""),
    alertOnRed: base.alertOnRed !== false,
    jobErrorMin: Math.max(0, Math.floor(Number(base.jobErrorMin) || 0)),
    collectStaleHours: Math.max(0, Math.floor(Number(base.collectStaleHours) || 0)),
    minIntervalMinutes: Math.max(5, Math.floor(Number(base.minIntervalMinutes) || 60)),
    lastFiredAt: base.lastFiredAt ?? null,
  };
}

function bool(v: unknown, d: boolean): boolean {
  if (typeof v === "boolean") return v;
  return d;
}

function clampLabels(d: Partial<UiLabelsConfig> | undefined): UiLabelsConfig {
  const base = { ...DEFAULT_UI_LABELS, ...(d ?? {}) };
  const out = { ...DEFAULT_UI_LABELS };
  (Object.keys(DEFAULT_UI_LABELS) as (keyof UiLabelsConfig)[]).forEach((k) => {
    const v = String((base as any)[k] ?? DEFAULT_UI_LABELS[k] ?? "").trim();
    out[k] = (v || DEFAULT_UI_LABELS[k]).slice(0, 80);
  });
  return out;
}

function clampDashboard(d: Partial<DashboardConfig> | undefined): DashboardConfig {
  const base = { ...DEFAULT_DASHBOARD, ...(d ?? {}) };
  const landing =
    base.customerLanding === "syspro" || base.customerLanding === "ams"
      ? base.customerLanding
      : "exec";
  return {
    estateTitle: String(
      (base as any).estateTitle || DEFAULT_DASHBOARD.estateTitle || "Exco Insight",
    ).slice(0, 80),
    estateSubtitle: (() => {
      let sub = String(
        base.estateSubtitle ?? DEFAULT_DASHBOARD.estateSubtitle ?? "",
      ).slice(0, 240);
      if (/Managed customer health/i.test(sub)) sub = "";
      return sub;
    })(),
    showMultitenantHint: bool(
      base.showMultitenantHint,
      DEFAULT_DASHBOARD.showMultitenantHint,
    ),
    collectFreshHours: Math.max(
      1,
      Math.floor(Number(base.collectFreshHours) || 24),
    ),
    licenseExpiringDays: Math.max(
      1,
      Math.floor(Number(base.licenseExpiringDays) || 90),
    ),
    kpiCustomers: bool(base.kpiCustomers, true),
    kpiAttention: bool(base.kpiAttention, true),
    kpiAssurance: bool(base.kpiAssurance, true),
    kpiRefresh: bool(base.kpiRefresh, true),
    kpiRisks: bool(base.kpiRisks, true),
    kpiLicenses: bool(base.kpiLicenses, true),
    kpiRmm: bool((base as any).kpiRmm, true),
    kpiHotfixes: bool((base as any).kpiHotfixes, true),
    panelPortfolioTable: bool((base as any).panelPortfolioTable, true),
    panelRmmHealth: bool((base as any).panelRmmHealth, true),
    panelDataRefresh: bool(base.panelDataRefresh, true),
    panelAttention: bool(base.panelAttention, true),
    panelAssuranceChart: bool(base.panelAssuranceChart, true),
    panelHealthChart: bool(base.panelHealthChart, true),
    panelSla: bool(base.panelSla, true),
    panelLicenses: bool(base.panelLicenses, true),
    panelRisks: bool(base.panelRisks, true),
    panelBackups: bool(base.panelBackups, true),
    customerLanding: landing,
    customerShowCharts: bool(base.customerShowCharts, true),
    customerShowDtr: bool(base.customerShowDtr, true),
    customerShowLists: bool(base.customerShowLists, true),
    excoAutoRefreshSec: (() => {
      const n = Math.floor(Number((base as any).excoAutoRefreshSec));
      if (!Number.isFinite(n) || n <= 0) return 0;
      return Math.min(3600, Math.max(30, n));
    })(),
  };
}

function clampSchedule(s: Partial<ReportScheduleConfig> | undefined): ReportScheduleConfig {
  const base = { ...DEFAULT_REPORT_SCHEDULE, ...(s ?? {}) };
  return {
    enabled: base.enabled !== false,
    to: String(base.to ?? ""),
    dayEnd: base.dayEnd !== false,
    weeklyDigest: base.weeklyDigest !== false,
    monthlyAms: base.monthlyAms !== false,
    rmmWeekly: base.rmmWeekly !== false,
    coveWeekly: base.coveWeekly !== false,
    eppWeekly: base.eppWeekly !== false,
    fullPackWeekly: (base as ReportScheduleConfig).fullPackWeekly !== false,
    patchPackWeekly: (base as ReportScheduleConfig).patchPackWeekly !== false,
    lastRunAt: base.lastRunAt ?? null,
    lastSlot: base.lastSlot ?? null,
    lastResult: base.lastResult ?? null,
  };
}

export function readSettingsFile(): AppSettingsFile {
  try {
    const p = settingsPath();
    if (!fs.existsSync(p)) return defaultFile();
    const raw = fs.readFileSync(p, "utf8");
    const j = JSON.parse(raw) as AppSettingsFile;
    if (!j.version) return defaultFile();
    return {
      version: 1,
      updatedAt: j.updatedAt ?? new Date().toISOString(),
      sqlConnections: Array.isArray(j.sqlConnections) ? j.sqlConnections : [],
      smtp: { ...DEFAULT_SMTP, ...(j.smtp ?? {}) },
      ssl: { ...DEFAULT_SSL, ...(j.ssl ?? {}) },
      rag: clampRag(j.rag),
      alerts: clampAlerts(j.alerts),
      dashboard: clampDashboard(j.dashboard),
      labels: clampLabels(j.labels),
      cronSecret: typeof j.cronSecret === "string" ? j.cronSecret : "",
      lastWeeklyReportAt: j.lastWeeklyReportAt ?? null,
      reportSchedule: clampSchedule(j.reportSchedule),
    };
  } catch {
    return defaultFile();
  }
}

export function writeSettingsFile(data: AppSettingsFile): void {
  const dir = path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  const prev = (() => {
    try {
      return readSettingsFile();
    } catch {
      return defaultFile();
    }
  })();
  const out: AppSettingsFile = {
    ...data,
    version: 1,
    updatedAt: new Date().toISOString(),
    rag: clampRag(data.rag ?? prev.rag),
    alerts: clampAlerts(data.alerts ?? prev.alerts),
    dashboard: clampDashboard(data.dashboard ?? prev.dashboard),
    labels: clampLabels(data.labels ?? prev.labels),
    ssl: { ...DEFAULT_SSL, ...(data.ssl ?? prev.ssl ?? {}) },
    cronSecret:
      typeof data.cronSecret === "string"
        ? data.cronSecret
        : (prev.cronSecret ?? ""),
    lastWeeklyReportAt:
      data.lastWeeklyReportAt !== undefined
        ? data.lastWeeklyReportAt
        : (prev.lastWeeklyReportAt ?? null),
    reportSchedule: clampSchedule(data.reportSchedule ?? prev.reportSchedule),
  };
  fs.writeFileSync(settingsPath(), JSON.stringify(out, null, 2), "utf8");
}

export function getPrimarySqlFromFile(): SqlConnectionConfig | null {
  const f = readSettingsFile();
  const primary =
    f.sqlConnections.find((c) => c.isPrimary) ?? f.sqlConnections[0];
  return primary ?? null;
}

export function getRagConfig(): RagThresholdConfig {
  return clampRag(readSettingsFile().rag);
}

export function getAlertConfig(): AlertRulesConfig {
  return clampAlerts(readSettingsFile().alerts);
}

export function getDashboardConfig(): DashboardConfig {
  return clampDashboard(readSettingsFile().dashboard);
}

export function getUiLabels(): UiLabelsConfig {
  return clampLabels(readSettingsFile().labels);
}

export function getSmtpConfig(): SmtpConfig {
  return { ...DEFAULT_SMTP, ...(readSettingsFile().smtp ?? {}) };
}

export function getReportSchedule(): ReportScheduleConfig {
  return clampSchedule(readSettingsFile().reportSchedule);
}

export function ensureCronSecret(): string {
  const f = readSettingsFile();
  if (f.cronSecret && f.cronSecret.trim()) return f.cronSecret.trim();
  const secret = crypto.randomUUID().replace(/-/g, "");
  writeSettingsFile({ ...f, cronSecret: secret });
  return secret;
}

export function maskPassword(p: string | undefined | null): string {
  if (!p) return "";
  return "********";
}

export function applyPasswordKeep(
  incoming: string | undefined | null,
  existing: string,
): string {
  const v = (incoming ?? "").trim();
  if (!v || v === "********" || v === "••••••••") return existing ?? "";
  return v;
}

/** Write primary SQL settings into .env.local so Vite restarts pick them up */
export function syncPrimarySqlToEnvLocal(c: {
  server: string;
  port: number;
  database: string;
  user: string;
  password: string;
  trustServerCertificate: boolean;
  encrypt: boolean;
  dataMode: string;
}): void {
  try {
    const envPath = path.join(process.cwd(), ".env.local");
    let raw = "";
    if (fs.existsSync(envPath)) raw = fs.readFileSync(envPath, "utf8");
    const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const map = new Map<string, string>();
    for (const line of lines) {
      if (line.trim().startsWith("#")) continue;
      const i = line.indexOf("=");
      if (i < 1) continue;
      map.set(line.slice(0, i).trim(), line.slice(i + 1));
    }
    const host =
      c.port && c.port !== 1433 ? `${c.server},${c.port}` : c.server;
    map.set("RPM_ASSURE_SQL_SERVER", host);
    map.set("RPM_ASSURE_SQL_DATABASE", c.database);
    map.set("RPM_ASSURE_SQL_USER", c.user);
    if (c.password) map.set("RPM_ASSURE_SQL_PASSWORD", c.password);
    map.set(
      "RPM_ASSURE_SQL_TRUST_CERT",
      c.trustServerCertificate ? "true" : "false",
    );
    map.set("RPM_ASSURE_SQL_ENCRYPT", c.encrypt ? "true" : "false");
    map.set("RPM_ASSURE_DATA_MODE", c.dataMode || "auto");
    const out = Array.from(map.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");
    fs.writeFileSync(envPath, out + "\n", "utf8");
  } catch {
    /* non-fatal */
  }
}

export { emptySqlConnection };
