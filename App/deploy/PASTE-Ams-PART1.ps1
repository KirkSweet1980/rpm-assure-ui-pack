# PASTE THIS ENTIRE BLOCK into Administrator PowerShell on the APP server.
# Do not paste line-by-line. Select from $ErrorActionPreference to === Done ===.
$ErrorActionPreference = 'Stop'
$App = 'C:\RPM-Assure\App'
$Utf8 = New-Object System.Text.UTF8Encoding $false
function W($c,$m){ Write-Host $m -ForegroundColor $c }
function Write-Utf8([string]$Path,[string]$Text){
  $dir = Split-Path -Parent $Path
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  [IO.File]::WriteAllText($Path, $Text, $Utf8)
}
function Patch([string]$Path,[string]$Find,[string]$Replace,[string]$Tag){
  if (-not (Test-Path -LiteralPath $Path)) { W Yellow "SKIP missing $Path"; return }
  $t = [IO.File]::ReadAllText($Path)
  if ($t.Contains($Tag)) { W DarkGray "already $Tag"; return }
  if (-not $t.Contains($Find)) { W Yellow "WARN marker not found for $Tag in $Path"; return }
  $t2 = $t.Replace($Find, $Replace)
  [IO.File]::WriteAllText($Path, $t2, $Utf8)
  W Green "patched $Tag"
}

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) { throw 'Run as Administrator — paste the WHOLE block once.' }
if (-not (Test-Path $App)) { throw "Missing $App" }

W Cyan '=== Write new files ==='
Write-Utf8 (Join-Path $App 'src\lib\data\sla-metrics.ts') @'
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

'@
Write-Utf8 (Join-Path $App 'src\lib\data\day-end.ts') @'
/**
 * AMS clause 4.5 — automated SYSPRO day-end (Mon–Fri, Business Days).
 * Status is derived from job logging + task groups. Honest when not detected.
 */

export type DayEndStatus =
  | "ran"
  | "failed"
  | "awaiting"
  | "skipped"
  | "not-scheduled"
  | "not-detected";

export type DayEndJob = {
  programName: string | null;
  operator: string | null;
  message: string | null;
  errorStatusCode: string | null;
  progErrorCode: number | null;
  progRunDate: string | null;
  transactionStatus?: string | null;
  failed: boolean;
};

export type DayEndSnapshot = {
  status: DayEndStatus;
  label: string;
  detail: string;
  lastRunAt: string | null;
  expectedToday: boolean;
  passwordRisk: boolean;
  passwordRiskNote: string | null;
  jobs: DayEndJob[];
  taskGroups: string[];
  asOfSast: string;
};

const DAYEND_RE =
  /day\s*end|day-end|dayend|\beod\b|imppde|impdde|impdco|close of day|night\s*run|overnight|end of day/i;
const PROG_RE = /^(impdde|imppde|impdco)$/i;
const OP_RE = /__srs|dayend|day_end|day end/i;
const FAIL_RE = /fail|error|unsuccess/i;
const PWD_RE =
  /password|logon failed|login failed|authentication|invalid login|access denied|operator.*(lock|disabled)|login failed for user/i;

/** South Africa public holidays (observed) 2026–2027 — clause 4.5 excludes these. */
const SA_HOLIDAYS = new Set([
  "2026-01-01",
  "2026-03-21",
  "2026-04-03",
  "2026-04-06",
  "2026-04-27",
  "2026-05-01",
  "2026-06-16",
  "2026-08-10",
  "2026-09-24",
  "2026-12-16",
  "2026-12-25",
  "2026-12-26",
  "2027-01-01",
  "2027-03-22",
  "2027-03-26",
  "2027-03-29",
  "2027-04-27",
  "2027-05-01",
  "2027-06-16",
  "2027-08-09",
  "2027-09-24",
  "2027-12-16",
  "2027-12-25",
  "2027-12-27",
]);

const WINDOW_HOUR = 17;

