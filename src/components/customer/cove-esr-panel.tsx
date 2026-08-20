import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ChartTooltip } from "@/components/portfolio/chart-tooltip";
import { Badge } from "@/components/ui/badge";
import { NoCoverPanel } from "@/components/ui/no-cover";
import { buildCoveEsr, COVE_SAFEGUARDS, type CoveEsrSlice } from "@/lib/data/cove-esr";
import type { CustomerDetailPayload } from "@/lib/data/types";
import { cn } from "@/lib/utils";

const PIE = ["#38bdf8", "#0ea5e9", "#0369a1", "#16a34a", "#7c3aed", "#ea580c"];

function Donut({ title, blurb, slices }: { title: string; blurb: string; slices: CoveEsrSlice[] }) {
  const data = slices.map((s, i) => ({ name: s.label, value: s.count, fill: PIE[i % PIE.length] }));
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2">
      <p className="text-[12px] font-bold text-fg">{title}</p>
      <p className="mb-1 text-[11px] text-muted">{blurb}</p>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="80%" paddingAngle={2} isAnimationActive={false}>
              {data.map((e) => (
                <Cell key={e.name} fill={e.fill} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="space-y-0.5 text-[11px] text-muted">
        {slices.map((s) => (
          <li key={s.label}>
            <span className="font-medium text-fg">{s.label}</span> {s.count} ({s.pct}%)
          </li>
        ))}
      </ul>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-3 text-center">
      <p className="text-[11px] font-semibold text-sky-700 dark:text-sky-300">{label}</p>
      <p className="mt-1 font-mono text-[20px] font-bold text-fg">{value}</p>
    </div>
  );
}

export function CoveEsrPanel({ data }: { data: CustomerDetailPayload }) {
  const esr = buildCoveEsr(data);
  if (!esr.covered) {
    return (
      <NoCoverPanel
        service="RPM Cloud Backup · Executive Summary"
        hint="No cover — no RPM Cloud Backup data for this customer."
      />
    );
  }
  return (
    <div className="space-y-4">
      <section>
        <div className="mb-2 rounded bg-sky-100 px-3 py-1.5 text-[12px] font-bold text-sky-900 dark:bg-sky-950 dark:text-sky-100">
          Cyber resilience and storage
        </div>
        <p className="mb-2 text-[12px] text-muted">
          <span className="font-semibold text-fg">
            Enabled safeguards | {esr.safeguardsOn} out of {esr.safeguardsTotal}
          </span>
          . Platform safeguards for RPM Cloud Backup on this tenant.
        </p>
        <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
          {COVE_SAFEGUARDS.map((s) => (
            <div key={s.id} className="flex items-center justify-between bg-surface px-3 py-2 text-[12px]">
              <span>{s.label}</span>
              <span className="font-bold text-rag-green">✓</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-2 rounded bg-sky-100 px-3 py-1.5 text-[12px] font-bold text-sky-900 dark:bg-sky-950 dark:text-sky-100">
          Servers and workstations
        </div>
        <p className="mb-2 text-[12px] text-muted">
          Backup | Success Rate:{" "}
          <span className={cn("font-bold", (esr.successPct ?? 0) >= 99.5 ? "text-rag-green" : "text-rag-amber")}>
            {esr.successPct == null ? "—" : `${esr.successPct}%`}
          </span>{" "}
          ({esr.successCaption})
        </p>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <Kpi label="Data backed up" value={esr.dataBackedUpLabel} />
          <Kpi label="Average backup time" value={esr.avgBackupTimeLabel} />
          <Kpi label="Devices" value={esr.deviceCount} />
          <Kpi label="Used storage" value={esr.usedStorageLabel} />
        </div>
        {esr.machines.length ? (
          <div className="mt-3 overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[720px] text-left text-[12px]">
              <thead className="rpma-table-head">
                <tr>
                  <th className="px-2 py-1.5">Machine / server</th>
                  <th className="px-2 py-1.5">Cove device</th>
                  <th className="px-2 py-1.5">Type</th>
                  <th className="px-2 py-1.5">Status</th>
                  <th className="px-2 py-1.5">Size</th>
                  <th className="px-2 py-1.5">Backup time</th>
                  <th className="px-2 py-1.5">Last success</th>
                  <th className="px-2 py-1.5">RPO</th>
                </tr>
              </thead>
              <tbody>
                {esr.machines.map((m) => (
                  <tr key={`${m.machineName}-${m.deviceName}`} className="border-t border-border">
                    <td className="px-2 py-1.5 font-medium">{m.machineName}</td>
                    <td className="px-2 py-1.5 text-muted">{m.deviceName}</td>
                    <td className="px-2 py-1.5">{m.kind}</td>
                    <td
                      className={cn(
                        "px-2 py-1.5",
                        /fail|error/i.test(m.status)
                          ? "font-semibold text-rag-red"
                          : m.rpoOk
                            ? "text-rag-green"
                            : "text-rag-amber",
                      )}
                    >
                      {m.status}
                    </td>
                    <td className="px-2 py-1.5 tabular-nums">{m.sizeLabel}</td>
                    <td className="px-2 py-1.5 tabular-nums">{m.durationLabel}</td>
                    <td className="px-2 py-1.5 text-muted">{m.lastSuccessLabel}</td>
                    <td className={cn("px-2 py-1.5", m.rpoOk ? "text-rag-green" : "text-rag-amber")}>
                      {m.rpoOk ? "Within 24h" : "Outside 24h"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section>
        <div className="mb-2 rounded bg-sky-100 px-3 py-1.5 text-[12px] font-bold text-sky-900 dark:bg-sky-950 dark:text-sky-100">
          Recovery point objective (RPO)
        </div>
        <p className="mb-2 text-[12px] text-muted">
          Share of devices whose last successful backup is inside the 24-hour RPO window.
        </p>
        <table className="w-full max-w-md text-left text-[12px]">
          <thead className="rpma-table-head">
            <tr>
              <th className="px-2 py-1.5">Backup frequency</th>
              <th className="px-2 py-1.5">Servers</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-border">
              <td className="px-2 py-1.5">{esr.rpoLabel}</td>
              <td className="px-2 py-1.5">
                {esr.rpoDailyPct == null ? (
                  "—"
                ) : (
                  <Badge variant={esr.rpoDailyPct >= 99 ? "green" : "amber"}>{esr.rpoDailyPct}%</Badge>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <div className="mb-2 rounded bg-sky-100 px-3 py-1.5 text-[12px] font-bold text-sky-900 dark:bg-sky-950 dark:text-sky-100">
          Restore | Success Rate: {esr.restoreCaption}
        </div>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <Kpi label="Data restored" value="0 B" />
          <Kpi label="Average restore time" value="< 1 min" />
          <Kpi label="Restores" value={esr.restoreCount} />
          <Kpi label="Recovery tested devices" value={esr.recoveryTested} />
        </div>
        <div className="mt-2">
          <Donut
            title="Image restore ready"
            blurb="Percentage of fully recoverable devices."
            slices={[
              {
                label: "Full System Recoverability",
                count: esr.recoverabilityCount,
                pct: esr.recoverabilityPct ?? 0,
              },
              {
                label: "Not ready",
                count: Math.max(0, esr.deviceCount - esr.recoverabilityCount),
                pct: Math.max(0, Math.round((100 - (esr.recoverabilityPct ?? 0)) * 10) / 10),
              },
            ].filter((s) => s.count > 0)}
          />
        </div>
      </section>

      <section>
        <div className="mb-2 rounded bg-sky-100 px-3 py-1.5 text-[12px] font-bold text-sky-900 dark:bg-sky-950 dark:text-sky-100">
          Assets and devices
        </div>
        <div className="grid gap-2 lg:grid-cols-2">
          <Donut title="Asset type distribution" blurb="Asset types being backed up." slices={esr.assets} />
          <Donut title="Devices distribution" blurb="Device types being backed up." slices={esr.deviceTypes} />
        </div>
      </section>

      <section>
        <div className="mb-2 rounded bg-sky-100 px-3 py-1.5 text-[12px] font-bold text-sky-900 dark:bg-sky-950 dark:text-sky-100">
          Retention
        </div>
        <Donut
          title="Retention policy distribution"
          blurb="Devices covered under each retention policy in use."
          slices={esr.retention}
        />
      </section>
    </div>
  );
}
