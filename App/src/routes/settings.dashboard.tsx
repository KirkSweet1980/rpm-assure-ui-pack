import { Link, createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, LayoutDashboard, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfigPageHead } from "@/components/settings/config-page";
import {
  fetchSettingsBundle,
  saveDashboardSettings,
} from "@/lib/settings/settings-api";
import {
  DASHBOARD_PRESETS,
  DEFAULT_DASHBOARD,
  type DashboardConfig,
} from "@/lib/settings/types";
import { clearDashboardConfigCache } from "@/lib/settings/use-dashboard-config";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings/dashboard")({
  component: DashboardSettingsPage,
});

function ToggleRow({
  label,
  help,
  checked,
  onChange,
}: {
  label: string;
  help?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <tr>
      <td>{label}</td>
      <td>{help ?? ""}</td>
      <td className="text-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
      </td>
    </tr>
  );
}

function countOn(d: DashboardConfig): { kpis: number; panels: number } {
  const kpis = [
    d.kpiCustomers,
    d.kpiAttention,
    d.kpiAssurance,
    d.kpiRefresh,
    d.kpiRisks,
    d.kpiLicenses,
    d.kpiRmm,
    d.kpiHotfixes,
  ].filter(Boolean).length;
  const panels = [
    d.panelPortfolioTable,
    d.panelRmmHealth,
    d.panelDataRefresh,
    d.panelAttention,
    d.panelAssuranceChart,
    d.panelHealthChart,
    d.panelSla,
    d.panelLicenses,
    d.panelRisks,
    d.panelBackups,
  ].filter(Boolean).length;
  return { kpis, panels };
}

