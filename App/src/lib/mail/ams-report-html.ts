/**
 * HTML builders for AMS-style packs matching iOCO sample structure:
 * - Day end & FinSight report (daily operational)
 * - Applications RPM Assure Report (monthly / board-style)
 * Brand: RPM Assure (not iOCO).
 */

import type { CustomerDetailPayload, PortfolioPayload } from "@/lib/data/types";
import { formatProgramLabel } from "@/lib/data/syspro-programs";
import { formatSastDate, formatSastDateTime } from "@/lib/utils";
import { REPORT_FIELDS, type ReportFieldDef } from "@/lib/data/report-fields";
import { isRmmServer, isRmmWorkstation } from "@/lib/data/rmm-device-class";
import {
  availabilityOf,
  capacityOf,
  fmtN,
  patchOf,
  splitRmmDevices,
} from "@/lib/mail/rmm-report-metrics";
import type { RmmDeviceRow } from "@/lib/data/types";
import { RPM_CONTRACT_CLOCKS, RPM_SECURITY_ADMIN, RPM_SLA_REVISION } from "@/lib/data/sla-metrics";
import { buildDayEndSnapshot } from "@/lib/data/day-end";
import { buildCoveEsr } from "@/lib/data/cove-esr";
import { COVE_ESR_CSS, coveEsrSections } from "@/lib/mail/cove-esr-html";
import { coverFromDetail, isPillarCovered, type CustomerCover } from "@/lib/data/cover";

function esc(s: string | number | null | undefined): string {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, String.fromCharCode(38) + "amp;")
    .replace(/</g, String.fromCharCode(38) + "lt;")
    .replace(/>/g, String.fromCharCode(38) + "gt;")
    .replace(/"/g, String.fromCharCode(38) + "quot;");
}


