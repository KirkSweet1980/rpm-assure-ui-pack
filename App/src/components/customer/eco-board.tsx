import { useEffect, useMemo, useState, type CSSProperties, type HTMLAttributes, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EcoCustomizeButton, EcoCustomizePanel } from "@/components/customer/eco-customize";
import { SpaLink } from "@/components/nav/spa-link";
import { ChartTooltip, CHART_TOOLTIP_CURSOR } from "@/components/portfolio/chart-tooltip";
import { RagBadge } from "@/components/portfolio/rag-badge";
import { EcoKpis } from "@/components/customer/eco-kpis";
import { StatCard } from "@/components/portfolio/stat-card";
import { HelpTip } from "@/components/ui/help-tip";
import { CoverTag } from "@/components/ui/status-robot";
import { coverFromDetail, isDormantCover, isPillarCovered } from "@/lib/data/cover";
import { customerLiveStatus } from "@/lib/data/live-status";
import { assuranceTone, floorScoreToRag } from "@/lib/data/rag-score";
import { buildExcoPillarSla, slaInputFromDetail } from "@/lib/data/exco-sla-stats";
import { finsightModuleName } from "@/lib/brand/finsight";
import { CHART } from "@/lib/brand-colors";
import {
  DEFAULT_ECO_WIDGET_LAYOUT,
  ecoWidgetMeta,
  readEcoWidgetLayout,
  visibleEcoWidgets,
  type EcoWidgetId,
  type EcoWidgetLayout,
} from "@/lib/eco-widgets";
import type { CustomerDetailPayload } from "@/lib/data/types";
import { ticketStats } from "@/lib/data/ticket-feed";
import { cn, formatSastDateTime } from "@/lib/utils";