function DashboardSettingsPage() {
  const [dash, setDash] = useState<DashboardConfig>({ ...DEFAULT_DASHBOARD });
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [presetHint, setPresetHint] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    const b = await fetchSettingsBundle();
    setDash({ ...DEFAULT_DASHBOARD, ...(b.dashboard ?? {}) });
    setDirty(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function set<K extends keyof DashboardConfig>(
    key: K,
    value: DashboardConfig[K],
  ) {
    setDash((s) => ({ ...s, [key]: value }));
    setPresetHint(null);
    setDirty(true);
  }

  async function onSave() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await saveDashboardSettings({ data: { dashboard: dash } });
      if (r.dashboard) setDash(r.dashboard);
      clearDashboardConfigCache();
      setDirty(false);
      setMsg("Saved. Open Exco Insight to see the new layout.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function onReset() {
    setDash({ ...DEFAULT_DASHBOARD });
    setPresetHint("full");
    setDirty(true);
    setMsg("Defaults loaded — click Save to apply.");
  }

  function applyPreset(key: string) {
    const p = DASHBOARD_PRESETS[key];
    if (!p) return;
    setDash((s) => ({ ...s, ...p.patch }));
    setPresetHint(key);
    setDirty(true);
    setMsg(`Preset “${p.label}” applied — click Save.`);
  }

  const counts = useMemo(() => countOn(dash), [dash]);

  return (
    <div className="space-y-6">
      <ConfigPageHead
        title="Dashboard Layout"
        icon={LayoutDashboard}
        actions={
          <>
            <Link
              to="/"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-[12px] font-semibold text-fg"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Exco Insight
            </Link>
            <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={onReset}>
              <RotateCcw className="size-3.5" />
              Reset
            </Button>
            <Button type="button" size="sm" disabled={busy || !dirty} onClick={() => void onSave()}>
              <Save className="size-3.5" />
              Save
            </Button>
          </>
        }
      />
      <p className="text-[12px] text-muted">
        {counts.kpis} KPIs · {counts.panels} panels
        {dirty ? <span className="text-rag-amber"> · unsaved</span> : null}
        {msg ? ` · ${msg}` : null}
      </p>

      <section className="rpma-panel overflow-hidden p-0">
        <div className="px-4 py-3">
          <h2 className="text-[16px] font-extrabold text-fg">Presets</h2>
        </div>
        <div className="grid gap-2 px-4 pb-4 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(DASHBOARD_PRESETS).map(([key, p]) => (
            <button
              key={key}
              type="button"
              onClick={() => applyPreset(key)}
              className={cn(
                "rounded-md border px-3 py-2 text-left",
                presetHint === key ? "border-[var(--color-nav)] bg-surface-2" : "border-border bg-surface",
              )}
            >
              <span className="block text-[12px] font-extrabold text-fg">{p.label}</span>
              <span className="mt-0.5 block text-[11px] text-muted">{p.help}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="rpma-panel overflow-hidden p-0">
        <div className="px-4 py-3">
          <h2 className="text-[16px] font-extrabold text-fg">Page Chrome</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="rpma-xls">
            <thead>
              <tr>
                <th>Setting</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Page Title</td>
                <td>
                  <input
                    className="w-full border-0 bg-transparent text-[12px] outline-none"
                    value={dash.estateTitle}
                    onChange={(e) => set("estateTitle", e.target.value)}
                    maxLength={80}
                  />
                </td>
              </tr>
              <tr>
                <td>Page Subtitle</td>
                <td>
                  <input
                    className="w-full border-0 bg-transparent text-[12px] outline-none"
                    value={dash.estateSubtitle}
                    onChange={(e) => set("estateSubtitle", e.target.value)}
                    maxLength={240}
                  />
                </td>
              </tr>
              <tr>
                <td>Auto-Refresh (Seconds)</td>
                <td>
                  <input
                    className="w-24 border-0 bg-transparent text-[12px] outline-none"
                    type="number"
                    min={0}
                    max={3600}
                    step={30}
                    value={dash.excoAutoRefreshSec ?? 120}
                    onChange={(e) => set("excoAutoRefreshSec", Math.floor(Number(e.target.value) || 0))}
                  />
                </td>
              </tr>
              <tr>
                <td>Collect Fresh Window (Hours)</td>
                <td>
                  <input
                    className="w-24 border-0 bg-transparent text-[12px] outline-none"
                    type="number"
                    min={1}
                    max={168}
                    value={dash.collectFreshHours}
                    onChange={(e) => set("collectFreshHours", Number(e.target.value))}
                  />
                </td>
              </tr>
              <tr>
                <td>License Expiring Soon (Days)</td>
                <td>
                  <input
                    className="w-24 border-0 bg-transparent text-[12px] outline-none"
                    type="number"
                    min={1}
                    max={365}
                    value={dash.licenseExpiringDays}
                    onChange={(e) => set("licenseExpiringDays", Number(e.target.value))}
                  />
                </td>
              </tr>
              <tr>
                <td>Show Multitenant Help Banner</td>
                <td>
                  <input
                    type="checkbox"
                    checked={dash.showMultitenantHint}
                    onChange={(e) => set("showMultitenantHint", e.target.checked)}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="rpma-panel overflow-hidden p-0">
        <div className="px-4 py-3">
          <h2 className="text-[16px] font-extrabold text-fg">KPI Strip</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="rpma-xls">
            <thead>
              <tr>
                <th>Item</th>
                <th>Used For</th>
                <th className="text-center">On</th>
              </tr>
            </thead>
            <tbody>
              <ToggleRow label="Customer Ecosystem" help="Count of customers" checked={dash.kpiCustomers} onChange={(v) => set("kpiCustomers", v)} />
              <ToggleRow label="Customers Needing Attention" help="Attention reasons" checked={dash.kpiAttention} onChange={(v) => set("kpiAttention", v)} />
              <ToggleRow label="Ecosystem Assurance" help="Average assurance score" checked={dash.kpiAssurance} onChange={(v) => set("kpiAssurance", v)} />
              <ToggleRow label="Customer Data Refresh" help="Fresh vs total collects" checked={dash.kpiRefresh} onChange={(v) => set("kpiRefresh", v)} />
              <ToggleRow label="Ecosystem Open Risks" help="Open risks on the board" checked={dash.kpiRisks} onChange={(v) => set("kpiRisks", v)} />
              <ToggleRow label="Licenses Expiring" help="Count in the license window" checked={dash.kpiLicenses} onChange={(v) => set("kpiLicenses", v)} />
              <ToggleRow label="RMM Devices" help="Pulseway rollup" checked={dash.kpiRmm} onChange={(v) => set("kpiRmm", v)} />
              <ToggleRow label="SYSPRO Hotfixes" help="Hotfix charts" checked={dash.kpiHotfixes} onChange={(v) => set("kpiHotfixes", v)} />
            </tbody>
          </table>
        </div>
      </section>

      <section className="rpma-panel overflow-hidden p-0">
        <div className="px-4 py-3">
          <h2 className="text-[16px] font-extrabold text-fg">Estate Panels</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="rpma-xls">
            <thead>
              <tr>
                <th>Item</th>
                <th>Used For</th>
                <th className="text-center">On</th>
              </tr>
            </thead>
            <tbody>
              <ToggleRow label="Customer Portfolio Table" help="Searchable estate list" checked={dash.panelPortfolioTable} onChange={(v) => set("panelPortfolioTable", v)} />
              <ToggleRow label="RMM Customer Health" help="Devices, offline, critical" checked={dash.panelRmmHealth} onChange={(v) => set("panelRmmHealth", v)} />
              <ToggleRow label="Customer Data Refresh List" help="Fresh / stale per customer" checked={dash.panelDataRefresh} onChange={(v) => set("panelDataRefresh", v)} />
              <ToggleRow label="Customers Needing Attention" help="Clickable attention reasons" checked={dash.panelAttention} onChange={(v) => set("panelAttention", v)} />
              <ToggleRow label="Ecosystem Assurance Chart" help="Assurance % by customer" checked={dash.panelAssuranceChart} onChange={(v) => set("panelAssuranceChart", v)} />
              <ToggleRow label="Health Score Chart" help="Health by customer" checked={dash.panelHealthChart} onChange={(v) => set("panelHealthChart", v)} />
              <ToggleRow label="SLA Stats Table" help="Availability when present" checked={dash.panelSla} onChange={(v) => set("panelSla", v)} />
              <ToggleRow label="Licenses Expiring Table" help="License window detail" checked={dash.panelLicenses} onChange={(v) => set("panelLicenses", v)} />
              <ToggleRow label="Open Risks Table" help="Risks and issues" checked={dash.panelRisks} onChange={(v) => set("panelRisks", v)} />
              <ToggleRow label="SQL Script Backup Status" help="SQL backup health" checked={dash.panelBackups} onChange={(v) => set("panelBackups", v)} />
            </tbody>
          </table>
        </div>
      </section>

      <section className="rpma-panel overflow-hidden p-0">
        <div className="px-4 py-3">
          <h2 className="text-[16px] font-extrabold text-fg">Customer Workspace</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="rpma-xls">
            <thead>
              <tr>
                <th>Setting</th>
                <th>Used For</th>
                <th className="text-center">On</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Open Customer On</td>
                <td>
                  <select
                    className="border-0 bg-transparent text-[12px] outline-none"
                    value={dash.customerLanding}
                    onChange={(e) =>
                      set("customerLanding", e.target.value as DashboardConfig["customerLanding"])
                    }
                  >
                    <option value="exec">Customer Ecosystem</option>
                    <option value="syspro">SYSPRO Hub</option>
                    <option value="ams">Customer Assurance</option>
                  </select>
                </td>
                <td />
              </tr>
              <ToggleRow label="Charts On Customer Ecosystem" help="Operator / signal charts" checked={dash.customerShowCharts} onChange={(v) => set("customerShowCharts", v)} />
              <ToggleRow label="FinSight Out Of Balance Strip" help="DTR strip on customer exec" checked={dash.customerShowDtr} onChange={(v) => set("customerShowDtr", v)} />
              <ToggleRow label="Priorities And Risks Lists" help="Lists on customer exec" checked={dash.customerShowLists} onChange={(v) => set("customerShowLists", v)} />
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