function zar(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtDt(iso: string | null | undefined): string {
  if (!iso) return "—";
  return formatSastDateTime(iso);
}

function fmtD(iso: string | null | undefined): string {
  if (!iso) return "—";
  return formatSastDate(iso);
}

function finsightModuleRows(dtr: import("@/lib/data/types").DtrLevel1Row[] | undefined | null) {
  return Array.isArray(dtr) ? dtr : [];
}

function finsightScore(dtr: import("@/lib/data/types").DtrLevel1Row[] | undefined | null) {
  const rows = finsightModuleRows(dtr);
  let oobLines = 0;
  let absVar = 0;
  let close = 0;
  let modulesOob = 0;
  for (const r of rows) {
    const oob = Number(r?.varianceLineCount) || 0;
    oobLines += oob;
    absVar += Math.abs(Number(r?.absVariance ?? r?.totalVariance) || 0);
    close += Number(r?.totalCloseBalance) || 0;
    if (oob > 0) modulesOob++;
  }
  const modules = rows.length;
  const modulesClean = Math.max(0, modules - modulesOob);
  let controlRag: "Green" | "Amber" | "Red" = "Green";
  if (modules === 0) controlRag = "Amber";
  else if (modulesOob >= 3 || oobLines >= 20 || absVar >= 1_000_000) controlRag = "Red";
  else if (modulesOob > 0 || oobLines > 0) controlRag = "Amber";
  return { modules, modulesOob, modulesClean, oobLines, absVar, close, controlRag };
}

function finsightControlTable(
  dtr: import("@/lib/data/types").DtrLevel1Row[] | undefined | null,
  customerCode: string,
  opts?: { onlyOob?: boolean },
): string {
  let rows = finsightModuleRows(dtr);
  if (opts?.onlyOob) rows = rows.filter((r) => (Number(r?.varianceLineCount) || 0) > 0);
  if (rows.length === 0) {
    const msg = opts?.onlyOob
      ? "No out-of-balance FinSight modules on this snapshot."
      : "No FinSight balance rows collected yet for this customer.";
    return `<tr><td colspan="8" class="muted">${msg}</td></tr>`;
  }
  return rows
    .map((r) => {
      const oob = Number(r?.varianceLineCount) || 0;
      const status = oob > 0 ? "Out of balance" : "In balance";
      const cls = oob > 0 ? "bad" : "ok";
      return `<tr>
      <td>${esc(customerCode)}</td>
      <td>${esc(r?.balanceTypeCode ?? "—")}</td>
      <td>${esc(r?.balanceTypeName ?? "—")}</td>
      <td style="text-align:right">${esc(zar(r?.totalCloseBalance))}</td>
      <td style="text-align:right">${esc(zar(r?.totalVariance))}</td>
      <td style="text-align:right">${esc(zar(r?.absVariance ?? Math.abs(Number(r?.totalVariance) || 0)))}</td>
      <td style="text-align:right" class="${cls}">${esc(oob)}</td>
      <td class="${cls}">${status}</td>
    </tr>`;
    })
    .join("");
}


const CSS = `
  body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; color: #1a1a1a; font-size: 11pt; margin: 0; }
  .page { max-width: 900px; margin: 0 auto; padding: 16px 20px 40px; }
  .cover { min-height: 70vh; display: flex; flex-direction: column; justify-content: flex-end; padding: 48px 32px 64px; border-bottom: 3px solid #1a4d7a; position: relative; }
  .cover-arc { position: absolute; top: 0; right: 0; width: 55%; height: 42%; background: linear-gradient(135deg, #e8f4f8 0%, #f5fbfc 60%, transparent 100%); border-bottom-left-radius: 80% 60%; }
  .cover-dot { width: 48px; height: 48px; border-radius: 12px; background: #12365a; margin-bottom: 48px; }
  .cover h1 { font-size: 22pt; font-weight: 600; color: #2a2a2a; margin: 0 0 8px; }
  .cover h2 { font-size: 16pt; font-weight: 500; color: #444; margin: 0 0 32px; }
  .brand-row { display: flex; align-items: center; gap: 24px; margin-top: 48px; }
  .brand { font-size: 18pt; font-weight: 800; color: #1bb8a6; letter-spacing: -0.02em; }
  .brand span { color: #2b6fae; }
  .teal-banner { background: #1a9b8f; color: #fff; padding: 10px 16px; display: flex; justify-content: space-between; align-items: center; border-radius: 0; }
  .teal-banner h1 { margin: 0; font-size: 16pt; font-weight: 600; }
  .teal-banner .when { font-size: 10pt; opacity: 0.95; }
  h2.sec { font-size: 12pt; color: #12365a; border-bottom: 2px solid #1a9b8f; padding-bottom: 4px; margin: 22px 0 10px; }
  h3.sub { font-size: 11pt; background: #1a4d7a; color: #fff; padding: 6px 10px; margin: 16px 0 0; font-weight: 600; }
  table.ams { width: 100%; border-collapse: collapse; font-size: 9.5pt; margin: 0 0 12px; }
  table.ams th { background: #d6e8f0; color: #12365a; text-align: left; padding: 5px 6px; border: 1px solid #b8cdd9; font-weight: 700; }
  table.ams th.dark { background: #1a4d7a; color: #fff; border-color: #12365a; }
  table.ams td { border: 1px solid #c5d5df; padding: 4px 6px; vertical-align: top; }
  table.ams tr:nth-child(even) td { background: #f7fafc; }
  .ok { color: #1a8f4a; font-weight: 700; }
  .bad { color: #c0392b; font-weight: 700; }
  .warn { color: #c47f00; font-weight: 700; }
  .note { border: 1px solid #ccc; padding: 10px 12px; margin: 10px 0; font-size: 9.5pt; background: #fafafa; }
  .note ul { margin: 6px 0 0 18px; padding: 0; }
  .footer { margin-top: 24px; font-size: 8.5pt; color: #666; border-top: 1px solid #ddd; padding-top: 8px; display: flex; justify-content: space-between; }
  .muted { color: #666; font-size: 9pt; }
  .rag-red { color: #c0392b; font-weight: 700; }
  .rag-amber { color: #c47f00; font-weight: 700; }
  .rag-green { color: #1a8f4a; font-weight: 700; }
  @media print {
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .page { max-width: none; padding: 0; }
    .cover { page-break-after: always; min-height: 90vh; }
    h3.sub { page-break-after: avoid; }
    table.ams { page-break-inside: auto; }
    tr { page-break-inside: avoid; }
  }
` + COVE_ESR_CSS;

function ragClass(rag: string): string {
  if (rag === "Red") return "rag-red";
  if (rag === "Amber") return "rag-amber";
  return "rag-green";
}

function shell(title: string, body: string, generatedAt: string): string {
  return `<!DOCTYPE html>
<html lang="en-ZA">
<head>
<meta charset="utf-8"/>
<title>${esc(title)}</title>
<style>${CSS}</style>
</head>
<body>
${body}
<div class="page">
  <div class="footer">
    <span>RPM Assure · ${esc(generatedAt)}</span>
    <span>Confidential — managed customer reporting</span>
  </div>
</div>
</body>
</html>`;
}

/** Daily operational pack — Day end & FinSight */
export function buildDayEndFinSightHtml(opts: {
  customer: CustomerDetailPayload;
  portfolio?: PortfolioPayload | null;
}): { subject: string; html: string; text: string } {
  const detail = opts.customer;
  const c = detail?.customer;
  if (!c?.customerCode) {
    throw new Error("Day-end pack requires a customer with customerCode");
  }
  const dtr = finsightModuleRows(detail.dtrLevel1);
  const backups = Array.isArray(detail.sqlBackups) ? detail.sqlBackups : [];
  const fs = finsightScore(dtr);
  const now = formatSastDateTime(new Date().toISOString());
  const title = `Day end · FinSight — ${c.displayName || c.customerCode}`;

  const bakRows =
    backups.length === 0
      ? `<tr><td colspan="4" class="muted">No SQL backup rows on latest snapshot.</td></tr>`
      : backups
          .map((b) => {
            const status = b?.lastBackupStatus ?? "—";
            const bad = /fail|error/i.test(String(status));
            return `<tr>
      <td>${esc(b?.databaseName ?? "—")}</td>
      <td>${esc(fmtDt(b?.lastFullBackup))}</td>
      <td class="${bad ? "bad" : "ok"}">${esc(status)}</td>
      <td style="text-align:right">${esc(b?.fullAgeHours ?? "—")}</td>
    </tr>`;
          })
          .join("");

  const collectOk = !!c.lastImportAt;
  const jobErrs = Number(c.sysproJobErrorCount) || 0;
  const controlNote =
    fs.modules === 0
      ? "FinSight balances not available on this customer (no L1 extract yet, or balance tables not present). Operational day-end checks still apply."
      : fs.modulesOob === 0
        ? "All collected FinSight modules are in balance on this snapshot."
        : `${fs.modulesOob} of ${fs.modules} FinSight module(s) have out-of-balance lines — review exception register and clear before period close where material.`;

  const body = `
<div class="teal-banner">
  <h1>RPM Assure · Day end · FinSight</h1>
  <span class="when">${esc(now)}</span>
</div>
<div class="page">
  <p class="muted"><strong>${esc(c.displayName)}</strong> (${esc(c.customerCode)}) · Instance ${esc(c.sqlInstanceName || "—")} · Health <span class="${ragClass(c.healthRag)}">${esc(c.healthRag)}</span> · FinSight controls <span class="${ragClass(fs.controlRag)}">${esc(fs.controlRag)}</span></p>

  <div class="note">
    <strong>What this pack is for</strong>
    <p style="margin:6px 0 0">Daily operational close for managed SYSPRO: confirm collect ran, surface <strong>financial integrity</strong> (sub-ledger vs GL) via FinSight, and check SQL backup posture before the next trading day.</p>
    <p style="margin:8px 0 0" class="muted"><em>RPM Assure line:</em> we report that SYSPRO is operating <strong>and</strong> whether financial control accounts are holding — with exceptions identified and sized.</p>
  </div>

  <h2 class="sec">1 Control strip (today)</h2>
  <table class="ams">
    <thead>
      <tr>
        <th class="dark">Collect</th>
        <th class="dark">Job errors</th>
        <th class="dark">Active users</th>
        <th class="dark">FinSight modules</th>
        <th class="dark">In balance</th>
        <th class="dark">Out of balance</th>
        <th class="dark">Out of Balance lines</th>
        <th class="dark">|Variance|</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="${collectOk ? "ok" : "bad"}">${collectOk ? "Received" : "Missing"}</td>
        <td class="${jobErrs > 0 ? "warn" : "ok"}">${esc(jobErrs)}</td>
        <td>${esc(c.activeUserCount)}</td>
        <td>${esc(fs.modules)}</td>
        <td class="ok">${esc(fs.modulesClean)}</td>
        <td class="${fs.modulesOob > 0 ? "bad" : "ok"}">${esc(fs.modulesOob)}</td>
        <td class="${fs.oobLines > 0 ? "bad" : "ok"}">${esc(fs.oobLines)}</td>
        <td style="text-align:right" class="${fs.absVar > 0 ? "warn" : "ok"}">${esc(zar(fs.absVar))}</td>
      </tr>
    </tbody>
  </table>
  <p class="muted">${esc(controlNote)}</p>

  <h2 class="sec">2 Day-end operations (SYSPRO collect)</h2>
  <table class="ams">
    <thead>
      <tr>
        <th class="dark">Customer</th>
        <th class="dark">Check</th>
        <th class="dark">Status</th>
        <th class="dark">Last collect (SAST)</th>
        <th class="dark">Job errors</th>
        <th class="dark">Active users</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${esc(c.displayName)}</td>
        <td>Scheduled collect → central</td>
        <td class="${collectOk ? "ok" : "bad"}">${collectOk ? "OK" : "Failed / stale"}</td>
        <td>${esc(fmtDt(c.lastImportAt))}</td>
        <td class="${jobErrs > 0 ? "warn" : "ok"}">${esc(jobErrs)}</td>
        <td>${esc(c.activeUserCount)}</td>
      </tr>
    </tbody>
  </table>
  <div class="note">
    <strong>If day-end collect fails, typical causes:</strong>
    <ul>
      <li>Company or SQL password change not updated on the collect account.</li>
      <li>Day-end Windows / agent session logged off after reboot.</li>
      <li>Users still in SYSPRO during the day-end window.</li>
      <li>Customer SQL unreachable (firewall / instance down).</li>
    </ul>
    <p style="margin:8px 0 0"><strong>Please action:</strong> notify RPM Assure when credentials change; re-establish collect after reboots; protect the day-end window.</p>
  </div>

  <h2 class="sec">3 FinSight — control account recons & sub-ledger integration</h2>
  <p class="muted"><strong>Control account recon:</strong> does each module balance agree with its GL control at L1? <strong>Sub-ledger integration:</strong> postings should flow module → GL; unexplained variance often means incomplete integration, timing, or unposted journals.</p>
  <h3 class="sub">Control account recon matrix</h3>
  <table class="ams">
    <thead>
      <tr>
        <th class="dark">Customer</th>
        <th class="dark">Code</th>
        <th class="dark">Module</th>
        <th class="dark">Close (L1)</th>
        <th class="dark">Sum var</th>
        <th class="dark">|Variance|</th>
        <th class="dark">Out of Balance lines</th>
        <th class="dark">Status</th>
      </tr>
    </thead>
    <tbody>${finsightControlTable(dtr, c.customerCode)}</tbody>
  </table>
  <h3 class="sub">Exception register (out of balance only)</h3>
  <table class="ams">
    <thead>
      <tr>
        <th class="dark">Customer</th>
        <th class="dark">Code</th>
        <th class="dark">Module</th>
        <th class="dark">Close (L1)</th>
        <th class="dark">Sum var</th>
        <th class="dark">|Variance|</th>
        <th class="dark">Out of Balance lines</th>
        <th class="dark">Status</th>
      </tr>
    </thead>
    <tbody>${finsightControlTable(dtr, c.customerCode, { onlyOob: true })}</tbody>
  </table>
  <p class="muted">Review exceptions in the customer workspace under <strong>RPM Assure FinSight</strong>. Recommended daily when Out of Balance lines > 0.</p>

  <h2 class="sec">4 SQL database backups</h2>
  <table class="ams">
    <thead>
      <tr>
        <th class="dark">Database</th>
        <th class="dark">Last full backup</th>
        <th class="dark">Status</th>
        <th class="dark">Age (h)</th>
      </tr>
    </thead>
    <tbody>${bakRows}</tbody>
  </table>

  <p class="muted">${esc(c.healthSummary || "")}</p>
</div>`;

  const text = [
    title,
    now,
    `Health: ${c.healthRag}`,
    `FinSight control: ${fs.controlRag}`,
    `Collect: ${c.lastImportAt ?? "missing"}`,
    `Job errors: ${jobErrs}`,
    `FinSight modules ${fs.modules} · Out of Balance modules ${fs.modulesOob} · Out of Balance lines ${fs.oobLines} · |Var| ${fs.absVar}`,
    `Backups: ${backups.length}`,
  ].join("\n");

  return {
    subject: `RPM Assure — Day end · FinSight — ${c.displayName || c.customerCode} — ${formatSastDate(new Date().toISOString())}`,
    html: shell(title, body, now),
    text,
  };
}


/** Month-end / period-end FinSight readiness pack */
export function buildPeriodEndFinSightHtml(opts: {
  customer: CustomerDetailPayload;
  portfolio?: PortfolioPayload | null;
}): { subject: string; html: string; text: string } {
  const detail = opts.customer;
  const c = detail?.customer;
  if (!c?.customerCode) {
    throw new Error("Period-end pack requires a customer with customerCode");
  }
  const dtr = finsightModuleRows(detail.dtrLevel1);
  const fs = finsightScore(dtr);
  const backups = Array.isArray(detail.sqlBackups) ? detail.sqlBackups : [];
  const jobErrs = Number(c.sysproJobErrorCount) || 0;
  const risks = (detail.risks ?? []).filter((r) => (r.status || "").toLowerCase() !== "closed");
  const now = formatSastDateTime(new Date().toISOString());
  const period = c.reportingPeriod || formatSastDate(new Date().toISOString()).slice(0, 7) || "current period";
  const title = `Period end · FinSight readiness — ${c.displayName || c.customerCode}`;

  const ready =
    fs.modules > 0 &&
    fs.modulesOob === 0 &&
    jobErrs === 0 &&
    !!c.lastImportAt;
  const readyLabel = ready
    ? "Ready for close (on collected signals)"
    : fs.modules === 0
      ? "FinSight data incomplete — do not rely on this pack alone for close"
      : "Not ready — clear FinSight exceptions and/or ops gates";

  const actions: string[] = [];
  if (!c.lastImportAt) actions.push("Restore SYSPRO collect before sign-off.");
  if (jobErrs > 0) actions.push(`Investigate ${jobErrs} job error signal(s) on latest snapshot.`);
  if (fs.modules === 0) actions.push("Enable FinSight balance collect (company balance tables + scheduled extract).");
  if (fs.modulesOob > 0) {
    actions.push(
      `Clear or explain ${fs.modulesOob} out-of-balance module(s) (${fs.oobLines} Out of Balance lines; |variance| ${zar(fs.absVar)}).`,
    );
  }
  if (risks.length > 0) actions.push(`Review ${risks.length} open RPM Assure risk(s) with finance impact.`);
  if (actions.length === 0) actions.push("No blocking FinSight or collect signals on this snapshot — proceed with normal period-end checklist.");

  const actionLis = actions.map((a) => `<li>${esc(a)}</li>`).join("");

  const body = `
<div class="teal-banner">
  <h1>RPM Assure · Period end · FinSight readiness</h1>
  <span class="when">${esc(now)}</span>
</div>
<div class="page">
  <p class="muted"><strong>${esc(c.displayName)}</strong> (${esc(c.customerCode)}) · Period <strong>${esc(period)}</strong> · Health <span class="${ragClass(c.healthRag)}">${esc(c.healthRag)}</span> · FinSight <span class="${ragClass(fs.controlRag)}">${esc(fs.controlRag)}</span></p>

  <div class="note">
    <strong>Purpose</strong>
    <p style="margin:6px 0 0">Period-end pack for finance and RPM Assure: evidence whether <strong>sub-ledger control accounts reconcile to GL</strong>, quantify exception exposure, and confirm operational gates (collect, jobs, backups) support a clean close.</p>
    <p style="margin:8px 0 0"><em>RPM Assure line:</em> we are not only stating that SYSPRO is operational — we evidence that financial controls are operating and that reconciliation exceptions are identified and managed.</p>
  </div>

  <h2 class="sec">1 Close readiness summary</h2>
  <table class="ams">
    <thead>
      <tr>
        <th class="dark">Readiness</th>
        <th class="dark">FinSight modules</th>
        <th class="dark">In balance</th>
        <th class="dark">Out of balance</th>
        <th class="dark">Out of Balance lines</th>
        <th class="dark">|Variance|</th>
        <th class="dark">Close value (L1)</th>
        <th class="dark">Job errors</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="${ready ? "ok" : "warn"}">${esc(readyLabel)}</td>
        <td>${esc(fs.modules)}</td>
        <td class="ok">${esc(fs.modulesClean)}</td>
        <td class="${fs.modulesOob > 0 ? "bad" : "ok"}">${esc(fs.modulesOob)}</td>
        <td class="${fs.oobLines > 0 ? "bad" : "ok"}">${esc(fs.oobLines)}</td>
        <td style="text-align:right">${esc(zar(fs.absVar))}</td>
        <td style="text-align:right">${esc(zar(fs.close))}</td>
        <td class="${jobErrs > 0 ? "warn" : "ok"}">${esc(jobErrs)}</td>
      </tr>
    </tbody>
  </table>

  <h2 class="sec">2 Control account recon matrix (sub-ledger → GL)</h2>
  <p class="muted">Each row is a control-account recon and a sub-ledger integration check at L1. <strong>Out of balance</strong> = sub-ledger and GL control do not agree (or integration incomplete).</p>
  <table class="ams">
    <thead>
      <tr>
        <th class="dark">Customer</th>
        <th class="dark">Code</th>
        <th class="dark">Control</th>
        <th class="dark">Close (L1)</th>
        <th class="dark">Sum var</th>
        <th class="dark">|Variance|</th>
        <th class="dark">Out of Balance lines</th>
        <th class="dark">Status</th>
      </tr>
    </thead>
    <tbody>${finsightControlTable(dtr, c.customerCode)}</tbody>
  </table>

  <h2 class="sec">3 Exception register (must clear or accept)</h2>
  <table class="ams">
    <thead>
      <tr>
        <th class="dark">Customer</th>
        <th class="dark">Code</th>
        <th class="dark">Control</th>
        <th class="dark">Close (L1)</th>
        <th class="dark">Sum var</th>
        <th class="dark">|Variance|</th>
        <th class="dark">Out of Balance lines</th>
        <th class="dark">Status</th>
      </tr>
    </thead>
    <tbody>${finsightControlTable(dtr, c.customerCode, { onlyOob: true })}</tbody>
  </table>

  <h2 class="sec">4 Operational gates for close</h2>
  <table class="ams">
    <thead>
      <tr>
        <th class="dark">Gate</th>
        <th class="dark">Signal</th>
        <th class="dark">Status</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Collect freshness</td>
        <td>${esc(fmtDt(c.lastImportAt))}</td>
        <td class="${c.lastImportAt ? "ok" : "bad"}">${c.lastImportAt ? "OK" : "Missing"}</td>
      </tr>
      <tr>
        <td>SYSPRO job errors</td>
        <td>${esc(jobErrs)} on latest snapshot</td>
        <td class="${jobErrs > 0 ? "warn" : "ok"}">${jobErrs > 0 ? "Review" : "Clear"}</td>
      </tr>
      <tr>
        <td>SQL backups (rows on file)</td>
        <td>${esc(backups.length)} database(s)</td>
        <td class="${backups.length ? "ok" : "warn"}">${backups.length ? "Present" : "None collected"}</td>
      </tr>
      <tr>
        <td>Open RPM Assure risks</td>
        <td>${esc(risks.length)}</td>
        <td class="${risks.length ? "warn" : "ok"}">${risks.length ? "Review" : "None open"}</td>
      </tr>
    </tbody>
  </table>

  <h2 class="sec">5 Recommended actions (RPM Assure + finance)</h2>
  <div class="note">
    <ul>${actionLis}</ul>
  </div>

  <p class="muted">${esc(c.healthSummary || "")}</p>
  <p class="muted">Generated by RPM Assure · FinSight does not replace statutory accounts preparation — it evidences control-account integrity for managed customers.</p>
</div>`;

  const text = [
    title,
    now,
    readyLabel,
    `FinSight ${fs.controlRag} · modules ${fs.modules} · Out of Balance ${fs.modulesOob} · lines ${fs.oobLines} · |Var| ${fs.absVar}`,
    ...actions,
  ].join("\n");

  return {
    subject: `RPM Assure — Period end · FinSight — ${c.displayName || c.customerCode} — ${formatSastDate(new Date().toISOString())}`,
    html: shell(title, body, now),
    text,
  };
}

/** Clause 4.8 monthly AMS pack — SYSPRO Support + AMS only. */
export function buildMonthlyAmsPackHtml(opts: {
  customer: CustomerDetailPayload;
  portfolio?: PortfolioPayload | null;
}): { subject: string; html: string; text: string } {
  const detail = opts.customer;
  const c = detail.customer;
  const now = formatSastDateTime(new Date().toISOString());
  const dateLabel = formatSastDate(new Date().toISOString());
  const monthLabel = new Date().toLocaleDateString("en-ZA", {
    month: "long",
    year: "numeric",
    timeZone: "Africa/Johannesburg",
  });
  const title = `Monthly AMS pack — ${monthLabel} — ${c.displayName}`;

  const dtr = detail.dtrLevel1 ?? [];
  const fs = finsightScore(dtr);
  const jobs = detail.jobErrors ?? [];
  const ops = detail.operators ?? [];
  const amends = detail.operAmends ?? [];
  const hotfixes = detail.sysproHotfixes ?? [];
  const gap = detail.hotfixGapSummary;
  const license = detail.license;
  const ver = detail.sysproVersion;
  const oa = detail.operationalAssurance;
  const sla = detail.availabilitySla;
  const dayEnd =
    detail.dayEnd ??
    buildDayEndSnapshot({
      jobs: jobs.map((j) => ({ ...j, failed: false })),
      taskGroups: detail.taskGroups ?? [],
      lastImportAt: c.lastImportAt,
    });
  const collectHours = oa?.collectAgeHours;
  const collectFresh = oa?.collectFresh ?? (collectHours != null && collectHours <= 24);
  const ticketMeasured =
    sla?.source === "live-incident" || sla?.source === "sla-period" || sla?.source === "snapshot";

  const byProg = new Map<string, number>();
  for (const j of jobs) {
    const k = formatProgramLabel(j.programName) || j.programName || "Unknown";
    byProg.set(k, (byProg.get(k) ?? 0) + 1);
  }
  const topProg = [...byProg.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

  const recentAmends = amends.slice(0, 12);
  const oobMods = dtr.filter((r) => (r.varianceLineCount || 0) > 0);

  const body = `
<div class="cover">
  <div class="cover-arc"></div>
  <div class="cover-dot"></div>
  <h1>Monthly AMS pack — ${esc(monthLabel)}</h1>
  <h2>${esc(c.displayName)} · ${esc(c.customerCode)}</h2>
  <div class="brand-row">
    <div class="brand">RPM <span>Assure</span></div>
    <div class="muted" style="font-size:12pt">SYSPRO Support & AMS · Rev ${esc(RPM_SLA_REVISION)} · Health <span class="${ragClass(c.healthRag)}">${esc(c.healthRag)}</span></div>
  </div>
</div>

<div class="page">
  <div class="note">
    <strong>What this pack is</strong>
    <p style="margin:6px 0 0">Monthly evidence for the <strong>signed SYSPRO Support + AMS SLA</strong> (clause 4.8). Ticket clocks are targets, not guarantees (7.5). There is <strong>no availability percentage</strong>. RMM, Cloud Backup, EPP and Microsoft 365 appear on the <strong>Full Assurance Pack</strong> when those services are on cover.</p>
  </div>

  <h3 class="sub">1. Health & collect</h3>
  <table class="ams">
    <thead><tr><th class="dark">Health</th><th class="dark">Collect</th><th class="dark">Age</th><th class="dark">Active users</th><th class="dark">Instance</th></tr></thead>
    <tbody>
      <tr>
        <td class="${ragClass(c.healthRag)}">${esc(c.healthRag)}</td>
        <td class="${collectFresh ? "ok" : "bad"}">${collectFresh ? "Fresh (≤24h)" : c.lastImportAt ? "Stale" : "Missing"}</td>
        <td>${collectHours != null ? esc(Math.round(collectHours) + "h") : "—"}</td>
        <td>${esc(c.activeUserCount)} / ${esc(c.operatorCount)}</td>
        <td>${esc(c.sqlInstanceName || "—")}</td>
      </tr>
    </tbody>
  </table>
  <p class="muted">${esc(c.healthSummary || oa?.summary || "")}</p>
  <p class="muted">Last collect (SAST): ${esc(fmtDt(c.lastImportAt))}</p>

  <h3 class="sub">2. Day-end (clause 4.5) — Mon–Fri</h3>
  <table class="ams">
    <thead><tr><th class="dark">Status</th><th class="dark">Last run</th><th class="dark">Password risk</th><th class="dark">Task groups</th></tr></thead>
    <tbody>
      <tr>
        <td class="${dayEnd.status === "ran" ? "ok" : dayEnd.status === "failed" || dayEnd.status === "skipped" ? "bad" : "warn"}">${esc(dayEnd.label)}</td>
        <td>${esc(fmtDt(dayEnd.lastRunAt))}</td>
        <td class="${dayEnd.passwordRisk ? "bad" : "ok"}">${dayEnd.passwordRisk ? "Yes — notify RPM" : "Clear"}</td>
        <td>${esc(dayEnd.taskGroups.join(", ") || "—")}</td>
      </tr>
    </tbody>
  </table>
  <p class="muted">${esc(dayEnd.detail)}</p>
  ${dayEnd.passwordRiskNote ? `<p class="muted"><strong>${esc(dayEnd.passwordRiskNote)}</strong></p>` : ""}

  <h3 class="sub">3. Job errors (latest snapshot)</h3>
  <table class="ams">
    <thead><tr><th class="dark">Program / module</th><th class="dark">Errors</th></tr></thead>
    <tbody>
      ${
        topProg.length === 0
          ? `<tr><td colspan="2" class="ok">No job errors on the latest snapshot.</td></tr>`
          : topProg
              .map(
                ([p, n]) =>
                  `<tr><td>${esc(p)}</td><td class="warn" style="text-align:right">${esc(n)}</td></tr>`,
              )
              .join("")
      }
    </tbody>
  </table>
  <p class="muted">Total job errors: ${esc(c.sysproJobErrorCount)}.</p>

  <h3 class="sub">4. FinSight — control accounts (sub-ledger vs GL)</h3>
  <table class="ams">
    <thead><tr><th class="dark">Modules</th><th class="dark">In balance</th><th class="dark">Out of balance</th><th class="dark">OOB lines</th><th class="dark">|Variance|</th></tr></thead>
    <tbody>
      <tr>
        <td>${esc(fs.modules)}</td>
        <td class="ok">${esc(fs.modulesClean)}</td>
        <td class="${fs.modulesOob > 0 ? "bad" : "ok"}">${esc(fs.modulesOob)}</td>
        <td class="${fs.oobLines > 0 ? "bad" : "ok"}">${esc(fs.oobLines)}</td>
        <td style="text-align:right">${esc(zar(fs.absVar))}</td>
      </tr>
    </tbody>
  </table>
  <table class="ams">
    <thead><tr><th class="dark">Module</th><th class="dark">OOB lines</th><th class="dark">|Variance|</th></tr></thead>
    <tbody>
      ${
        oobMods.length === 0
          ? `<tr><td colspan="3" class="ok">All collected modules in balance.</td></tr>`
          : oobMods
              .map(
                (r) =>
                  `<tr><td>${esc(r.balanceTypeName || r.balanceTypeCode)}</td><td class="warn" style="text-align:right">${esc(r.varianceLineCount)}</td><td style="text-align:right">${esc(zar(r.absVariance))}</td></tr>`,
              )
              .join("")
      }
    </tbody>
  </table>
  <p class="muted">Running FinSight is AMS. Interpreting exceptions is billable consulting unless already in the plan.</p>

  <h3 class="sub">5. Operators & security admin (clause 7.4)</h3>
  <table class="ams">
    <thead><tr><th class="dark">Operators</th><th class="dark">Active (≤30d)</th><th class="dark">Amends (90d)</th><th class="dark">Groups</th></tr></thead>
    <tbody>
      <tr>
        <td>${esc(ops.length || c.operatorCount)}</td>
        <td>${esc(c.activeUserCount)}</td>
        <td>${esc(detail.securitySummary?.amendCount90d ?? amends.length)}</td>
        <td>${esc(detail.securitySummary?.distinctGroups ?? "—")}</td>
      </tr>
    </tbody>
  </table>
  <table class="ams">
    <thead><tr><th class="dark">Security task</th><th class="dark">Target from a complete request</th></tr></thead>
    <tbody>
      ${RPM_SECURITY_ADMIN.map((r) => `<tr><td>${esc(r.task)}</td><td>${esc(r.target)}</td></tr>`).join("")}
    </tbody>
  </table>
  ${
    recentAmends.length
      ? `<table class="ams">
    <thead><tr><th class="dark">Recent amends</th><th class="dark">Type</th><th class="dark">When</th><th class="dark">By</th></tr></thead>
    <tbody>
      ${recentAmends
        .map(
          (a) =>
            `<tr><td>${esc(a.operatorCode)}</td><td>${esc(a.amendType)}</td><td>${esc(fmtDt(a.amendDate))}</td><td>${esc(a.changedBy)}</td></tr>`,
        )
        .join("")}
    </tbody>
  </table>`
      : `<p class="muted">No operator amend rows on this snapshot.</p>`
  }

  <h3 class="sub">6. Hotfixes & licence (clause 4.6)</h3>
  <table class="ams">
    <tbody>
      <tr><th>Product</th><td>${esc(license?.productName ?? ver?.productName ?? "—")}</td></tr>
      <tr><th>Version</th><td>${esc(license?.productVersion ?? ver?.productVersion ?? "—")}</td></tr>
      <tr><th>Expiry</th><td>${esc(fmtD(license?.licenseExpiry ?? ver?.licenseExpiry))}</td></tr>
      <tr><th>Hotfixes installed</th><td>${esc(hotfixes.length)}</td></tr>
      <tr><th>Mandatory missing</th><td class="${(gap?.missingMandatory ?? 0) > 0 ? "warn" : "ok"}">${esc(gap?.missingMandatory ?? "—")}</td></tr>
    </tbody>
  </table>

  <h3 class="sub">7. Signed SLA clocks (clause 7.2) — Business Hours</h3>
  <table class="ams">
    <thead><tr><th class="dark">Priority</th><th class="dark">Acknowledge</th><th class="dark">Remote</th><th class="dark">Restore</th></tr></thead>
    <tbody>
      ${RPM_CONTRACT_CLOCKS.map(
        (r) =>
          `<tr><td><strong>${esc(r.priority)}</strong> ${esc(r.name)}</td><td>${esc(r.acknowledge)}</td><td>${esc(r.remote)}</td><td>${esc(r.restore)}</td></tr>`,
      ).join("")}
    </tbody>
  </table>
  <p class="muted">${
    ticketMeasured
      ? `Ticket clocks measured this period: response ${sla?.slaResponsePct ?? "—"}% · restore ${sla?.slaResolvePct ?? "—"}%. ${sla?.note ?? ""}`
      : "Targets from the signed SLA — <strong>not measured</strong> this period. Connect a helpdesk feed before scoring clause 7.2. No 99.5% uptime is claimed."
  }</p>

  <div class="note">
    <strong>Not in this pack (and not in the contract)</strong>
    <ul>
      <li>Cloud Backup (Cove), EPP, Microsoft 365 — operational posture only, clauses 5.1 / 11.2.</li>
      <li>Availability % or invented respond/resolve scores.</li>
      <li>Workstations in any RMM figure.</li>
    </ul>
    <p style="margin:8px 0 0">Print or Save as PDF. Generated ${esc(now)} from live collect.</p>
  </div>
</div>`;

  const text = [
    title,
    `Health ${c.healthRag} · collect ${c.lastImportAt ?? "none"}`,
    `Day-end ${dayEnd.label} · jobs ${c.sysproJobErrorCount} · FinSight OOB ${fs.oobLines}`,
    `SLA clocks: P1 30m / 1 BH / 8 BH — ${ticketMeasured ? "measured" : "not measured"}`,
  ].join("\n");

  return {
    subject: `RPM Assure — Monthly AMS pack — ${c.displayName} — ${dateLabel}`,
    html: shell(title, body, now),
    text,
  };
}

/** Full Applications RPM Assure Report style pack */
function ynCover(on: boolean): string {
  return on ? `<span class="ok">Cover</span>` : `<span class="warn">No cover</span>`;
}

function patchBucket(n: number): "clean" | "light" | "medium" | "heavy" {
  if (n <= 0) return "clean";
  if (n <= 5) return "light";
  if (n <= 20) return "medium";
  return "heavy";
}

/** Full patching compliance report — servers scored, workstations visibility only. */
function patchComplianceHtml(detail: CustomerDetailPayload): string {
  const rmm = detail.rmm;
  const { servers, workstations } = splitRmmDevices(rmm?.devices);
  const sp = patchOf(servers);
  const wp = patchOf(workstations);
  const all = [...servers, ...workstations];
  const reporting = all.filter((d) => d.patchMissing != null || d.patchInstalled != null);
  const buckets = {
    clean: { label: "Up to date (0 missing)", devices: 0, missing: 0 },
    light: { label: "Light (1–5)", devices: 0, missing: 0 },
    medium: { label: "Moderate (6–20)", devices: 0, missing: 0 },
    heavy: { label: "Heavy (21+)", devices: 0, missing: 0 },
  };
  let onlineWith = 0;
  let offlineWith = 0;
  for (const d of reporting) {
    const miss = Number(d.patchMissing) || 0;
    const b = patchBucket(miss);
    buckets[b].devices += 1;
    buckets[b].missing += miss;
    if (miss > 0) {
      if (d.isOnline === false) offlineWith += 1;
      else onlineWith += 1;
    }
  }
  const serverRows = [...sp.offenders];
  const wsRows = [...wp.offenders];
  const recentCutoff = Date.now() - 30 * 24 * 3600 * 1000;
  const named = (rmm?.patches ?? []).filter((p) => p.title);
  const installed = named.filter((p) => p.status === "installed");
  const recent = installed.filter(
    (p) => p.installedAt && new Date(p.installedAt).getTime() >= recentCutoff,
  );
  const missingNamed = named.filter((p) => p.status === "missing" || p.status === "pending");
  function patchListTable(heading: string, list: typeof named, mode: "installed" | "missing"): string {
    const rows = list
      .slice(0, 120)
      .map((p) => {
        const when = p.installedAt ? esc(fmtDt(p.installedAt)) : "—";
        return `<tr><td>${esc(p.deviceName || p.deviceId)}</td><td>${esc(p.title)}</td><td>${esc(p.kb || "—")}</td><td>${esc(p.classification || p.status)}</td><td>${when}</td></tr>`;
      })
      .join("");
    return `<h3 class="sub">${esc(heading)}</h3>
    <table class="ams"><thead><tr><th class="dark">Server / device</th><th class="dark">Patch</th><th class="dark">KB</th><th class="dark">${mode === "installed" ? "Class" : "Status"}</th><th class="dark">${mode === "installed" ? "Installed" : "Seen"}</th></tr></thead>
    <tbody>${rows || `<tr><td colspan="5" class="muted">RMM did not publish named patches this collect — counts above still apply.</td></tr>`}</tbody></table>`;
  }
  return `<h3 class="sub">Patch compliance</h3>
  <p class="muted">Full estate from RPM RMM. <strong>Servers feed SLA</strong>. Workstations are visibility only and do not move assurance score. Devices with no patch counters are omitted from %.</p>
  ${kvTable([
    ["Server devices reporting", fmtN(sp.reporting)],
    ["Servers current (0 missing)", fmtN(sp.compliant)],
    ["Server compliance", `<span class="${(sp.compliancePct ?? 0) < 80 ? "bad" : (sp.compliancePct ?? 0) < 95 ? "warn" : "ok"}">${esc(fmtN(sp.compliancePct, "%"))}</span>`],
    ["Server outstanding / pending", `${fmtN(sp.missing)} / ${fmtN(sp.pending)}`],
    ["Installed patches (named, this customer)", fmtN(installed.length)],
    ["Recently installed (last 30 days)", fmtN(recent.length)],
    ["Named outstanding / pending", fmtN(missingNamed.length)],
    ["Workstation devices reporting", fmtN(wp.reporting)],
    ["Workstation compliance (visibility)", fmtN(wp.compliancePct, "%")],
    ["Workstation outstanding / pending", `${fmtN(wp.missing)} / ${fmtN(wp.pending)}`],
    ["Online devices with missing patches", fmtN(onlineWith)],
    ["Offline devices with missing patches", fmtN(offlineWith)],
  ])}
  <table class="ams">
    <thead><tr><th class="dark">Backlog band</th><th class="dark">Devices</th><th class="dark">Missing updates</th></tr></thead>
    <tbody>
      ${(["clean", "light", "medium", "heavy"] as const)
        .map((k) => {
          const row = buckets[k];
          const cls = k === "heavy" ? "bad" : k === "medium" ? "warn" : k === "clean" ? "ok" : "";
          return `<tr><td>${esc(row.label)}</td><td style="text-align:right">${esc(row.devices)}</td><td style="text-align:right" class="${cls}">${esc(row.missing)}</td></tr>`;
        })
        .join("")}
    </tbody>
  </table>
  ${rmmDeviceTable("Servers — full patch list", serverRows, "patch", 200)}
  ${rmmDeviceTable("Workstations — visibility only", wsRows, "patch", 200)}
  ${patchListTable("Recently installed patches (last 30 days)", recent, "installed")}
  ${patchListTable("Installed patches (this customer)", installed, "installed")}
  ${patchListTable("Outstanding / pending patches by device", missingNamed, "missing")}`;
}

/** Cover strip + RMM / RPM Cloud Backup / EPP / M365 sections for every customer pack. */
function coveredServicesHtml(detail: CustomerDetailPayload): string {
  const c = detail.customer;
  const cover: CustomerCover = coverFromDetail(detail);
  const parts: string[] = [];

  parts.push(`<h3 class="sub">Services on cover</h3>
  <p class="muted">Every RPM service is listed. Cover uses the same rule as the customer rail. Uncovered services stay visible as No cover — they are not scored.</p>
  ${kvTable([
    ["SYSPRO EcoSystem", ynCover(isPillarCovered(cover, "syspro"))],
    ["RPM RMM", ynCover(isPillarCovered(cover, "rmm"))],
    ["RPM Cloud Backup", ynCover(isPillarCovered(cover, "cove"))],
    ["RPM EndPoint Protection", ynCover(isPillarCovered(cover, "epp"))],
    ["Microsoft CSP", ynCover(isPillarCovered(cover, "csp"))],
  ])}`);

  const rmm = detail.rmm;
  const rs = rmm?.summary;
  if (!isPillarCovered(cover, "rmm")) {
    parts.push(`<h3 class="sub">RPM RMM</h3><p class="note"><strong class="warn">No cover</strong> — RPM RMM is not in scope for this customer.</p>`);
  } else if (!rs && !(rmm?.devices?.length)) {
    parts.push(`<h3 class="sub">RPM RMM</h3><p class="note"><strong class="ok">Cover</strong> — mapped, no device rows on the latest collect.</p>`);
  } else {
    const { servers, workstations } = splitRmmDevices(rmm?.devices);
    parts.push(`<h3 class="sub">RPM RMM</h3>${kvTable([
      ["Devices", esc(String(rs?.deviceCount ?? (rmm?.devices?.length ?? 0)))],
      ["Online / offline", `${esc(String(rs?.onlineCount ?? "—"))} / ${esc(String(rs?.offlineCount ?? "—"))}`],
      ["Servers online / offline", `${esc(String(rs?.serverOnline ?? servers.filter((d) => d.isOnline).length))} / ${esc(String(rs?.serverOffline ?? servers.filter((d) => d.isOnline === false).length))}`],
      ["Workstations online / offline", `${esc(String(rs?.workstationOnline ?? workstations.filter((d) => d.isOnline).length))} / ${esc(String(rs?.workstationOffline ?? workstations.filter((d) => d.isOnline === false).length))}`],
      ["Critical / elevated alerts", `${esc(String(rs?.criticalAlerts ?? 0))} / ${esc(String(rs?.elevatedAlerts ?? 0))}`],
      ["Outstanding patches", esc(String(rs?.patchMissing ?? "—"))],
      ["Org", esc(rmm?.pulsewayOrgName || c.pulsewayOrgName || "—")],
      ["Health", rs ? `<span class="${ragClass(rs.healthRag)}">${esc(rs.healthRag)}</span> — ${esc(rs.healthSummary)}` : "—"],
    ])}`);
    parts.push(patchComplianceHtml(detail));
  }

  const cove = detail.cove;
  if (!isPillarCovered(cover, "cove")) {
    parts.push(`<h3 class="sub">RPM Cloud Backup</h3><p class="note"><strong class="warn">No cover</strong> — Cove is not in scope for this customer.</p>`);
  } else {
    try {
      const esr = buildCoveEsr(detail);
      parts.push(`<h3 class="sub">RPM Cloud Backup</h3>${coveEsrSections(esr)}`);
    } catch {
      const cs = cove?.summary;
      parts.push(`<h3 class="sub">RPM Cloud Backup</h3>${kvTable([
        ["Devices", esc(String(cs?.deviceCount ?? cove?.devices?.length ?? 0))],
        ["OK / failed / stale", `${esc(String(cs?.okCount ?? "—"))} / ${esc(String(cs?.failedCount ?? "—"))} / ${esc(String(cs?.staleCount ?? "—"))}`],
        ["Last success", esc(fmtDt(cs?.lastSuccessAny))],
      ])}`);
    }
  }

  const epp = detail.epp;
  if (!isPillarCovered(cover, "epp")) {
    parts.push(`<h3 class="sub">RPM EndPoint Protection</h3><p class="note"><strong class="warn">No cover</strong> — no managed endpoints for this customer.</p>`);
  } else {
    const es = epp?.summary;
    parts.push(`<h3 class="sub">RPM EndPoint Protection</h3>${kvTable([
      ["Endpoints", esc(String(es?.deviceCount ?? epp?.devices?.length ?? c.eppDeviceCount ?? 0))],
      ["Managed / unmanaged", `${esc(String(es?.managedCount ?? "—"))} / ${esc(String(es?.unmanagedCount ?? "—"))}`],
      ["Infected", esc(String(c.bdInfectedCount ?? 0))],
      ["Last import", esc(fmtDt(es?.lastImportAt ?? c.eppLastImportAt))],
    ])}`);
  }

  const csp = detail.csp;
  if (!isPillarCovered(cover, "csp")) {
    parts.push(`<h3 class="sub">Microsoft CSP</h3><p class="note"><strong class="warn">No cover</strong> — Microsoft 365 is not in scope for this customer.</p>`);
  } else {
    const s = csp?.summary;
    const p = csp?.posture;
    parts.push(`<h3 class="sub">Microsoft CSP</h3>${kvTable([
      ["Domain", esc(csp?.tenant?.primaryDomain || "—")],
      ["Licensed users", esc(String(s?.licensedUserCount ?? c.cspUserCount ?? "—"))],
      ["Seats assigned / total", `${esc(String(s?.assignedSeats ?? c.cspAssignedSeats ?? "—"))} / ${esc(String(s?.totalSeats ?? "—"))}`],
      ["Secure Score", esc(p?.secureScorePct != null ? `${Math.round(p.secureScorePct)}%` : c.cspSecureScorePct != null ? `${Math.round(c.cspSecureScorePct)}%` : "—")],
      ["MFA registered", esc(p?.mfaRegisteredPct != null ? `${Math.round(p.mfaRegisteredPct)}%` : c.cspMfaRegisteredPct != null ? `${Math.round(c.cspMfaRegisteredPct)}%` : "—")],
    ])}`);
  }

  return parts.join("\n");
}

export function buildApplicationsAmsHtml(opts: {
  customer: CustomerDetailPayload;
  portfolio?: PortfolioPayload | null;
  /** weekly = ops digest; monthly/full = board pack */
  variant?: "full" | "weekly" | "monthly";
}): { subject: string; html: string; text: string } {
  const detail = opts.customer;
  const c = detail.customer;
  const variant = opts.variant || "full";
  const now = formatSastDateTime(new Date().toISOString());
  const dateLabel = formatSastDate(new Date().toISOString());
  const packLabel =
    variant === "weekly"
      ? "Weekly RPM Assure digest"
      : variant === "monthly"
        ? "Monthly RPM Assure board pack"
        : "Applications RPM Assure Report";
  const title = `${packLabel} — ${dateLabel} — ${c.displayName}`;

  const dtr = detail.dtrLevel1 ?? [];
  const backups = detail.sqlBackups ?? [];
  const jobs = detail.jobErrors ?? [];
  const ops = detail.operators ?? [];
  const license = detail.license;
  const ver = detail.sysproVersion;
  const hotfixes = detail.sysproHotfixes ?? [];
  const risks = (detail.risks ?? []).filter((r) => (r.status || "").toLowerCase() !== "closed");
  const incidents = detail.incidents ?? [];
  const sla = detail.availabilitySla;
  const oa = detail.operationalAssurance;

  // Job errors by program (top 10) — friendly labels
  const byProg = new Map<string, number>();
  for (const j of jobs) {
    const k = formatProgramLabel(j.programName) || j.programName || "Unknown";
    byProg.set(k, (byProg.get(k) ?? 0) + 1);
  }
  const topProg = [...byProg.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);


  const byOp = new Map<string, number>();
  for (const j of jobs) {
    const k = j.operator || "Unknown";
    byOp.set(k, (byOp.get(k) ?? 0) + 1);
  }
  const topOp = [...byOp.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

  const body = `
<div class="cover">
  <div class="cover-arc"></div>
  <div class="cover-dot"></div>
  <h1>${esc(packLabel)} — ${esc(dateLabel)}</h1>
  <h2>${esc(c.displayName)}${variant === "weekly" ? " · operational digest" : variant === "monthly" ? " · board pack" : ""}</h2>
  <div class="brand-row">
    <div class="brand">RPM <span>Assure</span></div>
    <div class="muted" style="font-size:12pt">${esc(c.customerCode)} · Health <span class="${ragClass(c.healthRag)}">${esc(c.healthRag)}</span></div>
  </div>
</div>

<div class="page">
  <h3 class="sub">Managed customer overview</h3>
  <table class="ams">
    <thead><tr><th class="dark">Customer</th><th class="dark">Code</th><th class="dark">Health</th><th class="dark">Assurance</th><th class="dark">Active users</th><th class="dark">Last collect</th></tr></thead>
    <tbody>
      <tr>
        <td>${esc(c.displayName)}</td>
        <td>${esc(c.customerCode)}</td>
        <td class="${ragClass(c.healthRag)}">${esc(c.healthRag)}</td>
        <td>${esc(oa?.scorePct != null ? `${oa.scorePct}%` : "—")}</td>
        <td>${esc(c.activeUserCount)} / ${esc(c.operatorCount)}</td>
        <td>${esc(fmtDt(c.lastImportAt))}</td>
      </tr>
    </tbody>
  </table>
  <p class="muted">${esc(c.healthSummary || oa?.summary || "")}</p>
  ${
    variant === "weekly"
      ? `<p class="muted"><strong>Weekly RPM Assure focus:</strong> every service on cover — SYSPRO, RMM, Cloud Backup, RPM EndPoint Protection, Microsoft CSP — plus jobs, FinSight, and open risks.</p>`
      : variant === "monthly"
        ? `<p class="muted"><strong>Monthly RPM Assure board pack:</strong> executive narrative for ExCo across all services on cover. Uncovered services are listed as No cover and are not scored.</p>`
        : `<p class="muted"><strong>Full assurance pack:</strong> SYSPRO plus every RPM service on cover (RMM, Cloud Backup, RPM EndPoint Protection, Microsoft CSP). No cover stays visible and is not scored.</p>`
  }

  ${coveredServicesHtml(detail)}

  <h3 class="sub">Executive snapshot</h3>
  <table class="ams">
    <thead><tr><th class="dark">Metric</th><th class="dark">Value</th><th class="dark">Notes</th></tr></thead>
    <tbody>
      <tr><td>Job errors (latest snapshot)</td><td class="${c.sysproJobErrorCount > 0 ? "warn" : "ok"}">${esc(c.sysproJobErrorCount)}</td><td>SYSPRO job logging</td></tr>
      <tr><td>FinSight out-of-balance lines</td><td class="${c.sysproDtrVarianceLines > 0 ? "warn" : "ok"}">${esc(c.sysproDtrVarianceLines)}</td><td>Control account recon / sub-ledger → GL</td></tr>
      <tr><td>Open risks</td><td>${esc(risks.length)}</td><td>RPM Assure risk register</td></tr>
      <tr><td>Incidents on file</td><td>${esc(incidents.length)}</td><td>${esc(incidents.filter((i) => i.isMajor).length)} major</td></tr>
      <tr><td>RPM SLA clocks</td><td>P1 30 min / 1 BH / 8 BH</td><td>Rev 5.0 — targets, not guarantees. No uptime %.</td></tr>
      <tr><td>Ticket measurement</td><td>${esc(sla?.slaCompliancePct != null ? `${sla.slaCompliancePct}%` : "Not measured")}</td><td>${esc(sla?.source === "live-incident" || sla?.source === "sla-period" ? "From helpdesk / period feed" : "Connect a desk feed before scoring clause 7.2")}</td></tr>
    </tbody>
  </table>

  <h3 class="sub">Syspro system error analysis — latest job errors by program</h3>
  <p class="muted">A rise in errors shows modules in a vulnerable state — investigate and correct. Modules with high errors should be focused on first.</p>
  <table class="ams">
    <thead><tr><th class="dark">Program / module</th><th class="dark">Error count</th></tr></thead>
    <tbody>
      ${
        topProg.length === 0
          ? `<tr><td colspan="2" class="muted">No job errors on latest snapshot.</td></tr>`
          : topProg
              .map(
                ([p, n]) =>
                  `<tr><td>${esc(formatProgramLabel(p))}</td><td style="text-align:right">${esc(n)}</td></tr>`,
              )
              .join("")
      }
    </tbody>
  </table>

  <h3 class="sub">Errors by top operator — latest snapshot</h3>
  <p class="muted">Users with repeated failures should be investigated (training, process, or client/server issues).</p>
  <table class="ams">
    <thead><tr><th class="dark">Operator</th><th class="dark">Error count</th></tr></thead>
    <tbody>
      ${
        topOp.length === 0
          ? `<tr><td colspan="2" class="muted">No operator error rows.</td></tr>`
          : topOp
              .map(
                ([o, n]) =>
                  `<tr><td>${esc(o)}</td><td style="text-align:right">${esc(n)}</td></tr>`,
              )
              .join("")
      }
    </tbody>
  </table>

  <h3 class="sub">FinSight — financial integrity (sub-ledger vs GL)</h3>
  <p class="muted">Variances indicate potential imbalance between sub-ledger and ledger. Investigate and correct. Rolling variance is not month-to-date only.</p>
  <table class="ams">
    <thead>
      <tr>
        <th class="dark">Module</th>
        <th class="dark">Name</th>
        <th class="dark">Out of Balance lines</th>
        <th class="dark">of L1</th>
        <th class="dark">Sum variance</th>
        <th class="dark">|Variance|</th>
        <th class="dark">Close value</th>
        <th class="dark">As of</th>
      </tr>
    </thead>
    <tbody>
      ${
        dtr.length === 0
          ? `<tr><td colspan="8" class="muted">FinSight not collected (or no Dtr*Balances on this customer).</td></tr>`
          : dtr
              .map(
                (r) => `<tr>
        <td>${esc(r.balanceTypeCode)}</td>
        <td>${esc(r.balanceTypeName)}</td>
        <td class="${r.varianceLineCount > 0 ? "bad" : "ok"}" style="text-align:right">${esc(r.varianceLineCount)}</td>
        <td style="text-align:right">${esc(r.totalLineCount)}</td>
        <td style="text-align:right">${esc(zar(r.totalVariance))}</td>
        <td style="text-align:right">${esc(zar(r.absVariance))}</td>
        <td style="text-align:right">${esc(zar(r.totalCloseBalance))}</td>
        <td>${esc(fmtD(r.asOfDate))}</td>
      </tr>`,
              )
              .join("")
      }
    </tbody>
  </table>

  <h3 class="sub">Licence information</h3>
  <table class="ams">
    <tbody>
      <tr><th>Product</th><td>${esc(license?.productName ?? ver?.productName ?? "—")}</td></tr>
      <tr><th>Version</th><td>${esc(license?.productVersion ?? ver?.productVersion ?? "—")}</td></tr>
      <tr><th>Build</th><td>${esc(ver?.buildNumber ?? "—")}</td></tr>
      <tr><th>Users</th><td>${esc(license?.users ?? ver?.users ?? "—")}</td></tr>
      <tr><th>Companies</th><td>${esc(ver?.companyCount ?? "—")}</td></tr>
      <tr><th>Expiry</th><td>${esc(fmtD(license?.licenseExpiry ?? ver?.licenseExpiry))}</td></tr>
      <tr><th>Server</th><td>${esc(ver?.serverName ?? "—")}</td></tr>
    </tbody>
  </table>

  <h3 class="sub">Hotfixes applied (SYSPRO) — ${esc(hotfixes.length)} installed</h3>
  <table class="ams">
    <thead><tr><th class="dark">KB / code</th><th class="dark">Name / description</th><th class="dark">Installed</th></tr></thead>
    <tbody>
      ${
        hotfixes.length === 0
          ? `<tr><td colspan="3" class="muted">No hotfix rows collected yet.</td></tr>`
          : hotfixes
              .slice(0, 80)
              .map(
                (h) =>
                  `<tr><td>${esc(h.hotfixCode)}</td><td>${esc(h.hotfixName ?? h.description ?? "")}</td><td>${esc(fmtDt(h.installedAt))}</td></tr>`,
              )
              .join("")
      }
    </tbody>
  </table>
  ${
    hotfixes.length > 80
      ? `<p class="muted">Showing 80 of ${hotfixes.length} installed hotfixes.</p>`
      : ""
  }

  <h3 class="sub">SQL backup status</h3>
  <table class="ams">
    <thead>
      <tr>
        <th class="dark">Database</th>
        <th class="dark">Last full</th>
        <th class="dark">Status</th>
        <th class="dark">Age (h)</th>
      </tr>
    </thead>
    <tbody>
      ${
        backups.length === 0
          ? `<tr><td colspan="4" class="muted">No backup rows.</td></tr>`
          : backups
              .map(
                (b) => `<tr>
        <td>${esc(b.databaseName)}</td>
        <td>${esc(fmtDt(b.lastFullBackup))}</td>
        <td class="${/fail|error/i.test(b.lastBackupStatus ?? "") ? "bad" : "ok"}">${esc(b.lastBackupStatus ?? "—")}</td>
        <td style="text-align:right">${esc(b.fullAgeHours ?? "—")}</td>
      </tr>`,
              )
              .join("")
      }
    </tbody>
  </table>

  <h3 class="sub">Operator activity (sample)</h3>
  <table class="ams">
    <thead><tr><th class="dark">Code</th><th class="dark">Name</th><th class="dark">Status</th><th class="dark">Last login</th></tr></thead>
    <tbody>
      ${
        ops.length === 0
          ? `<tr><td colspan="4" class="muted">No operators.</td></tr>`
          : ops
              .slice(0, 25)
              .map(
                (o) => `<tr>
        <td>${esc(o.operatorCode)}</td>
        <td>${esc(o.operatorName ?? "—")}</td>
        <td>${esc(o.operatorStatus ?? "—")}</td>
        <td>${esc(fmtDt(o.lastLoginDate))}</td>
      </tr>`,
              )
              .join("")
      }
    </tbody>
  </table>

  <h3 class="sub">Open risks & priorities</h3>
  <table class="ams">
    <thead><tr><th class="dark">Type</th><th class="dark">Title</th><th class="dark">RAG / status</th><th class="dark">Owner</th></tr></thead>
    <tbody>
      ${
        risks.length === 0 && (detail.priorities ?? []).length === 0
          ? `<tr><td colspan="4" class="muted">No open risks or priorities loaded.</td></tr>`
          : [
              ...risks.slice(0, 10).map(
                (r) =>
                  `<tr><td>Risk</td><td>${esc(r.title)}</td><td class="${ragClass(r.rag || "Amber")}">${esc(r.rag)} · ${esc(r.status)}</td><td>${esc(r.ownerName ?? "—")}</td></tr>`,
              ),
              ...(detail.priorities ?? []).slice(0, 8).map(
                (p) =>
                  `<tr><td>Priority</td><td>${esc(p.title)}</td><td>${esc(p.status ?? "Open")}</td><td>—</td></tr>`,
              ),
            ].join("")
      }
    </tbody>
  </table>

  <div class="note">
    <strong>Notes</strong>
    <ul>
      <li>This pack is generated from RPM Assure central collect (SYSPRO, RMM, Cloud Backup, RPM EndPoint Protection, Microsoft CSP, and AMS facts).</li>
      <li>Every service is listed. Cover uses the same rule as the customer rail. No cover is not scored.</li>
      <li>Sections such as 12-month sparkline trends, kill-script history, and full NOLOCK estate inventory appear when those collectors are enabled for the customer.</li>
      <li>Print or save as PDF from the browser. Outbound email is disabled.</li>
    </ul>
  </div>
</div>`;

  const text = [
    title,
    `Health: ${c.healthRag}`,
    `Jobs: ${c.sysproJobErrorCount} FinSight Out of Balance: ${c.sysproDtrVarianceLines}`,
    `Risks open: ${risks.length}`,
    `Generated: ${now}`,
  ].join("\n");

  return {
    subject: `RPM Assure — ${packLabel} — ${c.displayName} — ${dateLabel}`,
    html: shell(title, body, now),
    text,
  };
}

/** Portfolio weekly / estate digest in AMS-ish tables */
export function buildPortfolioAmsHtml(portfolio: PortfolioPayload): {
  subject: string;
  html: string;
  text: string;
} {
  const rows = portfolio.rows;
  const s = portfolio.summary;
  const now = formatSastDateTime(new Date().toISOString());
  const dateLabel = formatSastDate(new Date().toISOString());
  const title = `Applications RPM Assure Report — Estate — ${dateLabel}`;

  const attention = rows.filter((r) => r.healthRag !== "Green");

  const body = `
<div class="cover">
  <div class="cover-arc"></div>
  <div class="cover-dot"></div>
  <h1>Applications RPM Assure Report — ${esc(dateLabel)}</h1>
  <h2>Portfolio / estate overview</h2>
  <div class="brand-row">
    <div class="brand">RPM <span>Assure</span></div>
    <div class="muted" style="font-size:12pt">${esc(s.totalCustomers)} customers · ${esc(s.dataMode)} data</div>
  </div>
</div>
<div class="page">
  <h3 class="sub">Executive snapshot</h3>
  <table class="ams">
    <thead><tr><th class="dark">Customers</th><th class="dark">Red</th><th class="dark">Amber</th><th class="dark">Green</th><th class="dark">Active users</th></tr></thead>
    <tbody>
      <tr>
        <td>${esc(s.totalCustomers)}</td>
        <td class="bad">${esc(s.red)}</td>
        <td class="warn">${esc(s.amber)}</td>
        <td class="ok">${esc(s.green)}</td>
        <td>${esc(s.totalActiveUsers)}</td>
      </tr>
    </tbody>
  </table>

  <h3 class="sub">Customers needing attention</h3>
  <table class="ams">
    <thead><tr><th class="dark">Customer</th><th class="dark">Health</th><th class="dark">Summary</th><th class="dark">Jobs</th><th class="dark">Out of Balance</th><th class="dark">Collect</th></tr></thead>
    <tbody>
      ${
        attention.length === 0
          ? `<tr><td colspan="6" class="muted">No Red/Amber customers.</td></tr>`
          : attention
              .map(
                (r) => `<tr>
        <td>${esc(r.displayName)}</td>
        <td class="${ragClass(r.healthRag)}">${esc(r.healthRag)}</td>
        <td>${esc(r.healthSummary)}</td>
        <td style="text-align:right">${esc(r.sysproJobErrorCount)}</td>
        <td style="text-align:right">${esc(r.sysproDtrVarianceLines)}</td>
        <td>${esc(fmtDt(r.lastImportAt))}</td>
      </tr>`,
              )
              .join("")
      }
    </tbody>
  </table>

  <h3 class="sub">Full portfolio</h3>
  <table class="ams">
    <thead><tr><th class="dark">Customer</th><th class="dark">Health</th><th class="dark">Ops</th><th class="dark">Active</th><th class="dark">Jobs</th><th class="dark">Out of Balance</th></tr></thead>
    <tbody>
      ${rows
        .map(
          (r) => `<tr>
        <td>${esc(r.displayName)}</td>
        <td class="${ragClass(r.healthRag)}">${esc(r.healthRag)}</td>
        <td style="text-align:right">${esc(r.operatorCount)}</td>
        <td style="text-align:right">${esc(r.activeUserCount)}</td>
        <td style="text-align:right">${esc(r.sysproJobErrorCount)}</td>
        <td style="text-align:right">${esc(r.sysproDtrVarianceLines)}</td>
      </tr>`,
        )
        .join("")}
    </tbody>
  </table>
</div>`;

  return {
    subject: `RPM Assure — Estate Report — ${dateLabel}`,
    html: shell(title, body, now),
    text: `RPM Assure estate ${dateLabel}: ${s.red} Red, ${s.amber} Amber, ${s.green} Green of ${s.totalCustomers}`,
  };
}


function fieldOn(selected: Set<string>, id: string): boolean {
  return selected.has(id);
}

function kvTable(rows: Array<[string, string]>): string {
  return `<table class="ams"><tbody>${rows
    .map(
      ([k, v]) =>
        `<tr><td style="width:38%;font-weight:700;background:#f0f6fa">${esc(k)}</td><td>${v}</td></tr>`,
    )
    .join("")}</tbody></table>`;
}

/** Multi-pillar custom pack from selected field IDs */
export function buildCustomPackHtml(opts: {
  customer: CustomerDetailPayload;
  portfolio: PortfolioPayload;
  fieldIds: string[];
}): { subject: string; html: string; text: string } {
  const { customer: detail, fieldIds } = opts;
  const c = detail.customer;
  const code = c.customerCode;
  const name = c.displayName;
  const selected = new Set(fieldIds);
  const now = formatSastDateTime(new Date().toISOString());
  const dateLabel = formatSastDate(new Date().toISOString());
  const title = `Custom report — ${name} — ${dateLabel}`;
  const sections: string[] = [];

  // --- Estate ---
  if (fieldOn(selected, "health_rag") || fieldOn(selected, "collect_freshness") || fieldOn(selected, "assurance_score")) {
    const oa = detail.operationalAssurance;
    const rows: Array<[string, string]> = [];
    if (fieldOn(selected, "health_rag")) {
      rows.push([
        "Health",
        `<span class="${ragClass(c.healthRag)}">${esc(c.healthRag)}</span> — ${esc(c.healthSummary || "—")}`,
      ]);
    }
    if (fieldOn(selected, "collect_freshness")) {
      rows.push(["Last collect", esc(fmtDt(c.lastImportAt))]);
      if (oa?.collectAgeHours != null) {
        rows.push(["Collect age (hours)", esc(String(Math.round(oa.collectAgeHours * 10) / 10))]);
        rows.push(["Collect fresh", oa.collectFresh ? `<span class="ok">Yes</span>` : `<span class="bad">No</span>`]);
      }
    }
    if (fieldOn(selected, "assurance_score") && oa) {
      rows.push(["Assurance score", esc(oa.scorePct != null ? `${oa.scorePct}%` : "—")]);
      rows.push(["Assurance note", esc(oa.summary || "—")]);
    }
    sections.push(`<h2 class="sec">Customer health</h2>${kvTable(rows)}`);
  }

  if (fieldOn(selected, "cover_strip")) {
    const cover = coverFromDetail(detail);
    sections.push(`<h2 class="sec">Module cover</h2>${kvTable([
      ["SYSPRO Deployment", ynCover(isPillarCovered(cover, "syspro"))],
      ["RPM Remote Management", ynCover(isPillarCovered(cover, "rmm"))],
      ["RPM Cloud Backup", ynCover(isPillarCovered(cover, "cove"))],
      ["RPM EndPoint Protection", ynCover(isPillarCovered(cover, "epp"))],
      ["Microsoft 365 Tenant", ynCover(isPillarCovered(cover, "csp"))],
    ])}`);
  }

  // --- SYSPRO ---
  if (fieldOn(selected, "syspro_jobs")) {
    const jobs = (detail.jobErrors || []).slice(0, 15);
    sections.push(`<h2 class="sec">SYSPRO job errors</h2>
    ${kvTable([["Job error count", esc(String(c.sysproJobErrorCount ?? jobs.length))]])}
    <table class="ams"><thead><tr><th class="dark">Program</th><th class="dark">Operator</th><th class="dark">Message</th></tr></thead>
    <tbody>${
      jobs.length
        ? jobs
            .map(
              (j) =>
                `<tr><td>${esc(formatProgramLabel(j.programName || "—"))}</td><td>${esc(j.operator || "—")}</td><td>${esc((j.message || "").slice(0, 120))}</td></tr>`,
            )
            .join("")
        : `<tr><td colspan="3" class="muted">No job errors on latest collect.</td></tr>`
    }</tbody></table>`);
  }

  if (fieldOn(selected, "syspro_operators")) {
    sections.push(`<h2 class="sec">Operators</h2>${kvTable([
      ["Total operators", esc(String(c.operatorCount ?? "—"))],
      ["Active users", esc(String(c.activeUserCount ?? "—"))],
    ])}`);
  }

  if (fieldOn(selected, "syspro_license") && detail.license) {
    const L = detail.license;
    sections.push(`<h2 class="sec">Licence & version</h2>${kvTable([
      ["Product", esc(L.productName || "—")],
      ["Version", esc(L.productVersion || detail.sysproVersion?.productVersion || "—")],
      ["Users", esc(String(L.users ?? "—"))],
      ["Expiry", esc(fmtD(L.licenseExpiry))],
    ])}`);
  } else if (fieldOn(selected, "syspro_license")) {
    sections.push(`<h2 class="sec">Licence & version</h2><p class="muted">No licence row on this snapshot.</p>`);
  }

  if (fieldOn(selected, "syspro_hotfixes")) {
    const hfs = (detail.sysproHotfixes || []).slice(0, 25);
    sections.push(`<h2 class="sec">Hotfixes installed</h2>
    <table class="ams"><thead><tr><th class="dark">Code</th><th class="dark">Name</th><th class="dark">Installed</th></tr></thead>
    <tbody>${
      hfs.length
        ? hfs
            .map(
              (h) =>
                `<tr><td>${esc(h.hotfixCode || "—")}</td><td>${esc(h.hotfixName || h.description || "—")}</td><td>${esc(fmtD(h.installedAt))}</td></tr>`,
            )
            .join("")
        : `<tr><td colspan="3" class="muted">No hotfixes listed.</td></tr>`
    }</tbody></table>`);
  }

  if (fieldOn(selected, "syspro_hotfix_gap")) {
    const gap = detail.hotfixGap || [];
    const sum = detail.hotfixGapSummary;
    sections.push(`<h2 class="sec">Hotfix gap</h2>
    ${sum ? `<p class="note">Baseline ${esc(sum.baselineCount)} · missing ${esc(sum.missingCount)} · mandatory missing ${esc(sum.missingMandatory)}</p>` : ""}
    <table class="ams"><thead><tr><th class="dark">Code</th><th class="dark">Title</th><th class="dark">Severity</th></tr></thead>
    <tbody>${
      gap.length
        ? gap
            .slice(0, 30)
            .map((g) => `<tr><td>${esc(g.hotfixCode)}</td><td>${esc(g.title || "—")}</td><td>${esc(g.severity || "—")}</td></tr>`)
            .join("")
        : `<tr><td colspan="3" class="muted">No mandatory gap rows (or not collected).</td></tr>`
    }</tbody></table>`);
  }

  if (fieldOn(selected, "syspro_sql_backups")) {
    const backs = detail.sqlBackups || [];
    sections.push(`<h2 class="sec">SQL script backup status</h2>
    <table class="ams"><thead><tr><th class="dark">Database</th><th class="dark">Last full</th><th class="dark">Status</th><th class="dark">Age (h)</th></tr></thead>
    <tbody>${
      backs.length
        ? backs
            .slice(0, 40)
            .map(
              (b) =>
                `<tr><td>${esc(b.databaseName || "—")}</td><td>${esc(fmtDt(b.lastFullBackup))}</td><td>${esc(b.lastBackupStatus || "—")}</td><td style="text-align:right">${esc(b.fullAgeHours != null ? String(b.fullAgeHours) : "—")}</td></tr>`,
            )
            .join("")
        : `<tr><td colspan="4" class="muted">No SQL backup rows.</td></tr>`
    }</tbody></table>`);
  }

  // --- FinSight ---
  if (fieldOn(selected, "finsight_matrix") || fieldOn(selected, "finsight_exceptions")) {
    const sc = finsightScore(detail.dtrLevel1);
    sections.push(`<h2 class="sec">FinSight</h2>
    ${kvTable([
      ["Modules", esc(String(sc.modules))],
      ["Out of balance modules", `<span class="${sc.modulesOob ? "bad" : "ok"}">${esc(String(sc.modulesOob))}</span>`],
      ["OOB lines", esc(String(sc.oobLines))],
      ["Abs variance", esc(zar(sc.absVar))],
    ])}`);
    if (fieldOn(selected, "finsight_matrix")) {
      sections.push(`<h3 class="sub">Control matrix</h3>
      <table class="ams"><thead><tr>
        <th class="dark">Cust</th><th class="dark">Code</th><th class="dark">Module</th>
        <th class="dark">Close</th><th class="dark">Variance</th><th class="dark">|Var|</th>
        <th class="dark">OOB</th><th class="dark">Status</th>
      </tr></thead><tbody>${finsightControlTable(detail.dtrLevel1, code)}</tbody></table>`);
    }
    if (fieldOn(selected, "finsight_exceptions")) {
      sections.push(`<h3 class="sub">Exception register</h3>
      <table class="ams"><thead><tr>
        <th class="dark">Cust</th><th class="dark">Code</th><th class="dark">Module</th>
        <th class="dark">Close</th><th class="dark">Variance</th><th class="dark">|Var|</th>
        <th class="dark">OOB</th><th class="dark">Status</th>
      </tr></thead><tbody>${finsightControlTable(detail.dtrLevel1, code, { onlyOob: true })}</tbody></table>`);
    }
  }

  // --- RMM ---
  const cover = coverFromDetail(detail);
  const rmm = detail.rmm;
  const rs = rmm?.summary;
  if (fieldOn(selected, "rmm_fleet") || fieldOn(selected, "rmm_alerts") || fieldOn(selected, "rmm_patches") || fieldOn(selected, "rmm_disks") || fieldOn(selected, "rmm_reboot")) {
    if (!isPillarCovered(cover, "rmm")) {
      sections.push(`<h2 class="sec">RPM Remote Management</h2><p class="note"><strong class="warn">No cover</strong> — RPM RMM is not in scope for this customer.</p>`);
    } else if (!rs && !(rmm?.devices?.length)) {
      sections.push(`<h2 class="sec">RPM Remote Management</h2><p class="note"><strong class="ok">Cover</strong> — mapped, no device rows on the latest collect.</p>`);
    } else {
      const rows: Array<[string, string]> = [];
      if (fieldOn(selected, "rmm_fleet") && rs) {
        rows.push(["Devices", esc(String(rs.deviceCount))]);
        rows.push(["Online / offline", `${esc(String(rs.onlineCount))} / ${esc(String(rs.offlineCount))}`]);
        rows.push([
          "Servers online / offline",
          `${esc(String(rs.serverOnline ?? "—"))} / ${esc(String(rs.serverOffline ?? "—"))}`,
        ]);
        rows.push([
          "Workstations online / offline",
          `${esc(String(rs.workstationOnline ?? "—"))} / ${esc(String(rs.workstationOffline ?? "—"))}`,
        ]);
        rows.push(["Health", `<span class="${ragClass(rs.healthRag)}">${esc(rs.healthRag)}</span> — ${esc(rs.healthSummary)}`]);
      }
      if (fieldOn(selected, "rmm_alerts") && rs) {
        rows.push(["Critical alerts", esc(String(rs.criticalAlerts))]);
        rows.push(["Elevated alerts", esc(String(rs.elevatedAlerts))]);
      }
      if (fieldOn(selected, "rmm_disks") && rs) {
        rows.push(["Disk used GB", esc(rs.diskUsedGb != null ? String(rs.diskUsedGb) : "—")]);
        rows.push(["Disk free GB", esc(rs.diskFreeGb != null ? String(rs.diskFreeGb) : "—")]);
        rows.push(["Disk high volumes", esc(String(rs.diskHighCount))]);
      }
      if (fieldOn(selected, "rmm_reboot") && rs) {
        rows.push(["Max days since reboot", esc(rs.maxDaysSinceReboot != null ? String(rs.maxDaysSinceReboot) : "—")]);
        rows.push(["Avg days since reboot", esc(rs.avgDaysSinceReboot != null ? String(rs.avgDaysSinceReboot) : "—")]);
      }
      sections.push(`<h2 class="sec">RPM Remote Management</h2>${kvTable(rows)}`);
      if (fieldOn(selected, "rmm_patches") || fieldOn(selected, "rmm_patch_table")) {
        sections.push(patchComplianceHtml(detail));
      }
    }
  }

  if (fieldOn(selected, "rmm_offline") && rmm?.devices?.length) {
    const off = rmm.devices.filter((d) => d.isOnline === false).slice(0, 30);
    sections.push(`<h2 class="sec">Offline devices</h2>
    <table class="ams"><thead><tr><th class="dark">Device</th><th class="dark">Type</th><th class="dark">Last seen</th><th class="dark">Offline now</th></tr></thead>
    <tbody>${
      off.length
        ? off
            .map(
              (d) =>
                `<tr><td>${esc(d.name || d.deviceId)}</td><td>${esc(d.deviceType || "—")}</td><td>${esc(fmtDt(d.lastSeenOnline))}</td><td>${esc(d.offlineHoursCurrent != null ? `${d.offlineHoursCurrent}h` : "—")}</td></tr>`,
            )
            .join("")
        : `<tr><td colspan="4" class="muted">No offline devices on latest snapshot.</td></tr>`
    }</tbody></table>`);
  }

  // --- Cove ---
  const cove = detail.cove;
  if (fieldOn(selected, "cove_summary") || fieldOn(selected, "cove_recovery") || fieldOn(selected, "cove_devices")) {
    if (!isPillarCovered(cover, "cove")) {
      sections.push(`<h2 class="sec">RPM Cloud Backup</h2><p class="note"><strong class="warn">No cover</strong> — Cove is not in scope for this customer.</p>`);
    } else {
      const cs = cove?.summary;
      const rows: Array<[string, string]> = [];
      if (fieldOn(selected, "cove_summary") && cs) {
        rows.push(["Devices", esc(String(cs.deviceCount))]);
        rows.push(["OK / failed / stale", `${esc(String(cs.okCount))} / ${esc(String(cs.failedCount))} / ${esc(String(cs.staleCount))}`]);
        rows.push(["Last success (any)", esc(fmtDt(cs.lastSuccessAny))]);
        rows.push(["Last import", esc(fmtDt(cs.lastImportAt))]);
      }
      if (fieldOn(selected, "cove_recovery")) {
        const rec = cove?.recovery || cs?.recovery;
        if (rec) {
          rows.push(["Recovery testing devices", esc(String((rec as { testingCount?: number }).testingCount ?? (rec as { recoveryTestingCount?: number }).recoveryTestingCount ?? "—"))]);
          rows.push(["Standby image", esc(String((rec as { standbyCount?: number }).standbyCount ?? "—"))]);
        } else {
          rows.push(["Recovery testing", "Not on snapshot"]);
        }
      }
      sections.push(`<h2 class="sec">RPM Cloud Backup</h2>${kvTable(rows)}`);
      if (fieldOn(selected, "cove_devices") && cove?.devices?.length) {
        sections.push(`<h3 class="sub">Devices on cloud backup</h3>
        <table class="ams"><thead><tr><th class="dark">Machine / server</th><th class="dark">Cove device</th><th class="dark">Status</th><th class="dark">Last success</th></tr></thead>
        <tbody>${cove.devices
          .slice(0, 40)
          .map(
            (d) =>
              `<tr><td>${esc(d.machineName || d.deviceName || "—")}</td><td>${esc(d.deviceName || "—")}</td><td>${esc(d.lastBackupStatus || "—")}</td><td>${esc(fmtDt(d.lastSuccessTime))}</td></tr>`,
          )
          .join("")}</tbody></table>`);
      }
    }
  }

  // --- EPP ---
  const epp = detail.epp;
  if (fieldOn(selected, "epp_summary") || fieldOn(selected, "epp_incidents")) {
    if (!isPillarCovered(cover, "epp")) {
      sections.push(`<h2 class="sec">RPM EndPoint Protection</h2><p class="note"><strong class="warn">No cover</strong> — no managed endpoints for this customer.</p>`);
    } else {
      const es = epp?.summary;
      const rows: Array<[string, string]> = [];
      if (fieldOn(selected, "epp_summary") && es) {
        rows.push(["Endpoints", esc(String(es.deviceCount))]);
        rows.push(["Managed / unmanaged", `${esc(String(es.managedCount))} / ${esc(String(es.unmanagedCount))}`]);
        rows.push(["Servers / workstations", `${esc(String(es.serverCount))} / ${esc(String(es.workstationCount))}`]);
        if (epp?.license) {
        rows.push([
            "MSP licence slots (estate-wide)",
            `${esc(String(epp.license.usedSlots ?? "—"))} / ${esc(String(epp.license.totalSlots ?? "—"))}`,
          ]);
        }
      }
      if (fieldOn(selected, "epp_incidents")) {
        const fs = epp?.feedStatus;
        rows.push([
          "Incidents",
          esc(
            String(
              fs?.incidentsCount ?? epp?.incidents?.length ?? (fs?.incidentsOk === false ? fs.incidentsMessage || "N/A" : 0),
            ),
          ),
        ]);
        rows.push([
          "Quarantine",
          esc(
            String(
              fs?.quarantineCount ?? epp?.quarantine?.length ?? (fs?.quarantineOk === false ? fs.quarantineMessage || "N/A" : 0),
            ),
          ),
        ]);
      }
      sections.push(`<h2 class="sec">RPM EndPoint Protection</h2>${kvTable(rows)}`);
    }
  }

  // --- CSP ---
  const csp = detail.csp as
    | {
        enabled?: boolean;
        summary?: {
          userCount?: number;
          assignedSeats?: number;
          totalSeats?: number;
          secureScorePct?: number;
          mfaRegisteredPct?: number;
          primaryDomain?: string;
          lastImportAt?: string;
        } | null;
      }
    | null
    | undefined;
  if (fieldOn(selected, "csp_summary")) {
    if (!csp?.enabled && !csp?.summary) {
      sections.push(`<h2 class="sec">Microsoft 365 Tenant</h2><p class="note"><strong class="warn">No cover</strong> — pilot / no CSP data.</p>`);
    } else {
      const s = csp?.summary;
      sections.push(`<h2 class="sec">Microsoft 365 Tenant</h2>${kvTable([
        ["Primary domain", esc(s?.primaryDomain || "—")],
        ["Users", esc(String(s?.userCount ?? "—"))],
        ["Seats assigned / total", `${esc(String(s?.assignedSeats ?? "—"))} / ${esc(String(s?.totalSeats ?? "—"))}`],
        ["Secure Score %", esc(s?.secureScorePct != null ? String(s.secureScorePct) : "—")],
        ["MFA registered %", esc(s?.mfaRegisteredPct != null ? String(s.mfaRegisteredPct) : "—")],
        ["Last import", esc(fmtDt(s?.lastImportAt))],
      ])}`);
    }
  }

  // --- Assurance ---
  if (fieldOn(selected, "ams_risks")) {
    const risks = (detail.risks || []).slice(0, 15);
    sections.push(`<h2 class="sec">Open risks</h2>
    <table class="ams"><thead><tr><th class="dark">Risk</th><th class="dark">Status</th><th class="dark">Severity</th></tr></thead>
    <tbody>${
      risks.length
        ? risks
            .map(
              (r) =>
                `<tr><td>${esc(r.title || "—")}</td><td>${esc(r.status || "—")}</td><td>${esc(r.rag || "—")}</td></tr>`,
            )
            .join("")
        : `<tr><td colspan="3" class="muted">No open risks listed.</td></tr>`
    }</tbody></table>`);
  }

  if (fieldOn(selected, "ams_priorities")) {
    const pri = (detail.priorities || []).slice(0, 15);
    sections.push(`<h2 class="sec">Priorities</h2>
    <table class="ams"><thead><tr><th class="dark">Priority</th><th class="dark">Status</th></tr></thead>
    <tbody>${
      pri.length
        ? pri
            .map((p) => `<tr><td>${esc(p.title || "—")}</td><td>${esc(p.status || "—")}</td></tr>`)
            .join("")
        : `<tr><td colspan="2" class="muted">No priorities listed.</td></tr>`
    }</tbody></table>`);
  }

  if (fieldOn(selected, "ams_incidents")) {
    const inc = detail.incidents || [];
    const sla = detail.availabilitySla || detail.amsSlaSummary;
    sections.push(`<h2 class="sec">Incidents & SLA</h2>${kvTable([
      ["Incidents (listed)", esc(String(inc.length))],
      ["Availability %", esc((sla as { availabilityPct?: number } | null)?.availabilityPct != null ? String((sla as { availabilityPct?: number }).availabilityPct) : "—")],
      ["SLA compliance %", esc((sla as { compliancePct?: number } | null)?.compliancePct != null ? String((sla as { compliancePct?: number }).compliancePct) : "—")],
    ])}`);
  }

  if (!sections.length) {
    sections.push(`<p class="note">No fields selected — choose sections in Custom report.</p>`);
  }

  const labels = REPORT_FIELDS.filter((f: ReportFieldDef) => selected.has(f.id))
    .map((f) => f.label)
    .join(", ");

  const body = `
<div class="cover">
  <div class="cover-arc"></div>
  <div class="cover-dot"></div>
  <h1>Custom report — ${esc(dateLabel)}</h1>
  <h2>${esc(name)} (${esc(code)})</h2>
  <div class="brand-row">
    <div class="brand">RPM <span>Assure</span></div>
    <div class="muted" style="font-size:11pt">Selected fields: ${esc(labels.slice(0, 280))}${labels.length > 280 ? "…" : ""}</div>
  </div>
</div>
<div class="page">
  <div class="teal-banner"><h1>${esc(name)}</h1><span class="when">${esc(dateLabel)}</span></div>
  ${sections.join("\n")}
</div>`;

  return {
    subject: `RPM Assure — Custom report — ${name} — ${dateLabel}`,
    html: shell(title, body, now),
    text: `Custom report ${name}: ${labels}`,
  };
}

/** Dedicated RMM service pack */
export function buildRmmServiceHtml(opts: {
  customer: CustomerDetailPayload;
  portfolio: PortfolioPayload;
}): { subject: string; html: string; text: string } {
  return rmmPack({
    ...opts,
    kind: "service",
    title: "Remote Management Pack",
    note: "Fleet, alerts, patches, and offline. Servers feed SLA. Workstations are visibility only.",
  });
}

export function buildRmmAvailabilityHtml(opts: {
  customer: CustomerDetailPayload;
  portfolio: PortfolioPayload;
}): { subject: string; html: string; text: string } {
  return rmmPack({
    ...opts,
    kind: "availability",
    title: "Server Availability",
    note: "Server uptime and offline duration. Workstations listed separately — not in SLA.",
  });
}

export function buildRmmPatchHtml(opts: {
  customer: CustomerDetailPayload;
  portfolio: PortfolioPayload;
}): { subject: string; html: string; text: string } {
  return rmmPack({
    ...opts,
    kind: "patch",
    title: "Patch Compliance",
    note: "Server patch compliance first. Workstation backlog is visibility only.",
  });
}

export function buildRmmCapacityHtml(opts: {
  customer: CustomerDetailPayload;
  portfolio: PortfolioPayload;
}): { subject: string; html: string; text: string } {
  return rmmPack({
    ...opts,
    kind: "capacity",
    title: "Capacity & Performance",
    note: "Disk at risk (≥85%), CPU ≥80%, memory ≥85%. Peak IOPS only if RPM RMM publishes it (v3 API does not).",
  });
}

function rmmPack(opts: {
  customer: CustomerDetailPayload;
  portfolio: PortfolioPayload;
  kind: "service" | "availability" | "patch" | "capacity";
  title: string;
  note: string;
}): { subject: string; html: string; text: string } {
  const detail = opts.customer;
  const c = detail.customer;
  const name = c.displayName;
  const code = c.customerCode;
  const now = formatSastDateTime(new Date().toISOString());
  const dateLabel = formatSastDate(new Date().toISOString());
  const rmm = detail.rmm;
  const rs = rmm?.summary;
  const { servers, workstations, all } = splitRmmDevices(rmm?.devices);
  const sav = availabilityOf(servers);
  const wav = availabilityOf(workstations);
  const scap = capacityOf(servers);
  const wcap = capacityOf(workstations);
  const covered = Boolean(rmm?.enabled || rs || all.length);

  const sections: string[] = [];
  if (!covered) {
    sections.push(
      `<p class="note"><strong class="warn">No cover</strong> — no RMM / RPM RMM data for this customer.</p>`,
    );
  } else {
    sections.push(`<p class="note">${esc(opts.note)}</p>`);

    if (opts.kind === "service" || opts.kind === "availability") {
      sections.push(`<h2 class="sec">Availability</h2>${kvTable([
        ["Servers online / offline", `${fmtN(sav.online)} / ${fmtN(sav.offline)}`],
        ["Server availability now", fmtN(sav.onlinePctNow, "%")],
        ["Server avg online %", fmtN(sav.avgOnlinePct, "%")],
        ["Server offline hours (7d avg)", fmtN(sav.offlineHours7d, "h")],
        ["Server offline hours (30d avg)", fmtN(sav.offlineHours30d, "h")],
        ["Maintenance (estate)", fmtN(rs?.maintenanceCount)],
        ["Critical / elevated alerts", `${fmtN(rs?.criticalAlerts)} / ${fmtN(rs?.elevatedAlerts)}`],
        ["Workstations online / offline (not SLA)", `${fmtN(wav.online)} / ${fmtN(wav.offline)}`],
        ["Health", rs ? `<span class="${ragClass(rs.healthRag)}">${esc(rs.healthRag)}</span> — ${esc(rs.healthSummary)}` : "—"],
      ])}`);
    }

    if (opts.kind === "service" || opts.kind === "patch") {
      sections.push(patchComplianceHtml(detail));
    }

    if (opts.kind === "service" || opts.kind === "capacity") {
      sections.push(`<h2 class="sec">Capacity & performance</h2>${kvTable([
        ["Server disk used / free GB", `${fmtN(scap.diskUsedGb)} / ${fmtN(scap.diskFreeGb)}`],
        ["Server volumes at risk (≥85%)", fmtN(scap.atRiskVolumes)],
        ["Server avg CPU / memory", `${fmtN(scap.avgCpu, "%")} / ${fmtN(scap.avgMem, "%")}`],
        ["Servers CPU ≥80% / memory ≥85%", `${fmtN(scap.cpuHot)} / ${fmtN(scap.memHot)}`],
        ["Server peak IOPS", fmtN(scap.maxIops)],
        ["Workstation volumes at risk (visibility)", fmtN(wcap.atRiskVolumes)],
      ])}`);
    }

    if (opts.kind === "availability") {
      sections.push(rmmDeviceTable("Servers — availability", servers, "availability"));
      sections.push(rmmDeviceTable("Workstations — visibility only", workstations, "availability"));
    }
    if (opts.kind === "capacity") {
      sections.push(rmmDeviceTable("Servers — capacity", servers, "capacity"));
      sections.push(rmmDeviceTable("Workstations — visibility only", workstations.slice(0, 25), "capacity"));
    }
    if (opts.kind === "service" || opts.kind === "availability") {
      const off = all.filter((d) => d.isOnline === false).slice(0, 30);
      sections.push(`<h2 class="sec">Offline devices</h2>
      <table class="ams"><thead><tr><th class="dark">Device</th><th class="dark">Class</th><th class="dark">Last seen</th><th class="dark">Offline now</th><th class="dark">7d off</th></tr></thead>
      <tbody>${
        off.length
          ? off
              .map(
                (d) =>
                  `<tr><td>${esc(d.name || d.deviceId)}</td><td>${esc(isRmmServer(d) ? "Server" : "Workstation")}</td><td>${esc(fmtDt(d.lastSeenOnline))}</td><td>${esc(d.offlineHoursCurrent != null ? `${d.offlineHoursCurrent}h` : "—")}</td><td>${esc(fmtN(d.offlineHours7d, "h"))}</td></tr>`,
              )
              .join("")
          : `<tr><td colspan="5" class="muted">No offline devices on latest snapshot.</td></tr>`
      }</tbody></table>`);
    }
  }

  const body = `
<div class="cover">
  <div class="cover-arc"></div>
  <div class="cover-dot"></div>
  <h1>${esc(opts.title)} — ${esc(dateLabel)}</h1>
  <h2>${esc(name)} (${esc(code)})</h2>
  <div class="brand-row">
    <div class="brand">RPM <span>Assure</span></div>
    <div class="muted" style="font-size:11pt">RPM RMM · RMM snapshot</div>
  </div>
</div>
<div class="page">
  <div class="teal-banner"><h1>${esc(name)}</h1><span class="when">${esc(dateLabel)}</span></div>
  ${sections.join("\n")}
</div>`;

  return {
    subject: `RPM Assure — ${opts.title} — ${name} — ${dateLabel}`,
    html: shell(`${opts.title} — ${name} — ${dateLabel}`, body, now),
    text: `${opts.title} ${name}`,
  };
}

function rmmDeviceTable(
  heading: string,
  list: RmmDeviceRow[],
  mode: "availability" | "patch" | "capacity",
  limit = 40,
): string {
  if (mode === "availability") {
    const rows = list
      .slice(0, limit)
      .map(
        (d) =>
          `<tr><td>${esc(d.name || d.deviceId)}</td><td>${d.isOnline === false ? "Offline" : d.isOnline ? "Online" : "—"}</td><td>${esc(fmtDt(d.lastSeenOnline))}</td><td style="text-align:right">${esc(fmtN(d.onlinePct, "%"))}</td><td style="text-align:right">${esc(fmtN(d.offlineHours7d, "h"))}</td><td style="text-align:right">${esc(fmtN(d.offlineHours30d, "h"))}</td><td style="text-align:right">${esc(fmtN(d.daysSinceReboot))}</td></tr>`,
      )
      .join("");
    return `<h2 class="sec">${esc(heading)}</h2>
    <table class="ams"><thead><tr><th class="dark">Device</th><th class="dark">State</th><th class="dark">Last seen</th><th class="dark">Online %</th><th class="dark">7d off</th><th class="dark">30d off</th><th class="dark">Reboot days</th></tr></thead>
    <tbody>${rows || `<tr><td colspan="7" class="muted">None</td></tr>`}</tbody></table>`;
  }
  if (mode === "patch") {
    const rows = list
      .slice(0, limit)
      .map(
        (d) =>
          `<tr><td>${esc(d.name || d.deviceId)}</td><td>${d.isOnline === false ? "Offline" : d.isOnline ? "Online" : "—"}</td><td style="text-align:right" class="${(d.patchMissing ?? 0) > 0 ? "bad" : "ok"}">${esc(d.patchMissing ?? "—")}</td><td style="text-align:right">${esc(d.patchPending ?? "—")}</td><td style="text-align:right">${esc(d.patchInstalled ?? "—")}</td><td>${esc(d.osName || "—")}</td></tr>`,
      )
      .join("");
    return `<h2 class="sec">${esc(heading)}</h2>
    <table class="ams"><thead><tr><th class="dark">Device</th><th class="dark">State</th><th class="dark">Missing</th><th class="dark">Pending</th><th class="dark">Installed</th><th class="dark">OS</th></tr></thead>
    <tbody>${rows || `<tr><td colspan="6" class="muted">None reporting patches</td></tr>`}</tbody></table>`;
  }
  const rows = list
    .slice(0, 40)
    .map((d) => {
      const risk = (d.disks ?? []).filter((v) => (v.usedPct ?? 0) >= 85).length;
      const usedPct =
        d.diskTotalGb && d.diskUsedGb != null
          ? Math.round((d.diskUsedGb / d.diskTotalGb) * 1000) / 10
          : null;
      return `<tr><td>${esc(d.name || d.deviceId)}</td><td style="text-align:right">${esc(fmtN(d.cpuPct, "%"))}</td><td style="text-align:right">${esc(fmtN(d.memoryPct, "%"))}</td><td style="text-align:right">${esc(fmtN(usedPct, "%"))}</td><td style="text-align:right" class="${risk ? "bad" : ""}">${risk || "—"}</td><td style="text-align:right">${esc(fmtN(d.diskIopsMax))}</td></tr>`;
    })
    .join("");
  return `<h2 class="sec">${esc(heading)}</h2>
  <table class="ams"><thead><tr><th class="dark">Device</th><th class="dark">CPU</th><th class="dark">Memory</th><th class="dark">Disk used</th><th class="dark">Volumes ≥85%</th><th class="dark">Peak IOPS</th></tr></thead>
  <tbody>${rows || `<tr><td colspan="6" class="muted">None</td></tr>`}</tbody></table>`;
}

function coveBytes(d: { usedBytes?: number | null; selectedBytes?: number | null }): string {
  const n = d.usedBytes ?? d.selectedBytes;
  if (n == null || !Number.isFinite(n)) return "—";
  const gb = n / 1024 / 1024 / 1024;
  return gb >= 1 ? `${Math.round(gb * 10) / 10} GB` : `${Math.round(n / 1024 / 1024)} MB`;
}

function pillarPackShell(
  title: string,
  name: string,
  code: string,
  dateLabel: string,
  now: string,
  sections: string[],
  sub: string,
): { subject: string; html: string; text: string } {
  const body = `
<div class="cover">
  <div class="cover-arc"></div>
  <div class="cover-dot"></div>
  <h1>${esc(title)} — ${esc(dateLabel)}</h1>
  <h2>${esc(name)} (${esc(code)})</h2>
  <div class="brand-row">
    <div class="brand">RPM <span>Assure</span></div>
    <div class="muted" style="font-size:11pt">${esc(sub)}</div>
  </div>
</div>
<div class="page">
  <div class="teal-banner"><h1>${esc(name)}</h1><span class="when">${esc(dateLabel)}</span></div>
  ${sections.join("\n")}
</div>`;
  return {
    subject: `RPM Assure — ${title} — ${name} — ${dateLabel}`,
    html: shell(`${title} — ${name} — ${dateLabel}`, body, now),
    text: `${title} ${name}`,
  };
}

export function buildCoveServiceHtml(opts: {
  customer: CustomerDetailPayload;
  portfolio: PortfolioPayload;
}): { subject: string; html: string; text: string } {
  return covePack(opts, "service");
}

export function buildCoveRecoveryHtml(opts: {
  customer: CustomerDetailPayload;
  portfolio: PortfolioPayload;
}): { subject: string; html: string; text: string } {
  return covePack(opts, "recovery");
}

function covePack(
  opts: { customer: CustomerDetailPayload; portfolio: PortfolioPayload },
  kind: "service" | "recovery",
): { subject: string; html: string; text: string } {
  const c = opts.customer.customer;
  const now = formatSastDateTime(new Date().toISOString());
  const dateLabel = formatSastDate(new Date().toISOString());
  const esr = buildCoveEsr(opts.customer);
  const title = kind === "recovery" ? "Cove Recovery Testing" : "Cloud Backup Executive Summary";
  const sections = [coveEsrSections(esr)];
  if (kind === "recovery" && esr.covered) {
    const devices = opts.customer.cove?.devices ?? [];
    sections.push(`<h2 class="sec">Devices in recovery plans</h2>
      <table class="ams"><thead><tr><th class="dark">Machine / server</th><th class="dark">Cove device</th><th class="dark">Plan</th><th class="dark">Test status</th><th class="dark">Last test</th></tr></thead>
      <tbody>${
        devices.length
          ? devices
              .slice(0, 40)
              .map(
                (d) =>
                  `<tr><td>${esc(d.machineName || d.deviceName || "—")}</td><td>${esc(d.deviceName || "—")}</td><td>${esc(d.recoveryPlanLabel || "—")}</td><td class="${(d.recoveryTestStatus || "").toLowerCase().includes("fail") ? "bad" : ""}">${esc(d.recoveryTestStatus || "—")}</td><td>${esc(fmtDt(d.lastRecoveryTestAt))}</td></tr>`,
              )
              .join("")
          : `<tr><td colspan="5" class="muted">No recovery rows.</td></tr>`
      }</tbody></table>`);
  }
  return pillarPackShell(title, c.displayName, c.customerCode, dateLabel, now, sections, "RPM Cloud Backup · Cloud Backup Executive Summary");
}

export function buildEppServiceHtml(opts: {
  customer: CustomerDetailPayload;
  portfolio: PortfolioPayload;
}): { subject: string; html: string; text: string } {
  return eppPack(opts, "service");
}

export function buildEppIncidentsHtml(opts: {
  customer: CustomerDetailPayload;
  portfolio: PortfolioPayload;
}): { subject: string; html: string; text: string } {
  return eppPack(opts, "incidents");
}

function eppPack(
  opts: { customer: CustomerDetailPayload; portfolio: PortfolioPayload },
  kind: "service" | "incidents",
): { subject: string; html: string; text: string } {
  const c = opts.customer.customer;
  const now = formatSastDateTime(new Date().toISOString());
  const dateLabel = formatSastDate(new Date().toISOString());
  const epp = opts.customer.epp;
  const es = epp?.summary;
  const devices = epp?.devices ?? [];
  const covered = (es?.deviceCount ?? 0) > 0 || devices.length > 0;
  const title = kind === "incidents" ? "Incidents & Quarantine" : "RPM EndPoint Protection Pack";
  const sections: string[] = [];
  sections.push(`<p class="note">This pack is <strong>RPM EndPoint Protection only</strong>. It does not include RPM RMM devices.</p>`);
  if (!covered) {
    sections.push(`<p class="note"><strong class="warn">No cover</strong> — no managed endpoints for this customer.</p>`);
  } else {
    sections.push(`<p class="note">RPM EndPoint Protection only. Cover requires at least one endpoint.</p>`);
    if (kind === "service") {
      sections.push(`<h2 class="sec">Endpoints</h2>${kvTable([
        ["Endpoints", esc(String(es?.deviceCount ?? devices.length))],
        ["Managed / unmanaged", `${esc(String(es?.managedCount ?? "—"))} / ${esc(String(es?.unmanagedCount ?? "—"))}`],
        ["Servers / workstations", `${esc(String(es?.serverCount ?? "—"))} / ${esc(String(es?.workstationCount ?? "—"))}`],
        ["MSP licence slots (estate-wide)", epp?.license ? `${esc(String(epp.license.usedSlots ?? "—"))} / ${esc(String(epp.license.totalSlots ?? "—"))}` : "—"],
        ["Subscription end", esc(fmtD(epp?.license?.endSubscription))],
        ["Last import", esc(fmtDt(es?.lastImportAt))],
      ])}`);
      sections.push(`<h2 class="sec">Endpoint sample</h2>
      <table class="ams"><thead><tr><th class="dark">Device</th><th class="dark">Managed</th><th class="dark">OS</th><th class="dark">Policy</th></tr></thead>
      <tbody>${
        devices.length
          ? devices
              .slice(0, 40)
              .map(
                (d) =>
                  `<tr><td>${esc(d.deviceName || d.fqdn || d.endpointId)}</td><td>${d.isManaged === false ? "No" : d.isManaged ? "Yes" : "—"}</td><td>${esc(d.operatingSystem || "—")}</td><td>${esc(d.policyName || "—")}</td></tr>`,
              )
              .join("")
          : `<tr><td colspan="4" class="muted">No endpoint rows.</td></tr>`
      }</tbody></table>`);
    } else {
      const inc = epp?.incidents ?? [];
      const q = epp?.quarantine ?? [];
      sections.push(`<h2 class="sec">Feed</h2>${kvTable([
        ["Incidents", esc(String(epp?.feedStatus?.incidentsCount ?? inc.length))],
        ["Quarantine", esc(String(epp?.feedStatus?.quarantineCount ?? q.length))],
        ["Incidents feed", esc(epp?.feedStatus?.incidentsMessage || (epp?.feedStatus?.incidentsOk === false ? "Error" : "OK"))],
        ["Quarantine feed", esc(epp?.feedStatus?.quarantineMessage || (epp?.feedStatus?.quarantineOk === false ? "Error" : "OK"))],
      ])}`);
      sections.push(`<h2 class="sec">Incidents</h2>
      <table class="ams"><thead><tr><th class="dark">When</th><th class="dark">Device</th><th class="dark">Severity</th><th class="dark">Type</th><th class="dark">Summary</th></tr></thead>
      <tbody>${
        inc.length
          ? inc
              .slice(0, 30)
              .map(
                (r) =>
                  `<tr><td>${esc(fmtDt(r.detectedAt))}</td><td>${esc(r.deviceName || "—")}</td><td>${esc(r.severity || "—")}</td><td>${esc(r.incidentType || "—")}</td><td>${esc(r.summary || "—")}</td></tr>`,
              )
              .join("")
          : `<tr><td colspan="5" class="muted">No incidents on latest collect.</td></tr>`
      }</tbody></table>`);
      sections.push(`<h2 class="sec">Quarantine</h2>
      <table class="ams"><thead><tr><th class="dark">When</th><th class="dark">Device</th><th class="dark">Threat</th><th class="dark">Status</th></tr></thead>
      <tbody>${
        q.length
          ? q
              .slice(0, 30)
              .map(
                (r) =>
                  `<tr><td>${esc(fmtDt(r.quarantinedAt))}</td><td>${esc(r.deviceName || "—")}</td><td>${esc(r.threatName || "—")}</td><td>${esc(r.status || "—")}</td></tr>`,
              )
              .join("")
          : `<tr><td colspan="4" class="muted">No quarantine items.</td></tr>`
      }</tbody></table>`);
    }
  }
  return pillarPackShell(title, c.displayName, c.customerCode, dateLabel, now, sections, "RPM EndPoint Protection snapshot");
}
