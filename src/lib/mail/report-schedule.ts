/**
 * Scheduled pack generation: write HTML to disk, email when SMTP is on.
 * Daily Day End · Friday full pack + patch + RMM/Cove/EPP · 1st monthly AMS.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
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
  written: number;
  skipped: number;
  errors: string[];
  recipients: string;
  folder: string;
  detail: string[];
};

function packRoot(): string {
  const win = "C:\\RPM-Assure\\App\\data\\packs";
  try {
    mkdirSync(win, { recursive: true });
    return win;
  } catch {
    const local = join(process.cwd(), "data", "packs");
    mkdirSync(local, { recursive: true });
    return local;
  }
}

function stampFolder(slot: string): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const dir = join(packRoot(), slot, `${y}-${m}-${day}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function safeName(s: string): string {
  return s.replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 60);
}

async function generateOne(
  format: ReportFormat,
  code: string | null,
  to: string,
  folder: string,
  mailOn: boolean,
): Promise<{ ok: boolean; subject?: string; file?: string; mailed?: boolean; error?: string }> {
  const portfolio = await loadPortfolioForReport();
  const pack =
    format === "estate" || !code
      ? buildPack("estate", null, portfolio)
      : await (async () => {
          const loaded = await loadCustomerForReport(code);
          if (!loaded.customer) return null;
          return buildPack(format, loaded.customer, portfolio);
        })();
  if (!pack) return { ok: false, error: `${code || "estate"}: customer not found` };
  const file = join(folder, `${safeName(code || "estate")}-${safeName(format)}.html`);
  try {
    writeFileSync(file, pack.html, "utf8");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
  if (!mailOn || !to) return { ok: true, subject: pack.subject, file, mailed: false };
  const smtp = getSmtpConfig();
  const r = await sendMailWithSmtp(smtp, {
    to,
    subject: pack.subject,
    text: pack.text,
    html: pack.html,
  });
  if (!r.ok) return { ok: true, subject: pack.subject, file, mailed: false, error: `mail: ${r.error}` };
  return { ok: true, subject: pack.subject, file, mailed: true };
}

export async function runReportSlot(slot: ReportScheduleSlot): Promise<ScheduleRunResult> {
  const smtp = getSmtpConfig();
  const sched = getReportSchedule();
  const to = (sched.to || smtp.reportTo || smtp.fromEmail || "").trim();
  const folder = stampFolder(slot);
  const mailOn = Boolean(smtp.enabled && to);
  const result: ScheduleRunResult = {
    ok: false,
    slot,
    sent: 0,
    written: 0,
    skipped: 0,
    errors: [],
    recipients: to,
    folder,
    detail: [],
  };
  if (!sched.enabled) {
    result.errors.push("Report schedule is disabled.");
    return result;
  }

  const portfolio = await loadPortfolioForReport();
  const rows = (portfolio.rows ?? []).filter((r) => r.active !== false);

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
    if (sched.weeklyDigest && mailOn) {
      const digest = await sendWeeklyReportEmail(to);
      if (digest.ok) {
        result.sent += 1;
        result.detail.push("Weekly estate digest mailed");
      } else {
        result.errors.push(digest.error || "weekly digest failed");
      }
    } else result.skipped += 1;
    if (sched.fullPackWeekly) {
      for (const row of rows) {
        jobs.push({ format: "ams-full", code: row.customerCode, why: row.displayName });
      }
    } else result.skipped += 1;
    if (sched.rmmWeekly) {
      for (const row of rows) {
        if (row.cover?.rmm) jobs.push({ format: "rmm-service", code: row.customerCode, why: row.displayName });
      }
    } else result.skipped += 1;
    if (sched.patchPackWeekly) {
      for (const row of rows) {
        if (row.cover?.rmm) jobs.push({ format: "rmm-patch", code: row.customerCode, why: row.displayName });
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
    if (sched.fullPackWeekly) {
      for (const row of rows) {
        jobs.push({ format: "ams-full", code: row.customerCode, why: row.displayName });
      }
    }
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
      const r = await generateOne(job.format, job.code, to, folder, mailOn);
      if (r.ok) {
        result.written += 1;
        if (r.mailed) result.sent += 1;
        result.detail.push(`${job.format} · ${job.why}${r.mailed ? " mailed" : " saved"}`);
        if (r.error) result.errors.push(`${job.format} ${job.why}: ${r.error}`);
      } else {
        result.errors.push(`${job.format} ${job.why}: ${r.error}`);
      }
    } catch (e) {
      result.errors.push(`${job.format} ${job.why}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  result.ok = result.written + result.sent > 0;
  const file = readSettingsFile();
  writeSettingsFile({
    ...file,
    lastWeeklyReportAt: new Date().toISOString(),
    reportSchedule: {
      ...sched,
      lastRunAt: new Date().toISOString(),
      lastSlot: slot,
      lastResult: result.ok
        ? `Wrote ${result.written}, mailed ${result.sent}`
        : `Wrote ${result.written}, ${result.errors.length} error(s)`,
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