export function sastParts(d = new Date()): {
  ymd: string;
  hour: number;
  weekday: number;
} {
  const parts = new Intl.DateTimeFormat("en-ZA", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    weekday: "short",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const wd = get("weekday");
  const weekday =
    wd === "Mon" ? 1 : wd === "Tue" ? 2 : wd === "Wed" ? 3 : wd === "Thu" ? 4 : wd === "Fri" ? 5 : wd === "Sat" ? 6 : 0;
  return {
    ymd: `${get("year")}-${get("month")}-${get("day")}`,
    hour: Number(get("hour")) || 0,
    weekday,
  };
}

export function isSaBusinessDay(ymd: string, weekday: number): boolean {
  if (weekday === 0 || weekday === 6) return false;
  return !SA_HOLIDAYS.has(ymd);
}

export function isDayEndText(...parts: Array<string | null | undefined>): boolean {
  const blob = parts.filter(Boolean).join(" ");
  if (!blob.trim()) return false;
  if (DAYEND_RE.test(blob)) return true;
  const prog = (parts[0] || "").trim();
  if (PROG_RE.test(prog)) return true;
  const op = (parts[1] || "").trim();
  return OP_RE.test(op);
}

export function isJobFailed(j: {
  errorStatusCode?: string | null;
  progErrorCode?: number | null;
  transactionStatus?: string | null;
  message?: string | null;
}): boolean {
  if (j.errorStatusCode && String(j.errorStatusCode).trim()) return true;
  if (j.progErrorCode != null && Number(j.progErrorCode) !== 0) return true;
  if (j.transactionStatus && FAIL_RE.test(j.transactionStatus)) return true;
  if (j.message && FAIL_RE.test(j.message) && PWD_RE.test(j.message)) return true;
  return false;
}

function ymdOf(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const p = sastParts(new Date(iso));
  return p.ymd;
}

const LABELS: Record<DayEndStatus, string> = {
  ran: "Ran",
  failed: "Failed",
  awaiting: "Awaiting",
  skipped: "Skipped",
  "not-scheduled": "Not scheduled",
  "not-detected": "Not detected",
};

export function buildDayEndSnapshot(input: {
  jobs: DayEndJob[];
  taskGroups: Array<{ taskGroup?: string | null; description?: string | null; autoRun?: number | null }>;
  lastImportAt?: string | null;
  now?: Date;
}): DayEndSnapshot {
  const now = input.now ?? new Date();
  const sast = sastParts(now);
  const expectedToday = isSaBusinessDay(sast.ymd, sast.weekday);
  const afterWindow = sast.hour >= WINDOW_HOUR;

  const groups = (input.taskGroups ?? [])
    .filter((g) => isDayEndText(g.taskGroup, g.description))
    .map((g) => g.taskGroup || g.description || "Day end")
    .filter(Boolean);

  const jobs = (input.jobs ?? []).filter((j) =>
    isDayEndText(j.programName, j.operator, j.message),
  );
  const tagged = jobs.map((j) => ({ ...j, failed: j.failed || isJobFailed(j) }));

  const pwdHits = tagged.filter((j) => PWD_RE.test(`${j.message ?? ""} ${j.errorStatusCode ?? ""}`));
  const passwordRisk = pwdHits.length > 0;
  const passwordRiskNote = passwordRisk
    ? "Job text mentions password / logon failure — notify RPM before the next day-end (clause 4.5 / 6.7)."
    : null;

  const last = [...tagged].sort((a, b) =>
    String(b.progRunDate ?? "").localeCompare(String(a.progRunDate ?? "")),
  )[0];
  const lastRunAt = last?.progRunDate ?? null;
  const lastYmd = ymdOf(lastRunAt);
  const lastFailed = Boolean(last?.failed);

  let status: DayEndStatus;
  let detail: string;

  if (!expectedToday) {
    status = "not-scheduled";
    detail = "Weekends and public holidays are excluded unless Standby Support is taken (clause 4.5).";
  } else if (tagged.length === 0 && groups.length === 0) {
    status = "not-detected";
    detail =
      "No day-end program, operator or task group on the latest collect. Do not assume it ran.";
  } else if (lastYmd === sast.ymd) {
    status = lastFailed ? "failed" : "ran";
    detail = lastFailed
      ? "Day-end job logged an error today. Review jobs and notify the customer."
      : "Day-end job completed on today's collect.";
  } else if (lastYmd && lastYmd < sast.ymd && !afterWindow) {
    status = lastFailed ? "failed" : "ran";
    detail = lastFailed
      ? "Last day-end run failed. Tonight's window has not closed yet."
      : "Last scheduled run completed. Tonight's window is still open.";
  } else if (afterWindow && (groups.length > 0 || tagged.length > 0)) {
    status = "skipped";
    detail =
      "Business Day after 17:00 SAST and no day-end job today — treat as skipped. Typical causes: password change, session logged off, users still in SYSPRO.";
  } else if (!afterWindow && (groups.length > 0 || tagged.length > 0)) {
    status = "awaiting";
    detail = "Business Day — day-end window (from 17:00 SAST) has not closed yet.";
  } else {
    status = "not-detected";
    detail = "No conclusive day-end evidence on this snapshot.";
  }

  return {
    status,
    label: LABELS[status],
    detail,
    lastRunAt,
    expectedToday,
    passwordRisk,
    passwordRiskNote,
    jobs: tagged.slice(0, 20),
    taskGroups: [...new Set(groups)].slice(0, 8),
    asOfSast: `${sast.ymd} ${String(sast.hour).padStart(2, "0")}:00 SAST`,
  };
}

export function dayEndTone(
  status: DayEndStatus,
): "green" | "amber" | "red" | "default" {
  if (status === "ran") return "green";
  if (status === "failed" || status === "skipped") return "red";
  if (status === "awaiting" || status === "not-detected") return "amber";
  return "default";
}

'@
Write-Utf8 (Join-Path $App 'src\routes\customers.$code.syspro.day-end.tsx') @'
import { createFileRoute } from "@tanstack/react-router";
import { DayEndSection } from "@/components/customer/customer-sections";
import { Route as PillarRoute } from "./customers.$code.syspro";

export const Route = createFileRoute("/customers/$code/syspro/day-end")({
  component: function CustomerChild() {
    const data = PillarRoute.useLoaderData();
    if (!data?.customer) {
      return (
        <p className="text-sm text-muted">
          Loading customer workspace… If this stays blank, use Refresh in the top bar.
        </p>
      );
    }
    return <DayEndSection data={data} />;
  },
});

'@
W Green 'wrote sla-metrics, day-end, day-end route'
W Green '=== PART 1 Done — now paste PART 2 ==='
