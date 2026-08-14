import { COVE_SAFEGUARDS, type CoveEsr, type CoveEsrSlice } from "@/lib/data/cove-esr";

function esc(s: string | number | null | undefined): string {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">");
}

function kpi(label: string, value: string): string {
  return `<td class="esr-kpi"><div class="lbl">${esc(label)}</div><div class="val">${esc(value)}</div></td>`;
}

function donut(title: string, blurb: string, slices: CoveEsrSlice[]): string {
  const rows = slices.length
    ? slices
        .map(
          (s) =>
            `<tr><td>${esc(s.label)}</td><td style="text-align:right">${s.count} (${s.pct}%)</td></tr>`,
        )
        .join("")
    : `<tr><td colspan="2" class="muted">No devices</td></tr>`;
  return `<div class="esr-donut"><h4>${esc(title)}</h4><p class="muted">${esc(blurb)}</p>
  <table class="ams"><tbody>${rows}</tbody></table></div>`;
}

export const COVE_ESR_CSS = `
  .esr-hero h1 { font-size: 20pt; font-weight: 600; color: #1a365d; margin: 0 0 4px; }
  .esr-hero .sub { font-size: 14pt; color: #2b6cb0; margin: 0 0 8px; }
  .esr-hero .when { font-size: 10pt; color: #4a5568; }
  .esr-band { background: #ebf4ff; color: #1a365d; padding: 8px 12px; font-weight: 700; margin: 20px 0 8px; font-size: 11pt; }
  .esr-copy { font-size: 9.5pt; color: #4a5568; margin: 0 0 10px; line-height: 1.45; }
  .esr-sg { width: 100%; border-collapse: collapse; }
  .esr-sg td { border: 1px solid #e2e8f0; padding: 8px 10px; width: 50%; font-size: 10pt; }
  .esr-sg .tick { color: #16a34a; font-weight: 800; float: right; }
  .esr-kpis { width: 100%; border-collapse: collapse; margin: 8px 0 12px; }
  .esr-kpi { border: 1px solid #e2e8f0; width: 25%; padding: 14px 8px; text-align: center; }
  .esr-kpi .lbl { font-size: 9pt; color: #2b6cb0; font-weight: 600; margin-bottom: 6px; }
  .esr-kpi .val { font-size: 16pt; font-weight: 700; color: #1a202c; }
  .esr-rpo { width: 100%; border-collapse: collapse; }
  .esr-rpo th, .esr-rpo td { border: 1px solid #e2e8f0; padding: 8px; }
  .esr-rpo .hit { background: #16a34a; color: #fff; font-weight: 700; text-align: center; }
  .esr-rpo .miss { background: #ea580c; color: #fff; font-weight: 700; text-align: center; }
  .esr-donuts { display: flex; gap: 12px; }
  .esr-donut { flex: 1; border: 1px solid #e2e8f0; padding: 10px; }
  .esr-donut h4 { margin: 0 0 4px; color: #1a365d; }
  .esr-ok { color: #16a34a; font-weight: 700; }
  .esr-foot { background: #0f172a; color: #fff; padding: 8px 12px; font-size: 8.5pt; margin-top: 24px; }
`;

