import { n as formatSastDate, r as formatSastDateTime } from "./utils-BpkUUAOs.mjs";
import { n as formatProgramLabel } from "./syspro-programs-CuezAD_5.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/ams-report-html-DDL_kaDs.js
function esc(s) {
	if (s == null) return "";
	return String(s).replace(/&/g, String.fromCharCode(38) + "amp;").replace(/</g, String.fromCharCode(38) + "lt;").replace(/>/g, String.fromCharCode(38) + "gt;").replace(/"/g, String.fromCharCode(38) + "quot;");
}
function zar(n) {
	if (n == null || Number.isNaN(n)) return "—";
	return n.toLocaleString("en-ZA", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});
}
function fmtDt(iso) {
	if (!iso) return "—";
	return formatSastDateTime(iso);
}
function fmtD(iso) {
	if (!iso) return "—";
	return formatSastDate(iso);
}
function finsightModuleRows(dtr) {
	return Array.isArray(dtr) ? dtr : [];
}
function finsightScore(dtr) {
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
	let controlRag = "Green";
	if (modules === 0) controlRag = "Amber";
	else if (modulesOob >= 3 || oobLines >= 20 || absVar >= 1e6) controlRag = "Red";
	else if (modulesOob > 0 || oobLines > 0) controlRag = "Amber";
	return {
		modules,
		modulesOob,
		modulesClean,
		oobLines,
		absVar,
		close,
		controlRag
	};
}
function finsightControlTable(dtr, customerCode, opts) {
	let rows = finsightModuleRows(dtr);
	if (opts?.onlyOob) rows = rows.filter((r) => (Number(r?.varianceLineCount) || 0) > 0);
	if (rows.length === 0) return `<tr><td colspan="8" class="muted">${opts?.onlyOob ? "No out-of-balance FinSight modules on this snapshot." : "No FinSight balance rows collected yet for this customer."}</td></tr>`;
	return rows.map((r) => {
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
	}).join("");
}
var CSS = `
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
`;
function ragClass(rag) {
	if (rag === "Red") return "rag-red";
	if (rag === "Amber") return "rag-amber";
	return "rag-green";
}
function shell(title, body, generatedAt) {
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
function buildDayEndFinSightHtml(opts) {
	const detail = opts.customer;
	const c = detail?.customer;
	if (!c?.customerCode) throw new Error("Day-end pack requires a customer with customerCode");
	const dtr = finsightModuleRows(detail.dtrLevel1);
	const backups = Array.isArray(detail.sqlBackups) ? detail.sqlBackups : [];
	const fs = finsightScore(dtr);
	const now = formatSastDateTime((/* @__PURE__ */ new Date()).toISOString());
	const title = `Day end · FinSight — ${c.displayName || c.customerCode}`;
	const bakRows = backups.length === 0 ? `<tr><td colspan="4" class="muted">No SQL backup rows on latest snapshot.</td></tr>` : backups.map((b) => {
		const status = b?.lastBackupStatus ?? "—";
		const bad = /fail|error/i.test(String(status));
		return `<tr>
      <td>${esc(b?.databaseName ?? "—")}</td>
      <td>${esc(fmtDt(b?.lastFullBackup))}</td>
      <td class="${bad ? "bad" : "ok"}">${esc(status)}</td>
      <td style="text-align:right">${esc(b?.fullAgeHours ?? "—")}</td>
    </tr>`;
	}).join("");
	const collectOk = !!c.lastImportAt;
	const jobErrs = Number(c.sysproJobErrorCount) || 0;
	const controlNote = fs.modules === 0 ? "FinSight balances not available on this customer (no L1 extract yet, or balance tables not present). Operational day-end checks still apply." : fs.modulesOob === 0 ? "All collected FinSight modules are in balance on this snapshot." : `${fs.modulesOob} of ${fs.modules} FinSight module(s) have out-of-balance lines — review exception register and clear before period close where material.`;
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
    <p style="margin:8px 0 0" class="muted"><em>AMS line:</em> we report that SYSPRO is operating <strong>and</strong> whether financial control accounts are holding — with exceptions identified and sized.</p>
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
    <p style="margin:8px 0 0"><strong>Please action:</strong> notify AMS when credentials change; re-establish collect after reboots; protect the day-end window.</p>
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
		`Backups: ${backups.length}`
	].join("\n");
	return {
		subject: `RPM Assure — Day end · FinSight — ${c.displayName || c.customerCode} — ${formatSastDate((/* @__PURE__ */ new Date()).toISOString())}`,
		html: shell(title, body, now),
		text
	};
}
/** Month-end / period-end FinSight readiness pack */
function buildPeriodEndFinSightHtml(opts) {
	const detail = opts.customer;
	const c = detail?.customer;
	if (!c?.customerCode) throw new Error("Period-end pack requires a customer with customerCode");
	const dtr = finsightModuleRows(detail.dtrLevel1);
	const fs = finsightScore(dtr);
	const backups = Array.isArray(detail.sqlBackups) ? detail.sqlBackups : [];
	const jobErrs = Number(c.sysproJobErrorCount) || 0;
	const risks = (detail.risks ?? []).filter((r) => (r.status || "").toLowerCase() !== "closed");
	const now = formatSastDateTime((/* @__PURE__ */ new Date()).toISOString());
	const period = c.reportingPeriod || formatSastDate((/* @__PURE__ */ new Date()).toISOString()).slice(0, 7) || "current period";
	const title = `Period end · FinSight readiness — ${c.displayName || c.customerCode}`;
	const ready = fs.modules > 0 && fs.modulesOob === 0 && jobErrs === 0 && !!c.lastImportAt;
	const readyLabel = ready ? "Ready for close (on collected signals)" : fs.modules === 0 ? "FinSight data incomplete — do not rely on this pack alone for close" : "Not ready — clear FinSight exceptions and/or ops gates";
	const actions = [];
	if (!c.lastImportAt) actions.push("Restore SYSPRO collect before sign-off.");
	if (jobErrs > 0) actions.push(`Investigate ${jobErrs} job error signal(s) on latest snapshot.`);
	if (fs.modules === 0) actions.push("Enable FinSight balance collect (company balance tables + scheduled extract).");
	if (fs.modulesOob > 0) actions.push(`Clear or explain ${fs.modulesOob} out-of-balance module(s) (${fs.oobLines} Out of Balance lines; |variance| ${zar(fs.absVar)}).`);
	if (risks.length > 0) actions.push(`Review ${risks.length} open AMS risk(s) with finance impact.`);
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
    <p style="margin:6px 0 0">Period-end pack for finance and AMS: evidence whether <strong>sub-ledger control accounts reconcile to GL</strong>, quantify exception exposure, and confirm operational gates (collect, jobs, backups) support a clean close.</p>
    <p style="margin:8px 0 0"><em>AMS line:</em> we are not only stating that SYSPRO is operational — we evidence that financial controls are operating and that reconciliation exceptions are identified and managed.</p>
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
        <td>Open AMS risks</td>
        <td>${esc(risks.length)}</td>
        <td class="${risks.length ? "warn" : "ok"}">${risks.length ? "Review" : "None open"}</td>
      </tr>
    </tbody>
  </table>

  <h2 class="sec">5 Recommended actions (AMS + finance)</h2>
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
		...actions
	].join("\n");
	return {
		subject: `RPM Assure — Period end · FinSight — ${c.displayName || c.customerCode} — ${formatSastDate((/* @__PURE__ */ new Date()).toISOString())}`,
		html: shell(title, body, now),
		text
	};
}
/** Full Applications AMS Report style pack */
function buildApplicationsAmsHtml(opts) {
	const detail = opts.customer;
	const c = detail.customer;
	const variant = opts.variant || "full";
	const now = formatSastDateTime((/* @__PURE__ */ new Date()).toISOString());
	const dateLabel = formatSastDate((/* @__PURE__ */ new Date()).toISOString());
	const packLabel = variant === "weekly" ? "Weekly AMS digest" : variant === "monthly" ? "Monthly AMS board pack" : "Applications AMS Report";
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
	const byProg = /* @__PURE__ */ new Map();
	for (const j of jobs) {
		const k = formatProgramLabel(j.programName) || j.programName || "Unknown";
		byProg.set(k, (byProg.get(k) ?? 0) + 1);
	}
	const topProg = [...byProg.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
	const byOp = /* @__PURE__ */ new Map();
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
  ${variant === "weekly" ? `<p class="muted"><strong>Weekly AMS focus:</strong> is SYSPRO healthy, are jobs clean, and is FinSight showing any sub-ledger vs GL exceptions? Plus backups, licence, and open risks.</p>` : variant === "monthly" ? `<p class="muted"><strong>Monthly AMS board pack:</strong> executive narrative for ExCo — operations health plus FinSight financial integrity, risks, priorities, and hotfixes. AMS line: not only uptime — control exceptions are visible and managed.</p>` : `<p class="muted"><strong>AMS line:</strong> RPM Assure shows SYSPRO is operating; FinSight shows whether financial control accounts (sub-ledger vs GL) are holding.</p>`}

  <h3 class="sub">Executive snapshot</h3>
  <table class="ams">
    <thead><tr><th class="dark">Metric</th><th class="dark">Value</th><th class="dark">Notes</th></tr></thead>
    <tbody>
      <tr><td>Job errors (latest snapshot)</td><td class="${c.sysproJobErrorCount > 0 ? "warn" : "ok"}">${esc(c.sysproJobErrorCount)}</td><td>SYSPRO job logging</td></tr>
      <tr><td>FinSight out-of-balance lines</td><td class="${c.sysproDtrVarianceLines > 0 ? "warn" : "ok"}">${esc(c.sysproDtrVarianceLines)}</td><td>Control account recon / sub-ledger → GL</td></tr>
      <tr><td>Open risks</td><td>${esc(risks.length)}</td><td>AMS risk register</td></tr>
      <tr><td>Incidents on file</td><td>${esc(incidents.length)}</td><td>${esc(incidents.filter((i) => i.isMajor).length)} major</td></tr>
      <tr><td>Availability</td><td>${esc(sla?.availabilityPct != null ? `${sla.availabilityPct}%` : "—")}</td><td>Target ${esc(sla?.availabilitySlaPct != null ? `${sla.availabilitySlaPct}%` : "99.5%")}</td></tr>
      <tr><td>SLA compliance</td><td>${esc(sla?.slaCompliancePct != null ? `${sla.slaCompliancePct}%` : "—")}</td><td>Response / resolve</td></tr>
    </tbody>
  </table>

  <h3 class="sub">Syspro system error analysis — latest job errors by program</h3>
  <p class="muted">A rise in errors shows modules in a vulnerable state — investigate and correct. Modules with high errors should be focused on first.</p>
  <table class="ams">
    <thead><tr><th class="dark">Program / module</th><th class="dark">Error count</th></tr></thead>
    <tbody>
      ${topProg.length === 0 ? `<tr><td colspan="2" class="muted">No job errors on latest snapshot.</td></tr>` : topProg.map(([p, n]) => `<tr><td>${esc(formatProgramLabel(p))}</td><td style="text-align:right">${esc(n)}</td></tr>`).join("")}
    </tbody>
  </table>

  <h3 class="sub">Errors by top operator — latest snapshot</h3>
  <p class="muted">Users with repeated failures should be investigated (training, process, or client/server issues).</p>
  <table class="ams">
    <thead><tr><th class="dark">Operator</th><th class="dark">Error count</th></tr></thead>
    <tbody>
      ${topOp.length === 0 ? `<tr><td colspan="2" class="muted">No operator error rows.</td></tr>` : topOp.map(([o, n]) => `<tr><td>${esc(o)}</td><td style="text-align:right">${esc(n)}</td></tr>`).join("")}
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
      ${dtr.length === 0 ? `<tr><td colspan="8" class="muted">FinSight not collected (or no Dtr*Balances on this customer).</td></tr>` : dtr.map((r) => `<tr>
        <td>${esc(r.balanceTypeCode)}</td>
        <td>${esc(r.balanceTypeName)}</td>
        <td class="${r.varianceLineCount > 0 ? "bad" : "ok"}" style="text-align:right">${esc(r.varianceLineCount)}</td>
        <td style="text-align:right">${esc(r.totalLineCount)}</td>
        <td style="text-align:right">${esc(zar(r.totalVariance))}</td>
        <td style="text-align:right">${esc(zar(r.absVariance))}</td>
        <td style="text-align:right">${esc(zar(r.totalCloseBalance))}</td>
        <td>${esc(fmtD(r.asOfDate))}</td>
      </tr>`).join("")}
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
      ${hotfixes.length === 0 ? `<tr><td colspan="3" class="muted">No hotfix rows collected yet.</td></tr>` : hotfixes.slice(0, 80).map((h) => `<tr><td>${esc(h.hotfixCode)}</td><td>${esc(h.hotfixName ?? h.description ?? "")}</td><td>${esc(fmtDt(h.installedAt))}</td></tr>`).join("")}
    </tbody>
  </table>
  ${hotfixes.length > 80 ? `<p class="muted">Showing 80 of ${hotfixes.length} installed hotfixes.</p>` : ""}

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
      ${backups.length === 0 ? `<tr><td colspan="4" class="muted">No backup rows.</td></tr>` : backups.map((b) => `<tr>
        <td>${esc(b.databaseName)}</td>
        <td>${esc(fmtDt(b.lastFullBackup))}</td>
        <td class="${/fail|error/i.test(b.lastBackupStatus ?? "") ? "bad" : "ok"}">${esc(b.lastBackupStatus ?? "—")}</td>
        <td style="text-align:right">${esc(b.fullAgeHours ?? "—")}</td>
      </tr>`).join("")}
    </tbody>
  </table>

  <h3 class="sub">Operator activity (sample)</h3>
  <table class="ams">
    <thead><tr><th class="dark">Code</th><th class="dark">Name</th><th class="dark">Status</th><th class="dark">Last login</th></tr></thead>
    <tbody>
      ${ops.length === 0 ? `<tr><td colspan="4" class="muted">No operators.</td></tr>` : ops.slice(0, 25).map((o) => `<tr>
        <td>${esc(o.operatorCode)}</td>
        <td>${esc(o.operatorName ?? "—")}</td>
        <td>${esc(o.operatorStatus ?? "—")}</td>
        <td>${esc(fmtDt(o.lastLoginDate))}</td>
      </tr>`).join("")}
    </tbody>
  </table>

  <h3 class="sub">Open risks & priorities</h3>
  <table class="ams">
    <thead><tr><th class="dark">Type</th><th class="dark">Title</th><th class="dark">RAG / status</th><th class="dark">Owner</th></tr></thead>
    <tbody>
      ${risks.length === 0 && (detail.priorities ?? []).length === 0 ? `<tr><td colspan="4" class="muted">No open risks or priorities loaded.</td></tr>` : [...risks.slice(0, 10).map((r) => `<tr><td>Risk</td><td>${esc(r.title)}</td><td class="${ragClass(r.rag || "Amber")}">${esc(r.rag)} · ${esc(r.status)}</td><td>${esc(r.ownerName ?? "—")}</td></tr>`), ...(detail.priorities ?? []).slice(0, 8).map((p) => `<tr><td>Priority</td><td>${esc(p.title)}</td><td>${esc(p.status ?? "Open")}</td><td>—</td></tr>`)].join("")}
    </tbody>
  </table>

  <div class="note">
    <strong>Notes</strong>
    <ul>
      <li>This pack is generated from RPM Assure central collect (operators, jobs, FinSight, license, hotfixes, SQL backups, AMS facts).</li>
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
		`Generated: ${now}`
	].join("\n");
	return {
		subject: `RPM Assure — ${packLabel} — ${c.displayName} — ${dateLabel}`,
		html: shell(title, body, now),
		text
	};
}
/** Portfolio weekly / estate digest in AMS-ish tables */
function buildPortfolioAmsHtml(portfolio) {
	const rows = portfolio.rows;
	const s = portfolio.summary;
	const now = formatSastDateTime((/* @__PURE__ */ new Date()).toISOString());
	const dateLabel = formatSastDate((/* @__PURE__ */ new Date()).toISOString());
	const title = `Applications AMS Report — Estate — ${dateLabel}`;
	const attention = rows.filter((r) => r.healthRag !== "Green");
	const body = `
<div class="cover">
  <div class="cover-arc"></div>
  <div class="cover-dot"></div>
  <h1>Applications AMS Report — ${esc(dateLabel)}</h1>
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
      ${attention.length === 0 ? `<tr><td colspan="6" class="muted">No Red/Amber customers.</td></tr>` : attention.map((r) => `<tr>
        <td>${esc(r.displayName)}</td>
        <td class="${ragClass(r.healthRag)}">${esc(r.healthRag)}</td>
        <td>${esc(r.healthSummary)}</td>
        <td style="text-align:right">${esc(r.sysproJobErrorCount)}</td>
        <td style="text-align:right">${esc(r.sysproDtrVarianceLines)}</td>
        <td>${esc(fmtDt(r.lastImportAt))}</td>
      </tr>`).join("")}
    </tbody>
  </table>

  <h3 class="sub">Full portfolio</h3>
  <table class="ams">
    <thead><tr><th class="dark">Customer</th><th class="dark">Health</th><th class="dark">Ops</th><th class="dark">Active</th><th class="dark">Jobs</th><th class="dark">Out of Balance</th></tr></thead>
    <tbody>
      ${rows.map((r) => `<tr>
        <td>${esc(r.displayName)}</td>
        <td class="${ragClass(r.healthRag)}">${esc(r.healthRag)}</td>
        <td style="text-align:right">${esc(r.operatorCount)}</td>
        <td style="text-align:right">${esc(r.activeUserCount)}</td>
        <td style="text-align:right">${esc(r.sysproJobErrorCount)}</td>
        <td style="text-align:right">${esc(r.sysproDtrVarianceLines)}</td>
      </tr>`).join("")}
    </tbody>
  </table>
</div>`;
	return {
		subject: `RPM Assure — AMS Estate Report — ${dateLabel}`,
		html: shell(title, body, now),
		text: `AMS estate ${dateLabel}: ${s.red} Red, ${s.amber} Amber, ${s.green} Green of ${s.totalCustomers}`
	};
}
//#endregion
export { buildPortfolioAmsHtml as i, buildDayEndFinSightHtml as n, buildPeriodEndFinSightHtml as r, buildApplicationsAmsHtml as t };
