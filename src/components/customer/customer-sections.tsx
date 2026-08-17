import {
  Activity,
  AlertTriangle,
  ChevronRight,
  ClipboardList,
  Database,
  FileKey2,
  HardDrive,
  HeartPulse,
  Layers,
  ListTodo,
  Monitor,
  Package,
  Printer,
  Server,
  Shield,
  Users,
} from "lucide-react";
import { Children, Fragment, isValidElement, useEffect, useMemo, useState, type ReactNode } from "react";
import { ListPanel, ListRow } from "@/components/nav/list-row";
import { StickyPickSplit } from "@/components/customer/tenant-tree";
import { SpaLink } from "@/components/nav/spa-link";
import { keepLiveIops } from "@/lib/data/agent-iops";
import { useDashboardConfig } from "@/lib/settings/use-dashboard-config";
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
import { ChartTooltip, CHART_TOOLTIP_CURSOR } from "@/components/portfolio/chart-tooltip";
import { ProgramLabel } from "@/components/portfolio/program-label";
import { RagBadge } from "@/components/portfolio/rag-badge";
import { StatCard } from "@/components/portfolio/stat-card";
import { Badge } from "@/components/ui/badge";
import { NoCover, NoCoverPanel } from "@/components/ui/no-cover";
import { HelpTip, MetricLabel } from "@/components/ui/help-tip";
import { classifyRmmDevice, classifyServerHardware, isRmmServer, isRmmWorkstation } from "@/lib/data/rmm-device-class";
import { ServerKindIcon } from "@/components/customer/server-kind-icon";
import { assuranceTone } from "@/lib/data/rag-score";
import { Card, CardContent, CardHead } from "@/components/ui/card";
import { CHART } from "@/lib/brand-colors";
import { SignedSlaPanel } from "@/components/customer/signed-sla-panel";
import { CustomerSlaTree } from "@/components/customer/sla-tree";
import { formatProgramLabel } from "@/lib/data/syspro-programs";
import type { CustomerDetailPayload } from "@/lib/data/types";
import { coverFromDetail, isPillarCovered, type CustomerCover, type PillarId } from "@/lib/data/cover";
import { buildExcoPillarSla, slaInputFromDetail } from "@/lib/data/exco-sla-stats";
import { dayEndTone, isJobFailed } from "@/lib/data/day-end";
import {
  INDUSTRY_MEASURES,
  INDUSTRY_SLA_DOC,
  RPM_CONTRACT_CLOCKS,
  RPM_CONTRACT_RULES,
  RPM_SECURITY_ADMIN,
  RPM_SLA_DATE,
  RPM_SLA_REVISION,
  RPM_SLA_TITLE,
  vsIndustryTone,
} from "@/lib/data/sla-metrics";
import { buildRmmServiceSla, buildCoveServiceSla, buildEppServiceSla, buildSysproServiceSla, buildCspServiceSla, buildTicketsServiceSla } from "@/lib/data/service-sla";
import { ServiceSlaTable, SlaStrip } from "@/components/customer/service-sla-section";
import { CoveEsrPanel } from "@/components/customer/cove-esr-panel";
import { cn, formatSastDate, formatSastDateTime } from "@/lib/utils";
import {
  FINSIGHT_COL,
  FINSIGHT_CONTROL_WHAT,
  FINSIGHT_INTEGRATION_WHAT,
  FINSIGHT_PRODUCT,
  FINSIGHT_STATUS,
  finsightCleanDescription,
  finsightControlHint,
  finsightLevelHint,
  finsightLevelLabel,
  finsightModuleName,
  finsightModuleTitle,
} from "@/lib/brand/finsight";
import {
  M365_PAGES,
  M365_PRODUCT,
  M365_TAGLINE,
  m365SkuLabel,
  m365UtilLabel,
  m365UtilPct,
} from "@/lib/brand/m365";
import {
  autoOpenFinSightReconCases,
  updateFinSightReconCase,
} from "@/lib/data/finsight-recon-api";
import {
  upsertAmsIncident,
  transitionAmsIncident,
} from "@/lib/data/ams-incident-api";
import type { FactIncidentRow } from "@/lib/data/types";
import { ticketStats, ticketsForPillar, type TicketPillar } from "@/lib/data/ticket-feed";

function axisLabel(v: unknown, max = 14) {
  const s = String(v ?? "").trim();
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}
import type { DtrDetailLine, FinSightReconCase, FinSightReconStatus } from "@/lib/data/types";
import { FinSightD3Hierarchy } from "@/components/finsight/d3-hierarchy";