export function coveEsrSections(esr: CoveEsr): string {
  if (!esr.covered) {
    return `<p class="note"><strong class="warn">No cover</strong> — no Cove backup data for this customer.</p>`;
  }
  const sgRows: string[] = [];
  for (let i = 0; i < COVE_SAFEGUARDS.length; i += 2) {
    const a = COVE_SAFEGUARDS[i];
    const b = COVE_SAFEGUARDS[i + 1];
    sgRows.push(
      `<tr><td>${esc(a.label)}<span class="tick">✓</span></td>${
        b ? `<td>${esc(b.label)}<span class="tick">✓</span></td>` : "<td></td>"
      }</tr>`,
    );
  }
  const rpoCell =
    esr.rpoDailyPct == null
      ? `<td class="muted">—</td>`
      : `<td class="${esr.rpoDailyPct >= 99 ? "hit" : "miss"}">${esr.rpoDailyPct}%</td>`;
  const success =
    esr.successPct == null ? "—" : `${esr.successPct}%`;
  const restoreLine =
    esr.restoreSuccessPct == null
      ? esr.restoreCaption
      : `${esr.restoreSuccessPct}% (${esr.restoreCaption})`;

  return `
<div class="esr-hero">
  <h1>Hello ${esc(esr.customerName)}, here's your</h1>
  <p class="sub">Executive summary report.</p>
  <p class="when">Date range: ${esc(esr.periodLabel)}</p>
</div>

<div class="esr-band">Cyber resilience and storage</div>
<p class="esr-copy"><strong>Enabled safeguards | ${esr.safeguardsOn} out of ${esr.safeguardsTotal}</strong><br/>
A robust cyber resilience strategy is essential for maintaining business continuity to effectively anticipate, address, and recover from cyber threats, thereby minimizing the risk of financial loss and safeguarding reputation.</p>
<table class="esr-sg">${sgRows.join("")}</table>

<div class="esr-band">Servers and workstations</div>
<p class="esr-copy"><strong>Backup | Success Rate: <span class="esr-ok">${esc(success)}</span></strong> (${esc(esr.successCaption)})<br/>
Backup success rate indicates the effectiveness of the backup process, which is crucial for ensuring that data can be recovered when needed, minimizing downtime and preventing data loss.</p>
<table class="esr-kpis"><tr>
  ${kpi("Data backed up", esr.dataBackedUpLabel)}
  ${kpi("Average backup time", "—")}
  ${kpi("Devices", String(esr.deviceCount))}
  ${kpi("Used storage", esr.usedStorageLabel)}
</tr></table>

<div class="esr-band">Recovery point objective (RPO)</div>
<p class="esr-copy">Recovery Point Objective (RPO) displays the percentage of devices for each backup frequency depicting how often the successful backups are performed within the specified RPO interval, for example, every 24 hours.</p>
<table class="esr-rpo">
  <tr><th>Backup frequency</th><th>Servers</th></tr>
  <tr><td>${esc(esr.rpoLabel)}</td>${rpoCell}</tr>
</table>

<div class="esr-band">Restore | Success Rate: ${esc(restoreLine)}</div>
<p class="esr-copy">Restore success rate indicates the effectiveness of the restore process at the data source level (files and folders, databases, or virtual machines).</p>
<table class="esr-kpis"><tr>
  ${kpi("Data restored", "0 B")}
  ${kpi("Average restore time", "< 1 min")}
  ${kpi("Restores", String(esr.restoreCount))}
  ${kpi("Recovery tested devices", String(esr.recoveryTested))}
</tr></table>
<p class="esr-copy"><strong>Image restore ready</strong> — the percentage of fully recoverable devices.<br/>
Full System Recoverability ${esr.recoverabilityCount} (${esr.recoverabilityPct ?? 0}%)</p>

<div class="esr-band">Assets and devices</div>
<p class="esr-copy">The backup system demonstrates broad asset coverage. Device distribution helps administrators manage resources and ensure data protection across all device types.</p>
<div class="esr-donuts">
  ${donut("Asset type distribution", "Percentage of asset types being backed up.", esr.assets)}
  ${donut("Devices distribution", "Percentage of device types being backed up.", esr.deviceTypes)}
</div>

<div class="esr-band">Retention</div>
<p class="esr-copy">Retention policies specify how long to keep backups. These policies ensure compliance by offering secure storage and data retention.</p>
${donut("Retention policy distribution", "Devices covered under each retention policy in use.", esr.retention)}

<div class="esr-foot">Executive Summary Report | ${esc(esr.customerName)} (${esc(esr.customerCode)}) | Generated on ${esc(esr.generatedLabel)}</div>
`;
}