function axisLabel(v: unknown, max = 14) {
  const s = String(v ?? "").trim();
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function hoursAgo(iso: string | null | undefined): string {
  if (!iso) return "Never";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";
  const h = Math.round((Date.now() - t) / 3_600_000);
  if (h < 1) return "Just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

function Pane({
  title,
  tip,
  covered,
  children,
  className,
  ...rest
}: {
  title: string;
  tip?: string;
  covered?: boolean;
  children: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLElement>) {
  return (
    <section className={cn("rpma-glass p-3", className)} {...rest}>
      <p className="mb-1.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-muted">
        <span className="min-w-0 flex-1 truncate">{title}</span>
        {covered != null ? <CoverTag on={covered} /> : null}
        {tip ? <HelpTip text={tip} /> : null}
      </p>
      {children}
    </section>
  );
}

export function EcoBoard({ data }: { data: CustomerDetailPayload }) {
  const { customer, risks, issues, incidents, dtrLevel1, license, dayEnd, jobErrors, extraSummary, sysproHotfixes, operators } = data;
  const cover = coverFromDetail(data);
  const dormant = isDormantCover(cover);
  const live = customerLiveStatus(customer.customerCode, customer, cover, data);
  const tenantRag = dormant ? "Off" : live.pillars.eco.rag === "Off" ? "Green" : live.pillars.eco.rag;
  const rawScore = dormant
    ? 0
    : data.operationalAssurance?.scorePct ??
      (tenantRag === "Green" ? 88 : tenantRag === "Amber" ? 68 : 42);
  const score = dormant ? 0 : floorScoreToRag(rawScore, tenantRag);
  const base = `/customers/${customer.customerCode}`;
  const [layout, setLayout] = useState<EcoWidgetLayout>(DEFAULT_ECO_WIDGET_LAYOUT);
  const [customizeOpen, setCustomizeOpen] = useState(false);

  useEffect(() => {
    setLayout(readEcoWidgetLayout());
  }, []);

  const openRisks = risks.filter((r) => (r.status || "").toLowerCase() !== "closed");
  const openIssues = issues.filter((i) => (i.status || "").toLowerCase() !== "closed");
  const openIncidents = incidents.filter((i) => (i.status || "").toLowerCase() !== "closed");
  const major = openIncidents.filter((i) => i.isMajor);
  const tix = ticketStats(incidents, data.slaPolicies);

  const lastCollect = [
    customer.lastImportAt,
    customer.pulsewayLastImportAt,
    customer.coveLastImportAt,
    customer.eppLastImportAt,
    customer.cspLastImportAt,
  ].reduce<string | null>((best, v) => {
    if (!v) return best;
    if (!best) return v;
    return new Date(v).getTime() > new Date(best).getTime() ? v : best;
  }, null);

  const serviceBars = [
    { name: "SYSPRO", on: cover.syspro, href: `${base}/syspro` },
    { name: "RPM RMM", on: Boolean(cover.rmm), href: `${base}/rmm` },
    { name: "Cloud Backup", on: Boolean(cover.cove), href: `${base}/cove` },
    { name: "RPM EndPoint Protection", on: Boolean(cover.epp), href: `${base}/epp` },
    { name: "Microsoft CSP", on: Boolean(cover.csp), href: `${base}/csp` },
    { name: "Tickets", on: Boolean(cover.tickets), href: `${base}/tickets` },
  ];
  const coverCount = serviceBars.filter((s) => s.on).length;
  const coverPie = [
    { name: "On cover", value: coverCount, fill: "#17c666" },
    { name: "No cover", value: Math.max(0, serviceBars.length - coverCount), fill: "#5c6570" },
  ];

  const signalBars = [
    { name: "Jobs", value: customer.sysproJobErrorCount, fill: CHART.jobs },
    { name: "FinSight", value: customer.sysproDtrVarianceLines, fill: CHART.dtr },
    { name: "Risks", value: openRisks.length, fill: CHART.amber },
    { name: "Incidents", value: tix.total, fill: CHART.red },
  ];

  const rmmSum = data.rmm?.summary;
  const rmmOn =
    (rmmSum?.serverOnline ?? 0) + (rmmSum?.workstationOnline ?? 0) ||
    rmmSum?.onlineCount ||
    customer.pulsewayOnlineCount ||
    0;
  const rmmOff =
    (rmmSum?.serverOffline ?? 0) + (rmmSum?.workstationOffline ?? 0) ||
    rmmSum?.offlineCount ||
    customer.pulsewayOfflineCount ||
    0;
  const rmmServersOn = rmmSum?.serverOnline ?? customer.pulsewayServerOnline ?? 0;
  const rmmServersOff = rmmSum?.serverOffline ?? customer.pulsewayServerOffline ?? 0;
  const rmmCrit = rmmSum?.criticalAlerts ?? customer.pulsewayCriticalAlerts ?? 0;
  const rmmPie = [
    { name: "Online", value: rmmOn, fill: "#17c666" },
    { name: "Offline", value: rmmOff, fill: "#ea4d4d" },
  ];
  const coveOk = data.cove?.summary?.okCount ?? customer.coveOkDeviceCount ?? 0;
  const coveBad =
    (data.cove?.summary?.failedCount ?? customer.coveFailedDeviceCount ?? 0) +
    (data.cove?.summary?.staleCount ?? customer.coveStaleDeviceCount ?? 0);
  const eppDevices = data.epp?.summary?.deviceCount ?? data.epp?.devices?.length ?? customer.eppDeviceCount ?? 0;
  const eppInfected = customer.bdInfectedCount ?? data.epp?.incidents?.length ?? 0;
  const covePie = [
    { name: "Healthy", value: coveOk, fill: "#17c666" },
    { name: "Failed / stale", value: coveBad, fill: "#ffa21d" },
  ];
  const activeOps = customer.activeUserCount;
  const totalOps = Math.max(customer.operatorCount, 1);
  const userPie = [
    { name: "Active", value: activeOps, fill: CHART.active },
    { name: "Quiet", value: Math.max(0, totalOps - activeOps), fill: CHART.secondary },
  ];
  const fleetPie = cover.rmm ? rmmPie : cover.cove ? covePie : userPie;
  const fleetTitle = cover.rmm ? "RMM agents" : cover.cove ? "Cloud backup" : "Operators";

  const dtrBars = useMemo(() => {
    return (dtrLevel1 ?? [])
      .filter((d) => d.varianceLineCount > 0)
      .map((d) => ({
        name: finsightModuleName(d.balanceTypeCode, d.balanceTypeName),
        oob: d.varianceLineCount,
      }))
      .sort((a, b) => b.oob - a.oob)
      .slice(0, 6);
  }, [dtrLevel1]);

  const sla = useMemo(() => {
    try {
      return buildExcoPillarSla(slaInputFromDetail(cover, data));
    } catch {
      return { pillars: [], overallPct: score };
    }
  }, [data, score]);

  const freshness = [
    { k: "SYSPRO", at: customer.lastImportAt, on: cover.syspro },
    { k: "RMM", at: customer.pulsewayLastImportAt, on: Boolean(cover.rmm) },
    { k: "Backup", at: customer.coveLastImportAt, on: Boolean(cover.cove) },
    { k: "EPP", at: customer.eppLastImportAt, on: Boolean(cover.epp) },
    { k: "M365", at: customer.cspLastImportAt, on: Boolean(cover.csp) },
  ];

  const shown = useMemo(() => new Set(visibleEcoWidgets(layout, cover)), [layout, cover]);

  function wgt(id: EcoWidgetId) {
    const meta = ecoWidgetMeta(id);
    return {
      "data-span": meta.span,
      style: { order: layout.order.indexOf(id) } as CSSProperties,
    };
  }

  function show(id: EcoWidgetId) {
    return shown.has(id);
  }

  const ragTone =
    tenantRag === "Green" ? "green" : tenantRag === "Red" ? "red" : "amber";

  return (
    <div className="rpma-eco-visuals space-y-3">
      <div className="rpma-eco-menubar">
        <h2 className="rpma-eco-menubar-title sr-only">Customer EcoSystem</h2>
        <div className="ml-auto flex items-center gap-2">
          <Button asChild size="sm" variant="secondary" className="h-8 gap-1.5 text-[12px] font-semibold">
            <a href={`/api/agent-pack/${encodeURIComponent(customer.customerCode)}`} download>
              <Download className="size-3.5" />
              Assure Agent
            </a>
          </Button>
          <EcoCustomizeButton open={customizeOpen} onClick={() => setCustomizeOpen((v) => !v)} />
        </div>
      </div>
      {customizeOpen ? (
        <EcoCustomizePanel
          layout={layout}
          cover={cover}
          onChange={setLayout}
          onClose={() => setCustomizeOpen(false)}
        />
      ) : null}


      {dormant ? (
        <div className="rpma-dormant-banner" role="status">
          <strong>Dormant customer</strong>
          <span>
            Tickets only — no Assure agent and no SYSPRO, RMM, Backup, or EPP cover.
            SLA is not scored and RAG lights stay off until an agent or a covered service lands.
          </span>
        </div>
      ) : null}

      <div className="rpma-eco-board">
        {show("hero") ? (
        <div className="rpma-glass flex flex-wrap items-center gap-3 px-4 py-3" {...wgt("hero")}>
          <RagBadge rag={tenantRag} title={live.pillars.eco.hint || customer.healthSummary} />
          <div className="min-w-0">
            <p className="text-lg font-bold tracking-tight text-fg">{customer.displayName}</p>
            <p className="text-[12px] text-muted">
              Ecosystem overview · last collect {formatSastDateTime(lastCollect)}
            </p>
          </div>
          <div className="ml-auto min-w-[16rem] max-w-lg flex-1">
            <EcoKpis
              items={[
                {
                  label: "Assurance",
                  value: dormant || score == null ? "—" : `${score}%`,
                  tone: dormant || score == null ? "default" : assuranceTone(score, tenantRag),
                },
                {
                  label: "On cover",
                  value: `${coverCount}/${serviceBars.length}`,
                  tone: coverCount >= 4 ? "green" : coverCount >= 2 ? "amber" : "red",
                },
                {
                  label: "Open risks",
                  value: openRisks.length,
                  tone: openRisks.length === 0 ? "green" : "amber",
                },
              ]}
            />
          </div>
        </div>
        ) : null}

        {show("cover") ? (
        <Pane title="Service cover" tip="Green chip = live collect in scope. Grey = No Cover (not scored)." {...wgt("cover")}>
          <div className="flex flex-wrap gap-1.5">
            {serviceBars.map((s) => (
              <SpaLink
                key={s.name}
                href={s.href}
                className={cn("rpma-modbtn", s.on ? "is-cover" : "is-nocover")}
              >
                {s.name}
              </SpaLink>
            ))}
          </div>
        </Pane>
        ) : null}

        {show("attention") ? (
        <Pane title="What needs attention" tip="Open signals across SYSPRO and AMS." {...wgt("attention")}>
          <EcoKpis cols={2} items={signalBars.map((e) => ({ label: e.name, value: e.value }))} />
        </Pane>
        ) : null}

        {show("fleet") ? (
        <Pane title={fleetTitle} {...wgt("fleet")}>
          <EcoKpis cols={2} items={fleetPie.map((e) => ({ label: e.name, value: e.value }))} />
        </Pane>
        ) : null}

        {show("sla") ? (
        <Pane title="SLA by service" tip="SYSPRO, RMM, Backup and EPP only. Microsoft CSP is posture — never scored." {...wgt("sla")}>
          <ul className="space-y-2">
            {sla.pillars.length ? (
              sla.pillars.map((p) => (
                <li key={p.pillar} className="flex items-baseline justify-between gap-2">
                  <span className="text-[12px] font-semibold text-fg">{p.label}</span>
                  <span className="font-mono text-[13px] font-bold text-fg">
                    {p.covered && p.pct != null ? `${Math.round(p.pct)}%` : "—"}
                  </span>
                </li>
              ))
            ) : (
              <li className="text-[12px] text-muted">No covered services to score.</li>
            )}
          </ul>
          {sla.overallPct != null ? (
            <p className="mt-2 text-[11px] text-muted">Overall {Math.round(sla.overallPct)}%</p>
          ) : null}
        </Pane>
        ) : null}

        {show("rmm") ? (
        <Pane title="RPM RMM" tip="RPM RMM agents on the latest snapshot." covered={isPillarCovered(cover, "rmm")} {...wgt("rmm")}>
          {isPillarCovered(cover, "rmm") ? (
            <EcoKpis
              cols={2}
              items={[
                { label: "Online", value: rmmOn, tone: "green" },
                { label: "Offline", value: rmmOff, tone: rmmOff > 0 ? "red" : "green" },
                { label: "Critical", value: rmmCrit, tone: rmmCrit > 0 ? "red" : "green" },
                { label: "Servers", value: `${rmmServersOn}/${rmmServersOn + rmmServersOff}` },
              ]}
            />
          ) : (
            <p className="text-[12px] text-muted">No cover — RPM RMM is not in scope.</p>
          )}
        </Pane>
        ) : null}

        {show("backup") ? (
        <Pane title="Cloud Backup" tip="Cloud Backup devices vs 24h RPO." covered={isPillarCovered(cover, "cove")} {...wgt("backup")}>
          {isPillarCovered(cover, "cove") ? (
            <EcoKpis
              cols={2}
              items={[
                { label: "Healthy", value: coveOk, tone: "green" },
                { label: "Failed / stale", value: coveBad, tone: coveBad > 0 ? "amber" : "green" },
              ]}
            />
          ) : (
            <p className="text-[12px] text-muted">No cover — Cloud Backup is not in scope.</p>
          )}
        </Pane>
        ) : null}

        {show("epp") ? (
        <Pane title="RPM EndPoint Protection" tip="Protected endpoints, incidents, and quarantine." covered={isPillarCovered(cover, "epp")} {...wgt("epp")}>
          {isPillarCovered(cover, "epp") ? (
            <EcoKpis
              cols={2}
              items={[
                { label: "Endpoints", value: eppDevices },
                { label: "Infected", value: eppInfected, tone: eppInfected > 0 ? "red" : "green" },
              ]}
            />
          ) : (
            <p className="text-[12px] text-muted">No cover — RPM EndPoint Protection is not in scope.</p>
          )}
        </Pane>
        ) : null}

        {show("csp") ? (
        <Pane title="Microsoft CSP" tip="Tenant posture from Graph collect. Visibility only — not scored." covered={isPillarCovered(cover, "csp")} {...wgt("csp")}>
          {isPillarCovered(cover, "csp") ? (
            <EcoKpis
              cols={2}
              items={[
                {
                  label: "Secure Score",
                  value:
                    customer.cspSecureScorePct != null ? `${Math.round(customer.cspSecureScorePct)}%` : "—",
                },
                {
                  label: "MFA",
                  value:
                    customer.cspMfaRegisteredPct != null
                      ? `${Math.round(customer.cspMfaRegisteredPct)}%`
                      : "—",
                },
                { label: "Users", value: customer.cspUserCount ?? 0 },
                { label: "Seats", value: customer.cspAssignedSeats ?? 0 },
              ]}
            />
          ) : (
            <p className="text-[12px] text-muted">No cover — Microsoft CSP is not in scope.</p>
          )}
        </Pane>
        ) : null}

        {show("tickets") ? (
        <Pane title="RPM Service Desk" tip="Open / resolved / closed tickets." covered={true} {...wgt("tickets")}>
          {tix.total > 0 ? (
            <EcoKpis
              items={[
                { label: "Open Tickets", value: tix.open, tone: tix.open > 0 ? "amber" : "green" },
                { label: "Resolved Tickets", value: tix.resolved },
                { label: "Closed Tickets", value: tix.closed },
              ]}
            />
          ) : (
            <p className="text-[12px] text-muted">No tickets exist for this customer.</p>
          )}
        </Pane>
        ) : null}

        {show("finsight") ? (
        dtrBars.length > 0 ? (
          <Pane title="FinSight · out of balance" {...wgt("finsight")}>
            <div className="grid grid-cols-2 gap-1.5">
              {dtrBars.slice(0, 6).map((e) => (
                <StatCard key={e.name} label={e.name} value={e.oob} tone="amber" />
              ))}
            </div>
          </Pane>
        ) : (
          <Pane title="FinSight · out of balance" {...wgt("finsight")}>
            <p className="text-[12px] text-muted">No out-of-balance modules on the latest collect.</p>
          </Pane>
        )
        ) : null}

        {show("jumps") ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4" {...wgt("jumps")}>
          {[
            { label: "Incidents", href: `${base}/tickets/open`, n: tix.total, hint: `${tix.open} open · Freshdesk` },
            { label: "Risks", href: `${base}/ams/risks`, n: openRisks.length, hint: "Open items" },
            { label: "SLA", href: `${base}/ams/sla`, n: dormant ? "—" : `${score}%`, hint: "Assurance" },
            { label: "Customer Assurance", href: `${base}/ams`, n: openIssues.length, hint: "Issues" },
          ].map((t) => (
            <SpaLink key={t.href} href={t.href} className="rpma-glass rpma-tile block px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted">{t.label}</p>
              <p
                className={cn(
                  "font-mono text-xl font-bold",
                  ragTone === "red" && t.label === "Risks" ? "text-rag-red" : "text-fg",
                )}
              >
                {t.n}
              </p>
              <p className="text-[11px] text-muted">{t.hint} · open module</p>
            </SpaLink>
          ))}
        </div>
        ) : null}

        {show("incidents") ? (
        <Pane title="Tickets (30d)" {...wgt("incidents")}>
          {incidents.length === 0 ? (
            <p className="text-[12px] text-muted">No Freshdesk tickets mapped to this customer yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {incidents.slice(0, 8).map((i, idx) => (
                <li key={String(i.incidentId ?? i.title ?? idx)} className="flex justify-between gap-2 text-[12px]">
                  <span className="truncate text-fg">
                    {i.externalRef ? `${i.externalRef} · ` : ""}
                    {i.title || "Untitled"}
                  </span>
                  <span className="shrink-0 text-muted">{i.status}</span>
                </li>
              ))}
            </ul>
          )}
        </Pane>
        ) : null}

        {show("risks") ? (
        <Pane title="Open risks" {...wgt("risks")}>
          {openRisks.length === 0 ? (
            <p className="text-[12px] text-muted">No open risks.</p>
          ) : (
            <ul className="space-y-1.5">
              {openRisks.slice(0, 6).map((r, idx) => (
                <li key={String(r.title ?? idx)} className="flex justify-between gap-2 text-[12px]">
                  <span className="truncate text-fg">{r.title || "Untitled"}</span>
                  <span className="shrink-0 text-muted">{r.status}</span>
                </li>
              ))}
            </ul>
          )}
        </Pane>
        ) : null}

        {show("freshness") ? (
        <Pane title="Data freshness" tip="Age of the last collect per service." {...wgt("freshness")}>
          <ul className="space-y-1.5">
            {freshness.map((f) => (
              <li key={f.k} className="flex justify-between gap-2 text-[12px]">
                <span className="font-semibold text-fg">{f.k}</span>
                <span className="text-muted">{f.on ? hoursAgo(f.at) : "No cover"}</span>
              </li>
            ))}
          </ul>
        </Pane>
        ) : null}

        {show("license") ? (
        <Pane title="SYSPRO licence" {...wgt("license")}>
          <p className="text-[13px] font-semibold text-fg">{license?.productName ?? "—"}</p>
          <p className="mt-1 text-[12px] text-muted">
            {license?.licenseExpiry ? `Expires ${formatSastDateTime(license.licenseExpiry)}` : "No licence row"}
          </p>
        </Pane>
        ) : null}

        {show("dayend") ? (
        <Pane title="Day End" {...wgt("dayend")}>
          <p className="text-[13px] font-semibold text-fg">{dayEnd?.label ?? "—"}</p>
          <p className="mt-1 text-[12px] text-muted">{dayEnd?.detail ?? "No day-end snapshot"}</p>
        </Pane>
        ) : null}

        {show("jobs") ? (
        <Pane title="Job logging" {...wgt("jobs")}>
          <StatCard
            label="Errors"
            value={customer.sysproJobErrorCount}
            tone={customer.sysproJobErrorCount > 0 ? "amber" : "green"}
          />
          {jobErrors?.length ? (
            <ul className="mt-2 space-y-1">
              {jobErrors.slice(0, 4).map((j, i) => (
                <li key={i} className="truncate text-[11px] text-muted">
                  {j.programName || j.message || "Job error"}
                </li>
              ))}
            </ul>
          ) : null}
        </Pane>
        ) : null}

        {show("patch") ? (
        <Pane title="Server patch" {...wgt("patch")}>
          {isPillarCovered(cover, "rmm") ? (
            <SpaLink href={`${base}/rmm/patch`} className="block">
            <div className="grid grid-cols-2 gap-2">
              <StatCard label="Servers checked" value={customer.pulsewayPatchDevices ?? 0} hint="Open patch list" />
              <StatCard
                label="Outstanding"
                value={customer.pulsewayPatchMissing ?? 0}
                tone={(customer.pulsewayPatchMissing ?? 0) > 0 ? "amber" : "green"}
                hint="Click for KB titles"
              />
            </div>
            </SpaLink>
          ) : (
            <p className="text-[12px] text-muted">No cover — RMM is not in scope.</p>
          )}
        </Pane>
        ) : null}

        {show("operators") ? (
        <Pane title="SYSPRO operators" {...wgt("operators")}>
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Active" value={customer.activeUserCount} tone={customer.activeUserCount > 0 ? "green" : "amber"} />
            <StatCard label="Total" value={Math.max(customer.operatorCount, (operators ?? []).length)} />
          </div>
        </Pane>
        ) : null}

        {show("hotfixes") ? (
        <Pane title="SYSPRO hotfixes" {...wgt("hotfixes")}>
          <StatCard label="Applied" value={(sysproHotfixes ?? []).length} />
          <p className="mt-1 text-[12px] text-muted">
            {(sysproHotfixes ?? []).slice(0, 2).map((h) => h.hotfixName || h.hotfixCode).filter(Boolean).join(" · ") || "No hotfix rows"}
          </p>
        </Pane>
        ) : null}

        {show("sqlhealth") ? (
        <Pane title="SQL health" {...wgt("sqlhealth")}>
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Checks" value={extraSummary?.sqlHealthCount ?? 0} />
            <StatCard
              label="Failed"
              value={extraSummary?.sqlHealthFailCount ?? 0}
              tone={(extraSummary?.sqlHealthFailCount ?? 0) > 0 ? "red" : "green"}
            />
          </div>
        </Pane>
        ) : null}
      </div>
    </div>
  );
}
