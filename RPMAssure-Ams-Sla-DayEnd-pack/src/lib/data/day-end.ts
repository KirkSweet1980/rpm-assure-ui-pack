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