function formatZar(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-ZA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function ChartCaption({ title, why }: { title: string; why: string }) {
  return (
    <div className="mb-2">
      <p className="text-sm font-bold leading-tight text-fg sm:text-[0.95rem]">{title}</p>
      <p className="mt-0.5 text-[12px] leading-snug text-muted">{why}</p>
    </div>
  );
}

function ModuleList({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const [q, setQ] = useState("");
  const items = Children.toArray(children).filter((child) => {
    if (!q.trim()) return true;
    if (!isValidElement<{ title?: string }>(child)) return true;
    return String(child.props.title ?? "")
      .toLowerCase()
      .includes(q.trim().toLowerCase());
  });
  return (
    <ListPanel
      className="rpma-modlist"
      title={title}
      count={items.length}
      query={q}
      onQuery={setQ}
      placeholder={`Search ${title.toLowerCase()}…`}
    >
      {items}
    </ListPanel>
  );
}

function DrillCard({
  to,
  title,
  blurb,
  icon: Icon,
  badge,
}: {
  to: string;
  title: string;
  blurb: string;
  icon: typeof HeartPulse;
  badge?: React.ReactNode;
}) {
  return (
    <ListRow
      href={to}
      title={title}
      lead={
        <span className="rpma-list-ico">
          <Icon className="h-3.5 w-3.5" />
        </span>
      }
      meta={blurb}
      trail={badge}
    />
  );
}


function licenseFallback(data: CustomerDetailPayload): string | null {
  return data.license?.productName ?? null;
}

/** EXCO default — board language, charts first, less clutter */

/**
 * Same cover rule as the customer list, rail, reports, and Exco.
 */
function effectiveCover(data: CustomerDetailPayload): CustomerCover {
  return coverFromDetail(data);
}

/** Return NoCoverPanel when a pillar is not in scope (metrics must not be shown as scored). */
function CoverGate({
  data,
  pillar,
  service,
  hint,
  children,
}: {
  data: CustomerDetailPayload;
  pillar: PillarId;
  service: string;
  hint?: string;
  children: ReactNode;
}) {
  const cover = effectiveCover(data);
  if (!isPillarCovered(cover, pillar)) {
    return (
      <NoCoverPanel
        service={service}
        hint={
          hint ??
          `No cover — ${service} is not in scope for this customer. This leg does not affect estate health or SLA.`
        }
      />
    );
  }
  return <>{children}</>;
}

function ServiceVisuals({
  title,
  subtitle,
  kpis,
  pie,
  bars,
  tiles,
}: {
  title: string;
  subtitle?: string;
  kpis: { label: string; value: string | number; tone?: "green" | "amber" | "red" }[];
  pie?: { name: string; value: number; fill: string }[];
  bars?: { name: string; value: number; fill: string }[];
  tiles?: { label: string; href: string; n: string | number; hint: string }[];
}) {
  const pieData = (pie ?? []).filter((d) => d.value > 0);
  const barData = bars ?? [];
  return (
    <div className="rpma-eco-visuals space-y-2">
      <div className="rpma-glass flex flex-wrap items-center gap-2 px-3 py-2">
        <div className="min-w-0">
          <p className="text-base font-extrabold tracking-tight text-fg">{title}</p>
          {subtitle ? <p className="text-[11px] text-muted">{subtitle}</p> : null}
        </div>
        {kpis.length ? (
          <div className="ml-auto grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {kpis.slice(0, 4).map((k) => (
              <StatCard key={k.label} label={k.label} value={k.value} tone={k.tone} />
            ))}
          </div>
        ) : null}
      </div>
      {pieData.length || barData.length ? (
        <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
          {pieData.map((e) => (
            <StatCard key={`p-${e.name}`} label={e.name} value={e.value} />
          ))}
          {barData.map((e) => (
            <StatCard key={`b-${e.name}`} label={e.name} value={e.value} />
          ))}
        </div>
      ) : null}
      {tiles?.length ? (
        <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
          {tiles.map((t) => (
            <SpaLink key={t.href} href={t.href} className="rpma-glass rpma-tile block px-2.5 py-2">
              <p className="text-[10px] font-extrabold uppercase tracking-wide text-muted">
                <span className="inline-flex items-center gap-1">
                  {t.label}
                  {t.hint ? <HelpTip text={t.hint} /> : null}
                </span>
              </p>
              <p className="font-mono text-lg font-extrabold text-fg">{t.n}</p>
            </SpaLink>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function TicketStrip({
  data,
  pillar,
}: {
  data: CustomerDetailPayload;
  pillar: TicketPillar;
}) {
  const rows = ticketsForPillar(data.incidents, pillar);
  const s = ticketStats(rows);
  const href = `/customers/${data.customer.customerCode}/tickets`;
  return (
    <div className="rpma-glass flex flex-wrap items-center gap-3 px-3 py-2">
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Freshdesk tickets</p>
      <StatCard label="30d" value={s.total} />
      <StatCard label="Open" value={s.open} tone={s.open > 0 ? "amber" : "green"} />
      <StatCard label="SLA breach" value={s.breaches} tone={s.breaches > 0 ? "red" : "green"} />
      <SpaLink href={href} className="ml-auto text-[12px] font-semibold text-primary hover:underline">
        Customer Incidents
      </SpaLink>
    </div>
  );
}


export function ExecBriefSection({ data }: { data: CustomerDetailPayload }) {
  const {
    customer,
    risks,
    issues,
    priorities,
    incidents,
    dtrLevel1,
    operationalAssurance,
    operators,
    sysproVersion,
    sysproHotfixes,
  } = data;
  const { dashboard: dash } = useDashboardConfig();
  const code = customer.customerCode;
  const base = `/customers/${code}`;
  const openRisks = risks.filter((r) => (r.status || "").toLowerCase() !== "closed");
  const openIssues = issues.filter((i) => (i.status || "").toLowerCase() !== "closed");
  const major = incidents.filter((i) => i.isMajor && (i.status || "").toLowerCase() !== "closed");

  const oa = operationalAssurance;
  const score = oa?.scorePct ?? (customer.healthRag === "Green" ? 88 : customer.healthRag === "Amber" ? 68 : 42);

  const activeOps = customer.activeUserCount;
  const totalOps = Math.max(customer.operatorCount, operators.length, 1);
  const idleOps = Math.max(0, totalOps - activeOps);

  const userPie = useMemo(
    () => [
      { name: "Active (logged in ≤30d)", value: activeOps, fill: CHART.active },
      { name: "Not recently active", value: idleOps, fill: CHART.secondary },
    ],
    [activeOps, idleOps],
  );

  const signalBars = useMemo(
    () =>
      [
        { name: "Jobs", value: customer.sysproJobErrorCount, fill: CHART.jobs },
        { name: "FinSight", value: customer.sysproDtrVarianceLines, fill: CHART.dtr },
        { name: "Risks", value: openRisks.length, fill: CHART.amber },
        { name: "Incidents", value: major.length, fill: CHART.red },
      ].filter((d) => d.value > 0 || true),
    [customer.sysproJobErrorCount, customer.sysproDtrVarianceLines, openRisks.length, major.length],
  );

  const dtrBars = useMemo(() => {
    const rows = (dtrLevel1 ?? [])
      .filter((d) => d.varianceLineCount > 0)
      .map((d) => {
        const label = finsightModuleName(d.balanceTypeCode, d.balanceTypeName);
        return {
          name: label,
          oob: d.varianceLineCount,
          label,
        };
      })
      .sort((a, b) => b.oob - a.oob)
      .slice(0, 6);
    return rows;
  }, [dtrLevel1]);

  const topPriorities = priorities.slice(0, 3);
  const topRisks = openRisks.slice(0, 3);

  const cover = effectiveCover(data);
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
    { name: "RPM Remote Management", on: Boolean(cover.rmm), href: `${base}/rmm` },
    { name: "RPM Cloud Backup", on: Boolean(cover.cove), href: `${base}/cove` },
    { name: "RPM EndPoint Protection", on: Boolean(cover.epp), href: `${base}/epp` },
    { name: "Microsoft 365 CSP", on: Boolean(cover.csp), href: `${base}/csp` },
  ];
  const coverCount = serviceBars.filter((s) => s.on).length;
  const coverPie = [
    { name: "On cover", value: coverCount, fill: "#17c666" },
    { name: "No cover", value: Math.max(0, 5 - coverCount), fill: "#5c6570" },
  ];
  const rmmOnline = customer.pulsewayOnlineCount ?? customer.pulsewayServerOnline ?? 0;
  const rmmOffline = customer.pulsewayOfflineCount ?? customer.pulsewayServerOffline ?? 0;
  const rmmPie = [
    { name: "Online", value: rmmOnline, fill: "#17c666" },
    { name: "Offline", value: rmmOffline, fill: "#ea4d4d" },
  ];
  const coveOk = customer.coveOkDeviceCount ?? 0;
  const coveBad = (customer.coveFailedDeviceCount ?? 0) + (customer.coveStaleDeviceCount ?? 0);
  const covePie = [
    { name: "Healthy", value: coveOk, fill: "#17c666" },
    { name: "Failed / stale", value: coveBad, fill: "#ffa21d" },
  ];
  const ragTone =
    customer.healthRag === "Green" ? "green" : customer.healthRag === "Red" ? "red" : "amber";

  return (
    <div className="rpma-eco-visuals space-y-3">
      <div className="rpma-glass flex flex-wrap items-center gap-3 px-4 py-3">
        <RagBadge rag={customer.healthRag} title={customer.healthSummary} />
        <div className="min-w-0">
          <p className="text-lg font-bold tracking-tight text-fg">{customer.displayName}</p>
          <p className="text-[12px] text-muted">
            Ecosystem overview · last collect {formatSastDateTime(lastCollect)}
          </p>
        </div>
        <div className="ml-auto grid grid-cols-3 gap-2">
          <StatCard label="Assurance" value={`${score}%`} tone={assuranceTone(score, customer.healthRag)} />
          <StatCard label="Services on cover" value={`${coverCount}/5`} tone={coverCount >= 4 ? "green" : coverCount >= 2 ? "amber" : "red"} />
          <StatCard
            label="Open risks"
            value={openRisks.length}
            tone={openRisks.length === 0 ? "green" : "amber"}
          />
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="rpma-glass p-3">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted">Service cover</p>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={coverPie} dataKey="value" nameKey="name" innerRadius={48} outerRadius={70} paddingAngle={2} isAnimationActive={false}>
                  {coverPie.map((e) => (
                    <Cell key={e.name} fill={e.fill} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 flex flex-wrap gap-2">
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
        </div>

        <div className="rpma-glass p-3">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted">What needs attention</p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={signalBars} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="name" tick={{ fill: CHART.axis, fontSize: 10 }} interval={0} axisLine={false} tickLine={false} tickFormatter={(v) => axisLabel(v, 10)} />
                <YAxis allowDecimals={false} width={28} tick={{ fill: CHART.axis, fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={CHART_TOOLTIP_CURSOR} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={36} isAnimationActive={false}>
                  {signalBars.map((e, i) => (
                    <Cell key={i} fill={e.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rpma-glass p-3">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted">
            {cover.rmm ? "RMM agents" : cover.cove ? "Cloud backup" : "Operators"}
          </p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={cover.rmm ? rmmPie : cover.cove ? covePie : userPie}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={48}
                  outerRadius={70}
                  paddingAngle={2}
                  isAnimationActive={false}
                >
                  {(cover.rmm ? rmmPie : cover.cove ? covePie : userPie).map((e) => (
                    <Cell key={e.name} fill={e.fill} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {dtrBars.length > 0 ? (
        <div className="rpma-glass p-3">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted">FinSight · out of balance</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dtrBars} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fill: CHART.axis, fontSize: 10 }} />
                <YAxis type="category" dataKey="name" width={128} tick={{ fill: CHART.axis, fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} tickFormatter={(v) => axisLabel(v, 18)} />
                <Tooltip content={<ChartTooltip />} cursor={CHART_TOOLTIP_CURSOR} />
                <Bar dataKey="oob" fill={CHART.dtr} radius={[0, 6, 6, 0]} maxBarSize={16} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Incidents", href: `${base}/ams/incidents`, n: major.length || incidents.length, hint: "Assure register" },
          { label: "Risks", href: `${base}/ams/risks`, n: openRisks.length, hint: "Open items" },
          { label: "SLA", href: `${base}/ams/sla`, n: `${score}%`, hint: "Assurance" },
          { label: "Customer Assurance", href: `${base}/ams`, n: openIssues.length, hint: "Issues" },
        ].map((t) => (
          <SpaLink key={t.href} href={t.href} className="rpma-glass block px-3 py-2.5 hover:shadow-md">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">{t.label}</p>
            <p className={cn("font-mono text-xl font-bold", ragTone === "red" && t.label === "Risks" ? "text-rag-red" : "text-fg")}>
              {t.n}
            </p>
            <p className="text-[11px] text-muted">{t.hint} · open module</p>
          </SpaLink>
        ))}
      </div>
    </div>
  );
}

export function SysproHubSection({ data }: { data: CustomerDetailPayload }) {
  const c = data.customer;
  const cover = effectiveCover(data);
  const base = `/customers/${c.customerCode}/syspro`;
  if (!cover.syspro) {
    return (
      <NoCoverPanel
        service="SYSPRO Deployment"
        hint="No cover — no SYSPRO data for this customer (no instance map / operators / collect). Deferred customers stay No Cover until enabled."
      />
    );
  }
  const ops = data.operators ?? [];
  const activeOps = c.activeUserCount;
  const totalOps = Math.max(c.operatorCount, ops.length, 1);
  const idleOps = Math.max(0, totalOps - activeOps);
  return (
    <div className="space-y-3">
      <SlaStrip data={data} pillar="syspro" />
      <ServiceVisuals
      title="SYSPRO"
      subtitle={`${c.displayName} · last collect ${formatSastDateTime(c.lastImportAt)}`}
      kpis={[
        { label: "Active Users", value: activeOps, tone: activeOps > 0 ? "green" : "amber" },
        { label: "Job Logging", value: c.sysproJobErrorCount, tone: c.sysproJobErrorCount > 0 ? "amber" : "green" },
        { label: "FinSight OOB", value: c.sysproDtrVarianceLines, tone: c.sysproDtrVarianceLines > 0 ? "amber" : "green" },
        { label: "Tickets", value: ticketStats(ticketsForPillar(data.incidents, "syspro")).total },
      ]}
      pie={[
        { name: "Active", value: activeOps, fill: "#17c666" },
        { name: "Quiet", value: idleOps, fill: "#5c6570" },
      ]}
      bars={[
        { name: "Job Errors", value: c.sysproJobErrorCount, fill: "#ffa21d" },
        { name: "FinSight", value: c.sysproDtrVarianceLines, fill: "#ea4d4d" },
        { name: "Hotfixes", value: (data.sysproHotfixes ?? []).length, fill: "#4f46e0" },
      ]}
      tiles={[
        { label: "FinSight", href: `${base}/dtr`, n: c.sysproDtrVarianceLines, hint: "Control Recons" },
        { label: "Job Logging", href: `${base}/jobs`, n: c.sysproJobErrorCount, hint: "Batch Errors" },
        { label: "Day End", href: `${base}/day-end`, n: data.dayEnd?.label ?? "—", hint: "Close Status" },
        { label: "Operators", href: `${base}/operators`, n: totalOps, hint: "Accounts" },
      ]}
    />
    </div>
  );
}

/** RMM hub — parallel structure to SYSPRO hub */
export function RmmHubSection({ data }: { data: CustomerDetailPayload }) {
  const c = data.customer;
  const rmm = data.rmm;
  const cover = effectiveCover(data);
  const base = `/customers/${c.customerCode}/rmm`;
  const s = rmm?.summary;
  const devices = rmm?.devices ?? [];
  const fromDevices = useMemo(() => {
    let serverOnline = 0, serverOffline = 0, workstationOnline = 0, workstationOffline = 0;
    for (const d of devices) {
      const on = d.isOnline === true;
      if (isRmmServer(d)) {
        if (on) serverOnline += 1;
        else serverOffline += 1;
      } else if (on) workstationOnline += 1;
      else workstationOffline += 1;
    }
    return { serverOnline, serverOffline, workstationOnline, workstationOffline };
  }, [devices]);
  if (!cover.rmm && !(rmm?.agentIops?.length || rmm?.windowsEvents?.length)) {
    return (
      <NoCoverPanel
        service="RPM Remote Management"
        hint="No cover — no RPM RMM devices or org mapped for this customer. Map an org and run RMM collect."
      />
    );
  }
  const online = s?.serverOnline || fromDevices.serverOnline;
  const offline = s?.serverOffline || fromDevices.serverOffline;
  const wsOn = s?.workstationOnline || fromDevices.workstationOnline;
  const wsOff = s?.workstationOffline || fromDevices.workstationOffline;
  return (
    <div className="space-y-4">
    <SlaStrip data={data} pillar="rmm" />
    <ServiceVisuals
      title="RPM Remote Management"
      subtitle={`${c.displayName}${rmm?.pulsewayOrgName ? ` · ${rmm.pulsewayOrgName}` : ""}`}
      kpis={[
        { label: "Servers Online", value: online, tone: offline > 0 ? "amber" : "green" },
        { label: "Servers Offline", value: offline, tone: offline > 0 ? "red" : "green" },
        { label: "Critical Alerts", value: s?.criticalAlerts ?? 0, tone: (s?.criticalAlerts ?? 0) > 0 ? "red" : "green" },
      ]}
      pie={[
        { name: "Online", value: online, fill: "#17c666" },
        { name: "Offline", value: offline, fill: "#ea4d4d" },
      ]}
      bars={[
        { name: "Critical", value: s?.criticalAlerts ?? 0, fill: "#ea4d4d" },
        { name: "Elevated", value: s?.elevatedAlerts ?? 0, fill: "#ffa21d" },
        { name: "Patch Gaps", value: s?.patchMissing ?? 0, fill: "#5c6570" },
      ]}
      tiles={[
        { label: "Servers", href: `${base}/devices`, n: online + offline, hint: "Fleet" },
        { label: "Workstations", href: `${base}/workstations`, n: wsOn + wsOff, hint: "Endpoints" },
        { label: "Patch Compliance", href: `${base}/patch`, n: s?.patchMissing ?? 0, hint: "Missing" },
        { label: "Alerts", href: `${base}/alerts`, n: s?.criticalAlerts ?? 0, hint: "Critical" },
        { label: "Disk IOPS", href: `${base}/iops`, n: rmm?.agentIops?.length ?? 0, hint: "Volumes" },
        { label: "Event Logs", href: `${base}/events`, n: rmm?.windowsEvents?.length ?? 0, hint: "Errors" },
      ]}
    />
    </div>
  );
}

export function RmmOverviewSection({ data }: { data: CustomerDetailPayload }) {
  const rmm = data.rmm;
  const s = rmm?.summary;
  const cover = effectiveCover(data);
  if (!cover.rmm) {
    return (
      <NoCoverPanel
        service="RPM Remote Management overview"
        hint="No cover — no RMM data for this customer."
      />
    );
  }
  return (
    <div className="space-y-4">
      <ChartCaption
        title="RPM Remote Management overview"
        why="Day snapshot from RPM RMM (RPM Remote Management). RAG: Red if critical alerts or 5+ offline; Amber if any offline / elevated / disk pressure."
      />
      {rmm?.message ? (
        <p className="text-sm text-muted">{rmm.message}</p>
      ) : null}
      {!s ? (
        <p className="text-sm text-muted">
          No org summary yet. Map the org and import a snapshot (or run central 421 demo seed for AHIC).
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <RagBadge rag={s.healthRag} />
            <span className="text-sm text-muted">{s.healthSummary}</span>
            {s.asOfDate ? (
              <span className="text-xs text-muted">As of {formatSastDate(s.asOfDate)}</span>
            ) : null}
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Devices" value={s.deviceCount} />
            <StatCard label="Online" value={s.onlineCount} />
            <StatCard label="Offline" value={s.offlineCount} />
            <StatCard label="Maintenance" value={s.maintenanceCount} />
            <StatCard label="Critical alerts" value={s.criticalAlerts} />
            <StatCard label="Elevated alerts" value={s.elevatedAlerts} />
            <StatCard
              label="Windows events (24h)"
              value={rmm?.windowsEvents?.length ?? 0}
              hint="Critical / Error from Assure agents"
            />
            <StatCard
              label="Devices with alerts"
              value={s.devicesWithAlerts ?? "—"}
              hint="Any critical or elevated on the device"
            />
            <StatCard label="Notifications" value={s.notificationCount} />
            <StatCard label="Servers" value={s.serverCount} />
            <StatCard label="Workstations" value={s.workstationCount} />
          </div>

          <ChartCaption
            title="Customer Storage"
            why="Sum of RMM disk inventory for this customer. Used = total − free when both are reported."
          />
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Used space"
              value={
                s.diskUsedGb != null
                  ? `${s.diskUsedGb.toLocaleString("en-ZA")} GB`
                  : "—"
              }
            />
            <StatCard
              label="Free space"
              value={
                s.diskFreeGb != null
                  ? `${s.diskFreeGb.toLocaleString("en-ZA")} GB`
                  : "—"
              }
            />
            <StatCard
              label="Total capacity"
              value={
                s.diskTotalGb != null
                  ? `${s.diskTotalGb.toLocaleString("en-ZA")} GB`
                  : "—"
              }
            />
            <StatCard label="Disk high" value={s.diskHighCount} hint="Volumes near full" />
          </div>

          <ChartCaption
            title="Customer Reboot Age"
            why="Days since last reboot, parsed from RMM uptime (e.g. Online 23d). Max is the oldest reboot in the fleet."
          />
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Max days since reboot"
              value={s.maxDaysSinceReboot ?? "—"}
              tone={
                s.maxDaysSinceReboot != null && s.maxDaysSinceReboot >= 60
                  ? "amber"
                  : "default"
              }
            />
            <StatCard
              label="Avg days since reboot"
              value={s.avgDaysSinceReboot ?? "—"}
            />
          </div>

          <ChartCaption
            title="Customer Patches - Not Deployed"
            why="Outstanding updates from RMM updates (Critical + Important + Unspecified). SYSPRO hotfixes remain under SYSPRO → Hotfix Information."
          />
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Outstanding"
              value={s.patchMissing ?? "—"}
              tone={
                s.patchMissing != null && s.patchMissing > 0 ? "amber" : "default"
              }
              hint="Critical + Important + Unspecified across agents"
            />
            <StatCard
              label="Clean agents"
              value={
                s.patchDevicesReporting != null
                  ? Math.max(
                      0,
                      (s.patchDevicesReporting ?? 0) -
                        (rmm?.devices ?? []).filter(
                          (d) => (d.patchMissing ?? 0) > 0,
                        ).length,
                    )
                  : "—"
              }
              hint="Reporting agents with 0 outstanding"
            />
            <StatCard label="Still pending" value={s.patchPending ?? "—"} />
            <StatCard
              label="Devices reporting"
              value={s.patchDevicesReporting ?? 0}
              hint="Agents that sent Updates counters"
            />
          </div>

          {s.lastImportAt ? (
            <p className="text-xs text-muted">
              Last import {formatSastDateTime(s.lastImportAt)} · org{" "}
              {s.organizationName ?? rmm.pulsewayOrgName ?? "—"}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}

export function RmmPatchSection({ data }: { data: CustomerDetailPayload }) {
  const rmm = data.rmm;
  const s = rmm?.summary;
  const cover = effectiveCover(data);
  if (!cover.rmm) {
    return (
      <NoCoverPanel
        service="RPM Remote Management · Server Patch Management"
        hint="No cover — no RMM data for this customer."
      />
    );
  }
  // Server Patch Management — servers only (workstations excluded)
  const devices = [...(rmm?.devices ?? [])]
    .filter((d) => isRmmServer(d))
    .sort((a, b) => {
    const am = a.patchMissing ?? -1;
    const bm = b.patchMissing ?? -1;
    if (bm !== am) return bm - am;
    return (a.name || "").localeCompare(b.name || "");
  });
  const reporting = devices.filter(
    (d) =>
      d.patchInstalled != null ||
      d.patchMissing != null ||
      d.patchPending != null,
  );
  const withMissing = reporting.filter((d) => (d.patchMissing ?? 0) > 0);

  const [patchView, setPatchView] = useState<{
    mode: "installed" | "missing" | "recent" | "all";
    deviceId: string | null;
  }>({ mode: "missing", deviceId: null });

  type BucketKey = "clean" | "light" | "medium" | "heavy";
  const bucketOf = (n: number): BucketKey => {
    if (n <= 0) return "clean";
    if (n <= 5) return "light";
    if (n <= 20) return "medium";
    return "heavy";
  };
  const bucketMeta: Record<
    BucketKey,
    { label: string; range: string; tone: "green" | "default" | "amber" | "red" }
  > = {
    clean: { label: "Up to date", range: "0 missing", tone: "green" },
    light: { label: "Light backlog", range: "1–5 missing", tone: "default" },
    medium: { label: "Moderate", range: "6–20 missing", tone: "amber" },
    heavy: { label: "Heavy backlog", range: "21+ missing", tone: "red" },
  };

  const byType = {
    server: { devices: 0, missing: 0, withMissing: 0 },
    workstation: { devices: 0, missing: 0, withMissing: 0 },
    other: { devices: 0, missing: 0, withMissing: 0 },
  };
  const byBucket: Record<BucketKey, { devices: number; missing: number }> = {
    clean: { devices: 0, missing: 0 },
    light: { devices: 0, missing: 0 },
    medium: { devices: 0, missing: 0 },
    heavy: { devices: 0, missing: 0 },
  };
  let onlineMissing = 0;
  let offlineMissing = 0;
  let onlineWithMissing = 0;
  let offlineWithMissing = 0;

  for (const d of reporting) {
    const miss = Number(d.patchMissing) || 0;
    const bucket = bucketOf(miss);
    byBucket[bucket].devices += 1;
    byBucket[bucket].missing += miss;

    const typeKey =
      classifyRmmDevice(d) === "server"
        ? "server"
        : classifyRmmDevice(d) === "workstation"
          ? "workstation"
          : "other";
    byType[typeKey].devices += 1;
    byType[typeKey].missing += miss;
    if (miss > 0) byType[typeKey].withMissing += 1;

    if (d.isOnline === false) {
      offlineMissing += miss;
      if (miss > 0) offlineWithMissing += 1;
    } else {
      onlineMissing += miss;
      if (miss > 0) onlineWithMissing += 1;
    }
  }

  const totalMissingSum = reporting.reduce(
    (acc, d) => acc + (Number(d.patchMissing) || 0),
    0,
  );
  const pendingSum = reporting.reduce(
    (acc, d) => acc + (Number(d.patchPending) || 0),
    0,
  );
  const maxBucketDevices = Math.max(
    1,
    ...Object.values(byBucket).map((b) => b.devices),
  );
  const topOffenders = withMissing.slice(0, 8);
  const topMax = Math.max(
    1,
    ...topOffenders.map((d) => Number(d.patchMissing) || 0),
    1,
  );

  const namedAll = rmm?.patches ?? [];
  const cutoffMs = Date.now() - 30 * 86400000;
  const namedForView = (mode: "installed" | "missing" | "recent" | "all", deviceId: string | null) => {
    let rows = namedAll;
    if (deviceId) rows = rows.filter((p) => p.deviceId === deviceId);
    if (mode === "installed") rows = rows.filter((p) => p.status === "installed");
    else if (mode === "missing") rows = rows.filter((p) => p.status === "missing" || p.status === "pending");
    else if (mode === "recent") {
      rows = rows.filter(
        (p) => p.status === "installed" && p.installedAt && new Date(p.installedAt).getTime() >= cutoffMs,
      );
    }
    return rows;
  };
  const openPatches = (mode: "installed" | "missing" | "recent" | "all", deviceId: string | null = null) => {
    setPatchView({ mode, deviceId });
    queueMicrotask(() =>
      document.getElementById("rpma-patch-list")?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  };
  const viewRows = namedForView(patchView.mode, patchView.deviceId);
  const viewDeviceName = patchView.deviceId
    ? devices.find((d) => d.deviceId === patchView.deviceId)?.name ||
      namedAll.find((p) => p.deviceId === patchView.deviceId)?.deviceName ||
      patchView.deviceId
    : null;

  return (
    <div className="space-y-4">
      <ChartCaption
        title="Patch compliance — installed and outstanding"
        why="Installed, recently installed (30 days), and outstanding Windows updates per server from RPM RMM. Servers feed SLA. Workstations are visibility only."
      />
      {rmm?.message ? (
        <p className="text-sm text-muted">{rmm.message}</p>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Devices reporting"
          value={reporting.length}
          hint="Agents that sent Updates counters"
        />
        <button type="button" className="text-left" onClick={() => openPatches("missing")}>
        <StatCard
          label="Outstanding updates"
          value={totalMissingSum ?? "—"}
          tone={(totalMissingSum ?? 0) > 0 ? "amber" : "default"}
          hint="Click to list outstanding / pending patches"
        />
        </button>
        <StatCard
          label="Agents with backlog"
          value={withMissing.length}
          tone={withMissing.length > 0 ? "amber" : "green"}
          hint="At least one outstanding update"
        />
        <StatCard
          label="Pending / reboot"
          value={pendingSum || "—"}
          hint="Only when the server agent reports pending"
        />
        <button type="button" className="text-left" onClick={() => openPatches("installed")}>
        <StatCard
          label="Installed (named)"
          value={(rmm?.patches ?? []).filter((p) => p.status === "installed").length || (s?.patchInstalled ?? "—")}
          hint="Click to list installed patches"
        />
        </button>
        <button type="button" className="text-left" onClick={() => openPatches("recent")}>
        <StatCard
          label="Recently installed"
          value={s?.patchInstalledRecent ?? (rmm?.patches ?? []).filter((p) => p.status === "installed" && p.installedAt && Date.now() - new Date(p.installedAt).getTime() <= 30 * 86400000).length}
          hint="Last 30 days — click to list"
        />
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Clean (0 outstanding)"
          value={reporting.filter((d) => (d.patchMissing ?? 0) === 0).length}
          tone="green"
        />
        <StatCard label="Devices total" value={devices.length} />
        <StatCard
          label="Not reporting"
          value={Math.max(0, devices.length - reporting.length)}
          hint="No Updates object from agent"
        />
      </div>

      {reporting.length > 0 ? (
        <div className="space-y-3">
          <ChartCaption
            title="Missing patch count breakdown"
            why="How the missing total is distributed: severity buckets, device role, and online vs offline. Bars scale to device count in each bucket."
          />

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-surface/40 p-3">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">
                By severity (devices)
              </p>
              <div className="space-y-2">
                {(Object.keys(bucketMeta) as BucketKey[]).map((key) => {
                  const b = byBucket[key];
                  const meta = bucketMeta[key];
                  const pct = Math.round((b.devices / maxBucketDevices) * 100);
                  return (
                    <div key={key}>
                      <div className="mb-0.5 flex items-baseline justify-between gap-2 text-xs">
                        <span className="font-medium text-fg">
                          {meta.label}{" "}
                          <span className="font-normal text-muted">({meta.range})</span>
                        </span>
                        <span className="font-mono tabular-nums text-muted">
                          {b.devices} dev · {b.missing} miss
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted/50">
                        <div
                          className={
                            "h-full rounded-full transition-all " +
                            (meta.tone === "green"
                              ? "bg-rag-green"
                              : meta.tone === "amber"
                                ? "bg-rag-amber"
                                : meta.tone === "red"
                                  ? "bg-rag-red"
                                  : "bg-accent")
                          }
                          style={{ width: `${pct}%`, minWidth: b.devices > 0 ? 4 : 0 }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-xl border border-border bg-surface/40 p-3">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">
                  By device role
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ["Servers", byType.server],
                      ["Workstations", byType.workstation],
                      ["Other", byType.other],
                    ] as const
                  ).map(([label, row]) => (
                    <div
                      key={label}
                      className="rounded-lg border border-border/70 bg-card px-2 py-2 text-center"
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                        {label}
                      </p>
                      <p className="mt-1 font-mono text-lg font-bold tabular-nums text-fg">
                        {row.missing}
                      </p>
                      <p className="text-[10px] text-muted">
                        missing · {row.withMissing}/{row.devices} devices
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-surface/40 p-3">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">
                  Online vs offline (missing patches)
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-border/70 bg-card px-3 py-2">
                    <p className="rpma-online">Online</p>
                    <p className="font-mono text-xl font-bold tabular-nums text-fg">
                      {onlineMissing}
                    </p>
                    <p className="text-[10px] text-muted">
                      {onlineWithMissing} device{onlineWithMissing === 1 ? "" : "s"} with
                      backlog
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-card px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase text-muted">Offline</p>
                    <p
                      className={
                        "font-mono text-xl font-bold tabular-nums " +
                        (offlineMissing > 0 ? "text-rag-amber" : "text-fg")
                      }
                    >
                      {offlineMissing}
                    </p>
                    <p className="text-[10px] text-muted">
                      {offlineWithMissing} device{offlineWithMissing === 1 ? "" : "s"} with
                      backlog
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {topOffenders.length > 0 ? (
            <div className="rounded-xl border border-border bg-surface/40 p-3">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">
                Top devices by missing count
              </p>
              <div className="space-y-2">
                {topOffenders.map((d) => {
                  const miss = Number(d.patchMissing) || 0;
                  const pct = Math.round((miss / topMax) * 100);
                  return (
                    <div key={d.deviceId}>
                      <div className="mb-0.5 flex items-baseline justify-between gap-2 text-xs">
                        <span className="truncate font-medium text-fg">
                          <button
                            type="button"
                            className="truncate text-left underline-offset-2 hover:underline"
                            onClick={() => openPatches("missing", d.deviceId)}
                          >
                            {d.name ?? d.deviceId}
                          </button>
                          <span className="ml-1.5 font-normal text-muted">
                            {d.deviceType ?? "—"}
                            {d.isOnline === false ? " · offline" : ""}
                          </span>
                        </span>
                        <span className="shrink-0 font-mono font-semibold tabular-nums text-rag-amber">
                          {miss}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted/50">
                        <div
                          className="h-full rounded-full bg-rag-amber"
                          style={{ width: `${pct}%`, minWidth: 4 }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] text-muted">
                Assure Eco-System total missing:{" "}
                <span className="font-mono font-semibold text-fg">{totalMissingSum}</span>
                {withMissing.length > topOffenders.length
                  ? ` · showing top ${topOffenders.length} of ${withMissing.length}`
                  : null}
              </p>
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-border px-3 py-3 text-sm text-muted">
              All reporting devices show 0 missing patches.
            </p>
          )}
        </div>
      ) : null}

      {devices.length === 0 ? (
        <p className="text-sm text-muted">
          No RMM devices on latest snapshot. Map RMM organisation and re-run collect.
        </p>
      ) : reporting.length === 0 ? (
        <div className="space-y-2 rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted">
          <p className="font-medium text-fg">
            {devices.length} device(s) loaded, but patch counters are empty on the latest
            snapshot.
          </p>
          <p>
            RMM does not put missing/installed update counts on the base device record.
            The collect script must call OS Updates endpoints (devices/…/updates,
            windowsupdates, osupdates, …) and store PatchMissingCount /
            PatchInstalledCount / PatchPendingCount.
          </p>
          <ol className="list-decimal space-y-1 pl-5 text-[13px]">
            <li>
              On central: run{" "}
              <span className="font-mono text-xs">
                the RMM patch probe
              </span>{" "}
              — look for lines marked <span className="font-mono">**PATCH-LIKE**</span> and
              paste that log if still empty.
            </li>
            <li>
              Apply SQL{" "}
              <span className="font-mono text-xs">457_Ensure_Rmm_Devices_Latest_Patch.sql</span>{" "}
              then re-run{" "}
              <span className="font-mono text-xs">the RMM collect</span>.
            </li>
            <li>
              Confirm in SQL that agents are reporting patch counts on the latest
              snapshot (ReportingPatch greater than zero).
            </li>
          </ol>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2">Device</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Online</th>
                <th className="px-3 py-2 text-right">Installed</th>
                <th className="px-3 py-2 text-right">Outstanding</th>
                <th className="px-3 py-2 text-right">Pending</th>
                <th className="px-3 py-2">Band</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((d) => {
                const reports =
                  d.patchInstalled != null ||
                  d.patchMissing != null ||
                  d.patchPending != null;
                const miss = reports ? Number(d.patchMissing) || 0 : null;
                const band = miss == null ? null : bucketMeta[bucketOf(miss)];
                return (
                  <tr key={d.deviceId} className="border-b border-border/70">
                    <td className="px-3 py-2 font-medium">
                      {d.name ?? d.deviceId}
                    </td>
                    <td className="px-3 py-2 text-muted text-xs">
                      {d.deviceType ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {d.isOnline == null
                        ? "—"
                        : d.isOnline
                          ? <span className="rpma-online">Online</span>
                          : "Offline"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">
                      {reports ? (
                        <button
                          type="button"
                          className="underline-offset-2 hover:underline"
                          onClick={() => openPatches("installed", d.deviceId)}
                        >
                          {d.patchInstalled ?? "—"}
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td
                      className={
                        "px-3 py-2 text-right font-mono tabular-nums " +
                        ((d.patchMissing ?? 0) > 0 ? "font-semibold text-rag-amber" : "")
                      }
                    >
                      {reports ? (
                        <button
                          type="button"
                          className="underline-offset-2 hover:underline"
                          onClick={() => openPatches("missing", d.deviceId)}
                        >
                          {d.patchMissing ?? "—"}
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">
                      {reports ? (d.patchPending ?? "—") : "—"}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-muted">
                      {band ? band.label : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {(() => {
        const mode = patchView?.mode ?? "missing";
        const title =
          mode === "installed"
            ? "Installed patches"
            : mode === "recent"
              ? "Recently installed (30 days)"
              : mode === "all"
                ? "All named patches"
                : "Outstanding / pending patches";
        const deviceHint = viewDeviceName ? ` · ${viewDeviceName}` : "";
        return (
          <div id="rpma-patch-list" className="space-y-2 rounded-xl border border-border">
            <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
                {title}
                {deviceHint}
              </p>
              <div className="ml-auto flex flex-wrap gap-1">
                {(
                  [
                    ["missing", "Outstanding"],
                    ["installed", "Installed"],
                    ["recent", "Last 30 days"],
                    ["all", "All named"],
                  ] as const
                ).map(([m, lab]) => (
                  <button
                    key={m}
                    type="button"
                    className={
                      "rounded-md px-2 py-1 text-[11px] font-semibold " +
                      ((patchView?.mode ?? "missing") === m
                        ? "bg-accent text-accent-fg"
                        : "bg-muted/50 text-muted hover:text-fg")
                    }
                    onClick={() => openPatches(m, patchView?.deviceId ?? null)}
                  >
                    {lab}
                  </button>
                ))}
                {patchView?.deviceId ? (
                  <button
                    type="button"
                    className="rounded-md px-2 py-1 text-[11px] text-muted hover:text-fg"
                    onClick={() => openPatches(patchView.mode, null)}
                  >
                    All devices
                  </button>
                ) : null}
              </div>
            </div>
            {viewRows.length === 0 ? (
              <p className="px-3 py-4 text-sm text-muted">
                {namedAll.length === 0
                  ? "RMM published counts but no KB titles on this snapshot. Re-run RMM collect after the next agent cycle — named patches land in RMM patch list when the Updates list is present. Click a device count again after Recheck."
                  : "No patches in this filter. Try Installed or All named."}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-3 py-2">Device</th>
                      <th className="px-3 py-2">Patch</th>
                      <th className="px-3 py-2">KB</th>
                      <th className="px-3 py-2">Class</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Installed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewRows.slice(0, 200).map((p, i) => (
                      <tr key={`${p.deviceId}-${p.title}-${i}`} className="border-b border-border/70">
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            className="text-left underline-offset-2 hover:underline"
                            onClick={() => openPatches(patchView?.mode ?? "all", p.deviceId)}
                          >
                            {p.deviceName || p.deviceId}
                          </button>
                        </td>
                        <td className="px-3 py-2">{p.title}</td>
                        <td className="px-3 py-2 font-mono text-[11px]">{p.kb || "—"}</td>
                        <td className="px-3 py-2 text-[12px] text-muted">{p.classification || "—"}</td>
                        <td className="px-3 py-2">{p.status}</td>
                        <td className="px-3 py-2 text-[12px] text-muted">
                          {p.installedAt ? new Date(p.installedAt).toLocaleString("en-ZA") : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {viewRows.length > 200 ? (
                  <p className="px-3 py-2 text-[11px] text-muted">Showing 200 of {viewRows.length}</p>
                ) : null}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}

function AgentHostTelemetry({
  iops,
  events,
  focusHost,
}: {
  iops: NonNullable<CustomerDetailPayload["rmm"]>["agentIops"];
  events: NonNullable<CustomerDetailPayload["rmm"]>["windowsEvents"];
  focusHost?: string | null;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const rows = keepLiveIops(iops ?? []);
  const evs = events ?? [];
  const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const focus = focusHost ? norm(focusHost) : "";
  const iopsView = focus
    ? rows.filter((r) => {
        const h = norm(r.hostName);
        return h === focus || h.startsWith(focus) || focus.startsWith(h);
      })
    : rows;
  const evView = focus
    ? evs.filter((r) => {
        const h = norm(r.hostName);
        return h === focus || h.startsWith(focus) || focus.startsWith(h);
      })
    : evs;
  const iopsShow = focus ? iopsView : rows;
  const evShow = focus ? evView : evs;
  const iopsLatest = iopsShow.reduce<string | null>((best, r) => {
    const t = r.snapshotUtc;
    if (!t) return best;
    if (!best) return t;
    return new Date(t).getTime() > new Date(best).getTime() ? t : best;
  }, null);

  return (
    <div className="space-y-3">
      {iopsShow.length > 0 ? (
      <section className="rpma-panel p-0">
        <div className="rpma-settings-panel-head">
          Agent Disk IOPS
          <span className="rpma-settings-count">
            {iopsShow.length} volume{iopsShow.length === 1 ? "" : "s"}
            {iopsLatest ? ` · latest ${formatSastDateTime(iopsLatest)}` : ""}
          </span>
        </div>
          <table className="rpma-xls text-left">
            <thead>
              <tr>
                <th>Host</th>
                <th>Drive</th>
                <th>Media</th>
                <th>Size</th>
                <th>Used</th>
                <th>Read</th>
                <th>Write</th>
                <th>Total IOPS</th>
                <th>Queue</th>
              </tr>
            </thead>
            <tbody>
              {iopsShow.map((r, i) => {
                const used = r.usedPct;
                const usedCls =
                  used != null && used >= 90
                    ? "font-bold text-rag-red"
                    : used != null && used >= 80
                      ? "font-bold text-amber-400"
                      : "";
                const fmtI = (n: number | null | undefined) => {
                  if (n == null) return "—";
                  if (n < 0.5) return "idle";
                  return n < 10 ? n.toFixed(1) : Math.round(n).toLocaleString("en-ZA");
                };
                const size =
                  r.totalGb != null
                    ? `${r.freeGb != null ? `${r.freeGb.toFixed(0)} free / ` : ""}${r.totalGb.toFixed(0)} GB`
                    : "—";
                return (
                <tr key={`${r.hostName}-${r.driveLetter}-${i}`}>
                  <td className="font-mono">{r.hostName || "—"}</td>
                  <td className="font-mono">{r.driveLetter || "—"}</td>
                  <td>{r.mediaType || "—"}</td>
                  <td>{size}</td>
                  <td className={usedCls}>{used != null ? `${used.toFixed(1)}%` : "—"}</td>
                  <td>{fmtI(r.readIops)}</td>
                  <td>{fmtI(r.writeIops)}</td>
                  <td>{fmtI(r.totalIops)}</td>
                  <td>{r.queueLen != null ? r.queueLen.toFixed(1) : "—"}</td>
                </tr>
                );
              })}
            </tbody>
          </table>
      </section>
      ) : null}
      {evShow.length > 0 ? (
      <section className="rpma-panel p-0">
        <div className="rpma-settings-panel-head">
          Windows Event Log
          <span className="rpma-settings-count">{evShow.length}</span>
        </div>
          <table className="rpma-xls text-left">
            <thead>
              <tr>
                <th>Host</th>
                <th>When</th>
                <th>Level</th>
                <th>Log</th>
                <th>ID</th>
                <th>Provider</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {evShow.map((ev, i) => {
                const key = `${ev.hostName}-${ev.timeCreatedUtc}-${ev.eventId}-${i}`;
                const expanded = open === key;
                return (
                  <tr
                    key={key}
                    className="cursor-pointer align-top"
                    onClick={() => setOpen(expanded ? null : key)}
                  >
                    <td className="font-mono">{ev.hostName || "—"}</td>
                    <td>{formatSastDateTime(ev.timeCreatedUtc)}</td>
                    <td>
                      <Badge variant={ev.levelName.toLowerCase() === "critical" ? "red" : "amber"}>
                        {ev.levelName}
                      </Badge>
                    </td>
                    <td>{ev.logName}</td>
                    <td className="font-mono">{ev.eventId}</td>
                    <td>{ev.providerName || "—"}</td>
                    <td className={cn("max-w-[36rem] text-[12px] leading-snug", expanded ? "whitespace-pre-wrap break-words" : "line-clamp-2")}>
                      {ev.message || "—"}
                      {ev.message && ev.message.length > 120 ? (
                        <span className="ml-1 text-[10px] font-semibold uppercase tracking-wide text-accent">
                          {expanded ? "less" : "read"}
                        </span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
      </section>
      ) : null}
    </div>
  );
}

export function RmmDevicesSection({
  data,
  mode = "servers",
}: {
  data: CustomerDetailPayload;
  /** servers = Server class only; workstations = client devices only */
  mode?: "servers" | "workstations";
}) {
  const allDevices = data.rmm?.devices ?? [];
  const devices = useMemo(() => {
    const list = allDevices.filter((d) =>
      mode === "workstations" ? isRmmWorkstation(d) : isRmmServer(d),
    );
    // Offline first
    return [...list].sort((a, b) => {
      const ao = a.isOnline === false ? 0 : 1;
      const bo = b.isOnline === false ? 0 : 1;
      if (ao !== bo) return ao - bo;
      return String(a.name || a.deviceId).localeCompare(String(b.name || b.deviceId));
    });
  }, [allDevices, mode]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const title = mode === "workstations" ? "Workstations" : "Servers";
  const estateLabel = mode === "workstations" ? "Workstations" : "Servers";

  // Default: first offline device, else first device
  useEffect(() => {
    if (devices.length === 0) {
      setSelectedId(null);
      return;
    }
    setSelectedId((prev) => {
      if (prev && devices.some((d) => d.deviceId === prev)) return prev;
      const offline = devices.find((d) => d.isOnline === false);
      return (offline ?? devices[0]).deviceId;
    });
  }, [devices]);

  const selected = useMemo(
    () => devices.find((d) => d.deviceId === selectedId) ?? null,
    [devices, selectedId],
  );

  const agentIops = data.rmm?.agentIops ?? [];
  const windowsEvents = data.rmm?.windowsEvents ?? [];
  const hasAgentTel = agentIops.length > 0 || windowsEvents.length > 0;

  if (!effectiveCover(data).rmm && !hasAgentTel) {
    return (
      <NoCoverPanel
        service={`RPM Remote Management · ${title}`}
        hint="No cover — no RMM data for this customer."
      />
    );
  }

  if (devices.length === 0) {
    const mapped = (data.rmm?.mapping ?? []).map((m) => m.organizationName).filter(Boolean);
    return (
      <div className="space-y-3">
        <h2 className="text-[15px] font-bold text-fg">{title}</h2>
        <p className="text-sm text-muted">
          {allDevices.length === 0
            ? `RMM collect has 0 devices for this customer. Mapped org: ${mapped.join(", ") || data.rmm?.pulsewayOrgName || "—"}.`
            : `${allDevices.length} device(s) on collect, 0 classified as ${title.toLowerCase()}.`}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ChartCaption
        title={title}
        why={
          mode === "workstations"
            ? "Client devices only (desktops, laptops, notebooks). Servers are under the Servers module."
            : "Server-class devices only. Workstations and laptops are under the Workstations module. Offline devices listed first."
        }
      />
      {devices.length === 0 ? (
        <p className="text-sm text-muted">
          {mode === "workstations"
            ? "No workstations on the latest snapshot for this customer."
            : "No servers on the latest snapshot for this customer. Laptops and PCs appear under Workstations."}
        </p>
      ) : (
        <div className="rpma-rmm-split">
          <aside className="rpma-rmm-list">
            <div className="rpma-rmm-list-h">
              {estateLabel} ({devices.length})
            </div>
            <ul>
              {devices.map((d) => {
                const active = d.deviceId === selectedId;
                return (
                  <li key={d.deviceId}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(d.deviceId)}
                      className={
                        "flex w-full flex-col gap-0.5 px-3 py-2.5 text-left transition hover:bg-surface-2/60 " +
                        (active ? "bg-accent-soft/30" : "")
                      }
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-2">
                          {mode === "servers" ? <ServerKindIcon device={d} size={32} showLabel /> : null}
                          <span className="truncate text-sm font-semibold text-fg">
                            {d.name ?? d.deviceId}
                          </span>
                        </span>
                        {d.isOnline == null ? null : d.isOnline ? (
                          <Badge variant="online" className="shrink-0">
                            Online
                          </Badge>
                        ) : (
                          <Badge variant="amber" className="shrink-0">
                            Offline
                          </Badge>
                        )}
                      </span>
                      <span className="truncate text-[11px] text-muted">
                        {d.deviceType ?? "Device"}
                        {d.osName ? ` · ${d.osName}` : ""}
                      </span>
                      <span className="font-mono text-[10px] text-subtle">
                        CPU {d.cpuPct != null ? `${Math.round(d.cpuPct)}%` : "—"}
                        {" · "}
                        Mem {d.memoryPct != null ? `${Math.round(d.memoryPct)}%` : "—"}
                        {" · "}
                        {d.ipAddress ?? "no IP"}
                      </span>
                      {mode === "servers" && d.isOnline === false && d.offlineHoursCurrent != null ? (
                        <span className="font-mono text-[10px] text-subtle">
                          Offline {formatOfflineHours(d.offlineHoursCurrent)}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          <div className="rpma-rmm-detail">
            {!selected ? (
              <p className="text-sm text-muted">Select a device to view stats.</p>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    {mode === "servers" ? <ServerKindIcon device={selected} size={36} /> : null}
                    <div>
                    <h3 className="text-lg font-extrabold tracking-tight text-fg">
                      {selected.name ?? selected.deviceId}
                    </h3>
                    <p className="mt-0.5 font-mono text-[11px] text-muted">
                      {selected.deviceId}
                      {selected.organizationName
                        ? ` · ${selected.organizationName}`
                        : ""}
                    </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {selected.isOnline == null ? null : selected.isOnline ? (
                      <Badge variant="online">Online</Badge>
                    ) : (
                      <Badge variant="amber">Offline</Badge>
                    )}
                    <Badge variant="muted">{selected.deviceType ?? "Device"}</Badge>
                    {mode === "servers" ? (
                      <Badge variant="muted">
                        {classifyServerHardware(selected) === "virtual"
                          ? "Virtual"
                          : classifyServerHardware(selected) === "physical"
                            ? "Physical"
                            : "Type unknown"}
                      </Badge>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  <StatTile
                    label="Operating system"
                    value={selected.osName?.trim() || "Not reported by agent"}
                    tip="OS name as reported by the RPM RMM agent on this device."
                  />
                  <StatTile
                    label="IP address"
                    value={selected.ipAddress?.trim() || "Not reported by agent"}
                    mono
                    tip="Primary IP the agent last reported. Blank if RMM did not send one."
                  />
                  <StatCard
                    label="Days since reboot"
                    value={
                      selected.daysSinceReboot != null
                        ? selected.daysSinceReboot
                        : "Not reported"
                    }
                    hint={
                      selected.lastBootAt
                        ? `Boot ${formatSastDateTime(selected.lastBootAt)}`
                        : "RMM uptime / last boot"
                    }
                    tone={
                      selected.daysSinceReboot != null &&
                      selected.daysSinceReboot >= 60
                        ? "amber"
                        : "default"
                    }
                  />
                  <StatCard
                    label="Outstanding updates"
                    value={
                      selected.patchMissing != null
                        ? selected.patchMissing
                        : "Not reported"
                    }
                    tone={
                      (selected.patchMissing ?? 0) > 0 ? "amber" : "default"
                    }
                    hint="Critical + Important + Unspecified from RPM RMM"
                  />
                  <StatCard
                    label="Disk used"
                    value={
                      selected.diskUsedGb != null
                        ? `${selected.diskUsedGb.toLocaleString("en-ZA")} GB`
                        : selected.diskFreeGb != null && selected.diskTotalGb == null
                          ? "Partial data"
                          : "Not reported"
                    }
                    hint={
                      selected.diskTotalGb != null
                        ? `of ${selected.diskTotalGb.toLocaleString("en-ZA")} GB total`
                        : "Sum of volume used"
                    }
                  />
                  <StatCard
                    label="Disk free"
                    value={
                      selected.diskFreeGb != null
                        ? `${selected.diskFreeGb.toLocaleString("en-ZA")} GB`
                        : "Not reported"
                    }
                    hint="Sum of free space on volumes"
                  />
                  <StatTile
                    label="Online %"
                    value={
                      selected.onlinePct != null
                        ? `${Math.round(selected.onlinePct)}%`
                        : selected.isOnline == null
                          ? selected.lastSeenOnline
                            ? "From last seen"
                            : "Not reported"
                          : selected.isOnline
                            ? "100% (online now)"
                            : "0% (offline)"
                    }
                    tip="Share of recent samples the device was online. 100% means the agent is checking in now."
                  />
                  <StatCard
                    label="Offline now"
                    value={
                      selected.isOnline === false
                        ? formatOfflineHours(selected.offlineHoursCurrent)
                        : selected.isOnline === true
                          ? "0h"
                          : "—"
                    }
                    hint="Time since last seen online (servers)"
                    tone={
                      selected.isOnline === false &&
                      (selected.offlineHoursCurrent ?? 0) >= 4
                        ? "amber"
                        : "default"
                    }
                  />
                  <StatTile
                    label="CPU usage"
                    value={
                      selected.cpuPct != null
                        ? `${Math.round(selected.cpuPct)}%`
                        : "Not reported by agent"
                    }
                    bar={selected.cpuPct}
                    tip="Latest CPU percent from RPM RMM. Bar turns amber at 75% and red at 90%."
                  />
                  <StatTile
                    label="Memory usage"
                    value={
                      selected.memoryPct != null
                        ? `${Math.round(selected.memoryPct)}%`
                        : "Not reported by agent"
                    }
                    bar={selected.memoryPct}
                    tip="Latest memory percent from RPM RMM. Bar turns amber at 75% and red at 90%."
                  />
                  <StatTile
                    label="Alerts"
                    value={`Critical ${selected.criticalNotifications} · Elevated ${selected.elevatedNotifications}`}
                    tip="Open RMM notifications on this device. Critical needs an owner today."
                  />
                  <StatTile
                    label="Last seen online"
                    value={
                      selected.lastSeenOnline
                        ? formatSastDateTime(selected.lastSeenOnline)
                        : "—"
                    }
                    className="sm:col-span-2 lg:col-span-3"
                    tip="Last successful agent check-in, shown in SAST."
                  />
                </div>

                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-subtle">
                    Disks
                  </p>
                  {(selected.disks?.length ?? 0) === 0 ? (
                    <p className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted">
                      No disk inventory from RPM RMM for this device. Collect stores Name, free %, and size. IOPS is not in the the RMM API.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {selected.disks!.map((disk) => {
                        const media = normalizeMediaType(disk.mediaType);
                        const usedLabel =
                          disk.usedGb != null
                            ? `${disk.usedGb.toLocaleString("en-ZA")} GB used`
                            : disk.usedPct != null
                              ? `${disk.usedPct}% used`
                              : null;
                        const freeLabel =
                          disk.freeGb != null
                            ? `${disk.freeGb.toLocaleString("en-ZA")} GB free`
                            : null;
                        const totalLabel =
                          disk.totalGb != null
                            ? `${disk.totalGb.toLocaleString("en-ZA")} GB total`
                            : null;
                        const summary = [usedLabel, freeLabel, totalLabel]
                          .filter(Boolean)
                          .join(" · ");
                        const barPct =
                          disk.usedPct != null
                            ? disk.usedPct
                            : disk.totalGb != null &&
                                disk.usedGb != null &&
                                disk.totalGb > 0
                              ? (disk.usedGb / disk.totalGb) * 100
                              : null;
                        return (
                          <div
                            key={disk.driveLetter}
                            className="rounded-lg border border-border px-3 py-2"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono font-bold text-fg">
                                  {disk.driveLetter || "?"}
                                </span>
                                {media ? (
                                  <Badge
                                    variant="muted"
                                    className="font-mono text-[10px] uppercase tracking-wide"
                                  >
                                    {media}
                                  </Badge>
                                ) : (
                                  <span className="text-[10px] text-subtle">
                                    Media type not reported
                                  </span>
                                )}
                              </div>
                              <span className="text-right text-muted">
                                {summary || "Size not fully reported by agent"}
                                {disk.totalIops != null
                                  ? ` · ${Math.round(disk.totalIops).toLocaleString("en-ZA")} IOPS`
                                  : ""}
                              </span>

                            </div>
                            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                              <div
                                className={
                                  "h-full rounded-full " +
                                  ((barPct ?? 0) >= 90
                                    ? "bg-rag-red"
                                    : (barPct ?? 0) >= 80
                                      ? "bg-rag-amber"
                                      : barPct != null
                                        ? "bg-rag-green"
                                        : "bg-muted")
                                }
                                style={{
                                  width:
                                    barPct != null
                                      ? `${Math.min(100, Math.max(0, barPct))}%`
                                      : "0%",
                                }}
                              />
                            </div>
                            <p className="mt-1 text-[11px] text-muted">
                              Used{" "}
                              {barPct != null
                                ? `${barPct.toFixed(1)}%`
                                : freeLabel && !usedLabel
                                  ? "— (only free space collected)"
                                  : "—"}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function normalizeMediaType(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;
  const u = s.toUpperCase();
  if (u.includes("NVME") || u.includes("NVME")) return "NVMe";
  if (u.includes("SSD") || u.includes("SOLID")) return "SSD";
  if (u.includes("SAS")) return "SAS";
  if (u.includes("SCSI")) return "SCSI";
  if (u.includes("SATA")) return "SATA";
  if (u.includes("HDD") || u.includes("HARD") || u.includes("ROTAT")) return "HDD";
  if (u.length > 24) return s.slice(0, 24);
  return s;
}

/** Format offline hours for RMM server cards (e.g. 1.5h → 1h 30m, 48h → 2d) */
function formatOfflineHours(hours: number | null | undefined): string {
  if (hours == null || !Number.isFinite(hours)) return "—";
  if (hours <= 0) return "0h";
  if (hours < 1) {
    const m = Math.max(1, Math.round(hours * 60));
    return `${m}m`;
  }
  if (hours < 48) {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  const d = Math.floor(hours / 24);
  const h = Math.round(hours - d * 24);
  return h > 0 ? `${d}d ${h}h` : `${d}d`;
}

function StatTile({
  label,
  value,
  mono,
  bar,
  className,
  tip,
}: {
  label: string;
  value: string;
  mono?: boolean;
  bar?: number | null;
  className?: string;
  tip?: string;
}) {
  return (
    <div className={"rounded-lg border border-border px-3 py-2 " + (className ?? "")}>
      {tip ? <MetricLabel tip={tip}>{label}</MetricLabel> : (
        <p className="text-[10px] font-bold uppercase tracking-wide text-subtle">{label}</p>
      )}
      <p
        className={
          "mt-0.5 text-sm font-semibold text-fg " + (mono ? "font-mono" : "")
        }
      >
        {value}
      </p>
      {bar != null && Number.isFinite(bar) ? (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={
              "h-full rounded-full " +
              (bar >= 90 ? "bg-rag-red" : bar >= 75 ? "bg-rag-amber" : "bg-accent")
            }
            style={{ width: `${Math.min(100, Math.max(0, bar))}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

export function RmmAlertsSection({ data }: { data: CustomerDetailPayload }) {
  const alerts = (data.rmm?.alerts ?? []).filter((a) => a.source !== "agent");
  const devices = data.rmm?.devices ?? [];
  if (!effectiveCover(data).rmm && alerts.length === 0) {
    return (
      <NoCoverPanel
        service="RMM | Infrastructure Management · Alerts"
        hint="No cover — no RMM data for this customer."
      />
    );
  }
  const byDevice = new Map<
    string,
    {
      name: string;
      deviceId: string | null;
      type: string | null;
      online: boolean | null;
      crit: number;
      elev: number;
      rows: typeof alerts;
    }
  >();
  for (const d of devices) {
    const crit = d.criticalNotifications || 0;
    const elev = d.elevatedNotifications || 0;
    if (crit + elev <= 0) continue;
    const key = (d.deviceId || d.name || "unknown").toLowerCase();
    byDevice.set(key, {
      name: d.name || d.deviceId,
      deviceId: d.deviceId,
      type: d.deviceType,
      online: d.isOnline,
      crit,
      elev,
      rows: [],
    });
  }
  for (const a of alerts) {
    const key = (a.deviceId || a.deviceName || "unknown").toLowerCase();
    const existing = byDevice.get(key);
    if (existing) {
      existing.rows.push(a);
      continue;
    }
    const sev = (a.severity || "").toLowerCase();
    byDevice.set(key, {
      name: a.deviceName || a.deviceId || "Unknown",
      deviceId: a.deviceId,
      type: null,
      online: null,
      crit: sev === "critical" ? 1 : 0,
      elev: sev === "elevated" ? 1 : 0,
      rows: [a],
    });
  }
  const groups = [...byDevice.values()].sort((a, b) => b.crit - a.crit || b.elev - a.elev || a.name.localeCompare(b.name));
  const [sel, setSel] = useState(groups[0] ? (groups[0].deviceId || groups[0].name) : "");
  const current = groups.find((g) => (g.deviceId || g.name) === sel) ?? groups[0];
  const critN = groups.reduce((s, g) => s + g.crit, 0);
  const elevN = groups.reduce((s, g) => s + g.elev, 0);

  return (
    <div className="space-y-3">
      <ChartCaption
        title="RMM | Infrastructure Management · Alerts"
        why="Pulseway notifications and device counters for this tenant. Windows Event Logs sit under Event Logs."
      />
      <div className="grid gap-2 sm:grid-cols-4">
        <StatCard label="Hosts with alerts" value={groups.length} />
        <StatCard label="Critical" value={critN} tone={critN ? "red" : "green"} />
        <StatCard label="Elevated" value={elevN} tone={elevN ? "amber" : "default"} />
        <StatCard label="Notification rows" value={alerts.length} hint="Latest RMM snapshot" />
      </div>
      {groups.length === 0 ? (
        <p className="text-sm text-muted">No server alerts on the latest RMM snapshot for this customer.</p>
      ) : (
        <StickyPickSplit
          title="Servers"
          items={groups.map((g) => ({
            id: g.deviceId || g.name,
            label: g.name,
            meta: g.crit ? `${g.crit} crit` : g.elev ? `${g.elev} elev` : "alert",
            tone: g.crit ? "red" : g.elev ? "amber" : "off",
          }))}
          selected={current ? current.deviceId || current.name : ""}
          onSelect={setSel}
        >
          {current ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">{current.name}</span>
                {current.type ? <span className="text-[11px] text-muted">{current.type}</span> : null}
                {current.online === false ? <Badge variant="red">Offline</Badge> : current.online === true ? <Badge variant="green">Online</Badge> : null}
                {current.crit > 0 ? <Badge variant="red">{current.crit} critical</Badge> : null}
                {current.elev > 0 ? <Badge variant="amber">{current.elev} elevated</Badge> : null}
              </div>
              {current.rows.length ? (
                current.rows.map((a) => (
                  <div key={a.notificationId} className="rounded-lg border border-border px-2 py-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={(a.severity || "").toLowerCase() === "critical" ? "red" : (a.severity || "").toLowerCase() === "elevated" ? "amber" : "muted"}>
                        {a.severity ?? "Alert"}
                      </Badge>
                      <span className="text-xs font-medium">{a.title ?? "Notification"}</span>
                    </div>
                    {a.message ? <p className="mt-0.5 text-[11px] text-muted">{a.message}</p> : null}
                    {a.raisedAt ? <p className="mt-0.5 text-[11px] text-muted">{formatSastDateTime(a.raisedAt)}</p> : null}
                  </div>
                ))
              ) : (
                <p className="text-[12px] text-muted">Alert counters on the device — notification text not in this snapshot.</p>
              )}
            </div>
          ) : null}
        </StickyPickSplit>
      )}
    </div>
  );
}

export function RmmIopsSection({ data }: { data: CustomerDetailPayload }) {
  const rows = keepLiveIops(data.rmm?.agentIops ?? []);
  const hosts = [...new Set(rows.map((r) => r.hostName).filter(Boolean))];
  const [sel, setSel] = useState(hosts[0] ?? "");
  if (!rows.length) {
    return <p className="text-sm text-muted">No IOPS samples for this customer.</p>;
  }
  return (
    <StickyPickSplit
      title="Hosts"
      items={hosts.map((h) => ({ id: h, label: h, meta: "IOPS", tone: "green" as const }))}
      selected={sel || hosts[0]}
      onSelect={setSel}
    >
      <AgentHostTelemetry iops={rows} events={[]} focusHost={sel || hosts[0]} />
    </StickyPickSplit>
  );
}

export function RmmEventsSection({ data }: { data: CustomerDetailPayload }) {
  const agent = data.rmm?.windowsEvents ?? [];
  const fromAlerts = (data.rmm?.alerts ?? [])
    .filter((a) => a.source !== "agent")
    .map((a) => ({
      hostName: a.deviceName || "",
      timeCreatedUtc: a.raisedAt,
      logName: "RPM RMM",
      eventId: 0,
      levelName: a.severity || "Error",
      providerName: "RPM RMM",
      message: [a.title, a.message].filter(Boolean).join(" — "),
    }));
  const events = [...agent, ...fromAlerts];
  const hosts = [...new Set(events.map((e) => e.hostName).filter(Boolean))];
  const [sel, setSel] = useState(hosts[0] ?? "");
  return (
    <div className="space-y-3">
      <ChartCaption
        title="RMM | Infrastructure Management · Event Logs"
        why="Windows Critical/Error from Assure agents (7 days) plus RMM notifications for this tenant. Empty list means none on file — not No Cover."
      />
      {events.length === 0 ? (
        <p className="text-sm text-muted">No event log rows for this customer yet.</p>
      ) : (
        <StickyPickSplit
          title="Hosts"
          items={hosts.map((h) => ({ id: h, label: h, tone: "amber" as const }))}
          selected={sel || hosts[0]}
          onSelect={setSel}
        >
          <AgentHostTelemetry iops={[]} events={events} focusHost={sel || hosts[0]} />
        </StickyPickSplit>
      )}
    </div>
  );
}

export function RmmMappingSection({ data }: { data: CustomerDetailPayload }) {
  const rmm = data.rmm;
  const maps = rmm?.mapping ?? [];
  return (
    <div className="space-y-4">
      <ChartCaption
        title="Org mapping"
        why="Maps external RMM organisationanization → this CustomerCode (like SqlInstanceName for SYSPRO). Without a map, devices never land on the right customer."
      />
      <div className="rounded-xl border border-border bg-surface p-4 text-sm">
        <p>
          <span className="text-muted">RMM organisation:</span>{" "}
          <span className="font-mono">{rmm?.pulsewayOrgName ?? "—"}</span>
        </p>
        <p className="mt-1">
          <span className="text-muted">RMM cover:</span>{" "}
          {rmm?.pillarOn ? "On" : "Off"}
        </p>
      </div>
      {maps.length === 0 ? (
        <p className="text-sm text-muted">
          No rows in RMM organisation map for this customer. Insert OrganizationName → CustomerCode, then collect.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2">Organization</th>
                <th className="px-3 py-2">Org Id</th>
                <th className="px-3 py-2">Active</th>
                <th className="px-3 py-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {maps.map((m) => (
                <tr key={m.organizationName} className="border-b border-border/70 last:border-0">
                  <td className="px-3 py-2 font-medium">{m.organizationName}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted">{m.organizationId ?? "—"}</td>
                  <td className="px-3 py-2">{m.active ? "Yes" : "No"}</td>
                  <td className="px-3 py-2 text-xs text-muted">{m.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function AmsHubSection({ data }: { data: CustomerDetailPayload }) {
  const c = data.customer;
  const base = `/customers/${c.customerCode}/ams`;
  const openRisks = (data.risks ?? []).filter((r) => (r.status || "").toLowerCase() !== "closed");
  const closedRisks = Math.max(0, (data.risks ?? []).length - openRisks.length);
  const openIssues = (data.issues ?? []).filter((i) => (i.status || "").toLowerCase() !== "closed");
  const incidents = data.incidents ?? [];
  const openInc = incidents.filter((i) => (i.status || "").toLowerCase() !== "closed");
  const major = openInc.filter((i) => i.isMajor);
  const oa = data.operationalAssurance;
  const score = oa?.scorePct ?? (c.healthRag === "Green" ? 88 : c.healthRag === "Amber" ? 68 : 42);
  const slaPack = buildExcoPillarSla(slaInputFromDetail(effectiveCover(data), data));
  const riskPie = [
    { name: "Open risks", value: openRisks.length, fill: "#ffa21d" },
    { name: "Closed", value: Math.max(closedRisks, openRisks.length === 0 ? 1 : 0), fill: "#17c666" },
  ];
  const mixBars = [
    { name: "Incidents", value: openInc.length, fill: "#ea4d4d" },
    { name: "Major", value: major.length, fill: "#c0392b" },
    { name: "Risks", value: openRisks.length, fill: "#ffa21d" },
    { name: "Issues", value: openIssues.length, fill: "#5c6570" },
  ];
  const slaBars = slaPack.pillars
    .filter((s) => s.covered && s.pct != null)
    .map((s) => ({
      name: s.label,
      value: s.pct ?? 0,
      fill: (s.pct ?? 0) >= 80 ? "#17c666" : (s.pct ?? 0) >= 55 ? "#ffa21d" : "#ea4d4d",
    }));

  return (
    <div className="rpma-eco-visuals space-y-3">
      <div className="rpma-glass flex flex-wrap items-center gap-3 px-4 py-3">
        <RagBadge rag={c.healthRag} title={c.healthSummary} />
        <div className="min-w-0">
          <p className="text-lg font-bold tracking-tight text-fg">Customer Assurance</p>
          <p className="text-[12px] text-muted">{c.displayName} · last collect {formatSastDateTime(c.lastImportAt)}</p>
        </div>
        <div className="ml-auto grid grid-cols-3 gap-2">
          <StatCard label="Assurance" value={`${score}%`} tone={assuranceTone(score, c.healthRag)} />
          <StatCard label="Open risks" value={openRisks.length} tone={openRisks.length === 0 ? "green" : "amber"} />
          <StatCard label="Open incidents" value={openInc.length} tone={openInc.length === 0 ? "green" : "red"} />
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="rpma-glass p-3">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted">Risk register</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={riskPie} dataKey="value" nameKey="name" innerRadius={46} outerRadius={68} paddingAngle={2} isAnimationActive={false}>
                  {riskPie.map((e) => (
                    <Cell key={e.name} fill={e.fill} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rpma-glass p-3">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted">Open items</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mixBars} margin={{ top: 8, right: 8, left: 0, bottom: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="name" tick={{ fill: CHART.axis, fontSize: 10 }} interval={0} height={36} angle={-20} textAnchor="end" tickFormatter={(v) => axisLabel(v, 10)} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} width={24} tick={{ fill: CHART.axis, fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={CHART_TOOLTIP_CURSOR} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={32} isAnimationActive={false}>
                  {mixBars.map((e, i) => (
                    <Cell key={i} fill={e.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rpma-glass p-3">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted">SLA by service</p>
          <div className="h-48">
            {slaBars.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={slaBars} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: CHART.axis, fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fill: CHART.axis, fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} tickFormatter={(v) => axisLabel(v, 16)} />
                  <Tooltip content={<ChartTooltip />} cursor={CHART_TOOLTIP_CURSOR} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={14} isAnimationActive={false}>
                    {slaBars.map((e, i) => (
                      <Cell key={i} fill={e.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="px-2 py-8 text-sm text-muted">No SLA scores on this snapshot.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Incidents", href: `${base}/incidents`, n: openInc.length, hint: "Service desk" },
          { label: "Risks", href: `${base}/risks`, n: openRisks.length, hint: "Register" },
          { label: "SLA", href: `${base}/sla`, n: `${score}%`, hint: "Clocks" },
          {
            label: "Day End",
            href: `/customers/${c.customerCode}/syspro/day-end`,
            n: data.dayEnd?.label ?? "—",
            hint: data.dayEnd?.expectedToday ? "Expected today" : "Schedule",
          },
        ].map((t) => (
          <SpaLink key={t.href} href={t.href} className="rpma-glass block px-3 py-2.5 hover:shadow-md">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">{t.label}</p>
            <p className="font-mono text-xl font-bold text-fg">{t.n}</p>
            <p className="text-[11px] text-muted">{t.hint} · open module</p>
          </SpaLink>
        ))}
      </div>

      <SpaLink
        href={`/reports?format=ams-monthly&customer=${encodeURIComponent(c.customerCode)}`}
        className="rpma-glass flex min-h-11 items-center gap-3 px-3 py-2.5 text-[13px] font-semibold text-fg"
      >
        Print monthly AMS pack
        <span className="font-normal text-muted">Health · day-end · jobs · FinSight · clocks</span>
      </SpaLink>
    </div>
  );
}

export function OperatorsSection({ data }: { data: CustomerDetailPayload }) {
  if (!effectiveCover(data).syspro) {
    return (
      <NoCoverPanel
        service="SYSPRO operators"
        hint="No cover — no SYSPRO data for this customer."
      />
    );
  }
  const ops = data.operators ?? [];
  const logins = data.recentLogins ?? [];
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <StatCard label="Operators" value={ops.length || data.customer.operatorCount} />
        <StatCard label="Active users" value={data.customer.activeUserCount} hint="Login ≤ 30 days" />
        <StatCard
          label="With last login"
          value={ops.filter((o) => o.lastLoginDate).length}
        />
        <StatCard label="Recent login rows" value={logins.length} />
      </div>
      <Card>
        <CardHead>Operators</CardHead>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-left text-[12px]">
            <thead className="rpma-table-head">
              <tr>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Last login</th>
              </tr>
            </thead>
            <tbody>
              {ops.slice(0, 80).map((o) => (
                <tr key={o.operatorCode} className="border-t border-border">
                  <td className="px-3 py-1.5 font-mono text-[11px]">{o.operatorCode}</td>
                  <td className="px-3 py-1.5">{o.operatorName ?? "—"}</td>
                  <td className="px-3 py-1.5">{o.operatorStatus ?? "—"}</td>
                  <td className="px-3 py-1.5 text-muted">
                    {formatSastDateTime(o.lastLoginDate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

export function DayEndSection({ data }: { data: CustomerDetailPayload }) {
  if (!effectiveCover(data).syspro) {
    return (
      <NoCoverPanel
        service="Day end"
        hint="No cover — no SYSPRO data for this customer."
      />
    );
  }
  const snap = data.dayEnd ?? null;
  if (!snap) {
    return (
      <p className="text-sm text-muted">Day-end status is not available on this snapshot.</p>
    );
  }
  const tone = dayEndTone(snap.status);
  return (
    <div className="space-y-3">
      <ChartCaption
        title="Automated day-end"
        why="AMS clause 4.5 — Monday to Friday, Business Days. Weekends and public holidays are excluded unless Standby Support is taken."
      />
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <StatCard
          label="Status"
          value={snap.label}
          tone={tone}
          hint={snap.expectedToday ? "Expected today" : "Not a Business Day"}
        />
        <StatCard
          label="Last run"
          value={snap.lastRunAt ? formatSastDateTime(snap.lastRunAt) : "—"}
          hint="From SYSPRO job logging"
        />
        <StatCard
          label="Password risk"
          value={snap.passwordRisk ? "Yes" : "Clear"}
          tone={snap.passwordRisk ? "red" : "green"}
          hint="Clause 4.5 / 6.7 — notify RPM of credential changes"
        />
        <StatCard
          label="Task groups"
          value={snap.taskGroups.length}
          hint={snap.taskGroups[0] || "No day-end task group named"}
        />
      </div>
      <div
        className={cn(
          "rounded-xl border px-3 py-2 text-[12px] leading-relaxed",
          tone === "red"
            ? "border-rag-red/30 bg-rag-red/10 text-fg"
            : tone === "green"
              ? "border-rag-green/30 bg-rag-green/10 text-fg"
              : "border-border bg-surface-2 text-muted",
        )}
      >
        {snap.detail}
        {snap.passwordRiskNote ? (
          <p className="mt-1 font-medium text-fg">{snap.passwordRiskNote}</p>
        ) : null}
        <p className="mt-1 text-[11px] text-subtle">As of {snap.asOfSast}</p>
      </div>
      {snap.taskGroups.length > 0 ? (
        <Card>
          <CardHead>Day-end task groups</CardHead>
          <CardContent className="text-[12px]">
            <ul className="list-disc space-y-1 pl-4">
              {snap.taskGroups.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardHead>Matching jobs ({snap.jobs.length})</CardHead>
        <CardContent className="space-y-2">
          {snap.jobs.length === 0 ? (
            <p className="text-xs text-muted">
              No day-end-named jobs on the latest collect. Status uses task groups and the Business Day window only.
            </p>
          ) : (
            snap.jobs.map((j, i) => (
              <div key={i} className="rounded-md border border-border px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <ProgramLabel code={j.programName} showDescription />
                  <Badge variant={j.failed ? "red" : "green"}>{j.failed ? "Failed" : "Ran"}</Badge>
                </div>
                {j.message ? (
                  <p className="mt-1 text-[12px] text-muted line-clamp-2">{j.message}</p>
                ) : null}
                <p className="mt-0.5 text-[11px] text-subtle">
                  {j.operator ?? "—"} · {formatSastDateTime(j.progRunDate)}
                  {j.progErrorCode != null ? ` · error ${j.progErrorCode}` : ""}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function JobsSection({ data }: { data: CustomerDetailPayload }) {
  if (!effectiveCover(data).syspro) {
    return (
      <NoCoverPanel
        service="SYSPRO jobs"
        hint="No cover — no SYSPRO data for this customer."
      />
    );
  }
  const jobs = (data.jobErrors ?? []).filter((j) => isJobFailed(j));
  const byProg = useMemo(() => {
    const m = new Map<string, number>();
    for (const j of jobs) {
      const k = j.programName || "Unknown";
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m.entries()]
      .map(([name, count]) => {
        const label = formatProgramLabel(name);
        // Short axis tick: code only; full label in tooltip
        return { name, count, label, tick: name };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [jobs]);

  return (
    <div className="space-y-3">
      <ChartCaption
        title="Job errors by program"
        why="Which SYSPRO programs failed most on the latest snapshot. Hover for friendly names."
      />
      {byProg.length > 0 ? (
        <Card>
          <CardContent className="h-52 p-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byProg} margin={{ top: 4, right: 8, left: 0, bottom: 18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="name" tick={{ fill: CHART.axis, fontSize: 10 }} interval={0} height={40} angle={-24} textAnchor="end" tickFormatter={(v) => axisLabel(v, 10)} />
                <YAxis allowDecimals={false} width={28} tick={{ fill: CHART.axis, fontSize: 10 }} />
                <Tooltip
                  content={<ChartTooltip />}
                  formatter={(v: number, _n, item) => [
                    v,
                    (item?.payload as { label?: string })?.label ?? "Program",
                  ]}
                />
                <Bar isAnimationActive={false} dataKey="count" fill={CHART.jobs} radius={[6, 6, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardHead>Latest job errors ({jobs.length})</CardHead>
        <CardContent className="space-y-2">
          {jobs.length === 0 ? (
            <p className="text-xs text-muted">No job errors on the latest snapshot.</p>
          ) : (
            jobs.slice(0, 40).map((j, i) => (
              <div key={i} className="rounded-md border border-border px-3 py-2 text-sm">
                <ProgramLabel code={j.programName} showDescription />
                <p className="mt-1 text-[12px] text-muted line-clamp-2">{j.message}</p>
                <p className="mt-0.5 text-[11px] text-subtle">
                  {j.operator ?? "—"} · {formatSastDateTime(j.progRunDate)}
                  {j.progErrorCode != null ? ` · error code ${j.progErrorCode}` : ""}
                  {j.errorStatusCode ? ` · status ${j.errorStatusCode}` : ""}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function DtrSection({ data }: { data: CustomerDetailPayload }) {
  if (!effectiveCover(data).syspro) {
    return (
      <NoCoverPanel
        service={FINSIGHT_PRODUCT}
        hint="No cover — this customer has no SYSPRO Deployment, so FinSight control recons are not collected."
      />
    );
  }
  const rows = data.dtrLevel1 ?? [];
  const detailAll = data.dtrDetailLines ?? [];
  const [selectedMod, setSelectedMod] = useState<string | null>(
    () => rows.find((r) => (r.varianceLineCount || 0) > 0)?.balanceTypeCode ?? rows[0]?.balanceTypeCode ?? null,
  );
  const [selectedL2Key, setSelectedL2Key] = useState<string | null>(null);
  const [cases, setCases] = useState<FinSightReconCase[]>(data.finsightReconCases ?? []);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const chart = useMemo(
    () =>
      rows.map((r) => {
        const label = finsightModuleName(r.balanceTypeCode, r.balanceTypeName);
        return {
          name: label,
          oob: r.varianceLineCount,
          abs: r.absVariance ?? 0,
          label,
        };
      }),
    [rows],
  );

  const modules = rows.length;
  const modulesOob = rows.filter((r) => (r.varianceLineCount || 0) > 0).length;
  const modulesClean = Math.max(0, modules - modulesOob);
  const oobLines = rows.reduce((s, r) => s + (r.varianceLineCount || 0), 0);
  const absVar = rows.reduce((s, r) => s + Math.abs(Number(r.absVariance ?? r.totalVariance) || 0), 0);
  const integrationOk = modules > 0 && modulesOob === 0;

  const modDetail = useMemo(
    () => detailAll.filter((d) => d.balanceTypeCode === selectedMod),
    [detailAll, selectedMod],
  );

  /** Collapse exact duplicates (same company + amounts + keys) */
  function dedupeDetailLines(lines: DtrDetailLine[]): DtrDetailLine[] {
    const seen = new Set<string>();
    const out: DtrDetailLine[] = [];
    for (const line of lines) {
      const k = [
        line.companyDb ?? "",
        line.informationLevel,
        line.levelKey ?? "",
        line.glCode ?? "",
        line.dimension1 ?? "",
        line.description ?? "",
        line.glCloseBalance ?? "",
        line.subCloseBalance ?? "",
        line.variance ?? "",
        line.glYear ?? "",
        line.glPeriod ?? "",
      ].join("|");
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(line);
    }
    return out;
  }

  const l1Lines = useMemo(
    () => dedupeDetailLines(modDetail.filter((d) => d.informationLevel === 1)),
    [modDetail],
  );
  const l2Lines = useMemo(
    () => dedupeDetailLines(modDetail.filter((d) => d.informationLevel === 2)),
    [modDetail],
  );
  const l3Lines = useMemo(() => {
    const l3 = modDetail.filter((d) => d.informationLevel === 3);
    const filtered = !selectedL2Key
      ? l3
      : l3.filter(
          (d) =>
            d.parentLevelKey === selectedL2Key ||
            d.levelKey === selectedL2Key ||
            d.glCode === selectedL2Key ||
            !d.parentLevelKey,
        );
    return dedupeDetailLines(filtered);
  }, [modDetail, selectedL2Key]);

  const hasL23 = detailAll.some((d) => Number(d.informationLevel) >= 2);

  async function runAutoOpen() {
    setBusy(true);
    setMsg(null);
    try {
      const res = (await autoOpenFinSightReconCases({
        data: { customerCode: data.customer.customerCode },
      })) as {
        ok?: boolean;
        message?: string;
        cases?: FinSightReconCase[];
      };
      if (res.cases?.length) setCases(res.cases);
      setMsg(res.message ?? (res.ok ? "Done" : "Failed"));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function advanceCase(c: FinSightReconCase, status: FinSightReconStatus) {
    setBusy(true);
    setMsg(null);
    try {
      const res = (await updateFinSightReconCase({
        data: {
          reconCaseId: c.reconCaseId,
          status,
          actorName: "Staff",
          stepNote: `Status to ${status}`,
        },
      })) as { ok?: boolean; case?: FinSightReconCase };
      if (res.case) {
        const updated = res.case;
        setCases((prev) => prev.map((x) => (x.reconCaseId === updated.reconCaseId ? updated : x)));
      }
      setMsg(`Case ${c.balanceTypeCode} → ${status}`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function displayKey(line: DtrDetailLine): string {
    return (
      line.glCode ||
      line.levelKey ||
      line.dimension1 ||
      (line.companyDb ? line.companyDb : "") ||
      "—"
    );
  }

  function displayDesc(line: DtrDetailLine): string {
    const cleaned = finsightCleanDescription(line.description, {
      moduleCode: line.balanceTypeCode,
      levelKey: line.levelKey,
      glCode: line.glCode,
    });
    const extras: string[] = [];
    if (
      line.levelKey &&
      line.levelKey !== line.glCode &&
      cleaned !== line.levelKey &&
      !cleaned.includes(line.levelKey)
    ) {
      extras.push(line.levelKey);
    }
    if (line.glYear != null && line.glPeriod != null) {
      extras.push(`Year ${line.glYear} · Period ${line.glPeriod}`);
    }
    if (extras.length === 0) return cleaned;
    if (cleaned === "—") return extras.join(" · ");
    return `${cleaned} · ${extras.join(" · ")}`;
  }

  function LevelTable({
    title,
    level,
    lines,
    onRowClick,
    activeKey,
  }: {
    title: string;
    level: 1 | 2 | 3;
    lines: DtrDetailLine[];
    onRowClick?: (line: DtrDetailLine) => void;
    activeKey?: string | null;
  }) {
    if (lines.length === 0) {
      return (
        <Card className="border-dashed">
          <CardContent className="space-y-1 p-3 text-[12px] text-muted">
            <p className="font-semibold text-fg">
              {title}: no rows on latest snapshot
            </p>
            <p>{finsightLevelHint(level)}</p>
            <p className="text-[11px] text-subtle">
              If this stays empty after refresh, re-run FinSight collect on the customer SYSPRO host
              (native fallback or Datarapt all-levels).
            </p>
          </CardContent>
        </Card>
      );
    }
    const showCompany = lines.some((l) => Boolean(l.companyDb));
    return (
      <Card>
        <CardHead title={finsightLevelHint(level)}>
          <span className="font-semibold">{title}</span>
          <span className="ml-2 font-normal text-muted">· {lines.length} row(s)</span>
        </CardHead>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-left text-[12px]">
            <thead className="border-b border-border bg-surface-2/50 text-[10px] uppercase tracking-wide text-subtle">
              <tr>
                <th className="px-3 py-2" title="GL account or rollup key">
                  {FINSIGHT_COL.keyGl}
                </th>
                <th className="px-3 py-2">{FINSIGHT_COL.description}</th>
                {showCompany ? (
                  <th className="px-3 py-2" title="SYSPRO company database">
                    {FINSIGHT_COL.company}
                  </th>
                ) : null}
                <th
                  className="px-3 py-2 text-right"
                  title="Balance from the sub-ledger / module"
                >
                  {FINSIGHT_COL.subClose}
                </th>
                <th
                  className="px-3 py-2 text-right"
                  title="Balance from the GL control account(s) mapped for this module"
                >
                  {FINSIGHT_COL.glClose}
                </th>
                <th
                  className="px-3 py-2 text-right"
                  title="Sub-ledger close minus GL control close"
                >
                  {FINSIGHT_COL.variance}
                </th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, i) => {
                const key = displayKey(line);
                const rowKey = `${key}|${line.companyDb ?? ""}|${line.glCloseBalance ?? ""}|${line.variance ?? ""}|${i}`;
                const v = Number(line.variance) || 0;
                const active =
                  !!activeKey &&
                  (key === activeKey ||
                    line.levelKey === activeKey ||
                    line.glCode === activeKey);
                return (
                  <tr
                    key={rowKey}
                    className={
                      "border-b border-border/80 " +
                      (onRowClick ? "cursor-pointer hover:bg-surface-2/60 " : "") +
                      (active ? "bg-primary/10 " : "") +
                      (Math.abs(v) > 0.005 ? "" : "opacity-80")
                    }
                    onClick={() => onRowClick?.(line)}
                  >
                    <td className="px-3 py-2 font-mono text-[11px]">
                      {key}
                      {line.dimension1 && line.dimension1 !== key ? (
                        <span className="block text-muted">{line.dimension1}</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">{displayDesc(line)}</td>
                    {showCompany ? (
                      <td className="px-3 py-2 text-muted">{line.companyDb || "—"}</td>
                    ) : null}
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatZar(line.subCloseBalance)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatZar(line.glCloseBalance)}
                    </td>
                    <td
                      className={
                        "px-3 py-2 text-right tabular-nums font-semibold " +
                        (Math.abs(v) > 0.005
                          ? "text-red-700 dark:text-red-400"
                          : "text-emerald-700 dark:text-emerald-400")
                      }
                    >
                      {formatZar(line.variance)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <ChartCaption
        title={`${FINSIGHT_PRODUCT} · control recons`}
        why="Control totals (L1) roll from mid-level (L2) and detail (L3). Variance = sub-ledger close vs GL control close. Open recon cases to track clear-down."
      />

      {(detailAll.length > 0 || rows.length > 0) ? (
        <Card className="overflow-hidden border-primary/25">
          <CardContent className="p-4">
            <FinSightD3Hierarchy
              lines={detailAll.length > 0 ? detailAll : rows}
              focusModule={selectedMod}
              onSelectModule={(code) => {
                setSelectedMod(code);
                setSelectedL2Key(null);
              }}
              onSelectL2={(key) => setSelectedL2Key(key)}
            />
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="space-y-2 p-4 text-sm">
          <p className="font-semibold text-fg">How FinSight works</p>
          <ul className="list-inside list-disc space-y-1 text-[13px] text-muted">
            <li>
              <strong className="text-fg">{finsightLevelLabel(1)}</strong> —{" "}
              {finsightLevelHint(1)}
            </li>
            <li>
              <strong className="text-fg">{finsightLevelLabel(2)}</strong> —{" "}
              {finsightLevelHint(2)}
            </li>
            <li>
              <strong className="text-fg">{finsightLevelLabel(3)}</strong> —{" "}
              {finsightLevelHint(3)}
            </li>
            <li>
              <strong className="text-fg">Workflow</strong> — auto-open cases for out-of-balance
              controls; track to Cleared / Accepted
            </li>
          </ul>
          <p className="text-[12px] text-subtle">
            {FINSIGHT_CONTROL_WHAT} {FINSIGHT_INTEGRATION_WHAT}
          </p>
          {!hasL23 && modules > 0 ? (
            <div className="rounded-md border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-900 dark:text-amber-200">
              <p className="font-semibold">Mid-level and detail not on central yet</p>
              <p className="mt-1 text-[11px] leading-relaxed opacity-95">
                Control totals (L1) are present, but {finsightLevelLabel(2)} and{" "}
                {finsightLevelLabel(3)} rows are missing for this customer. Run FinSight collect on
                the <strong>customer SYSPRO SQL host</strong>, then hard-refresh.
              </p>
              <p className="mt-1 font-mono text-[10px] leading-relaxed opacity-95">
                powershell -NoProfile -ExecutionPolicy Bypass -File
                C:\RPM-Assure\Sql\base\syspro-direct\Collect-Dtr-Native-Fallback.ps1
                -ConfigPath C:\RPM-Assure\Sql\customers\{data.customer.customerCode}
                \Customer.Config.ps1
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {modules > 0 ? (
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
          <StatCard
            label="Control modules"
            value={modules}
            tip="Distinct L1 control modules collected (INV, AP, AR, WIP, …)"
          />
          <StatCard
            label={FINSIGHT_STATUS.inBalance}
            value={modulesClean}
            tone="green"
            tip="Modules where sub-ledger and GL control agree"
          />
          <StatCard
            label={FINSIGHT_STATUS.outOfBalance}
            value={modulesOob}
            tone={modulesOob > 0 ? "red" : "green"}
            tip="Modules with at least one out-of-balance line"
          />
          <StatCard
            label={FINSIGHT_COL.oobLines}
            value={oobLines}
            tone={oobLines > 0 ? "amber" : "green"}
            tip="Count of control lines that do not reconcile"
          />
          <StatCard
            label={FINSIGHT_COL.absVariance}
            value={formatZar(absVar)}
            tone={absVar > 0 ? "amber" : "green"}
            tip="Sum of absolute ZAR variance across L1 controls"
          />
        </div>
      ) : null}

      {modules > 0 ? (
        <Card>
          <CardHead>Sub-ledger → GL integration</CardHead>
          <CardContent className="p-4 text-sm">
            <p
              className={
                integrationOk
                  ? "font-semibold text-emerald-700 dark:text-emerald-400"
                  : "font-semibold text-amber-800 dark:text-amber-300"
              }
            >
              {integrationOk
                ? "Holding — all collected control accounts reconcile."
                : `${modulesOob} control module(s) out of balance — drill mid-level / detail and open recon cases.`}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* Automated recon workflow */}
      <Card>
        <CardHead>Recon workflow</CardHead>
        <CardContent className="space-y-3 p-4">
          <p className="text-[13px] text-muted">
            Opens one active case per control module with out-of-balance lines. Advance status as
            RPM Assure and finance clear the recon: Open → Investigating → Waiting finance → Cleared
            / Accepted.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy || modulesOob === 0}
              onClick={() => void runAutoOpen()}
              className="rounded-lg bg-primary px-3 py-1.5 text-[13px] font-semibold text-primary-fg disabled:opacity-50"
            >
              {busy ? "Working…" : "Auto-open cases from out-of-balance controls"}
            </button>
            <span className="text-[12px] text-subtle">{cases.length} active case(s)</span>
          </div>
          {msg ? <p className="text-[12px] text-muted">{msg}</p> : null}
          {cases.length === 0 ? (
            <p className="text-[12px] text-muted">
              No open recon cases. Run auto-open when out-of-balance controls are greater than zero.
            </p>
          ) : (
            <div className="space-y-2">
              {cases.map((c) => (
                <div
                  key={c.reconCaseId}
                  className="flex flex-col gap-2 rounded-lg border border-border bg-surface-2/40 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-fg">
                      <button
                        type="button"
                        className="text-left hover:underline"
                        onClick={() => {
                          setSelectedMod(c.balanceTypeCode);
                          setSelectedL2Key(null);
                        }}
                      >
                        {finsightModuleTitle(c.balanceTypeCode)}
                      </button>{" "}
                      <span className="font-normal text-muted">· {c.status}</span>
                    </p>
                    <p className="truncate text-[12px] text-muted">{c.title}</p>
                    <p className="text-[11px] text-subtle">
                      {FINSIGHT_COL.oobLines} {c.oobLines} · {FINSIGHT_COL.absVariance}{" "}
                      {formatZar(c.absVariance)} · Owner {c.ownerName || "—"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(
                      [
                        ["Investigating", "Investigate"],
                        ["WaitingFinance", "Wait finance"],
                        ["Cleared", "Cleared"],
                        ["Accepted", "Accept"],
                        ["Closed", "Close"],
                      ] as const
                    ).map(([st, label]) => (
                      <button
                        key={st}
                        type="button"
                        disabled={busy || c.status === st}
                        onClick={() => void advanceCase(c, st)}
                        className="rounded-md border border-border px-2 py-1 text-[11px] font-medium hover:bg-surface disabled:opacity-40"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {chart.length > 0 ? (
        <Card>
          <CardHead>Out-of-balance lines by control module</CardHead>
          <CardContent className="h-56 p-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ top: 4, right: 8, left: 0, bottom: 22 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="name" tick={{ fill: CHART.axis, fontSize: 10 }} interval={0} height={44} angle={-24} textAnchor="end" tickFormatter={(v) => axisLabel(v, 12)} />
                <YAxis allowDecimals={false} width={28} tick={{ fill: CHART.axis, fontSize: 10 }} />
                <Tooltip
                  content={<ChartTooltip />}
                  formatter={(v: number, name) => [
                    name === "oob" ? `${v} lines` : formatZar(v),
                    name === "oob" ? FINSIGHT_COL.oobLines : FINSIGHT_COL.absVariance,
                  ]}
                />
                <Bar
                  isAnimationActive={false}
                  dataKey="oob"
                  name={FINSIGHT_COL.oobLines}
                  fill={CHART.dtr}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="space-y-2 p-4">
            <p className="text-sm font-semibold text-fg">No FinSight recon data yet</p>
            <p className="text-sm text-muted">
              Control account recons appear when balance extracts exist and collect has written rows
              to central (native FinSight or Datarapt).
            </p>
          </CardContent>
        </Card>
      )}

      {/* L1 matrix + drill selector */}
      {rows.length > 0 ? (
        <Card>
          <CardHead>Control account matrix — select a module to drill</CardHead>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[640px] text-left text-[12px]">
              <thead className="border-b border-border bg-surface-2/50 text-[10px] uppercase tracking-wide text-subtle">
                <tr>
                  <th className="px-3 py-2 font-semibold">{FINSIGHT_COL.control}</th>
                  <th className="px-3 py-2 font-semibold">{FINSIGHT_COL.module}</th>
                  <th className="px-3 py-2 font-semibold">{FINSIGHT_COL.whatWeRecon}</th>
                  <th className="px-3 py-2 font-semibold text-right">{FINSIGHT_COL.closeL1}</th>
                  <th className="px-3 py-2 font-semibold text-right">{FINSIGHT_COL.absVariance}</th>
                  <th className="px-3 py-2 font-semibold text-right">{FINSIGHT_COL.oobLines}</th>
                  <th className="px-3 py-2 font-semibold">{FINSIGHT_COL.status}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const oob = r.varianceLineCount || 0;
                  const ok = oob === 0;
                  const sel = selectedMod === r.balanceTypeCode;
                  return (
                    <tr
                      key={r.balanceTypeCode}
                      className={
                        "cursor-pointer border-b border-border/80 hover:bg-surface-2/50 " +
                        (sel ? "bg-primary/10" : "")
                      }
                      onClick={() => {
                        setSelectedMod(r.balanceTypeCode);
                        setSelectedL2Key(null);
                      }}
                    >
                      <td className="px-3 py-2 font-mono font-semibold text-fg">
                        {r.balanceTypeCode}
                      </td>
                      <td className="px-3 py-2 text-fg">
                        {finsightModuleName(r.balanceTypeCode, r.balanceTypeName)}
                      </td>
                      <td className="max-w-[14rem] px-3 py-2 text-muted">
                        {finsightControlHint(r.balanceTypeCode)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatZar(r.totalCloseBalance ?? r.closeBalance)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatZar(r.absVariance)}
                      </td>
                      <td
                        className={
                          "px-3 py-2 text-right tabular-nums font-semibold " +
                          (ok
                            ? "text-emerald-700 dark:text-emerald-400"
                            : "text-red-700 dark:text-red-400")
                        }
                      >
                        {oob}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={
                            "inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase " +
                            (ok
                              ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                              : "bg-red-500/15 text-red-800 dark:text-red-300")
                          }
                        >
                          {ok ? FINSIGHT_STATUS.inBalance : FINSIGHT_STATUS.outOfBalance}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}

      {selectedMod ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-fg">
            Drill-down · {finsightModuleTitle(selectedMod)}{" "}
            <span className="font-normal text-muted">
              — {finsightControlHint(selectedMod)} · click a mid-level row to filter detail
            </span>
          </p>
          <LevelTable
            title={`${finsightLevelLabel(1)} · ${finsightModuleTitle(selectedMod)}`}
            level={1}
            lines={l1Lines.length ? l1Lines : []}
          />
          <LevelTable
            title={`${finsightLevelLabel(2)} · ${finsightModuleTitle(selectedMod)}`}
            level={2}
            lines={l2Lines}
            activeKey={selectedL2Key}
            onRowClick={(line) => setSelectedL2Key(line.levelKey || line.glCode || null)}
          />
          <LevelTable
            title={
              selectedL2Key
                ? `${finsightLevelLabel(3)} · ${finsightModuleTitle(selectedMod)} (under ${selectedL2Key})`
                : `${finsightLevelLabel(3)} · ${finsightModuleTitle(selectedMod)} (all detail)`
            }
            level={3}
            lines={l3Lines}
          />
          {selectedL2Key ? (
            <button
              type="button"
              className="text-[12px] font-medium text-primary hover:underline"
              onClick={() => setSelectedL2Key(null)}
            >
              Clear mid-level filter — show all detail
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function HealthSection({ data }: { data: CustomerDetailPayload }) {
  if (!effectiveCover(data).syspro) {
    return (
      <NoCoverPanel
        service="SYSPRO health log"
        hint="No cover — no SYSPRO data for this customer."
      />
    );
  }
  const { customer, healthLogs, operationalAssurance, diagSummaries, sqlHealthRows } = data;
  const score = operationalAssurance?.scorePct ?? 0;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <StatCard
          label="Health"
          value={customer.healthRag}
          tone={
            customer.healthRag === "Red"
              ? "red"
              : customer.healthRag === "Amber"
                ? "amber"
                : "green"
          }
        />
        <StatCard label="Assurance" value={`${score}%`} tone={assuranceTone(score, customer.healthRag)} />
        <StatCard label="Job errors" value={customer.sysproJobErrorCount} />
        <StatCard
          label="FinSight out-of-balance lines"
          value={customer.sysproDtrVarianceLines}
          tip="Control account lines where sub-ledger does not equal GL"
        />
      </div>
      <p className="text-sm text-muted">{customer.healthSummary}</p>
      {operationalAssurance?.summary ? (
        <p className="text-[12px] text-subtle">{operationalAssurance.summary}</p>
      ) : null}
      <Card>
        <CardHead>Health log</CardHead>
        <CardContent className="space-y-2">
          {(healthLogs ?? []).length === 0 ? (
            <p className="text-xs text-muted">
              No detailed health-log lines yet — operational assurance above still applies.
            </p>
          ) : (
            healthLogs.slice(0, 20).map((h, i) => (
              <div key={i} className="border-t border-border py-2 text-sm first:border-0">
                <p className="font-medium">{h.healthFunction ?? "Check"}</p>
                <p className="text-[12px] text-muted">{h.message ?? h.description}</p>
                <p className="text-[11px] text-subtle">
                  {formatSastDateTime(h.runDateTime)} · {h.statusFlag ?? ""}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      {(diagSummaries?.length ?? 0) > 0 || (sqlHealthRows?.length ?? 0) > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <Card>
            <CardHead>Diagnostics</CardHead>
            <CardContent className="space-y-1 text-[12px]">
              {(diagSummaries ?? []).slice(0, 12).map((d, i) => (
                <div key={i} className="border-t border-border py-1 first:border-0">
                  <span className="font-medium">{d.diagName ?? d.diagCode}</span>
                  <span className="text-muted"> · {d.statusText ?? d.severity}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHead>SQL health</CardHead>
            <CardContent className="space-y-1 text-[12px]">
              {(sqlHealthRows ?? []).slice(0, 12).map((s, i) => (
                <div key={i} className="border-t border-border py-1 first:border-0">
                  {s.companyDb} · {s.healthKey ?? s.description} · {s.statusText}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

export function SecuritySection({ data }: { data: CustomerDetailPayload }) {
  if (!effectiveCover(data).syspro) {
    return (
      <NoCoverPanel
        service="SYSPRO security"
        hint="No cover — no SYSPRO data for this customer."
      />
    );
  }
  const { securitySummary, operGroups, operAmends, auditEvents } = data;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <StatCard label="Group links" value={securitySummary.groupMemberships} />
        <StatCard label="Operators in groups" value={securitySummary.distinctOperatorsInGroups} />
        <StatCard label="Distinct groups" value={securitySummary.distinctGroups} />
        <StatCard label="Amends (90d)" value={securitySummary.amendCount90d} />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHead>Operator groups</CardHead>
          <CardContent className="max-h-64 overflow-auto text-[12px]">
            {(operGroups ?? []).slice(0, 40).map((g, i) => (
              <div key={i} className="border-t border-border py-1 first:border-0">
                <span className="font-mono">{g.operatorCode}</span>
                <span className="text-muted">
                  {" "}
                  → {g.groupName ?? g.groupCode}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHead>Recent amends / audit</CardHead>
          <CardContent className="max-h-64 overflow-auto text-[12px]">
            {(operAmends ?? []).slice(0, 15).map((a, i) => (
              <div key={`a${i}`} className="border-t border-border py-1 first:border-0">
                {a.operatorCode} · {a.amendType ?? "Amend"} · {formatSastDateTime(a.amendDate)}
              </div>
            ))}
            {(auditEvents ?? []).slice(0, 10).map((e, i) => (
              <div key={`e${i}`} className="border-t border-border py-1.5 first:border-0">
                {e.programName ? (
                  <ProgramLabel code={e.programName} size="sm" />
                ) : (
                  <span className="text-muted">{e.actionCode ?? "Audit"}</span>
                )}
                <p className="mt-0.5 text-[11px] text-subtle">
                  {e.operatorCode ?? "—"} · {formatSastDateTime(e.eventAt)}
                  {e.detail ? ` · ${e.detail.slice(0, 80)}` : ""}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function LicenseSection({ data }: { data: CustomerDetailPayload }) {
  if (!effectiveCover(data).syspro) {
    return (
      <NoCoverPanel
        service="SYSPRO license"
        hint="No cover — no SYSPRO data for this customer."
      />
    );
  }
  const { license, sysproVersion } = data;
  const code = data.customer.customerCode;
  const buildRaw =
    (sysproVersion?.buildNumber &&
    sysproVersion.buildNumber !== "0" &&
    sysproVersion.buildNumber.toLowerCase() !== "n/a"
      ? sysproVersion.buildNumber
      : null) ||
    data.customer.sysproBuild ||
    null;
  const companyDbs = new Set<string>();
  for (const r of data.sqlHealthRows ?? []) {
    if (r.companyDb) companyDbs.add(r.companyDb);
  }
  for (const r of data.dtrDetailLines ?? []) {
    if (r.companyDb) companyDbs.add(r.companyDb);
  }
  const companies =
    (sysproVersion?.companyCount && sysproVersion.companyCount > 0
      ? sysproVersion.companyCount
      : null) ??
    (license?.companyCount && license.companyCount > 0 ? license.companyCount : null) ??
    (companyDbs.size > 0 ? companyDbs.size : null);
  const build = buildRaw || "—";
  const companiesLabel = companies != null ? String(companies) : "—";

  return (
    <div className="space-y-3">
      <ChartCaption
        title="License & version"
        why="Product, license type, user seats, companies, and expiry from SYSPRO. Hotfix lists live under Hotfix Information."
      />
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
        <StatCard label="Product" value={license?.productName ?? sysproVersion?.productName ?? "—"} />
        <StatCard label="Version" value={license?.productVersion ?? sysproVersion?.productVersion ?? "—"} />
        <StatCard
          label="Build"
          value={build}
          hint={
            buildRaw
              ? "Database / port from AdmSysVersion (or last known collect)"
              : "License file is only the product (e.g. 8.0). Build comes from AdmSysVersion — re-run SYSPRO collect on the agent"
          }
        />
        <StatCard label="Users" value={license?.users ?? sysproVersion?.users ?? "—"} />
        <StatCard
          label="Companies"
          value={companiesLabel}
          hint={
            companies != null
              ? companyDbs.size > 0 && !(sysproVersion?.companyCount && sysproVersion.companyCount > 0)
                ? "From company databases on last FinSight / SQL health collect"
                : undefined
              : "License CompanyCount is 0 — count comes from company DBs after collect"
          }
        />
      </div>
      {sysproVersion || license ? (
        <Card>
          <CardHead>License detail</CardHead>
          <CardContent className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <p>
              <span className="text-subtle">Product </span>
              {sysproVersion?.productName ?? license?.productName ?? "—"}
            </p>
            <p>
              <span className="text-subtle">Version </span>
              <span className="font-semibold">
                {sysproVersion?.productVersion ?? license?.productVersion ?? "—"}
              </span>
            </p>
            <p>
              <span className="text-subtle">Build / DB </span>
              {build}
            </p>
            <p>
              <span className="text-subtle">License type </span>
              {sysproVersion?.licenseType ?? license?.licenseType ?? "—"}
            </p>
            <p>
              <span className="text-subtle">Users </span>
              {sysproVersion?.users ?? license?.users ?? "—"}
            </p>
            <p>
              <span className="text-subtle">Companies </span>
              {companiesLabel}
            </p>
            <p>
              <span className="text-subtle">Server </span>
              {sysproVersion?.serverName ?? data.customer.sqlInstanceName ?? "—"}
            </p>
            <p>
              <span className="text-subtle">Customer name </span>
              {sysproVersion?.customerName ?? license?.customerName ?? "—"}
            </p>
            <p>
              <span className="text-subtle">Expiry </span>
              {license?.licenseExpiry || sysproVersion?.licenseExpiry
                ? formatSastDate(license?.licenseExpiry ?? sysproVersion?.licenseExpiry)
                : "—"}
            </p>
            <p>
              <span className="text-subtle">Last import </span>
              {sysproVersion?.importDate
                ? formatSastDateTime(sysproVersion.importDate)
                : license?.importDate
                  ? formatSastDateTime(license.importDate)
                  : "—"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted">
          No license/version row yet — run SystemLicense / version collect on the customer server.
        </p>
      )}
      <p className="text-sm text-muted">
        Installed hotfixes and gap analysis:{" "}
        <SpaLink
          href={`/customers/${encodeURIComponent(code)}/syspro/hotfixes`}
          className="font-medium text-accent hover:underline"
        >
          Hotfix Information
        </SpaLink>
      </p>
    </div>
  );
}

export function HotfixSection({ data }: { data: CustomerDetailPayload }) {
  if (!effectiveCover(data).syspro) {
    return (
      <NoCoverPanel
        service="SYSPRO hotfixes"
        hint="No cover — no SYSPRO data for this customer."
      />
    );
  }
  const { sysproHotfixes, hotfixGap, hotfixGapSummary, sysproVersion, customer } = data;
  const hfCount = (sysproHotfixes ?? []).length;
  const missingMandatory = hotfixGapSummary?.missingMandatory ?? 0;
  const missingCount = hotfixGapSummary?.missingCount ?? 0;
  const baselineCount = hotfixGapSummary?.baselineCount ?? 0;
  const installedMatch = hotfixGapSummary?.installedMatchCount ?? 0;
  const gapRows = hotfixGap ?? [];
  const missingRows = gapRows.filter((h) => h.isMissing);
  const installedGapRows = gapRows.filter((h) => !h.isMissing);

  return (
    <div className="space-y-3">
      <ChartCaption
        title="Hotfix information"
        why="Installed KBs from SYSPRO Deployment CustomerHotfixes. Gap compares the real catalogue baseline (KB codes, Sample titles excluded) to what is installed on this customer server."
      />
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
        <StatCard
          label="Installed HFs"
          value={hfCount}
          tone={hfCount > 0 ? "green" : "amber"}
          hint="CustomerHotfixes"
        />
        <StatCard
          label="Baseline (real)"
          value={baselineCount || "—"}
          hint="KB codes, no samples"
        />
        <StatCard label="Matched" value={installedMatch || "—"} tone="green" />
        <StatCard
          label="Missing total"
          value={missingCount || (baselineCount ? 0 : "—")}
          tone={missingCount > 0 ? "amber" : "green"}
        />
        <StatCard
          label="Missing mandatory"
          value={missingMandatory || (baselineCount ? 0 : "—")}
          tone={missingMandatory > 0 ? "red" : "green"}
          hint={
            sysproVersion?.productVersion
              ? `SYSPRO ${sysproVersion.productVersion}`
              : customer.displayName
          }
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHead>
            Installed hotfixes
            <Badge variant="muted" className="ml-2">
              {hfCount}
            </Badge>
          </CardHead>
          <CardContent className="max-h-[28rem] overflow-auto p-0">
            {hfCount === 0 ? (
              <p className="p-3 text-muted">
                No installed hotfix rows yet. Run 241 Deployment catalogue (or 227) on the customer
                server.
              </p>
            ) : (
              <table className="w-full text-left text-[12px]">
                <thead className="rpma-table-head sticky top-0">
                  <tr>
                    <th className="px-3 py-2">KB / code</th>
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2">Installed</th>
                  </tr>
                </thead>
                <tbody>
                  {sysproHotfixes!.map((h, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-3 py-1.5 font-semibold whitespace-nowrap">{h.hotfixCode}</td>
                      <td className="px-3 py-1.5 text-muted">
                        {h.hotfixName ?? h.description ?? "—"}
                      </td>
                      <td className="px-3 py-1.5 text-subtle whitespace-nowrap">
                        {h.installedAt ? formatSastDateTime(h.installedAt) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHead>
            Hotfix gap
            {hotfixGapSummary ? (
              <Badge variant={missingMandatory > 0 ? "amber" : "muted"} className="ml-2">
                {missingCount} missing
                {missingMandatory > 0 ? ` · ${missingMandatory} mandatory` : ""}
              </Badge>
            ) : null}
          </CardHead>
          <CardContent className="max-h-[28rem] space-y-1 overflow-auto text-[12px]">
            {gapRows.length === 0 ? (
              <p className="text-muted">
                No gap rows. Run central 371 + customer 241 catalogue collect, then refresh.
              </p>
            ) : (
              <>
                {missingRows.length > 0 ? (
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-subtle">
                    Not installed ({missingRows.length})
                  </p>
                ) : (
                  <p className="text-muted">All listed baseline hotfixes appear installed.</p>
                )}
                {missingRows.map((h, i) => {
                  const mand = (h.severity ?? "").toLowerCase().includes("mandat");
                  return (
                    <div key={`m-${i}`} className="border-t border-border py-1.5 first:border-0">
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="font-semibold">{h.hotfixCode}</span>
                        {mand ? (
                          <Badge variant="amber">Mandatory</Badge>
                        ) : (
                          <Badge variant="muted">Optional</Badge>
                        )}
                        {h.releaseLabel ? (
                          <span className="text-subtle">rel {h.releaseLabel}</span>
                        ) : null}
                      </div>
                      <p className="text-muted">{h.title ?? "—"}</p>
                    </div>
                  );
                })}
                {installedGapRows.length > 0 ? (
                  <>
                    <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-subtle">
                      Installed matches (preview)
                    </p>
                    {installedGapRows.slice(0, 30).map((h, i) => (
                      <div key={`i-${i}`} className="border-t border-border py-1 text-muted">
                        <span className="font-medium text-fg">{h.hotfixCode}</span>
                        {" · "}
                        {h.title ?? "—"}
                        {h.installedAt ? (
                          <span className="text-subtle">
                            {" "}
                            · {formatSastDateTime(h.installedAt)}
                          </span>
                        ) : null}
                      </div>
                    ))}
                  </>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function SqlSection({ data }: { data: CustomerDetailPayload }) {
  if (!effectiveCover(data).syspro) {
    return (
      <NoCoverPanel
        service="SQL backups (SYSPRO host)"
        hint="No cover — no SYSPRO data for this customer."
      />
    );
  }
  const { sqlBackups, sqlBackupFailures, sqlHealthRows } = data;
  const failCount = (sqlBackupFailures ?? []).length;
  const stale = (sqlBackups ?? []).filter(
    (b) => b.fullAgeHours != null && b.fullAgeHours > 36,
  ).length;
  const failedStatus = (sqlBackups ?? []).filter((b) =>
    /fail|error|cancel/i.test(String(b.lastBackupStatus ?? "")),
  ).length;

  return (
    <div className="space-y-3">
      <ChartCaption
        title="SQL backup status"
        why="Last full / differential / log backup times per database (SAST). Failures and overdue fulls need ops attention."
      />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard label="Databases" value={(sqlBackups ?? []).length || "—"} />
        <StatCard
          label="Full > 36h"
          value={stale}
          tone={stale > 0 ? "amber" : "green"}
        />
        <StatCard
          label="Failed status"
          value={failedStatus}
          tone={failedStatus > 0 ? "red" : "green"}
        />
        <StatCard
          label="Job failures"
          value={failCount}
          tone={failCount > 0 ? "red" : "green"}
          hint="msdb history"
        />
      </div>
      <Card>
        <CardHead>Backup status by database</CardHead>
        <CardContent className="overflow-x-auto p-0">
          {(sqlBackups ?? []).length === 0 ? (
            <p className="p-3 text-sm text-muted">
              No backup rows yet. Run SQL backups collect (224) on the customer server. If job
              failures are empty, grant Rpm_collect SELECT on msdb backup tables.
            </p>
          ) : (
            <table className="w-full text-left text-[12px]">
              <thead className="rpma-table-head">
                <tr>
                  <th className="px-3 py-2">Database</th>
                  <th className="px-3 py-2">Last full</th>
                  <th className="px-3 py-2">Last diff</th>
                  <th className="px-3 py-2">Last log</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Full age (h)</th>
                </tr>
              </thead>
              <tbody>
                {(sqlBackups ?? []).map((b, i) => {
                  const bad = /fail|error|cancel/i.test(String(b.lastBackupStatus ?? ""));
                  const old = b.fullAgeHours != null && b.fullAgeHours > 36;
                  return (
                    <tr key={i} className="border-t border-border">
                      <td className="px-3 py-1.5 font-medium">{b.databaseName}</td>
                      <td className="px-3 py-1.5 text-muted whitespace-nowrap">
                        {formatSastDateTime(b.lastFullBackup)}
                      </td>
                      <td className="px-3 py-1.5 text-muted whitespace-nowrap">
                        {formatSastDateTime(b.lastDiffBackup)}
                      </td>
                      <td className="px-3 py-1.5 text-muted whitespace-nowrap">
                        {formatSastDateTime(b.lastLogBackup)}
                      </td>
                      <td className="px-3 py-1.5">
                        {bad ? (
                          <Badge variant="red">{b.lastBackupStatus}</Badge>
                        ) : (
                          (b.lastBackupStatus ?? "—")
                        )}
                      </td>
                      <td
                        className={
                          old
                            ? "px-3 py-1.5 font-mono text-amber-600 dark:text-amber-400"
                            : "px-3 py-1.5 font-mono"
                        }
                      >
                        {b.fullAgeHours ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHead>
          Backup failures
          {failCount > 0 ? (
            <Badge variant="red" className="ml-2">
              {failCount}
            </Badge>
          ) : null}
        </CardHead>
        <CardContent className="space-y-1 text-[12px]">
          {failCount === 0 ? (
            <p className="text-muted">
              No backup job failures on the latest snapshot. (Requires msdb read for
              sysjobhistory — run grant script if collect skipped job history.)
            </p>
          ) : (
            sqlBackupFailures!.slice(0, 40).map((f, i) => (
              <div key={i} className="rounded-md border border-red-500/25 bg-red-500/5 px-2 py-1.5">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-medium text-fg">{f.jobName ?? "Job"}</span>
                  <span className="font-mono text-[11px] text-subtle">
                    {formatSastDateTime(f.failureAt)}
                  </span>
                </div>
                <p className="text-muted">
                  {f.databaseName ?? "—"}
                  {f.stepName ? ` · step ${f.stepName}` : ""}
                </p>
                {f.message ? (
                  <p className="mt-0.5 line-clamp-3 text-[11px] text-subtle">{f.message}</p>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
      {(sqlHealthRows?.length ?? 0) > 0 ? (
        <Card>
          <CardHead>SQL health checks</CardHead>
          <CardContent className="text-[12px]">
            {sqlHealthRows!.slice(0, 20).map((s, i) => (
              <div key={i} className="border-t border-border py-1 first:border-0">
                {s.companyDb} · {s.description ?? s.healthKey} · {s.statusText}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export function IncidentsSection({ data }: { data: CustomerDetailPayload }) {
  const [incidents, setIncidents] = useState<FactIncidentRow[]>(data.incidents ?? []);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [severity, setSeverity] = useState<"Critical" | "High" | "Medium" | "Low">("Medium");
  const [isMajor, setIsMajor] = useState(false);
  const summary = data.amsSlaSummary;

  const open = incidents.filter((i) => !/closed|cancelled/i.test(i.status));
  const recentClosed = incidents.filter((i) => /closed|resolved/i.test(i.status));

  async function createIncident() {
    if (title.trim().length < 3) {
      setMsg("Title needs at least 3 characters");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = (await upsertAmsIncident({
        data: {
          customerCode: data.customer.customerCode,
          title: title.trim(),
          severity,
          status: "New",
          isMajor,
          sourceSystem: "RPM Assure",
          ownerName: "RPM Assure Ops",
        },
      })) as { ok?: boolean; error?: string; incident?: FactIncidentRow };
      if (!res.ok || !res.incident) {
        setMsg(res.error || "Create failed — deploy 313 SQL and ensure Fact_Incident exists");
      } else {
        setIncidents((prev) => [res.incident!, ...prev]);
        setTitle("");
        setIsMajor(false);
        setMsg("Incident opened — SLA clock started");
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function act(inc: FactIncidentRow, action: "respond" | "resolve" | "close" | "reopen") {
    if (!inc.incidentId) {
      setMsg("This incident has no id (demo/legacy row) — cannot transition");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = (await transitionAmsIncident({
        data: { incidentId: inc.incidentId, action, actorName: "Staff" },
      })) as { ok?: boolean; error?: string; incident?: FactIncidentRow };
      if (!res.ok || !res.incident) {
        setMsg(res.error || "Transition failed");
      } else {
        setIncidents((prev) =>
          prev.map((x) => (x.incidentId === res.incident!.incidentId ? res.incident! : x)),
        );
        setMsg(`Incident ${action} recorded — SLA flags updated`);
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function slaBadge(met: boolean | null | undefined, label: string) {
    if (met === true)
      return (
        <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
          {label} met
        </span>
      );
    if (met === false)
      return (
        <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-bold text-red-800 dark:text-red-300">
          {label} breach
        </span>
      );
    return (
      <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-muted">
        {label} open
      </span>
    );
  }

  return (
    <div className="space-y-3">
      <ChartCaption
        title="Customer incidents — Freshdesk + SLA clocks"
        why="Tickets from Freshdesk (mapped companies only) land in Fact_Incident. Response/resolve scored against Dim_SlaPolicy. Manual log still available for Assure-only incidents."
      />

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <StatCard label="Open" value={open.length} tone={open.length > 0 ? "amber" : "green"} />
        <StatCard
          label="Major open"
          value={summary?.majorOpenCount ?? open.filter((i) => i.isMajor).length}
          tone={(summary?.majorOpenCount ?? 0) > 0 ? "red" : "default"}
        />
        <StatCard
          label="Response breach (30d)"
          value={summary?.responseBreach ?? incidents.filter((i) => i.responseSlaMet === false).length}
          tone={(summary?.responseBreach ?? 0) > 0 ? "red" : "green"}
        />
        <StatCard
          label="Resolve breach (30d)"
          value={summary?.resolveBreach ?? incidents.filter((i) => i.resolveSlaMet === false).length}
          tone={(summary?.resolveBreach ?? 0) > 0 ? "red" : "green"}
        />
      </div>

      <Card>
        <CardHead>Ticket register (module data)</CardHead>
        <CardContent className="overflow-x-auto p-0">
          {incidents.length === 0 ? (
            <p className="p-4 text-[12px] text-muted">
              No Freshdesk or Assure incidents for this customer in the last 30 days.
            </p>
          ) : (
            <table className="w-full text-left text-[12px]">
              <thead className="rpma-table-head">
                <tr>
                  <th className="px-2 py-1.5">Ticket</th>
                  <th className="px-2 py-1.5">Subject</th>
                  <th className="px-2 py-1.5">Pri</th>
                  <th className="px-2 py-1.5">Status</th>
                  <th className="px-2 py-1.5">Opened</th>
                  <th className="px-2 py-1.5">Response</th>
                  <th className="px-2 py-1.5">Restore</th>
                  <th className="px-2 py-1.5">Source</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((inc, i) => {
                  const fd = inc.externalRef && /^FD-\d+$/i.test(inc.externalRef)
                    ? inc.externalRef.replace(/^FD-/i, "")
                    : null;
                  return (
                    <tr key={inc.incidentId ?? i} className="border-t border-border">
                      <td className="px-2 py-1.5 font-mono text-[11px] whitespace-nowrap">
                        {fd ? (
                          <a
                            className="text-primary underline-offset-2 hover:underline"
                            href={`https://rpmresourceshelp.freshdesk.com/a/tickets/${fd}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            #{fd}
                          </a>
                        ) : (
                          inc.externalRef || "—"
                        )}
                      </td>
                      <td className="px-2 py-1.5 font-medium text-fg">{inc.title}</td>
                      <td className="px-2 py-1.5">{inc.priority || inc.severity}</td>
                      <td className="px-2 py-1.5">{inc.status}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap">{formatSastDateTime(inc.openedAt)}</td>
                      <td className="px-2 py-1.5">{slaBadge(inc.responseSlaMet, "Ack")}</td>
                      <td className="px-2 py-1.5">{slaBadge(inc.resolveSlaMet, "Restore")}</td>
                      <td className="px-2 py-1.5 text-muted">{inc.sourceSystem || "Assure"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHead>Log incident (starts SLA clock)</CardHead>
        <CardContent className="space-y-2 p-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              placeholder="Incident title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <select
              className="rounded-lg border border-border bg-surface px-2 py-2 text-sm"
              value={severity}
              onChange={(e) => setSeverity(e.target.value as typeof severity)}
            >
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
            <label className="flex items-center gap-1.5 text-[12px] text-muted">
              <input type="checkbox" checked={isMajor} onChange={(e) => setIsMajor(e.target.checked)} />
              Major
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={() => void createIncident()}
              className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-fg disabled:opacity-50"
            >
              Open
            </button>
          </div>
          {msg ? <p className="text-[12px] text-muted">{msg}</p> : null}
        </CardContent>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHead>Open / active incidents</CardHead>
          <CardContent className="space-y-2 p-3">
            {open.length === 0 ? (
              <p className="text-[12px] text-muted">No open incidents on the live feed.</p>
            ) : (
              open.map((inc, i) => (
                <div key={inc.incidentId ?? i} className="rounded-lg border border-border px-3 py-2 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-fg">{inc.title}</p>
                      <p className="text-[11px] text-muted">
                        {inc.severity}
                        {inc.priority && inc.priority !== inc.severity ? ` · P ${inc.priority}` : ""} ·{" "}
                        {inc.status}
                        {inc.isMajor ? " · Major" : ""}
                        {inc.ownerName ? ` · ${inc.ownerName}` : ""}
                        {inc.sourceSystem ? ` · ${inc.sourceSystem}` : ""}
                      </p>
                      <p className="mt-0.5 text-[11px] text-subtle">
                        Opened {formatSastDateTime(inc.openedAt)}
                        {inc.responseMinsElapsed != null
                          ? ` · resp ${inc.responseMinsElapsed}m / ${inc.respondMins ?? "—"}m`
                          : ""}
                        {inc.resolveMinsElapsed != null
                          ? ` · res ${inc.resolveMinsElapsed}m / ${inc.resolveMins ?? "—"}m`
                          : ""}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {slaBadge(inc.responseSlaMet, "Response")}
                        {slaBadge(inc.resolveSlaMet, "Resolve")}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {!inc.firstResponseAt ? (
                        <button
                          type="button"
                          disabled={busy}
                          className="rounded border border-border px-2 py-1 text-[11px] font-semibold hover:bg-surface-2"
                          onClick={() => void act(inc, "respond")}
                        >
                          Log response
                        </button>
                      ) : null}
                      {!/resolved|closed/i.test(inc.status) ? (
                        <button
                          type="button"
                          disabled={busy}
                          className="rounded border border-border px-2 py-1 text-[11px] font-semibold hover:bg-surface-2"
                          onClick={() => void act(inc, "resolve")}
                        >
                          Resolve
                        </button>
                      ) : null}
                      {!/closed/i.test(inc.status) ? (
                        <button
                          type="button"
                          disabled={busy}
                          className="rounded border border-border px-2 py-1 text-[11px] font-semibold hover:bg-surface-2"
                          onClick={() => void act(inc, "close")}
                        >
                          Close
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHead>Problems</CardHead>
          <CardContent className="space-y-2 p-3">
            {(data.problems ?? []).length === 0 ? (
              <p className="text-[12px] text-muted">No open problems on Fact_Problem.</p>
            ) : (
              (data.problems ?? []).map((p, i) => (
                <div key={i} className="rounded-md border border-border px-3 py-2 text-sm">
                  <p className="font-medium">{p.title}</p>
                  <p className="text-[11px] text-muted">
                    {p.severity} · {p.status} · {p.ownerName ?? ""}
                  </p>
                </div>
              ))
            )}
            {recentClosed.length > 0 ? (
              <div className="border-t border-border pt-2">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-subtle">
                  Recent resolved / closed (SLA history)
                </p>
                {recentClosed.slice(0, 8).map((inc, i) => (
                  <div key={inc.incidentId ?? `c${i}`} className="border-t border-border/60 py-1.5 text-[12px] first:border-0">
                    <p className="font-medium text-fg">{inc.title}</p>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {slaBadge(inc.responseSlaMet, "Response")}
                      {slaBadge(inc.resolveSlaMet, "Resolve")}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function RisksSection({ data }: { data: CustomerDetailPayload }) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Card>
        <CardHead>Risks</CardHead>
        <CardContent className="space-y-2">
          {(data.risks ?? []).map((r, i) => (
            <div key={i} className="rounded-md border border-border px-3 py-2 text-sm">
              <div className="flex items-center gap-2">
                <RagBadge rag={(r.rag as "Red" | "Amber" | "Green") || "Amber"} />
                <p className="font-medium">{r.title}</p>
              </div>
              <p className="text-[11px] text-muted">
                {r.status} · {r.ownerName ?? "—"} · target {formatSastDate(r.targetDate)}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHead>Issues & priorities</CardHead>
        <CardContent className="space-y-2">
          {(data.issues ?? []).map((iss, i) => (
            <div key={`i${i}`} className="text-sm">
              <p className="font-medium">{iss.title}</p>
              <p className="text-[11px] text-muted">{iss.status}</p>
            </div>
          ))}
          {(data.priorities ?? []).map((p, i) => (
            <div key={`p${i}`} className="rounded-md border border-border px-2 py-1.5 text-sm">
              <p className="font-medium">{p.title}</p>
              {p.detail ? <p className="text-[11px] text-muted">{p.detail}</p> : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function SlaSection({ data }: { data: CustomerDetailPayload }) {
  return <CustomerSlaTree data={data} />;
}

export function ChangeSection({ data }: { data: CustomerDetailPayload }) {
  const success =
    data.changes.length === 0
      ? null
      : Math.round(
          (data.changes.filter((c) =>
            /success|completed|ok/i.test(`${c.outcome ?? ""} ${c.status}`),
          ).length /
            data.changes.length) *
            100,
        );
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Card>
        <CardHead>
          Change management
          {success != null ? (
            <Badge variant="green" className="ml-2">
              {success}% success
            </Badge>
          ) : null}
        </CardHead>
        <CardContent className="space-y-2 text-sm">
          {data.changes.map((c, i) => (
            <div key={i} className="rounded-md border border-border px-3 py-2">
              <p className="font-medium text-fg">{c.title}</p>
              <p className="text-[11px] text-muted">
                {c.status}
                {c.outcome ? ` · ${c.outcome}` : ""}
                {c.completedAt ? ` · ${formatSastDateTime(c.completedAt)}` : ""}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHead>Customer satisfaction (CSAT)</CardHead>
        <CardContent>
          {data.csat ? (
            <div className="grid grid-cols-2 gap-2">
              <StatCard label="Score" value={data.csat.score} tone="green" hint="/ 5" />
              <StatCard label="Responses" value={data.csat.responseCount ?? "—"} />
              <p className="col-span-2 text-[12px] text-muted">
                Period {formatSastDate(data.csat.periodFrom)} –{" "}
                {formatSastDate(data.csat.periodTo)}
                {data.csat.source ? ` · Source: ${data.csat.source}` : ""}
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted">CSAT will appear when survey feed is linked.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}



function CoveRecentDaysPanel({
  days,
  title = "Last 7 days",
  why = "Daily collect snapshots for backup health and recovery testing (not latest-only).",
}: {
  days?: {
    snapshotDate: string;
    deviceCount: number;
    okCount: number;
    staleCount: number;
    failedCount: number;
    recoveryTestingCount: number;
    standbyImageCount: number;
    testSuccessCount: number;
    testFailedCount: number;
    lastSuccessAny?: string | null;
    lastRecoveryTestAt?: string | null;
  }[];
  title?: string;
  why?: string;
}) {
  const rows = days ?? [];
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface/40 px-3 py-3">
        <ChartCaption title={title} why={why} />
        <p className="text-sm text-muted">
          No multi-day Cove snapshots yet. After daily Cloud Backup collect runs, the last 7 days of backups and recovery tests appear here.
        </p>
      </div>
    );
  }
  const maxDev = Math.max(1, ...rows.map((d) => d.deviceCount || 0));
  return (
    <div className="rounded-xl border border-border bg-surface/50 p-3">
      <ChartCaption title={title} why={why} />
      {/* Stacked day bars: green OK / amber stale / red failed */}
      <div className="mt-3 flex h-24 items-end gap-1.5 sm:gap-2">
        {[...rows].reverse().map((d) => {
          const ok = d.okCount || 0;
          const stale = d.staleCount || 0;
          const failed = d.failedCount || 0;
          const total = Math.max(1, ok + stale + failed);
          const h = Math.max(12, Math.round(((d.deviceCount || total) / maxDev) * 88));
          const okH = Math.round((ok / total) * h);
          const stH = Math.round((stale / total) * h);
          const flH = Math.max(0, h - okH - stH);
          return (
            <div
              key={`bar-${d.snapshotDate}`}
              className="flex min-w-0 flex-1 flex-col items-center gap-1"
              title={`${d.snapshotDate}: OK ${ok} · Stale ${stale} · Failed ${failed}`}
            >
              <div className="flex w-full max-w-[2.25rem] flex-col justify-end overflow-hidden rounded-t-md" style={{ height: h }}>
                {flH > 0 ? <div className="w-full bg-rag-red" style={{ height: flH }} /> : null}
                {stH > 0 ? <div className="w-full bg-rag-amber" style={{ height: stH }} /> : null}
                {okH > 0 ? <div className="w-full bg-rag-green" style={{ height: okH }} /> : null}
              </div>
              <span className="truncate text-[9px] tabular-nums text-muted">
                {formatSastDate(d.snapshotDate).slice(0, 5)}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-1 text-[10px] text-muted">
        Bars = share of OK (green) / stale (amber) / failed (red) per collect day. Age rules: older than 36h stale, older than 72h failed when status blank.
      </p>
      <div className="mt-2 overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wide text-muted">
            <tr>
              <th className="px-3 py-2">Day</th>
              <th className="px-3 py-2">Devices</th>
              <th className="px-3 py-2">OK</th>
              <th className="px-3 py-2">Stale</th>
              <th className="px-3 py-2">Failed</th>
              <th className="px-3 py-2">RT plan</th>
              <th className="px-3 py-2">Standby</th>
              <th className="px-3 py-2">Tests OK</th>
              <th className="px-3 py-2">Tests fail</th>
              <th className="px-3 py-2">Last success</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.snapshotDate} className="border-b border-border/70">
                <td className="px-3 py-2 font-medium tabular-nums">
                  {formatSastDate(d.snapshotDate)}
                </td>
                <td className="px-3 py-2 tabular-nums">{d.deviceCount}</td>
                <td className="px-3 py-2 tabular-nums text-rag-green">{d.okCount}</td>
                <td className="px-3 py-2 tabular-nums text-rag-amber">{d.staleCount}</td>
                <td
                  className={
                    d.failedCount > 0
                      ? "px-3 py-2 tabular-nums font-semibold text-rag-red"
                      : "px-3 py-2 tabular-nums"
                  }
                >
                  {d.failedCount}
                </td>
                <td className="px-3 py-2 tabular-nums">{d.recoveryTestingCount}</td>
                <td className="px-3 py-2 tabular-nums">{d.standbyImageCount}</td>
                <td className="px-3 py-2 tabular-nums text-rag-green">{d.testSuccessCount}</td>
                <td
                  className={
                    d.testFailedCount > 0
                      ? "px-3 py-2 tabular-nums font-semibold text-rag-red"
                      : "px-3 py-2 tabular-nums"
                  }
                >
                  {d.testFailedCount}
                </td>
                <td className="px-3 py-2 text-xs text-muted">
                  {d.lastSuccessAny
                    ? formatSastDateTime(d.lastSuccessAny)
                    : d.lastRecoveryTestAt
                      ? formatSastDateTime(d.lastRecoveryTestAt)
                      : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length < 7 ? (
        <p className="mt-2 text-[11px] text-muted">
          Showing {rows.length} collect day(s) of the last 7 — more appear as daily Cloud Backup collect stores snapshots.
        </p>
      ) : null}
    </div>
  );
}

export function CoveHubSection({ data }: { data: CustomerDetailPayload }) {
  const cover = effectiveCover(data);
  if (!cover.cove) {
    return (
      <NoCoverPanel
        service="RPM Cloud Backup"
        hint="No cover — no RPM Cloud Backup devices mapped for this customer. Map partner and run Cloud Backup collect."
      />
    );
  }
  return (
    <div className="space-y-3">
      <SlaStrip data={data} pillar="cove" />
      <CoveEsrPanel data={data} />
    </div>
  );
}

export function CoveOverviewSection({ data }: { data: CustomerDetailPayload }) {
  if (!effectiveCover(data).cove) {
    return (
      <NoCoverPanel
        service="RPM Cloud Backup overview"
        hint="No cover — no RPM Cloud Backup data for this customer."
      />
    );
  }
  return <CoveHubSection data={data} />;
}

export function EppHubSection({ data }: { data: CustomerDetailPayload }) {
  const cover = effectiveCover(data);
  const epp = data.epp;
  const s = epp?.summary;
  const devices = epp?.devices ?? [];
  const code = data.customer.customerCode;
  if (!cover.epp) {
    return (
      <NoCoverPanel
        service="RPM EndPoint Protection"
        hint={epp?.message || "No cover — no RPM EndPoint Protection endpoints mapped for this customer."}
      />
    );
  }
  const managed = s?.managedCount ?? devices.filter((d) => d.isManaged).length;
  const servers = s?.serverCount ?? 0;
  const workstations = s?.workstationCount ?? 0;
  const incidents = epp?.incidents?.length ?? 0;
  const infected = devices.filter((d) => d.infected || d.malwareDetected).length;
  const outdated = devices.filter((d) => d.productOutdated || d.signatureOutdated).length;
  const fdTickets = ticketStats(ticketsForPillar(data.incidents, "epp"));
  return (
    <div className="space-y-3">
    <SlaStrip data={data} pillar="epp" />
    <ServiceVisuals
      title="RPM EndPoint Protection"
      subtitle={data.customer.displayName}
      kpis={[
        { label: "Endpoints", value: s?.deviceCount ?? devices.length },
        { label: "Managed", value: managed, tone: "green" },
        { label: "Infected", value: infected, tone: infected > 0 ? "red" : "green" },
        { label: "Tickets", value: fdTickets.total, tone: fdTickets.open > 0 ? "amber" : "green" },
      ]}
      pie={[
        { name: "Managed", value: managed, fill: "#17c666" },
        { name: "Other", value: Math.max(0, (s?.deviceCount ?? devices.length) - managed), fill: "#5c6570" },
      ]}
      bars={[
        { name: "Servers", value: servers, fill: "#4f46e0" },
        { name: "Workstations", value: workstations, fill: "#17c666" },
        { name: "Incidents", value: incidents, fill: "#ea4d4d" },
      ]}
      tiles={[
        { label: "Endpoints", href: `/customers/${code}/epp/endpoints`, n: s?.deviceCount ?? devices.length, hint: "Fleet" },
        { label: "Policies", href: `/customers/${code}/epp/modules`, n: "Open", hint: "Policy" },
        { label: "Security Incidents", href: `/customers/${code}/epp/incidents`, n: incidents, hint: "Open" },
        { label: "Quarantine", href: `/customers/${code}/epp/quarantine`, n: epp?.quarantine?.length ?? 0, hint: "Items" },
      ]}
    />
    </div>
  );
}

function formatCoveBytes(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  const digits = i >= 3 ? 2 : i >= 2 ? 1 : 0;
  return `${v.toFixed(digits)} ${units[i]}`;
}

function formatRecoveryTestStatus(
  status: string | null | undefined,
  lastTest: string | null | undefined,
): string {
  const s = (status || "").trim();
  if (!s || s === "Unknown") {
    // Prefer honest labels over perpetual "Unknown"
    return lastTest ? "Result not reported" : "No test recorded";
  }
  if (s === "NotInPlan") return "Not in plan";
  if (s === "NotStarted") return lastTest ? "In plan" : "In plan";
  if (s === "InProgress") return "In progress";
  if (s === "Success" || s === "Passed" || s === "OK") return "Success";
  if (s === "Failed" || s === "Fail" || s === "Error") return "Failed";
  return s;
}

export function CoveDevicesSection({ data }: { data: CustomerDetailPayload }) {
  const devices = data.cove?.devices ?? [];
  const [sel, setSel] = useState(0);
  const totalUsed = devices.reduce(
    (sum, d) => {
      const n = d.usedBytes ?? d.selectedBytes;
      return sum + (n != null && Number.isFinite(n) ? n : 0);
    },
    0,
  );
  const sizedCount = devices.filter((d) => (d.usedBytes ?? d.selectedBytes ?? 0) > 0).length;
  if (!effectiveCover(data).cove) {
    return (
      <NoCoverPanel
        service="Devices on Cloud Backup"
        hint="No cover — no RPM Cloud Backup data for this customer."
      />
    );
  }
  return (
    <div className="space-y-4">
      <ChartCaption
        title="Devices on Cloud Backup"
        why="Devices protected by RPM Cloud Backup — health, last success, and backup size from the latest Cloud Backup collect."
      />
      {devices.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Devices" value={devices.length} />
          <StatCard label="Total backup size" value={formatCoveBytes(totalUsed)} />
          <StatCard label="With size reported" value={sizedCount} />
          <StatCard
            label="Failed / overdue"
            value={devices.filter((d) => {
              const st = (d.lastBackupStatus || "").toLowerCase();
              return st.includes("fail") || st.includes("error") || st.includes("overdue");
            }).length}
            tone="red"
          />
        </div>
      ) : null}
      <CoveRecentDaysPanel
        days={data.cove?.recentDays}
        title="Recent backups (last 7 days)"
        why="Daily backup OK / stale / failed counts from Cloud Backup collect snapshots."
      />
      {devices.length === 0 ? (
        <p className="text-sm text-muted">
          {data.cove?.message ||
            "No Cloud Backup devices on latest snapshot. Map the N-Able partner to this CustomerCode and re-collect."}
        </p>
      ) : (
        <StickyPickSplit
          title="Devices"
          items={devices.map((d, i) => ({
            id: String(i),
            label: d.deviceName ?? d.machineName ?? `Device ${i + 1}`,
            meta: d.lastBackupStatus || "—",
            tone: /fail|error|overdue/i.test(String(d.lastBackupStatus ?? "")) ? "red" : "green",
          }))}
          selected={String(Math.min(sel, Math.max(0, devices.length - 1)))}
          onSelect={(id) => setSel(Number(id))}
        >
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2">Device</th>
                <th className="px-3 py-2">Partner</th>
                <th className="px-3 py-2">Backup health</th>
                <th className="px-3 py-2">Backup size</th>
                <th className="px-3 py-2">Backup time</th>
                <th className="px-3 py-2">Retention policy</th>
                <th className="px-3 py-2">Last success</th>
                <th className="px-3 py-2">Recovery plan</th>
                <th className="px-3 py-2">Test status</th>
                <th className="px-3 py-2">Last recovery test</th>
                <th className="px-3 py-2">Verification</th>
              </tr>
            </thead>
            <tbody>
              {devices.filter((_, i) => i === sel).map((d, i) => {
                const st = (d.lastBackupStatus || "").toLowerCase();
                let health: "ok" | "stale" | "failed" = "ok";
                if (st.includes("fail") || st.includes("error") || st.includes("overdue") || st.includes("abort"))
                  health = "failed";
                else if (st.includes("stale") || st.includes("warn") || st.includes("miss")) health = "stale";
                else if (d.lastSuccessTime) {
                  const ageH = (Date.now() - Date.parse(d.lastSuccessTime)) / 3_600_000;
                  if (ageH > 72) health = "failed";
                  else if (ageH > 36) health = "stale";
                } else if (!d.lastSuccessTime) {
                  health = "failed";
                }
                const healthLabel =
                  health === "failed" ? "Failed / overdue" : health === "stale" ? "Stale" : d.lastBackupStatus || "OK";
                return (
                <tr key={`${d.accountId}-${i}`} className="border-b border-border/70">
                  <td className="px-3 py-2 font-medium">{d.deviceName ?? d.machineName ?? "—"}</td>
                  <td className="px-3 py-2 text-muted">{d.partnerName ?? "—"}</td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        health === "failed"
                          ? "font-semibold text-rag-red"
                          : health === "stale"
                            ? "font-semibold text-rag-amber"
                            : "font-semibold text-rag-green"
                      }
                    >
                      {healthLabel}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs tabular-nums text-muted">
                    {formatCoveBytes(d.usedBytes ?? d.selectedBytes)}
                  </td>
                  <td className="px-3 py-2 text-xs tabular-nums text-muted">
                    {d.backupDurationSec == null
                      ? "—"
                      : d.backupDurationSec < 60
                        ? "< 1 min"
                        : d.backupDurationSec < 3600
                          ? `${Math.round(d.backupDurationSec / 60)} min`
                          : `${(d.backupDurationSec / 3600).toFixed(1)} h`}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted" title={d.profileName || undefined}>
                    {d.retentionPolicy || "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted">
                    {d.lastSuccessTime ? formatSastDateTime(d.lastSuccessTime) : "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted">
                    {d.recoveryPlanLabel ||
                      (d.recoveryPlanType === 1
                        ? "Recovery Testing"
                        : d.recoveryPlanType === 2
                          ? "Standby Image"
                          : "—")}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <span
                      className={
                        d.recoveryTestStatus === "Success"
                          ? "font-semibold text-rag-green"
                          : d.recoveryTestStatus === "Failed"
                            ? "font-semibold text-rag-red"
                            : d.recoveryTestStatus === "InProgress"
                              ? "font-semibold text-rag-amber"
                              : "text-muted"
                      }
                    >
                      {formatRecoveryTestStatus(d.recoveryTestStatus, d.lastRecoveryTestAt)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted">
                    {d.lastRecoveryTestAt ? formatSastDateTime(d.lastRecoveryTestAt) : "—"}
                  </td>
                  <td
                    className="max-w-[200px] truncate px-3 py-2 text-xs text-muted"
                    title={d.recoveryVerification || undefined}
                  >
                    {d.recoveryVerification || "—"}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </StickyPickSplit>
      )}
    </div>
  );
}

export function CoveRecoverySection({ data }: { data: CustomerDetailPayload }) {
  if (!effectiveCover(data).cove) {
    return (
      <NoCoverPanel
        service="Backup Recovery Testing"
        hint="No cover — no RPM Cloud Backup data for this customer."
      />
    );
  }
  const rec = data.cove?.recovery ?? data.cove?.summary?.recovery ?? null;
  const recentDays = data.cove?.recentDays ?? [];
  const history = data.cove?.recoveryHistory ?? [];
  const isRecoveryRow = (d: {
    recoveryPlanType?: number | null;
    recoveryTestStatus?: string | null;
    lastRecoveryTestAt?: string | null;
  }) => {
    const plan = d.recoveryPlanType ?? 0;
    const st = (d.recoveryTestStatus || "").toLowerCase();
    if (st === "notinplan" && plan === 0 && !d.lastRecoveryTestAt) return false;
    return (
      plan > 0 ||
      Boolean(d.lastRecoveryTestAt) ||
      ["success", "failed", "inprogress", "notstarted", "unknown"].includes(st)
    );
  };
  const devicesLatest = (data.cove?.devices ?? []).filter(isRecoveryRow);
  const historyRows = history.filter(isRecoveryRow);
  const latestOf = (
    rows: typeof devicesLatest,
  ): typeof devicesLatest => {
    const seen = new Set<string>();
    const out: typeof devicesLatest = [];
    for (const d of rows) {
      const k = String(d.accountId || d.deviceName || d.machineName || "");
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(d);
    }
    return out;
  };
  // One row per device (latest snapshot). 7 collect days ≠ 7 recovery tests.
  const devices = latestOf(historyRows.length > 0 ? historyRows : devicesLatest);
  return (
    <div className="space-y-4">
      <ChartCaption
        title="Backup Recovery Testing"
        why="Devices on a Recovery Testing or Standby Image plan (I80). Last test time only appears when the statistics API publishes RVO/RVL — the Cove console Continuity report can show tests that are not on this feed."
      />
      {rec ? (
        <>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Recovery Testing plan" value={rec.recoveryTestingCount} />
            <StatCard label="Standby Image plan" value={rec.standbyImageCount} />
            <StatCard
              label="Verification success"
              value={rec.testSuccessCount}
              tone={rec.testSuccessCount > 0 ? "green" : "default"}
            />
            <StatCard
              label="Verification failed"
              value={rec.testFailedCount}
              tone={rec.testFailedCount > 0 ? "red" : "default"}
            />
          </div>
          {rec.lastRecoveryTestAt ? (
            <p className="text-[12px] text-muted">
              Most recent VDR restore session:{" "}
              <span className="font-medium text-fg">
                {formatSastDateTime(rec.lastRecoveryTestAt)}
              </span>
            </p>
          ) : (
            <p className="text-[12px] text-muted">
              On plan. Last test time is not on the statistics API (RVO/RVL empty). Tests you see in the
              Cove console Recovery Testing report are Continuity sessions — re-run collect after the
              next pack if we add a Continuity method.
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-muted">
          No recovery summary yet. Apply SQL 436 and re-run Cloud Backup collect so I80 + RV* are stored.
        </p>
      )}
      <CoveRecentDaysPanel
        days={recentDays}
        title="Backup Recovery Testing — last 7 days"
        why="Daily count of devices on a Recovery Testing / Standby Image plan (collect snapshots). This is plan membership, not a test-run log."
      />

      {devices.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted">
          No devices with a Recovery Testing or Standby Image plan in the last 7 days (or latest snapshot).
          Enable Recovery Testing in Cove Continuity, apply SQL 436, re-run Collect-Cove-To-RPMAssure.ps1,
          then hard-refresh. Check log for "Recovery sample I80=".
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2">As of</th>
                <th className="px-3 py-2">Device</th>
                <th className="px-3 py-2">Plan</th>
                <th className="px-3 py-2">Test status</th>
                <th className="px-3 py-2">Last test</th>
                <th className="px-3 py-2">Physicality</th>
                <th className="px-3 py-2">Verification detail</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((d, i) => (
                <tr key={`rt-${d.snapshotDate ?? ""}-${d.accountId}-${i}`} className="border-b border-border/70">
                  <td className="px-3 py-2 text-xs tabular-nums text-muted">
                    {d.snapshotDate ? formatSastDate(d.snapshotDate) : "—"}
                  </td>
                  <td className="px-3 py-2 font-medium">
                    {d.deviceName ?? d.machineName ?? d.accountId ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-muted">
                    {d.recoveryPlanLabel || "—"}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        d.recoveryTestStatus === "Success"
                          ? "font-semibold text-rag-green"
                          : d.recoveryTestStatus === "Failed"
                            ? "font-semibold text-rag-red"
                            : d.recoveryTestStatus === "InProgress"
                              ? "font-semibold text-rag-amber"
                              : "text-muted"
                      }
                    >
                      {formatRecoveryTestStatus(d.recoveryTestStatus, d.lastRecoveryTestAt)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted">
                    {d.lastRecoveryTestAt
                      ? formatSastDateTime(d.lastRecoveryTestAt)
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-muted">{d.physicality || "—"}</td>
                  <td
                    className="max-w-[280px] truncate px-3 py-2 text-xs text-muted"
                    title={d.recoveryVerification || undefined}
                  >
                    {d.recoveryVerification || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


function formatRetentionPeriod(v: string | null | undefined): string {
  if (v == null || String(v).trim() === "") return "—";
  const s = String(v).trim();
  // Numeric days from API
  const n = Number(s);
  if (Number.isFinite(n) && String(n) === s) {
    if (n <= 0) return "—";
    if (n % 365 === 0) return `${n / 365} year${n / 365 === 1 ? "" : "s"}`;
    if (n % 30 === 0 && n >= 30) return `${n / 30} month${n / 30 === 1 ? "" : "s"}`;
    return `${n} day${n === 1 ? "" : "s"}`;
  }
  return s;
}

export function CoveRetentionSection({ data }: { data: CustomerDetailPayload }) {
  if (!effectiveCover(data).cove) {
    return (
      <NoCoverPanel
        service="Retention policies"
        hint="No cover — no RPM Cloud Backup data for this customer."
      />
    );
  }
  const devices = data.cove?.devices ?? [];
  const policyCounts = new Map<string, number>();
  for (const d of devices) {
    const k = (d.retentionPolicy || "").trim() || "(not reported)";
    policyCounts.set(k, (policyCounts.get(k) || 0) + 1);
  }
  const policies = [...policyCounts.entries()].sort((a, b) => b[1] - a[1]);
  const withPolicy = devices.filter((d) => (d.retentionPolicy || "").trim()).length;

  return (
    <div className="space-y-4">
      <ChartCaption
        title="Retention policies"
        why="Cove Retention Policy (PN) and Profile (OP) per device, plus per-source retention periods (files, system state, Hyper-V, SQL, VMware, network)."
      />
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Devices" value={devices.length} />
        <StatCard label="With policy name" value={withPolicy} />
        <StatCard label="Distinct policies" value={policies.filter(([k]) => k !== "(not reported)").length} />
        {/* COVE-RETENTION-UI-20260812 */}
        <StatCard
          label="Total backup size"
          value={formatCoveBytes(
            devices.reduce(
              (s, d) => {
                const n = d.usedBytes ?? d.selectedBytes;
                return s + (n != null && Number.isFinite(n) ? n : 0);
              },
              0,
            ),
          )}
        />
      </div>
      {devices.length > 0 && withPolicy === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-3 text-sm text-muted">
          Devices are loaded but retention policy names are empty. Apply SQL 438, re-run Cloud Backup collect
          (log should show Retention sample PN=), then rebuild/restart the app so the data layer maps PN/OP/FR.
        </p>
      ) : null}


      {policies.length > 0 ? (
        <div className="rounded-xl border border-border bg-surface/50 p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
            Policy distribution
          </p>
          <div className="flex flex-wrap gap-2">
            {policies.map(([name, cnt]) => (
              <span
                key={name}
                className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs text-fg"
              >
                <span className="font-medium">{name}</span>
                <span className="ml-1.5 text-muted">×{cnt}</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {devices.length === 0 ? (
        <p className="text-sm text-muted">
          {data.cove?.message ||
            "No Cloud Backup devices on latest snapshot. Run Cloud Backup collect after applying SQL 438."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2">Device</th>
                <th className="px-3 py-2">Retention policy</th>
                <th className="px-3 py-2">Profile</th>
                <th className="px-3 py-2">Files</th>
                <th className="px-3 py-2">System state</th>
                <th className="px-3 py-2">Hyper-V</th>
                <th className="px-3 py-2">SQL</th>
                <th className="px-3 py-2">VMware</th>
                <th className="px-3 py-2">Network</th>
                <th className="px-3 py-2">Backup size</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((d, i) => (
                <tr key={`ret-${d.accountId}-${i}`} className="border-b border-border/70">
                  <td className="px-3 py-2 font-medium">
                    {d.deviceName ?? d.machineName ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {d.retentionPolicy ? (
                      <span className="font-semibold text-fg">{d.retentionPolicy}</span>
                    ) : (
                      <span className="text-muted">Not reported</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted">{d.profileName || "—"}</td>
                  <td className="px-3 py-2 text-xs tabular-nums text-muted">
                    {formatRetentionPeriod(d.retentionFiles)}
                  </td>
                  <td className="px-3 py-2 text-xs tabular-nums text-muted">
                    {formatRetentionPeriod(d.retentionSystemState)}
                  </td>
                  <td className="px-3 py-2 text-xs tabular-nums text-muted">
                    {formatRetentionPeriod(d.retentionHyperV)}
                  </td>
                  <td className="px-3 py-2 text-xs tabular-nums text-muted">
                    {formatRetentionPeriod(d.retentionSql)}
                  </td>
                  <td className="px-3 py-2 text-xs tabular-nums text-muted">
                    {formatRetentionPeriod(d.retentionVmware)}
                  </td>
                  <td className="px-3 py-2 text-xs tabular-nums text-muted">
                    {formatRetentionPeriod(d.retentionNetwork)}
                  </td>
                  <td className="px-3 py-2 text-xs tabular-nums text-muted">
                    {formatCoveBytes(d.usedBytes ?? d.selectedBytes)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[12px] text-muted">
        Values come from Cove EnumerateAccountStatistics (PN / OP / FR / SR / HR / ZR / WR / NR).
        Re-run Cloud Backup collect after SQL 438 so columns populate. Blank cells mean that data source is
        not in use or the API did not return a period for the device.
      </p>
    </div>
  );
}

export function CoveMappingSection({ data }: { data: CustomerDetailPayload }) {
  const maps = data.cove?.mapping ?? [];
  const unmapped = data.cove?.unmapped ?? [];
  return (
    <div className="space-y-4">
      <ChartCaption
        title="Cove partner mapping"
        why="Maps Cove partner → CustomerCode so devices land on the right estate row. Estate-wide unmapped partners (need alias) listed below."
      />
      {unmapped.length > 0 ? (
        <div className="rounded-lg border border-rag-amber/40 bg-rag-amber/10 px-3 py-2 text-sm">
          <p className="font-semibold text-fg">{unmapped.length} unmapped partner(s) on latest estate snap</p>
          <ul className="mt-1 max-h-28 list-inside list-disc overflow-y-auto text-[12px] text-muted">
            {unmapped.slice(0, 20).map((u) => (
              <li key={u.partnerName}>
                {u.partnerName}
                {u.deviceCount ? ` · ${u.deviceCount} device(s)` : ""}
              </li>
            ))}
          </ul>
          <p className="mt-1 text-[11px] text-muted">
            Run EnumeratePartners auto-map or add Dim_Cove_PartnerAlias then re-collect.
          </p>
        </div>
      ) : null}
      {maps.length === 0 ? (
        <p className="text-sm text-muted">No partner map rows for this customer.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {maps.map((m) => (
            <li key={m.partnerName} className="rounded-lg border border-border px-3 py-2">
              <span className="font-medium">{m.partnerName}</span>
              <span className="ml-2 text-muted">{m.active ? "Active" : "Inactive"}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


/* ========== Microsoft 365 Tenant (CSP) ========== */

export function CspTenantHealthSection({ data }: { data: CustomerDetailPayload }) {
  const cover = effectiveCover(data);
  if (!cover.csp) {
    return (
      <NoCoverPanel
        service={M365_PRODUCT}
        hint="No cover — no Microsoft 365 tenant data mapped for this customer yet. Apply CSP collect (seed or Graph) and map TenantId → CustomerCode."
      />
    );
  }
  const csp = data.csp;
  const t = csp?.tenant;
  const s = csp?.summary;
  const p = csp?.posture;
  const total = s?.totalSeats ?? 0;
  const assigned = s?.assignedSeats ?? 0;
  const util = m365UtilPct(assigned, total);
  const health = t?.healthScore;
  const healthTone =
    health == null ? undefined : health >= 90 ? "green" : health >= 70 ? "amber" : "red";
  const scorePct = p?.secureScorePct;
  const scoreTone =
    scorePct == null
      ? undefined
      : scorePct >= 70
        ? "green"
        : scorePct >= 50
          ? "amber"
          : "red";
  const mfaPct = p?.mfaRegisteredPct;
  const mfaTone =
    mfaPct == null ? undefined : mfaPct >= 90 ? "green" : mfaPct >= 70 ? "amber" : "red";
  const ga = p?.globalAdminCount;
  const gaTone = ga == null ? undefined : ga <= 2 ? "green" : ga <= 5 ? "amber" : "red";

  return (
    <div className="space-y-4">
      <SlaStrip data={data} pillar="csp" />
      <ServiceVisuals
        title="Microsoft 365 CSP"
        subtitle={t?.displayName || t?.primaryDomain || data.customer.displayName}
        kpis={[
          { label: "Secure Score", value: scorePct != null ? `${Math.round(scorePct)}%` : "—", tone: scoreTone },
          { label: "MFA", value: mfaPct != null ? `${mfaPct}%` : "—", tone: mfaTone },
          { label: "Global Admins", value: ga ?? csp?.globalAdmins?.length ?? "—", tone: gaTone },
        ]}
        pie={[
          { name: "Assigned Seats", value: assigned, fill: "#4f46e0" },
          { name: "Unassigned", value: Math.max(0, total - assigned), fill: "#5c6570" },
        ]}
        bars={[
          { name: "Health", value: health ?? 0, fill: "#17c666" },
          { name: "Secure Score", value: Math.round(scorePct ?? 0), fill: "#4f46e0" },
          { name: "MFA", value: Math.round(mfaPct ?? 0), fill: "#ffa21d" },
        ]}
        tiles={[
          { label: "Secure Score", href: `/customers/${data.customer.customerCode}/csp/secure-score`, n: scorePct != null ? `${Math.round(scorePct)}%` : "—", hint: "Posture" },
          { label: "Global Admins", href: `/customers/${data.customer.customerCode}/csp/global-admins`, n: ga ?? "—", hint: "Privileged" },
          { label: "MFA", href: `/customers/${data.customer.customerCode}/csp/mfa`, n: mfaPct != null ? `${mfaPct}%` : "—", hint: "Registered" },
          { label: "Licences", href: `/customers/${data.customer.customerCode}/csp/licenses`, n: assigned, hint: "Assigned" },
        ]}
      />
      <ChartCaption title={M365_PAGES.health.title} why={M365_PAGES.health.why} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Tenant health"
          value={health != null ? `${health}` : "—"}
          tone={healthTone}
          tip="Microsoft service health score (0–100)"
        />
        <StatCard
          label="Secure Score"
          value={
            scorePct != null
              ? `${Number(scorePct).toFixed(scorePct % 1 === 0 ? 0 : 1)}%`
              : p?.secureScore != null
                ? String(p.secureScore)
                : "—"
          }
          tone={scoreTone}
          tip={
            p?.secureScore != null && p?.secureScoreMax != null
              ? `Microsoft Secure Score ${p.secureScore} / ${p.secureScoreMax}`
              : "Microsoft Secure Score (current vs max). Needs SecurityEvents.Read.All on the Graph app."
          }
        />
        <StatCard
          label="MFA registered"
          value={mfaPct != null ? `${mfaPct}%` : "—"}
          tone={mfaTone}
          tip={
            p?.mfaRegisteredCount != null && p?.mfaCapableCount != null
              ? `${p.mfaRegisteredCount} of ${p.mfaCapableCount} users registered MFA`
              : "Share of users with MFA methods registered (AuditLog.Read.All)"
          }
        />
        <StatCard
          label="Global Admins"
          value={
            ga != null
              ? String(ga)
              : (csp?.globalAdmins?.length ?? 0) > 0
                ? String(csp?.globalAdmins?.length)
                : "—"
          }
          tone={gaTone}
          tip={
            p?.globalAdminNames
              ? p.globalAdminNames
              : "Directory role Global Administrator members. Prefer 2 break-glass accounts only."
          }
        />
      </div>
      {/* Collect / Secure Score strip — always visible when on cover */}
      <Card className="border-accent/30 bg-accent/5">
        <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-2 p-4 text-sm">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              Secure Score (detail)
            </p>
            <p className="mt-0.5 font-mono text-lg font-bold tabular-nums text-fg">
              {scorePct != null
                ? `${Number(scorePct).toFixed(scorePct % 1 === 0 ? 0 : 1)}%`
                : "—"}
              {p?.secureScore != null && p?.secureScoreMax != null ? (
                <span className="ml-2 text-sm font-medium text-muted">
                  ({p.secureScore} / {p.secureScoreMax})
                </span>
              ) : null}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              Last Graph collect
            </p>
            <p className="mt-0.5 font-medium text-fg">
              {s?.lastImportAt
                ? formatSastDateTime(s.lastImportAt)
                : data.customer.cspLastImportAt
                  ? formatSastDateTime(data.customer.cspLastImportAt)
                  : t?.lastSyncAt
                    ? formatSastDateTime(t.lastSyncAt)
                    : "—"}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              Posture snapshot
            </p>
            <p className="mt-0.5 font-medium text-fg">
              {p?.asOfDate
                ? formatSastDate(p.asOfDate)
                : s?.asOfDate
                  ? formatSastDate(s.asOfDate)
                  : "—"}
            </p>
          </div>
          <div className="min-w-[12rem] flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              Collect notes
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {p?.notes ||
                csp?.message ||
                "Graph collect OK — Secure Score from security/secureScores"}
            </p>
          </div>
        </CardContent>
      </Card>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Open service issues"
          value={String(t?.openIncidents ?? 0)}
          tone={(t?.openIncidents ?? 0) > 0 ? "amber" : "green"}
          tip="Microsoft service health incidents (when polled)"
        />
        <StatCard
          label="Directory users"
          value={String(s?.licensedUserCount ?? csp?.users?.length ?? 0)}
          tip="Users on latest collect snapshot"
        />
        <StatCard
          label="Seat utilisation"
          value={util != null ? m365UtilLabel(util) : s ? `${assigned} / ${total}` : "—"}
          tip="Assigned seats ÷ purchased seats across all SKUs"
        />
        <StatCard
          label="Guests / failed sign-ins (7d)"
          value={
            p
              ? `${p.guestUserCount ?? 0} / ${
                  p.failedSignInCount7d == null
                    ? "—"
                    : p.failedSignInCount7d >= 51
                      ? "50+"
                      : p.failedSignInCount7d
                }`
              : "—"
          }
          tone={
            (p?.failedSignInCount7d ?? 0) > 20 || (p?.guestUserCount ?? 0) > 10
              ? "amber"
              : "green"
          }
          tip="Guest users in directory · failed sign-ins sampled last 7 days (not a full dump)"
        />
      </div>
      <Card>
        <CardHead>Tenant identity</CardHead>
        <CardContent className="space-y-2 p-4 text-sm">
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted">Display name</p>
              <p className="font-medium text-fg">{t?.displayName ?? data.customer.displayName}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted">Primary domain</p>
              <p className="font-medium text-fg">
                {t?.primaryDomain ?? data.customer.cspPrimaryDomain ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted">Tenant ID</p>
              <p className="break-all font-mono text-xs text-fg">{t?.tenantId ?? "—"}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted">Country / region</p>
              <p className="text-fg">{t?.country ?? "—"}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted">Last sync</p>
              <p className="text-fg">
                {t?.lastSyncAt ? formatSastDateTime(t.lastSyncAt) : "—"}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted">SKU products</p>
              <p className="text-fg">{s?.skuCount ?? csp?.licenses?.length ?? 0}</p>
            </div>
            {p?.disabledLicensedCount != null && p.disabledLicensedCount > 0 ? (
              <div className="sm:col-span-2">
                <p className="text-[11px] uppercase tracking-wide text-muted">
                  Disabled accounts still licensed
                </p>
                <p className="font-medium text-rag-amber">{p.disabledLicensedCount}</p>
              </div>
            ) : null}
          </div>
          {csp?.message ? (
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">{csp.message}</p>
          ) : (
            <p className="mt-2 text-xs text-muted">
              {M365_TAGLINE}
              {p?.notes ? ` · ${p.notes}` : ""}
            </p>
          )}
        </CardContent>
      </Card>
      {((csp?.globalAdmins?.length ?? 0) > 0 || p?.globalAdminNames) ? (
        <Card>
          <CardHead>
            Global Administrators
            <span className="ml-2 text-[11px] font-normal normal-case tracking-normal text-muted">
              {ga != null ? ga : csp?.globalAdmins?.length ?? 0} account(s)
            </span>
          </CardHead>
          <CardContent className="p-0">
            {(csp?.globalAdmins?.length ?? 0) > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[28rem] text-left text-[12px]">
                  <thead className="bg-muted/40 text-[10px] font-semibold uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-3 py-2">Display name</th>
                      <th className="px-3 py-2">UPN / sign-in</th>
                      <th className="px-3 py-2">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(csp?.globalAdmins ?? []).map((a) => (
                      <tr
                        key={a.objectId}
                        className="border-t border-border/70"
                      >
                        <td className="px-3 py-2 font-medium text-fg">
                          {a.displayName ?? "—"}
                        </td>
                        <td className="px-3 py-2 font-mono text-[11px] text-fg">
                          {a.userPrincipalName ?? a.mail ?? a.objectId}
                        </td>
                        <td className="px-3 py-2 text-muted">
                          {a.principalType ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="p-4 text-sm text-muted">
                {p?.globalAdminNames
                  ? p.globalAdminNames.split(";").map((n) => n.trim()).filter(Boolean).join(" · ")
                  : "No Global Admin names on latest collect."}
              </p>
            )}
            <p className="border-t border-border/60 px-4 py-2 text-[11px] text-muted">
              Prefer two break-glass Global Admins only. Re-run Graph collect after granting RoleManagement.Read.Directory if the list is empty.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-4 text-sm text-muted">
            Global Admin list not collected yet for this tenant. After deploy, re-run Graph collect (needs Directory.Read.All or RoleManagement.Read.Directory).
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHead>Microsoft 365 modules</CardHead>
        <CardContent className="flex flex-wrap gap-2 p-4 text-[12px]">
          {(
            [
              ["secure-score", "Secure Score"],
              ["global-admins", "Global Admins"],
              ["mfa", "MFA registration"],
              ["users", "Licensed users"],
              ["licenses", "License stats"],
            ] as const
          ).map(([path, label]) => (
            <SpaLink
              key={path}
              href={`/customers/${data.customer.customerCode}/csp/${path}`}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/20 px-3 py-1.5 font-medium text-accent transition hover:border-accent/50 hover:bg-accent/10"
            >
              {label} <ChevronRight className="h-3 w-3" />
            </SpaLink>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function CspLicensesSection({ data }: { data: CustomerDetailPayload }) {
  const cover = effectiveCover(data);
  if (!cover.csp) {
    return (
      <NoCoverPanel
        service={M365_PRODUCT}
        hint="No cover — license stats not available until Microsoft 365 is on cover for this customer."
      />
    );
  }
  const rows = data.csp?.licenses ?? [];
  const s = data.csp?.summary;
  const total = s?.totalSeats ?? 0;
  const assigned = s?.assignedSeats ?? 0;
  const unused = s?.unusedSeats ?? Math.max(0, total - assigned);
  const util = m365UtilPct(assigned, total);

  return (
    <div className="space-y-4">
      <ChartCaption title={M365_PAGES.licenses.title} why={M365_PAGES.licenses.why} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Purchased seats" value={String(total)} tip="Sum of prepaid units across SKUs" />
        <StatCard label="Assigned seats" value={String(assigned)} tip="Consumed / assigned units" />
        <StatCard
          label="Unused seats"
          value={String(unused)}
          tone={unused > 0 && util != null && util < 70 ? "amber" : "green"}
          tip="Purchased minus assigned"
        />
        <StatCard
          label="Utilisation"
          value={util != null ? `${util}%` : "—"}
          tone={util == null ? undefined : util >= 95 ? "amber" : util >= 40 ? "green" : "amber"}
          tip={m365UtilLabel(util)}
        />
      </div>
      <Card>
        <CardHead>
          Products & SKUs ({rows.length})
        </CardHead>
        <CardContent className="overflow-x-auto p-0">
          {rows.length === 0 ? (
            <p className="p-4 text-sm text-muted">
              {data.csp?.message || "No SKU rows for the latest snapshot. Run Graph collect or pilot seed."}
            </p>
          ) : (
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-border bg-muted/30 text-[11px] uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Product</th>
                  <th className="px-3 py-2 font-medium">SKU part number</th>
                  <th className="px-3 py-2 font-medium text-right">Purchased</th>
                  <th className="px-3 py-2 font-medium text-right">Assigned</th>
                  <th className="px-3 py-2 font-medium text-right">Available</th>
                  <th className="px-3 py-2 font-medium text-right">Use %</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const pre = r.prepaidUnits ?? 0;
                  const con = r.consumedUnits ?? 0;
                  const pct = m365UtilPct(con, pre);
                  return (
                    <tr key={r.skuId} className="border-b border-border/60 hover:bg-muted/20">
                      <td className="px-3 py-2 font-medium text-fg">
                        {m365SkuLabel(r.skuPartNumber, r.productName)}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-muted">
                        {r.skuPartNumber || r.skuId}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.prepaidUnits ?? "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.consumedUnits ?? "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.availableUnits ?? "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted">
                        {pct != null ? `${pct}%` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function CspUsersSection({ data }: { data: CustomerDetailPayload }) {
  const cover = effectiveCover(data);
  if (!cover.csp) {
    return (
      <NoCoverPanel
        service={M365_PRODUCT}
        hint="No cover — licensed users feed not enabled for this customer."
      />
    );
  }
  const rows = data.csp?.users ?? [];
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) => {
      const blob = [
        r.displayName,
        r.userPrincipalName,
        r.department,
        r.jobTitle,
        r.assignedSkus,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return blob.includes(needle);
    });
  }, [rows, q]);
  const enabled = rows.filter((r) => r.accountEnabled !== false).length;
  const disabled = rows.length - enabled;

  return (
    <div className="space-y-4">
      <ChartCaption title={M365_PAGES.users.title} why={M365_PAGES.users.why} />
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Users on snapshot" value={String(rows.length)} />
        <StatCard label="Enabled" value={String(enabled)} tone="green" />
        <StatCard
          label="Disabled"
          value={String(disabled)}
          tone={disabled > 0 ? "amber" : "green"}
        />
      </div>
      <Card>
        <CardHead className="flex flex-wrap items-center gap-2 !normal-case">
          <span>Directory users ({filtered.length}{q ? ` of ${rows.length}` : ""})</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter name, UPN, dept, license…"
            className="ml-auto w-full max-w-xs rounded-md border border-border bg-bg px-2 py-1 text-[12px] text-fg sm:w-56"
          />
        </CardHead>
        <CardContent className="overflow-x-auto p-0">
          {rows.length === 0 ? (
            <p className="p-4 text-sm text-muted">
              {data.csp?.message || "No users for the latest snapshot. Run Graph collect or pilot seed."}
            </p>
          ) : filtered.length === 0 ? (
            <p className="p-4 text-sm text-muted">No users match “{q}”.</p>
          ) : (
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-border bg-muted/30 text-[11px] uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Sign-in name (UPN)</th>
                  <th className="px-3 py-2 font-medium">Department</th>
                  <th className="px-3 py-2 font-medium">Job title</th>
                  <th className="px-3 py-2 font-medium">Assigned licenses</th>
                  <th className="px-3 py-2 font-medium">Enabled</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.userPrincipalName}
                    className="border-b border-border/60 hover:bg-muted/20"
                  >
                    <td className="px-3 py-2 font-medium text-fg">{r.displayName || "—"}</td>
                    <td className="px-3 py-2 font-mono text-xs text-muted">
                      {r.userPrincipalName}
                    </td>
                    <td className="px-3 py-2 text-muted">{r.department || "—"}</td>
                    <td className="px-3 py-2 text-muted">{r.jobTitle || "—"}</td>
                    <td className="px-3 py-2 text-xs text-fg">{r.assignedSkus || "—"}</td>
                    <td className="px-3 py-2">
                      {r.accountEnabled === false ? (
                        <span className="font-medium text-amber-600 dark:text-amber-400">No</span>
                      ) : (
                        <span className="font-medium text-rag-green">Yes</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


export function CspSecureScoreSection({ data }: { data: CustomerDetailPayload }) {
  const cover = effectiveCover(data);
  if (!cover.csp) {
    return (
      <NoCoverPanel
        service={M365_PRODUCT}
        hint="No cover — Secure Score is not available until Microsoft 365 is on cover for this customer."
      />
    );
  }
  const p = data.csp?.posture;
  const s = data.csp?.summary;
  const scorePct = p?.secureScorePct;
  const scoreTone =
    scorePct == null
      ? undefined
      : scorePct >= 70
        ? "green"
        : scorePct >= 50
          ? "amber"
          : "red";

  return (
    <div className="space-y-4">
      <ChartCaption title={M365_PAGES.secureScore.title} why={M365_PAGES.secureScore.why} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Secure Score"
          value={
            scorePct != null
              ? `${Number(scorePct).toFixed(scorePct % 1 === 0 ? 0 : 1)}%`
              : "—"
          }
          tone={scoreTone}
          tip="currentScore / maxScore from Graph security/secureScores"
        />
        <StatCard
          label="Points achieved"
          value={p?.secureScore != null ? String(p.secureScore) : "—"}
          tip="Microsoft Secure Score current points"
        />
        <StatCard
          label="Points available"
          value={p?.secureScoreMax != null ? String(p.secureScoreMax) : "—"}
          tip="Microsoft Secure Score maximum points"
        />
        <StatCard
          label="As of"
          value={
            p?.asOfDate
              ? formatSastDate(p.asOfDate)
              : s?.asOfDate
                ? formatSastDate(s.asOfDate)
                : "—"
          }
          tip="Snapshot date of latest Graph collect"
        />
      </div>
      <Card className="border-accent/30 bg-accent/5">
        <CardContent className="space-y-2 p-4 text-sm">
          <p className="font-medium text-fg">Collect</p>
          <p className="text-muted">
            Last Graph import:{" "}
            {s?.lastImportAt
              ? formatSastDateTime(s.lastImportAt)
              : data.customer.cspLastImportAt
                ? formatSastDateTime(data.customer.cspLastImportAt)
                : "—"}
          </p>
          <p className="text-xs text-muted">
            {p?.notes ||
              "Requires SecurityEvents.Read.All (application) on the Graph app with admin consent."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export function CspGlobalAdminsSection({ data }: { data: CustomerDetailPayload }) {
  const cover = effectiveCover(data);
  if (!cover.csp) {
    return (
      <NoCoverPanel
        service={M365_PRODUCT}
        hint="No cover — Global Admins are not available until Microsoft 365 is on cover for this customer."
      />
    );
  }
  const p = data.csp?.posture;
  const admins = data.csp?.globalAdmins ?? [];
  const ga = p?.globalAdminCount ?? (admins.length > 0 ? admins.length : null);
  const gaTone = ga == null ? undefined : ga <= 2 ? "green" : ga <= 5 ? "amber" : "red";
  const nameList =
    p?.globalAdminNames
      ?.split(";")
      .map((n) => n.trim())
      .filter(Boolean) ?? [];

  return (
    <div className="space-y-4">
      <ChartCaption
        title={M365_PAGES.globalAdmins.title}
        why={M365_PAGES.globalAdmins.why}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Global Admin count"
          value={ga != null ? String(ga) : "—"}
          tone={gaTone}
          tip="Directory role Global Administrator members"
        />
        <StatCard
          label="Named on collect"
          value={String(admins.length || nameList.length)}
          tip="Rows saved to Csp_GlobalAdmins / GlobalAdminNames"
        />
        <StatCard
          label="As of"
          value={p?.asOfDate ? formatSastDate(p.asOfDate) : "—"}
        />
      </div>
      <Card>
        <CardHead>
          Global Administrators
          <span className="ml-2 text-[11px] font-normal normal-case tracking-normal text-muted">
            {ga != null ? ga : admins.length} account(s)
          </span>
        </CardHead>
        <CardContent className="p-0">
          {admins.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[28rem] text-left text-[12px]">
                <thead className="bg-muted/40 text-[10px] font-semibold uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-3 py-2">Display name</th>
                    <th className="px-3 py-2">UPN / sign-in</th>
                    <th className="px-3 py-2">Mail</th>
                    <th className="px-3 py-2">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map((a) => (
                    <tr key={a.objectId} className="border-t border-border/70">
                      <td className="px-3 py-2 font-medium text-fg">
                        {a.displayName ?? "—"}
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px] text-fg">
                        {a.userPrincipalName ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-muted">{a.mail ?? "—"}</td>
                      <td className="px-3 py-2 text-muted">
                        {a.principalType ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : nameList.length > 0 ? (
            <ul className="space-y-1 p-4 text-sm">
              {nameList.map((n) => (
                <li key={n} className="font-mono text-fg">
                  {n}
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-4 text-sm text-muted">
              No Global Admins on the latest collect. Grant Directory.Read.All or
              RoleManagement.Read.Directory on the Graph app, then re-run collect.
            </p>
          )}
          <p className="border-t border-border/60 px-4 py-2 text-[11px] text-muted">
            Prefer two break-glass Global Admins only.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export function CspMfaSection({ data }: { data: CustomerDetailPayload }) {
  const cover = effectiveCover(data);
  if (!cover.csp) {
    return (
      <NoCoverPanel
        service={M365_PRODUCT}
        hint="No cover — MFA registration is not available until Microsoft 365 is on cover for this customer."
      />
    );
  }
  const p = data.csp?.posture;
  const mfaPct = p?.mfaRegisteredPct;
  const mfaTone =
    mfaPct == null ? undefined : mfaPct >= 90 ? "green" : mfaPct >= 70 ? "amber" : "red";

  return (
    <div className="space-y-4">
      <ChartCaption title={M365_PAGES.mfa.title} why={M365_PAGES.mfa.why} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="MFA registered"
          value={mfaPct != null ? `${mfaPct}%` : "—"}
          tone={mfaTone}
          tip="isMfaRegistered from authenticationMethods/userRegistrationDetails"
        />
        <StatCard
          label="Registered users"
          value={
            p?.mfaRegisteredCount != null ? String(p.mfaRegisteredCount) : "—"
          }
        />
        <StatCard
          label="Capable users"
          value={p?.mfaCapableCount != null ? String(p.mfaCapableCount) : "—"}
        />
        <StatCard
          label="As of"
          value={p?.asOfDate ? formatSastDate(p.asOfDate) : "—"}
        />
      </div>
      <Card>
        <CardContent className="space-y-2 p-4 text-sm text-muted">
          {mfaPct == null ? (
            <p>
              MFA registration was not returned on the latest collect (often Graph{" "}
              <strong className="text-fg">403</strong> without{" "}
              <code className="text-fg">Reports.Read.All</code> application
              permission + admin consent). Secure Score and licenses can still load.
            </p>
          ) : (
            <p>
              {p?.mfaRegisteredCount ?? "—"} of {p?.mfaCapableCount ?? "—"} users
              have MFA methods registered ({mfaPct}%).
            </p>
          )}
          {p?.notes ? (
            <p className="text-xs">Collect notes: {p.notes}</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
