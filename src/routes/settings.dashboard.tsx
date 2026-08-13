import { Link, createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, LayoutDashboard, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHead } from "@/components/ui/card";
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

function Toggle({
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
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-bg/40 px-3 py-2.5 transition hover:border-accent/30">
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 accent-[var(--color-accent)]"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-fg">{label}</span>
        {help ? (
          <span className="mt-0.5 block text-[11px] text-muted">{help}</span>
        ) : null}
      </span>
    </label>
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
      setMsg(
        "Saved. Open Exco Insight (or refresh it) to see the new layout.",
      );
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
    setMsg("Full operations defaults loaded in the form — click Save to store them.");
  }

  function applyPreset(key: string) {
    const p = DASHBOARD_PRESETS[key];
    if (!p) return;
    setDash((s) => ({ ...s, ...p.patch }));
    setPresetHint(key);
    setDirty(true);
    setMsg(
      `Preset “${p.label}” applied in the form only — click Save, then open Exco Insight.`,
    );
  }

  const counts = useMemo(() => countOn(dash), [dash]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent">
            <LayoutDashboard className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-bold text-fg">
              Dashboard Configuration
            </h2>
            <p className="mt-0.5 max-w-xl text-[13px] text-muted">
              Controls what appears on <strong className="text-fg">Exco Insight</strong>{" "}
              (home / estate view). Form shows{" "}
              <span className="font-medium text-fg">
                {counts.kpis} KPIs · {counts.panels} panels
              </span>
              {dirty ? (
                <span className="text-rag-amber"> · unsaved changes</span>
              ) : null}
              .
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-sm font-semibold text-fg hover:border-accent/40"
          >
            <ExternalLink className="h-4 w-4" />
            Open Exco Insight
          </Link>
          <Button type="button" variant="secondary" disabled={busy} onClick={onReset}>
            <RotateCcw className="h-4 w-4" />
            Reset defaults
          </Button>
          <Button type="button" disabled={busy} onClick={() => void onSave()}>
            <Save className="h-4 w-4" />
            Save
          </Button>
        </div>
      </div>

      <Card className="border-accent/25 bg-accent-soft/20">
        <CardHead>How to use</CardHead>
        <CardContent className="space-y-2 text-[13px] leading-relaxed text-muted">
          <ol className="list-decimal space-y-1.5 pl-5">
            <li>
              <strong className="text-fg">Pick a preset</strong> (optional) for a
              starting layout — ExCo board, RMM focus, SYSPRO / RPM Assure, or full ops.
            </li>
            <li>
              <strong className="text-fg">Fine-tune</strong> title, subtitle, KPI
              cards, and panels with the toggles below.
            </li>
            <li>
              Click <strong className="text-fg">Save</strong> — nothing is stored
              until you save (presets alone do not persist).
            </li>
            <li>
              Open <strong className="text-fg">Exco Insight</strong> (button above
              or home in the left menu). Refresh if it was already open.
            </li>
          </ol>
          <p className="text-[12px]">
            Who can change this: staff with access to Settings (Platform Admin).
            Layout is shared for all users — not per person. Customer drill-down
            pages are separate; only the estate home layout is controlled here.
          </p>
        </CardContent>
      </Card>

      {msg ? (
        <p
          className={cn(
            "rounded-lg border px-3 py-2 text-sm",
            msg.toLowerCase().includes("saved")
              ? "border-rag-green/30 bg-rag-green-bg text-rag-green"
              : "border-border bg-surface text-muted",
          )}
        >
          {msg}
        </p>
      ) : null}

      <Card>
        <CardHead>1 · Quick presets</CardHead>
        <CardContent className="space-y-2">
          <p className="text-[12px] text-muted">
            One click fills the form. Still click <strong className="text-fg">Save</strong>{" "}
            afterward.
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(DASHBOARD_PRESETS).map(([key, p]) => (
              <button
                key={key}
                type="button"
                onClick={() => applyPreset(key)}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-left transition hover:border-accent/40",
                  presetHint === key
                    ? "border-accent bg-accent-soft/40"
                    : "border-border bg-bg/40",
                )}
              >
                <span className="block text-sm font-semibold text-fg">{p.label}</span>
                <span className="mt-0.5 block text-[11px] text-muted">{p.help}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHead>2 · Estate page chrome</CardHead>
        <CardContent className="space-y-4">
          <label className="block text-xs">
            <span className="mb-1 block font-medium text-fg">Page title</span>
            <input
              className="field w-full"
              value={dash.estateTitle}
              onChange={(e) => set("estateTitle", e.target.value)}
              maxLength={80}
              placeholder="Exco Insight"
            />
            <span className="mt-1 block text-[11px] text-muted">
              Large heading on the estate home page (default: Exco Insight).
            </span>
          </label>
          <label className="block text-xs">
            <span className="mb-1 block font-medium text-fg">Page subtitle</span>
            <input
              className="field w-full"
              value={dash.estateSubtitle}
              onChange={(e) => set("estateSubtitle", e.target.value)}
              maxLength={240}
            />
            <span className="mt-1 block text-[11px] text-muted">
              One line under the title — e.g. what the board should focus on.
            </span>
          </label>
          <label className="block text-xs">
            <span className="mb-1 block font-medium text-fg">
              Exco auto-refresh (seconds)
            </span>
            <input
              className="field max-w-xs"
              type="number"
              min={0}
              max={3600}
              step={30}
              value={dash.excoAutoRefreshSec ?? 120}
              onChange={(e) =>
                set("excoAutoRefreshSec", Math.floor(Number(e.target.value) || 0))
              }
            />
            <span className="mt-1 block text-[11px] text-muted">
              How often Exco Insight reloads estate metrics while open. 0 = off.
              When on, minimum 30 (default 120). Still needs scheduled SQL collects
              for Pulseway, Cove, SYSPRO, and EPP.
            </span>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs">
              <span className="mb-1 block font-medium text-fg">
                Collect “Fresh” window (hours)
              </span>
              <input
                className="field"
                type="number"
                min={1}
                max={168}
                value={dash.collectFreshHours}
                onChange={(e) => set("collectFreshHours", Number(e.target.value))}
              />
              <span className="mt-1 block text-[11px] text-muted">
                How recent a collect must be to show as Fresh on Exco Insight. Does
                not change RAG math (that is Settings → RAG).
              </span>
            </label>
            <label className="block text-xs">
              <span className="mb-1 block font-medium text-fg">
                License “expiring soon” (days)
              </span>
              <input
                className="field"
                type="number"
                min={1}
                max={365}
                value={dash.licenseExpiringDays}
                onChange={(e) =>
                  set("licenseExpiringDays", Number(e.target.value))
                }
              />
              <span className="mt-1 block text-[11px] text-muted">
                KPI and license panel use this window (e.g. 90 = next 90 days).
              </span>
            </label>
          </div>
          <Toggle
            label="Show multitenant help banner"
            help="Short tip on estate vs customer switcher — usually off after training."
            checked={dash.showMultitenantHint}
            onChange={(v) => set("showMultitenantHint", v)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHead>3 · KPI strip (top cards)</CardHead>
        <CardContent className="space-y-2">
          <p className="text-[12px] text-muted">
            Top summary numbers. Off = card hidden (layout reflows).
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Toggle
              label="Customer Ecosystem"
              help="Count of customers on the estate board."
              checked={dash.kpiCustomers}
              onChange={(v) => set("kpiCustomers", v)}
            />
            <Toggle
              label="Customers Needing Attention"
              help="How many have attention reasons (health, RMM, collect, etc.)."
              checked={dash.kpiAttention}
              onChange={(v) => set("kpiAttention", v)}
            />
            <Toggle
              label="Ecosystem Assurance"
              help="Average assurance score across customers."
              checked={dash.kpiAssurance}
              onChange={(v) => set("kpiAssurance", v)}
            />
            <Toggle
              label="Customer Data Refresh"
              help="Fresh collects vs total (uses Fresh window above)."
              checked={dash.kpiRefresh}
              onChange={(v) => set("kpiRefresh", v)}
            />
            <Toggle
              label="Ecosystem Open Risks"
              help="Sum of open risks on the board."
              checked={dash.kpiRisks}
              onChange={(v) => set("kpiRisks", v)}
            />
            <Toggle
              label="Licenses Expiring"
              help="Count in the license days window."
              checked={dash.kpiLicenses}
              onChange={(v) => set("kpiLicenses", v)}
            />
            <Toggle
              label="RMM Devices"
              help="Pulseway devices / offline / critical rollup."
              checked={dash.kpiRmm}
              onChange={(v) => set("kpiRmm", v)}
            />
            <Toggle
              label="SYSPRO Hotfixes (charts)"
              help="Estate charts: installed by customer, gaps, coverage pie — not a single total KPI."
              checked={dash.kpiHotfixes}
              onChange={(v) => set("kpiHotfixes", v)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHead>4 · Estate panels (main body)</CardHead>
        <CardContent className="space-y-2">
          <p className="text-[12px] text-muted">
            Larger sections under the KPI strip. Off = panel not rendered.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Toggle
              label="Customer portfolio table"
              help="Searchable list: health, ops, jobs, FinSight, RMM, Cove."
              checked={dash.panelPortfolioTable}
              onChange={(v) => set("panelPortfolioTable", v)}
            />
            <Toggle
              label="RMM Customer Health"
              help="Per-customer Pulseway devices, offline, critical."
              checked={dash.panelRmmHealth}
              onChange={(v) => set("panelRmmHealth", v)}
            />
            <Toggle
              label="Customer Data Refresh list"
              help="Last import time and Fresh/Stale per customer."
              checked={dash.panelDataRefresh}
              onChange={(v) => set("panelDataRefresh", v)}
            />
            <Toggle
              label="Customers Needing Attention"
              help="Clickable list of attention reasons."
              checked={dash.panelAttention}
              onChange={(v) => set("panelAttention", v)}
            />
            <Toggle
              label="Ecosystem Assurance chart"
              help="Bar chart of assurance % by customer."
              checked={dash.panelAssuranceChart}
              onChange={(v) => set("panelAssuranceChart", v)}
            />
            <Toggle
              label="Health Score chart"
              help="Horizontal health score by customer."
              checked={dash.panelHealthChart}
              onChange={(v) => set("panelHealthChart", v)}
            />
            <Toggle
              label="SLA Stats table"
              help="SLA / availability when snapshot data exists."
              checked={dash.panelSla}
              onChange={(v) => set("panelSla", v)}
            />
            <Toggle
              label="Licenses Expiring table"
              help="Detail rows for the license KPI window."
              checked={dash.panelLicenses}
              onChange={(v) => set("panelLicenses", v)}
            />
            <Toggle
              label="Open Risks table"
              help="Risk and issue counts by customer."
              checked={dash.panelRisks}
              onChange={(v) => set("panelRisks", v)}
            />
            <Toggle
              label="SQL Script Backup Status table"
              help="SQL backup health when collect is in place."
              checked={dash.panelBackups}
              onChange={(v) => set("panelBackups", v)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHead>5 · Customer workspace defaults</CardHead>
        <CardContent className="space-y-3">
          <p className="text-[12px] text-muted">
            Applies when you open a single customer from the switcher — not the
            estate home layout.
          </p>
          <label className="block text-xs">
            <span className="mb-1 block font-medium text-fg">Open customer on</span>
            <select
              className="field"
              value={dash.customerLanding}
              onChange={(e) =>
                set(
                  "customerLanding",
                  e.target.value as DashboardConfig["customerLanding"],
                )
              }
            >
              <option value="exec">Customer Ecosystem</option>
              <option value="syspro">SYSPRO hub</option>
              <option value="ams">RPM Assure pack hub</option>
            </select>
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            <Toggle
              label="Charts on Customer Ecosystem"
              help="Operator / signal charts on the customer exec page."
              checked={dash.customerShowCharts}
              onChange={(v) => set("customerShowCharts", v)}
            />
            <Toggle
              label="FinSight Out of Balance strip"
              checked={dash.customerShowDtr}
              onChange={(v) => set("customerShowDtr", v)}
            />
            <Toggle
              label="Priorities & risks lists"
              checked={dash.customerShowLists}
              onChange={(v) => set("customerShowLists", v)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3 py-2.5">
        <p className="text-[12px] text-muted">
          {dirty
            ? "You have unsaved changes."
            : "Form matches last saved settings."}
        </p>
        <Button type="button" disabled={busy || !dirty} onClick={() => void onSave()}>
          <Save className="h-4 w-4" />
          Save configuration
        </Button>
      </div>
    </div>
  );
}
