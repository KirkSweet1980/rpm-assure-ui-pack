/**
 * Scheduled outbound packs: daily Day End, weekly digest + RMM/Cove/EPP, monthly AMS.
 */
import { sendMailWithSmtp } from "@/lib/mail/send";
import { sendWeeklyReportEmail } from "@/lib/mail/weekly-report";
import {
  buildPack,
  loadCustomerForReport,
  loadPortfolioForReport,
  type ReportFormat,
} from "@/lib/mail/report-build";
import {
  ensureCronSecret,
  getReportSchedule,
  getSmtpConfig,
  readSettingsFile,
  writeSettingsFile,
} from "@/lib/settings/settings-store";
import type { ReportScheduleSlot } from "@/lib/settings/types";

export type ScheduleRunResult = {
  ok: boolean;
  slot: ReportScheduleSlot;
  sent: number;
  skipped: number;
  errors: string[];
  recipients: string;
  detail: string[];
};

async function sendOne(
  format: ReportFormat,
  code: string | null,
  to: string,
): Promise<{ ok: boolean; subject?: string; error?: string }> {
  const smtp = getSmtpConfig();
  const portfolio = await loadPortfolioForReport();
  if (format === "estate" || !code) {
    const pack = buildPack("estate", null, portfolio);
    const r = await sendMailWithSmtp(smtp, {
      to,
      subject: pack.subject,
      text: pack.text,
      html: pack.html,
    });
    return r.ok ? { ok: true, subject: pack.subject } : { ok: false, error: r.error };
  }
  const loaded = await loadCustomerForReport(code);
  if (!loaded.customer) return { ok: false, error: `${code}: customer not found` };
  const pack = buildPack(format, loaded.customer, portfolio);
  const r = await sendMailWithSmtp(smtp, {
    to,
    subject: pack.subject,
    text: pack.text,
    html: pack.html,
  });
  return r.ok ? { ok: true, subject: pack.subject } : { ok: false, error: r.error };
}

export async function runReportSlot(slot: ReportScheduleSlot): Promise<ScheduleRunResult> {
  const smtp = getSmtpConfig();
  const sched = getReportSchedule();
  const to = (sched.to || smtp.reportTo || smtp.fromEmail || "").trim();
  const result: ScheduleRunResult = {
    ok: false,
    slot,
    sent: 0,
    skipped: 0,
    errors: [],
    recipients: to,
    detail: [],
  };
  if (!smtp.enabled) {
    result.errors.push("SMTP is disabled.");
    return result;
  }
  if (!sched.enabled) {
    result.errors.push("Report schedule is disabled.");
    return result;
  }
  if (!to) {
    result.errors.push("No recipients (set Report To on Email).");
    return result;
  }

  const portfolio = await loadPortfolioForReport();
  const rows = portfolio.rows ?? [];

  const jobs: Array<{ format: ReportFormat; code: string | null; why: string }> = [];

  if (slot === "daily") {
    if (!sched.dayEnd) result.skipped += 1;
    else {
      for (const row of rows) {
        if (row.cover?.syspro) {
          jobs.push({ format: "day-end", code: row.customerCode, why: row.displayName });
        }
      }
    }
  }

  if (slot === "weekly") {
    if (sched.weeklyDigest) {
      const digest = await sendWeeklyReportEmail(to);
      if (digest.ok) {
        result.sent += 1;
        result.detail.push("Weekly estate digest");
      } else {
        result.errors.push(digest.error || "weekly digest failed");
      }
    } else result.skipped += 1;
    if (sched.rmmWeekly) {
      for (const row of rows) {
        if (row.cover?.rmm) jobs.push({ format: "rmm-service", code: row.customerCode, why: row.displayName });
      }
    } else result.skipped += 1;
    if (sched.coveWeekly) {
      for (const row of rows) {
        if (row.cover?.cove) jobs.push({ format: "cove-service", code: row.customerCode, why: row.displayName });
      }
    } else result.skipped += 1;
    if (sched.eppWeekly) {
      for (const row of rows) {
        if (row.cover?.epp) jobs.push({ format: "epp-service", code: row.customerCode, why: row.displayName });
      }
    } else result.skipped += 1;
  }

  if (slot === "monthly") {
    if (!sched.monthlyAms) result.skipped += 1;
    else {
      for (const row of rows) {
        if (row.cover?.syspro) {
          jobs.push({ format: "ams-monthly", code: row.customerCode, why: row.displayName });
        }
      }
    }
  }

  for (const job of jobs) {
    try {
      const r = await sendOne(job.format, job.code, to);
      if (r.ok) {
        result.sent += 1;
        result.detail.push(`${job.format} · ${job.why}`);
      } else {
        result.errors.push(`${job.format} ${job.why}: ${r.error}`);
      }
    } catch (e) {
      result.errors.push(`${job.format} ${job.why}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  result.ok = result.errors.length === 0 && result.sent > 0;
  const file = readSettingsFile();
  writeSettingsFile({
    ...file,
    lastWeeklyReportAt: new Date().toISOString(),
    reportSchedule: {
      ...sched,
      lastRunAt: new Date().toISOString(),
      lastSlot: slot,
      lastResult: result.ok
        ? `Sent ${result.sent}`
        : `Sent ${result.sent}, ${result.errors.length} error(s)`,
    },
  });
  return result;
}

export function cronSecretOk(given: string | null | undefined): boolean {
  const expected =
    process.env.RPM_ASSURE_CRON_SECRET?.trim() || ensureCronSecret();
  const got = (given || "").trim();
  return Boolean(got && expected && got === expected);
}
