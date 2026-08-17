import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { RequireAuth } from "@/components/portfolio/require-auth";
import { AppShell } from "@/components/portfolio/app-shell";
import { RagBadge } from "@/components/portfolio/rag-badge";
import { Badge } from "@/components/ui/badge";
import { fetchDataSourceStatus, fetchPortfolio } from "@/lib/data/portfolio";
import { useStaffProfile } from "@/lib/auth/use-staff-profile";
import { useDashboardConfig } from "@/lib/settings/use-dashboard-config";
import type { ExcoCustomerBoard, ExcoInsightPayload } from "@/lib/data/types";
import { buildExcoPillarSla, hasSlaCover } from "@/lib/data/exco-sla-stats";
import { finsightOobAttention } from "@/lib/brand/finsight";
import { issueHrefForDrill } from "@/lib/data/live-status";
import { cn } from "@/lib/utils";
import { ChevronRight, RefreshCw } from "lucide-react";
import { HelpTip, HoverTip, MetricLabel, PaneHead } from "@/components/ui/help-tip";
import { SpaLink } from "@/components/nav/spa-link";
import { HeadsUpDisplay } from "@/components/exco/heads-up-display";
import { ExcoWorkspaceRail } from "@/components/exco/exco-workspace-rail";
import { CustomizeWidgetsButton, CustomizeWidgetsPanel } from "@/components/exco/customize-widgets";
import {
  DEFAULT_EXCO_WIDGET_LAYOUT,
  readExcoWidgetLayout,
  widgetMeta,
  type ExcoWidgetId,
  type ExcoWidgetLayout,
} from "@/lib/exco-widgets";
import {
  ESTATE_VIEWS,
  allEstateViews,
  persistActiveEstateView,
  persistCustomEstateViews,
  readActiveEstateView,
  readCustomEstateViews,
  type EstateView,
} from "@/lib/estate-views";

export const Route = createFileRoute("/")({
  loader: async () => {
    const [portfolio, source] = await Promise.all([
      fetchPortfolio(),
      fetchDataSourceStatus(),
    ]);
    return { portfolio, source };
  },
  component: ExcoInsightPage,
});




function KpiMini({
  label,
  value,
  sub,
  tone,
  tip,
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "green" | "amber" | "red";
  tip?: string;
}) {
  const color =
    tone === "green"
      ? "text-rag-green"
      : tone === "amber"
        ? "text-rag-amber"
        : tone === "red"
          ? "text-rag-red"
          : "text-fg";
  return (
    <div className="min-w-0 rounded-lg border border-border/80 bg-card/40 px-2.5 py-2">
      <MetricLabel showIcon={false} tip={tip || `${label} — click related tiles for the customer list.`}>{label}</MetricLabel>
      <p className={cn("font-mono text-lg font-bold tabular-nums leading-tight", color)}>
        {value}
      </p>
      {sub ? <p className="truncate text-[10px] text-muted">{sub}</p> : null}
    </div>
  );
}

function CustLink({ code, name }: { code: string; name: string }) {
  return (
    <Link
      to="/customers/$code"
      params={{ code }}
      className="font-medium text-fg hover:text-accent"
    >
      {name}
    </Link>
  );
}

type RiskAxis = "Low" | "Medium" | "High";
type DrillKind =
  | "rag-green"
  | "rag-amber"
  | "rag-red"
  | "attention"
  | "jobs"
  | "finsight"
  | "rmm-offline"
  | "rmm-critical"
  | "backup"
  | "stale"
  | "risks"
  | "incidents"
  | "sla"
  | `matrix-${RiskAxis}-${RiskAxis}`;

type RiskPoint = {
  customerCode: string;
  displayName: string;
  healthRag: "Red" | "Amber" | "Green";
  impact: RiskAxis;
  likelihood: RiskAxis;
  impactScore: number;
  likeScore: number;
  drivers: string[];
  href: "/customers/$code" | "/customers/$code/ams/risks";
};

function classifyRisk(b: {
  customerCode: string;
  displayName: string;
  healthRag: "Red" | "Amber" | "Green";
  attentionReasons: string[];
  collectFresh: boolean;
  sysproCovered?: boolean;
  jobErrorCount?: number;
  dtrVarianceLines?: number;
  pulsewayCriticalAlerts?: number;
  pulsewayServerOffline?: number;
  backupHealthy?: boolean | null;
  openRiskCount?: number;
  openIssueCount?: number;
}): RiskPoint {
  let impactScore = 0;
  const drivers: string[] = [];
  if (b.healthRag === "Red") {
    impactScore += 3;
    drivers.push("Health Red");
  } else if (b.healthRag === "Amber") {
    impactScore += 1;
    drivers.push("Health Amber");
  }
  if ((b.pulsewayServerOffline || 0) > 0) {
    impactScore += 3;
    drivers.push(`${b.pulsewayServerOffline} server(s) offline`);
  }
  if ((b.pulsewayCriticalAlerts || 0) > 0) {
    impactScore += 2;
    drivers.push(`${b.pulsewayCriticalAlerts} RMM critical`);
  }
  if ((b.jobErrorCount || 0) >= 10) {
    impactScore += 2;
    drivers.push(`${b.jobErrorCount} job errors`);
  } else if ((b.jobErrorCount || 0) > 0) {
    impactScore += 1;
    drivers.push(`${b.jobErrorCount} job error(s)`);
  }
  if ((b.dtrVarianceLines || 0) > 0) {
    impactScore += 1;
    drivers.push(`${b.dtrVarianceLines} FinSight OOB`);
  }
  if (b.backupHealthy === false) {
    impactScore += 2;
    drivers.push("Backup unhealthy");
  }
  if ((b.openRiskCount || 0) > 0) {
    impactScore += 1;
    drivers.push(`${b.openRiskCount} open risk(s)`);
  }

  let likeScore = b.attentionReasons.length;
  if (b.sysproCovered && !b.collectFresh) likeScore += 1;
  if (b.healthRag === "Red" && b.sysproCovered && !b.collectFresh) likeScore += 1;
  if ((b.openIssueCount || 0) > 0) likeScore += 1;

  const impact: RiskAxis =
    impactScore >= 5 ? "High" : impactScore >= 2 ? "Medium" : "Low";
  const likelihood: RiskAxis =
    likeScore >= 4 ? "High" : likeScore >= 2 ? "Medium" : "Low";

  return {
    customerCode: b.customerCode,
    displayName: b.displayName,
    healthRag: b.healthRag,
    impact,
    likelihood,
    impactScore,
    likeScore,
    drivers: drivers.length ? drivers : b.attentionReasons.slice(0, 3),
    href: (b.openRiskCount || 0) > 0 ? "/customers/$code/ams/risks" : "/customers/$code",
  };
}

function matrixTone(impact: RiskAxis, likelihood: RiskAxis): "red" | "amber" | "green" {
  const i = impact === "High" ? 2 : impact === "Medium" ? 1 : 0;
  const l = likelihood === "High" ? 2 : likelihood === "Medium" ? 1 : 0;
  const score = i + l;
  if (score >= 3) return "red";
  if (score >= 2) return "amber";
  return "green";
}

function DrillTile({
  label,
  value,
  sub,
  tone,
  active,
  onClick,
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "green" | "amber" | "red";
  active?: boolean;
  onClick?: () => void;
}) {
  const color =
    tone === "green"
      ? "text-rag-green"
      : tone === "amber"
        ? "text-rag-amber"
        : tone === "red"
          ? "text-rag-red"
          : "text-fg";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-w-0 rounded-lg border bg-card/40 px-2.5 py-2 text-left transition",
        "hover:border-accent/40 hover:bg-surface-2/40",
        active ? "border-accent bg-accent-soft/40 ring-1 ring-accent/30" : "border-border/80",
      )}
    >
      <p className="truncate text-[10px] font-bold uppercase tracking-wide text-subtle">
        {label}
      </p>
      <p className={cn("font-mono text-lg font-bold tabular-nums leading-tight", color)}>
        {value}
      </p>
      {sub ? <p className="truncate text-[10px] text-muted">{sub}</p> : null}
    </button>
  );
}

function deriveExcoFromRows(
  rows: {
    customerCode: string;
    displayName: string;
    healthRag: "Red" | "Amber" | "Green";
    healthSummary: string;
    activeUserCount: number;
    operatorCount: number;
    sysproJobErrorCount: number;
    sysproDtrVarianceLines: number;
    lastImportAt: string | null;
    sqlInstanceName?: string | null;
    cover?: { syspro: boolean; rmm: boolean; cove: boolean };
    pulsewayDeviceCount?: number;
    pulsewayOfflineCount?: number;
    pulsewayOnlineCount?: number;
    pulsewayCriticalAlerts?: number;
    pulsewayHealthRag?: "Red" | "Amber" | "Green" | null;
    pulsewayHealthSummary?: string | null;
    pulsewayServerOnline?: number;
    pulsewayServerOffline?: number;
    pulsewayWorkstationOnline?: number;
    pulsewayWorkstationOffline?: number;
  }[],
): ExcoInsightPayload {
  const boards: ExcoCustomerBoard[] = rows.map((row) => {
    const collectAgeHours = row.lastImportAt
      ? Math.round(
          ((Date.now() - new Date(row.lastImportAt).getTime()) / 3600000) * 10,
        ) / 10
      : null;
    const collectFresh = collectAgeHours != null && collectAgeHours <= 24;
    const cov = row.cover ?? {
      syspro: (row.operatorCount ?? 0) > 0 || Boolean(row.sqlInstanceName),
      rmm: (row.pulsewayDeviceCount ?? 0) > 0,
      cove: false,
    };
    const healthScorePct =
      row.healthRag === "Green" ? 88 : row.healthRag === "Amber" ? 58 : 28;
    const collectPart = cov.syspro ? (collectFresh ? 100 : 30) : 100;
    const jobsPart = cov.syspro ? (row.sysproJobErrorCount === 0 ? 100 : 40) : 100;
    const assuranceScorePct = Math.round(
      healthScorePct * 0.55 + collectPart * 0.25 + jobsPart * 0.2,
    );
    const attentionReasons: string[] = [];
    if (row.healthRag !== "Green") attentionReasons.push(`Health ${row.healthRag}`);
    if (cov.syspro && !collectFresh)
      attentionReasons.push(
        collectAgeHours == null ? "No SYSPRO collect" : `SYSPRO collect stale (${collectAgeHours}h)`,
      );
    if (cov.syspro && row.sysproJobErrorCount > 0)
      attentionReasons.push(`${row.sysproJobErrorCount} job error(s)`);
    if (cov.syspro && row.sysproDtrVarianceLines > 0)
      attentionReasons.push(finsightOobAttention(row.sysproDtrVarianceLines));
    if (cov.rmm && (row.pulsewayCriticalAlerts ?? 0) > 0)
      attentionReasons.push(`${row.pulsewayCriticalAlerts} RMM critical`);
    if (cov.rmm && (row.pulsewayOfflineCount ?? 0) > 0)
      attentionReasons.push(`${row.pulsewayOfflineCount} RMM offline`);
    if (!cov.syspro && !cov.rmm && !cov.cove)
      attentionReasons.push("No service cover");
    return {
      customerCode: row.customerCode,
      displayName: row.displayName,
      healthRag: row.healthRag,
      healthSummary: row.healthSummary,
      healthScorePct,
      assuranceScorePct,
      collectAgeHours,
      collectFresh,
      lastImportAt: row.lastImportAt,
      activeUserCount: row.activeUserCount,
      operatorCount: row.operatorCount,
      jobErrorCount: row.sysproJobErrorCount,
      dtrVarianceLines: row.sysproDtrVarianceLines,
      slaCompliancePct: null,
      availabilityPct: null,
      licenseExpiry: null,
      licenseProduct: null,
      licenseDaysRemaining: null,
      openRiskCount: 0,
      openIssueCount: 0,
      lastFullBackup: null,
      backupStatus: null,
      backupHealthy: null,
      sysproVersion: null,
      sysproBuild: null,
      installedHotfixCount: 0,
      lastHotfixAt: null,
      sampleHotfixCode: null,
      missingHotfixCount: null,
      missingMandatoryHotfixes: null,
      sysproCovered: cov.syspro === true,
      attentionReasons,
      pulsewayDeviceCount: row.pulsewayDeviceCount ?? 0,
      pulsewayOnlineCount: row.pulsewayOnlineCount ?? 0,
      pulsewayOfflineCount: row.pulsewayOfflineCount ?? 0,
      pulsewayCriticalAlerts: row.pulsewayCriticalAlerts ?? 0,
      pulsewayHealthRag: row.pulsewayHealthRag ?? null,
      pulsewayHealthSummary: row.pulsewayHealthSummary ?? null,
      pulsewayServerOnline: row.pulsewayServerOnline ?? 0,
      pulsewayServerOffline: row.pulsewayServerOffline ?? 0,
      pulsewayWorkstationOnline: row.pulsewayWorkstationOnline ?? 0,
      pulsewayWorkstationOffline: row.pulsewayWorkstationOffline ?? 0,
    };
  });
  return {
    generatedAt: new Date().toISOString(),
    estateAssurancePct:
      boards.length === 0
        ? 0
        : Math.round(
            boards.reduce((s, b) => s + b.assuranceScorePct, 0) / boards.length,
          ),
    customersNeedingAttention: boards.filter((b) => b.attentionReasons.length > 0)
      .length,
    collectFreshCount: boards.filter((b) => b.collectFresh).length,
    collectStaleCount: boards.filter(
      (b) => !b.collectFresh && b.collectAgeHours != null,
    ).length,
    collectMissingCount: boards.filter((b) => b.lastImportAt == null).length,
    licensesExpiringSoon: 0,
    openRisksTotal: 0,
    openIssuesTotal: 0,
    backupUnhealthyCount: 0,
    installedHotfixesTotal: boards.reduce(
      (s, b) => s + (b.sysproCovered ? b.installedHotfixCount || 0 : 0),
      0,
    ),
    customersWithHotfixes: boards.filter(
      (b) => b.sysproCovered && (b.installedHotfixCount || 0) > 0,
    ).length,
    customersMissingHotfixes: boards.filter(
      (b) =>
        b.sysproCovered &&
        (b.installedHotfixCount || 0) === 0 &&
        b.operatorCount > 0,
    ).length,
    rmmDevicesTotal: boards.reduce((s, b) => s + (b.pulsewayDeviceCount || 0), 0),
    rmmOfflineTotal: boards.reduce((s, b) => s + (b.pulsewayOfflineCount || 0), 0),
    rmmCriticalTotal: boards.reduce((s, b) => s + (b.pulsewayCriticalAlerts || 0), 0),
    rmmCustomersWithDevices: boards.filter((b) => (b.pulsewayDeviceCount || 0) > 0)
      .length,
    rmmCustomersUnhealthy: boards.filter(
      (b) =>
        (b.pulsewayDeviceCount || 0) > 0 &&
        (b.pulsewayHealthRag === "Red" || b.pulsewayHealthRag === "Amber"),
    ).length,
    rmmServerOnlineTotal: boards.reduce((s, b) => s + (b.pulsewayServerOnline || 0), 0),
    rmmServerOfflineTotal: boards.reduce((s, b) => s + (b.pulsewayServerOffline || 0), 0),
    rmmWorkstationOnlineTotal: boards.reduce(
      (s, b) => s + (b.pulsewayWorkstationOnline || 0),
      0,
    ),
    rmmWorkstationOfflineTotal: boards.reduce(
      (s, b) => s + (b.pulsewayWorkstationOffline || 0),
      0,
    ),
    boards,
  };
}

function ExcoInsightPage() {
  const loader = Route.useLoaderData();
  const navigate = useNavigate();
  const { profile } = useStaffProfile();
  const { dashboard: dash } = useDashboardConfig();

  const [portfolio, setPortfolio] = useState(loader.portfolio);
  const [source, setSource] = useState(loader.source);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshAt, setLastRefreshAt] = useState(() => Date.now());
  const [autoEnabled, setAutoEnabled] = useState(true);
  const [tick, setTick] = useState(0);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    setPortfolio(loader.portfolio);
    setSource(loader.source);
    setLastRefreshAt(Date.now());
  }, [loader.portfolio, loader.source]);

  const autoSec = useMemo(() => {
    const n = Math.floor(Number(dash.excoAutoRefreshSec ?? 120));
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.min(3600, Math.max(30, n));
  }, [dash.excoAutoRefreshSec]);

  const refreshEstate = useCallback(async (force = true) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setRefreshing(true);
    setRefreshError(null);
    try {
      const qs = force ? "force=1" : "force=0";
      const res = await fetch(`/api/portfolio-refresh?${qs}`, {
        method: "GET",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      const text = await res.text();
      let j: {
        ok?: boolean;
        error?: string;
        portfolio?: typeof loader.portfolio;
        source?: typeof loader.source;
      } | null = null;
      try {
        j = text ? JSON.parse(text) : null;
      } catch {
        setRefreshError(`Refresh failed (HTTP ${res.status})`);
        return;
      }
      if (j?.ok && j.portfolio) {
        setPortfolio(j.portfolio);
        if (j.source) setSource(j.source as typeof loader.source);
        setLastRefreshAt(Date.now());
      } else {
        setRefreshError(j?.error || `Refresh failed (HTTP ${res.status})`);
      }
    } catch (e) {
      setRefreshError(e instanceof Error ? e.message : String(e));
    } finally {
      inFlight.current = false;
      setRefreshing(false);
    }
  }, [loader.portfolio, loader.source]);

  // Auto-refresh while tab visible
  useEffect(() => {
    if (!autoEnabled || autoSec <= 0) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      void refreshEstate(true);
    }, autoSec * 1000);
    return () => window.clearInterval(id);
  }, [autoEnabled, autoSec, refreshEstate]);

  // 1s tick for "updated ago" / countdown UI
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const ageSec = Math.max(0, Math.floor((Date.now() - lastRefreshAt) / 1000));
  const nextIn =
    autoEnabled && autoSec > 0 ? Math.max(0, autoSec - (ageSec % autoSec)) : null;
  void tick; // re-render each second

  const { summary, rows: rowsList, customers, exco: excoRaw } = portfolio;
  const allRows = rowsList ?? customers ?? [];

  const rows = useMemo(() => {
    const codes = profile?.allowedCustomerCodes;
    if (!codes || codes.length === 0) return allRows;
    const set = new Set(codes.map((c) => c.toUpperCase()));
    return allRows.filter((r) => set.has(r.customerCode.toUpperCase()));
  }, [allRows, profile?.allowedCustomerCodes]);

  const exco = useMemo(() => {
    const base = excoRaw ?? deriveExcoFromRows(rows);
    if (rows === allRows) return base;
    const set = new Set(rows.map((r) => r.customerCode.toUpperCase()));
    const boards = base.boards.filter((b) => set.has(b.customerCode.toUpperCase()));
    return {
      ...base,
      boards,
      customersNeedingAttention: boards.filter((b) => b.attentionReasons.length > 0)
        .length,
      collectFreshCount: boards.filter((b) => b.collectFresh).length,
      collectStaleCount: boards.filter(
        (b) => !b.collectFresh && b.collectAgeHours != null,
      ).length,
      collectMissingCount: boards.filter((b) => b.lastImportAt == null).length,
      estateAssurancePct:
        boards.length === 0
          ? 0
          : Math.round(
              boards.reduce((s, b) => s + b.assuranceScorePct, 0) / boards.length,
            ),
      openRisksTotal: boards.reduce((s, b) => s + b.openRiskCount, 0),
      openIssuesTotal: boards.reduce((s, b) => s + b.openIssueCount, 0),
      licensesExpiringSoon: boards.filter(
        (b) =>
          b.licenseDaysRemaining != null &&
          b.licenseDaysRemaining >= 0 &&
          b.licenseDaysRemaining <= 90,
      ).length,
      backupUnhealthyCount: boards.filter((b) => b.backupHealthy === false).length,
      installedHotfixesTotal: boards.reduce(
        (s, b) => s + (b.sysproCovered ? b.installedHotfixCount || 0 : 0),
        0,
      ),
      customersWithHotfixes: boards.filter(
        (b) => b.sysproCovered && (b.installedHotfixCount || 0) > 0,
      ).length,
      customersMissingHotfixes: boards.filter(
        (b) =>
          b.sysproCovered &&
          (b.installedHotfixCount || 0) === 0 &&
          b.operatorCount > 0,
      ).length,
      rmmDevicesTotal: boards.reduce((s, b) => s + (b.pulsewayDeviceCount || 0), 0),
      rmmOfflineTotal: boards.reduce((s, b) => s + (b.pulsewayOfflineCount || 0), 0),
      rmmCriticalTotal: boards.reduce(
        (s, b) => s + (b.pulsewayCriticalAlerts || 0),
        0,
      ),
      rmmServerOfflineTotal: boards.reduce(
        (s, b) => s + (b.pulsewayServerOffline || 0),
        0,
      ),
      rmmServerOnlineTotal: boards.reduce((s, b) => s + (b.pulsewayServerOnline || 0), 0),
      rmmServerAvailabilityPct: (() => {
        const on = boards.reduce((s, b) => s + (b.pulsewayServerOnline || 0), 0);
        const off = boards.reduce((s, b) => s + (b.pulsewayServerOffline || 0), 0);
        const n = on + off;
        return n ? Math.round((on / n) * 1000) / 10 : null;
      })(),
      rmmPatchCompliancePct: (() => {
        const devices = boards.reduce((s, b) => s + (b.pulsewayPatchDevices || 0), 0);
        const ok = boards.reduce((s, b) => s + (b.pulsewayPatchCompliant || 0), 0);
        return devices ? Math.round((ok / devices) * 1000) / 10 : null;
      })(),
      rmmDiskHighTotal: boards.reduce((s, b) => s + (b.pulsewayDiskHighCount || 0), 0),
      coveFailedTotal: rows.reduce((s, r) => s + (r.coveFailedDeviceCount || 0), 0),
      coveStaleTotal: rows.reduce((s, r) => s + (r.coveStaleDeviceCount || 0), 0),
      eppEndpointTotal: rows.reduce((s, r) => s + (r.eppDeviceCount || 0), 0),
      eppUnmanagedTotal: rows.reduce((s, r) => {
        const all = r.eppDeviceCount || 0;
        const managed = r.eppManagedCount || 0;
        return s + Math.max(0, all - managed);
      }, 0),
    };
  }, [excoRaw, rows, allRows]);

  const attention = useMemo(
    () =>
      [...exco.boards]
        .filter((b) => b.attentionReasons.length > 0)
        .sort(
          (a, b) =>
            (a.healthRag === "Red" ? 0 : a.healthRag === "Amber" ? 1 : 2) -
              (b.healthRag === "Red" ? 0 : b.healthRag === "Amber" ? 1 : 2) ||
            b.attentionReasons.length - a.attentionReasons.length,
        ),
    [exco.boards],
  );


  const coverStats = useMemo(() => {
    let syspro = 0,
      rmm = 0,
      cove = 0,
      epp = 0,
      csp = 0;
    for (const row of rows) {
      const c = row.cover;
      if (c?.syspro) syspro++;
      if (c?.rmm || (row.pulsewayDeviceCount ?? 0) > 0) rmm++;
      if (c?.cove || (row.coveDeviceCount ?? 0) > 0) cove++;
      if (c?.epp || (row.eppDeviceCount ?? 0) > 0) epp++;
      if (c?.csp || (row.cspUserCount ?? 0) > 0 || (row.cspLicenseSkuCount ?? 0) > 0)
        csp++;
    }
    return { syspro, rmm, cove, epp, csp, n: rows.length };
  }, [rows]);

  const m365Estate = useMemo(() => {
    const covered = rows.filter(
      (r) =>
        r.cover?.csp ||
        (r.cspUserCount ?? 0) > 0 ||
        (r.cspLicenseSkuCount ?? 0) > 0 ||
        r.cspSecureScorePct != null,
    );
    const withScore = covered.filter((r) => r.cspSecureScorePct != null);
    const avgScore =
      withScore.length === 0
        ? null
        : Math.round(
            withScore.reduce((s, r) => s + (r.cspSecureScorePct ?? 0), 0) /
              withScore.length,
          );
    const mfaGap = covered.filter(
      (r) => r.cspMfaRegisteredPct != null && (r.cspMfaRegisteredPct as number) < 90,
    ).length;
    const highGa = covered.filter(
      (r) => r.cspGlobalAdminCount != null && (r.cspGlobalAdminCount as number) > 2,
    ).length;
    const seats = covered.reduce((s, r) => s + (r.cspTotalSeats ?? 0), 0);
    const assigned = covered.reduce((s, r) => s + (r.cspAssignedSeats ?? 0), 0);
    return {
      tenants: covered.length,
      avgScore,
      mfaGap,
      highGa,
      seats,
      assigned,
    };
  }, [rows]);

  const scoreboard = useMemo(() => {
    return [...exco.boards]
      .map((b) => {
        const row = rows.find(
          (r) => r.customerCode.toUpperCase() === b.customerCode.toUpperCase(),
        );
        const cover = {
          syspro: row?.cover?.syspro === true || b.sysproCovered === true,
          rmm: row?.cover?.rmm === true || (b.pulsewayDeviceCount || 0) > 0,
          cove: row?.cover?.cove === true || (row?.coveDeviceCount || 0) > 0,
          epp: row?.cover?.epp === true || (row?.eppDeviceCount || 0) > 0,
          csp: row?.cover?.csp === true,
        };
        const dtrLines =
          b.dtrVarianceLines ?? row?.sysproDtrVarianceLines ?? 0;
        // Prefer server-built pillar SLA; recompute client-side so UI stays correct after cover fixes
        const sla = buildExcoPillarSla({
          cover,
          collectFresh: Boolean(b.collectFresh),
          collectAgeHours: b.collectAgeHours,
          jobErrorCount: b.jobErrorCount ?? 0,
          dtrVarianceLines: dtrLines,
          serverOnline: b.pulsewayServerOnline ?? 0,
          serverOffline: b.pulsewayServerOffline ?? 0,
          criticalAlerts: b.pulsewayCriticalAlerts ?? 0,
          backupHealthy: cover.cove ? b.backupHealthy : null,
          coveDeviceCount: row?.coveDeviceCount ?? 0,
          eppDeviceCount: row?.eppDeviceCount ?? 0,
          eppManagedCount: row?.eppManagedCount ?? null,
          healthRag: b.healthRag,
        });
        const byKey = Object.fromEntries(
          sla.pillars.map((p) => [p.pillar, p]),
        ) as Record<string, (typeof sla.pillars)[0]>;
        return {
          ...b,
          dtrVarianceLines: dtrLines,
          coverSyspro: cover.syspro,
          coverRmm: cover.rmm,
          coverCove: cover.cove,
          coverEpp: cover.epp,
          coverCsp: cover.csp,
          hasSlaCover: hasSlaCover(cover),
          slaOverallPct: hasSlaCover(cover) ? sla.overallPct : null,
          slaSyspro: byKey.syspro ?? null,
          slaRmm: byKey.rmm ?? null,
          slaCove: byKey.cove ?? null,
          slaEpp: byKey.epp ?? null,
          pillarSla: sla.pillars,
        };
      })
      .sort(
        (a, b) =>
          (a.healthRag === "Red" ? 0 : a.healthRag === "Amber" ? 1 : 2) -
            (b.healthRag === "Red" ? 0 : b.healthRag === "Amber" ? 1 : 2) ||
          (a.slaOverallPct ?? 999) - (b.slaOverallPct ?? 999) ||
          a.assuranceScorePct - b.assuranceScorePct,
      );
  }, [exco.boards, rows]);

  const finsightEstate = useMemo(() => {
    const sysproBoards = scoreboard.filter((b) => b.coverSyspro);
    let oobCustomers = 0;
    let clearCustomers = 0;
    let totalOobLines = 0;
    for (const b of sysproBoards) {
      const n = Number(b.dtrVarianceLines) || 0;
      totalOobLines += n;
      if (n > 0) oobCustomers++;
      else clearCustomers++;
    }
    return {
      sysproCovered: sysproBoards.length,
      oobCustomers,
      clearCustomers,
      totalOobLines,
      worst: [...sysproBoards]
        .filter((b) => (b.dtrVarianceLines || 0) > 0)
        .sort((a, b) => (b.dtrVarianceLines || 0) - (a.dtrVarianceLines || 0))
        .slice(0, 6),
    };
  }, [scoreboard]);

  const liveLabel =
    source.liveOk || summary.dataMode === "live" ? "Live SQL" : "Demo data";

  const estateTone =
    exco.estateAssurancePct >= 80
      ? "green"
      : exco.estateAssurancePct >= 55
        ? "amber"
        : "red";

  const [drill, setDrill] = useState<DrillKind | null>(null);
  const [customViews, setCustomViews] = useState<EstateView[]>([]);
  const [activeView, setActiveView] = useState<string>("all");
  const [widgetLayout, setWidgetLayout] = useState<ExcoWidgetLayout>(DEFAULT_EXCO_WIDGET_LAYOUT);
  const [customizeOpen, setCustomizeOpen] = useState(false);

  useEffect(() => {
    const custom = readCustomEstateViews();
    setCustomViews(custom);
    setWidgetLayout(readExcoWidgetLayout());
    const saved = readActiveEstateView();
    const hit = allEstateViews(custom).find((v) => v.id === saved);
    if (hit) {
      setActiveView(hit.id);
      setDrill((hit.drill as DrillKind) ?? null);
    }
  }, []);

  const rag = useMemo(() => {
    let green = 0;
    let amber = 0;
    let red = 0;
    for (const b of exco.boards) {
      if (b.healthRag === "Green") green += 1;
      else if (b.healthRag === "Amber") amber += 1;
      else red += 1;
    }
    const overall: "Green" | "Amber" | "Red" =
      red > 0 ? "Red" : amber > 0 ? "Amber" : green > 0 ? "Green" : "Amber";
    return { green, amber, red, overall, total: exco.boards.length };
  }, [exco.boards]);

  const riskPoints = useMemo(
    () => scoreboard.map((b) => classifyRisk(b)),
    [scoreboard],
  );

  const matrixCells = useMemo(() => {
    const axes: RiskAxis[] = ["Low", "Medium", "High"];
    const map = new Map<string, RiskPoint[]>();
    for (const i of axes) {
      for (const l of axes) map.set(`${i}|${l}`, []);
    }
    for (const p of riskPoints) {
      map.get(`${p.impact}|${p.likelihood}`)?.push(p);
    }
    return map;
  }, [riskPoints]);

  const incidents = useMemo(() => {
    const items: {
      severity: "Red" | "Amber";
      customerCode: string;
      displayName: string;
      text: string;
      to: string;
    }[] = [];
    for (const b of scoreboard) {
      if (b.healthRag === "Red") {
        items.push({
          severity: "Red",
          customerCode: b.customerCode,
          displayName: b.displayName,
          text: b.healthSummary || "Health Red",
          to: `/customers/${b.customerCode}`,
        });
      }
      if ((b.jobErrorCount || 0) > 0) {
        items.push({
          severity: (b.jobErrorCount || 0) >= 10 ? "Red" : "Amber",
          customerCode: b.customerCode,
          displayName: b.displayName,
          text: `${b.jobErrorCount} SYSPRO job error(s)`,
          to: `/customers/${b.customerCode}/syspro/jobs`,
        });
      }
      if ((b.pulsewayCriticalAlerts || 0) > 0) {
        items.push({
          severity: "Red",
          customerCode: b.customerCode,
          displayName: b.displayName,
          text: `${b.pulsewayCriticalAlerts} RMM critical alert(s)`,
          to: `/customers/${b.customerCode}/rmm/alerts`,
        });
      }
      if ((b.pulsewayServerOffline || 0) > 0) {
        items.push({
          severity: "Amber",
          customerCode: b.customerCode,
          displayName: b.displayName,
          text: `${b.pulsewayServerOffline} server(s) offline`,
          to: `/customers/${b.customerCode}/rmm`,
        });
      }
      if ((b.dtrVarianceLines || 0) > 0) {
        items.push({
          severity: "Amber",
          customerCode: b.customerCode,
          displayName: b.displayName,
          text: `${b.dtrVarianceLines} FinSight out of balance`,
          to: `/customers/${b.customerCode}/syspro/dtr`,
        });
      }
    }
    return items
      .sort((a, b) => (a.severity === "Red" ? 0 : 1) - (b.severity === "Red" ? 0 : 1))
      .slice(0, 18);
  }, [scoreboard]);

  const drillRows = useMemo(() => {
    if (!drill) return [];
    if (drill === "rag-green")
      return scoreboard.filter((b) => b.healthRag === "Green");
    if (drill === "rag-amber")
      return scoreboard.filter((b) => b.healthRag === "Amber");
    if (drill === "rag-red")
      return scoreboard.filter((b) => b.healthRag === "Red");
    if (drill === "attention")
      return scoreboard.filter((b) => b.attentionReasons.length > 0);
    if (drill === "jobs")
      return scoreboard.filter((b) => (b.jobErrorCount || 0) > 0);
    if (drill === "finsight")
      return scoreboard.filter((b) => (b.dtrVarianceLines || 0) > 0);
    if (drill === "rmm-offline")
      return scoreboard.filter((b) => (b.pulsewayServerOffline || 0) > 0);
    if (drill === "rmm-critical")
      return scoreboard.filter((b) => (b.pulsewayCriticalAlerts || 0) > 0);
    if (drill === "backup")
      return scoreboard.filter((b) => b.backupHealthy === false);
    if (drill === "stale")
      return scoreboard.filter((b) => b.coverSyspro && !b.collectFresh);
    if (drill === "sla")
      return scoreboard.filter((b) => b.slaOverallPct != null && (b.slaOverallPct as number) < 80);
    if (drill === "risks")
      return scoreboard.filter(
        (b) => (b.openRiskCount || 0) > 0 || (b.openIssueCount || 0) > 0,
      );
    if (drill === "incidents")
      return scoreboard.filter((b) =>
        incidents.some((i) => i.customerCode === b.customerCode),
      );
    if (drill.startsWith("matrix-")) {
      const [, impact, likelihood] = drill.split("-") as [
        string,
        RiskAxis,
        RiskAxis,
      ];
      const codes = new Set(
        (matrixCells.get(`${impact}|${likelihood}`) ?? []).map(
          (p) => p.customerCode,
        ),
      );
      return scoreboard.filter((b) => codes.has(b.customerCode));
    }
    return [];
  }, [drill, scoreboard, incidents, matrixCells]);

  const drillTitle = useMemo(() => {
    if (!drill) return "";
    const labels: Record<string, string> = {
      "rag-green": "Green customers",
      "rag-amber": "Amber customers",
      "rag-red": "Red customers",
      attention: "Customers needing attention",
      jobs: "Customers with job errors",
      finsight: "FinSight out of balance",
      "rmm-offline": "Servers offline",
      "rmm-critical": "RMM critical alerts",
      backup: "Backup issues",
      stale: "Stale SYSPRO collect",
      sla: "SLA below 80%",
      risks: "Open risks & issues",
      incidents: "Major incidents",
    };
    if (labels[drill]) return labels[drill];
    if (drill.startsWith("matrix-")) {
      const [, impact, likelihood] = drill.split("-");
      return `Risk matrix · Impact ${impact} · Likelihood ${likelihood}`;
    }
    return "Drill-down";
  }, [drill]);

  const toggleDrill = (k: DrillKind) =>
    setDrill((cur) => {
      const next = cur === k ? null : k;
      const match = allEstateViews(customViews).find((v) => v.drill === next);
      const id = match?.id ?? (next ? "custom" : "all");
      setActiveView(id);
      persistActiveEstateView(id === "custom" ? "all" : id);
      return next;
    });

  function customersForDrill(k: DrillKind) {
    if (k === "rag-green") return scoreboard.filter((b) => b.healthRag === "Green");
    if (k === "rag-amber") return scoreboard.filter((b) => b.healthRag === "Amber");
    if (k === "rag-red") return scoreboard.filter((b) => b.healthRag === "Red");
    if (k === "attention") return scoreboard.filter((b) => b.attentionReasons.length > 0);
    if (k === "jobs") return scoreboard.filter((b) => (b.jobErrorCount || 0) > 0);
    if (k === "finsight") return scoreboard.filter((b) => (b.dtrVarianceLines || 0) > 0);
    if (k === "rmm-offline") return scoreboard.filter((b) => (b.pulsewayServerOffline || 0) > 0);
    if (k === "rmm-critical") return scoreboard.filter((b) => (b.pulsewayCriticalAlerts || 0) > 0);
    if (k === "backup") return scoreboard.filter((b) => b.backupHealthy === false);
    if (k === "stale") return scoreboard.filter((b) => b.coverSyspro && !b.collectFresh);
    if (k === "sla") return scoreboard.filter((b) => b.slaOverallPct != null && (b.slaOverallPct as number) < 80);
    if (k === "risks") return scoreboard.filter((b) => (b.openRiskCount || 0) > 0 || (b.openIssueCount || 0) > 0);
    if (k === "incidents") return scoreboard.filter((b) => incidents.some((i) => i.customerCode === b.customerCode));
    return [];
  }

  function openTile(tone: "green" | "amber" | "red" | undefined, k: DrillKind) {
    const slice = customersForDrill(k);
    if ((tone === "amber" || tone === "red") && slice.length === 1) {
      const href = issueHrefForDrill(slice[0].customerCode, k);
      void navigate({ to: href as never });
      return;
    }
    if ((tone === "amber" || tone === "red") && slice.length > 1) {
      toggleDrill(k);
      return;
    }
    toggleDrill(k);
  }

  function customerIssueTo(code: string, rag: string, kind: DrillKind | null = drill) {
    if (rag === "Amber" || rag === "Red") return issueHrefForDrill(code, kind);
    return `/customers/${encodeURIComponent(code)}`;
  }

  function applyView(v: EstateView) {
    setActiveView(v.id);
    setDrill((v.drill as DrillKind) ?? null);
    persistActiveEstateView(v.id);
  }

  function saveCurrentView() {
    if (!drill) return;
    const label = window.prompt("Name this view", drillTitle || "My view");
    if (!label?.trim()) return;
    const next: EstateView = {
      id: `v-${Date.now()}`,
      label: label.trim().slice(0, 32),
      drill,
    };
    const list = [...customViews, next];
    setCustomViews(list);
    persistCustomEstateViews(list);
    setActiveView(next.id);
    persistActiveEstateView(next.id);
  }

  function removeView(id: string) {
    const list = customViews.filter((v) => v.id !== id);
    setCustomViews(list);
    persistCustomEstateViews(list);
    if (activeView === id) applyView(ESTATE_VIEWS[0]);
  }

  const slaAvg = (() => {
    const withSla = scoreboard.filter((b) => b.slaOverallPct != null);
    if (!withSla.length) return exco.estateAssurancePct;
    return Math.round(
      withSla.reduce((s, b) => s + (b.slaOverallPct as number), 0) / withSla.length,
    );
  })();

  const slaByService = useMemo(() => {
    const avg = (pick: (b: (typeof scoreboard)[number]) => number | null | undefined) => {
      const xs = scoreboard.map(pick).filter((n): n is number => n != null && Number.isFinite(n));
      if (!xs.length) return null;
      return Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
    };
    return {
      syspro: avg((b) => b.slaSyspro?.pct ?? null),
      rmm: avg((b) => b.slaRmm?.pct ?? null),
      cove: avg((b) => b.slaCove?.pct ?? null),
      epp: avg((b) => b.slaEpp?.pct ?? null),
    };
  }, [scoreboard]);

  const serversOnline = scoreboard.reduce((s, b) => s + (b.pulsewayServerOnline ?? 0), 0);
  const serversOffline = scoreboard.reduce((s, b) => s + (b.pulsewayServerOffline ?? 0), 0);

  const collectFreshness = useMemo(() => {
    function latest(vals: Array<string | null | undefined>) {
      let max = 0;
      for (const v of vals) {
        if (!v) continue;
        const t = new Date(v).getTime();
        if (Number.isFinite(t) && t > max) max = t;
      }
      return max || null;
    }
    function age(ms: number | null) {
      if (!ms) return { label: "No collect", tone: "muted" as const };
      const h = (Date.now() - ms) / 3600000;
      if (h < 1) return { label: `${Math.max(1, Math.round(h * 60))}m ago`, tone: "green" as const };
      if (h <= 24) return { label: `${Math.round(h)}h ago`, tone: "green" as const };
      if (h <= 72) return { label: `${Math.round(h)}h ago`, tone: "amber" as const };
      return { label: `${Math.round(h / 24)}d ago`, tone: "red" as const };
    }
    return [
      { k: "SYSPRO", ...age(latest(rows.map((r) => r.lastImportAt))) },
      { k: "RMM", ...age(latest(rows.map((r) => r.pulsewayLastImportAt))) },
      { k: "Backup", ...age(latest(rows.map((r) => r.coveLastImportAt))) },
      { k: "EPP", ...age(latest(rows.map((r) => r.eppLastImportAt))) },
      { k: "M365", ...age(latest(rows.map((r) => r.cspLastImportAt))) },
    ];
  }, [rows]);

  const viewCounts: Record<string, number> = {
    all: scoreboard.length,
    attention: attention.length,
    finsight: scoreboard.filter((b) => (b.dtrVarianceLines || 0) > 0).length,
    sla: scoreboard.filter((b) => b.slaOverallPct != null && (b.slaOverallPct as number) < 80).length,
    stale: scoreboard.filter((b) => b.coverSyspro && !b.collectFresh).length,
  };

  function wgt(id: ExcoWidgetId) {
    const meta = widgetMeta(id);
    return {
      "data-span": meta.span,
      style: {
        order: widgetLayout.order.indexOf(id),
        display: widgetLayout.hidden.includes(id) ? "none" : undefined,
      } as CSSProperties,
    };
  }

  return (
    <RequireAuth>
      <AppShell>
        <div className="rpma-context-bar" role="navigation" aria-label="Exco path">
          <h2 className="text-[15px] font-bold tracking-tight text-fg sm:text-base">
            Customer Eco-System
          </h2>
          <span className="hidden text-[11px] text-muted sm:inline">
            {liveLabel} · SLA {slaAvg}%
          </span>
          <RagBadge rag={rag.overall} />
          <span className="ml-auto text-[11px] text-muted">
            {rag.red} red · {rag.amber} amber · {rag.green} green
          </span>
        </div>
        <div className="rpma-d3-workspace is-tool is-exco">
          <ExcoWorkspaceRail
            views={allEstateViews(customViews)}
            viewCounts={viewCounts}
            activeView={activeView}
            onView={applyView}
            onRemoveView={removeView}
            boards={scoreboard}
            slaAvg={slaAvg}
            estateRag={rag.overall}
          />
          <div className="rpma-d3-detail min-w-0">
            <div className="rpma-pane-menubar" role="banner">
              <h2 className="rpma-pane-menubar-title">Customer Eco-System</h2>
              <div className="rpma-pane-coverline">
                <CustomizeWidgetsButton
                  open={customizeOpen}
                  onClick={() => setCustomizeOpen((v) => !v)}
                />
              </div>
            </div>
            <div className="rpma-d3-detail-body">
        <div className="rpma-exco space-y-4">
          <HeadsUpDisplay
            liveSql={source.liveOk || summary.dataMode === "live"}
            generatedAt={exco.generatedAt || summary.generatedAt}
          />
          {customizeOpen ? (
            <CustomizeWidgetsPanel
              layout={widgetLayout}
              onChange={setWidgetLayout}
              onClose={() => setCustomizeOpen(false)}
            />
          ) : null}
          <div className="rpma-exco-board">
          <section className={cn("rpma-pane is-tile", `is-${estateTone}`)} id="exco-brief" {...wgt("brief")}>
            <PaneHead tip="Each KPI tile lights Green / Amber / Red. Click an amber tile to open that customer's amber issues (or the amber list if several).">
              Executive Brief
            </PaneHead>
            <div className="rpma-pane-body">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-[15px] font-extrabold tracking-tight text-fg">
                  Customer Eco-System is{" "}
                  <span className={rag.overall === "Green" ? "text-rag-green" : rag.overall === "Amber" ? "text-rag-amber" : "text-rag-red"}>
                    {rag.overall}
                  </span>
                  <span className="ml-2 text-[12px] font-semibold text-muted">
                    {rag.red} red · {rag.amber} amber · {rag.green} green · {attention.length} attention
                  </span>
                </h3>
              </div>
              <p className="text-[12px] text-muted">{liveLabel} · SLA {slaAvg}%</p>
            </div>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
              {collectFreshness.map((x) => (
                <li key={x.k} className="flex items-center gap-1.5 text-[12px]">
                  <span className="font-semibold text-muted">{x.k}</span>
                  <span className={cn(
                    "font-medium",
                    x.tone === "green" && "text-rag-green",
                    x.tone === "amber" && "text-rag-amber",
                    x.tone === "red" && "text-rag-red",
                    x.tone === "muted" && "text-subtle",
                  )}>{x.label}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-12">
              {[
                { k: "rag-red" as DrillKind, l: "Red", v: rag.red, t: "red" as const, tip: "Customers whose overall health is Red. Open one to see which service is failing." },
                { k: "rag-amber" as DrillKind, l: "Amber", v: rag.amber, t: "amber" as const, tip: "Customers on Amber — usually one pillar degraded or collect ageing." },
                { k: "attention" as DrillKind, l: "Attention", v: attention.length, t: "amber" as const, tip: "Needs an owner this week: health, SLA, stale collect or open incidents." },
                { k: "incidents" as DrillKind, l: "Incidents", v: incidents.length, t: "red" as const, tip: "Open major incidents across the estate." },
                { k: "jobs" as DrillKind, l: "Job Errors", v: scoreboard.filter((b) => (b.jobErrorCount || 0) > 0).length, t: "red" as const, tip: "SYSPRO companies with failed or errored jobs on the last collect." },
                { k: "finsight" as DrillKind, l: "FinSight OOB", v: finsightEstate.oobCustomers, t: "amber" as const, tip: "Customers with out-of-balance FinSight control lines." },
                { k: "rmm-offline" as DrillKind, l: "Servers Off", v: scoreboard.filter((b) => (b.pulsewayServerOffline || 0) > 0).length, t: "red" as const, tip: "Customers with at least one Pulseway server offline." },
                { k: "rmm-critical" as DrillKind, l: "RMM Critical", v: scoreboard.filter((b) => (b.pulsewayCriticalAlerts || 0) > 0).length, t: "red" as const, tip: "Customers with Pulseway critical alerts still open." },
                { k: "backup" as DrillKind, l: "Backup Issues", v: exco.backupUnhealthyCount, t: "amber" as const, tip: "Customers with failed or stale Cove backups on the latest collect." },
                { k: "stale" as DrillKind, l: "Stale Collect", v: exco.collectStaleCount, t: "amber" as const, tip: "Last SYSPRO / agent collect is older than 24 hours." },
                { k: "risks" as DrillKind, l: "Open Risks", v: exco.openRisksTotal, t: "amber" as const, tip: "Open Customer Assurance risks that still need a mitigation owner." },
                { k: "attention" as DrillKind, l: "SLA Avg", v: `${slaAvg}%`, t: slaAvg >= 80 ? ("green" as const) : slaAvg >= 55 ? ("amber" as const) : ("red" as const), tip: "Average SLA across covered services. Target blend is 80%+ green." },
              ].map((x, i) => (
                <button
                  key={`${x.l}-${i}`}
                  type="button"
                  onClick={() => openTile((Number(x.v) > 0 || String(x.v).includes("%")) ? x.t : "green", x.k)}
                  className={cn("rpma-kpi-tile rpma-hovertip", `is-${(Number(x.v) > 0 || x.t === "green") ? x.t : "green"}`, drill === x.k && "is-on")}
                >
                  <MetricLabel tip={x.tip} showIcon={false}>{x.l}</MetricLabel>
                  <p className={cn("font-mono text-[15px] font-bold tabular-nums leading-tight",
                    x.t === "red" && Number(x.v) > 0 ? "text-rag-red" :
                    x.t === "amber" && Number(x.v) > 0 ? "text-rag-amber" :
                    x.t === "green" ? "text-rag-green" : "text-fg")}>{x.v}</p>
                  <span role="tooltip" className="rpma-help-bubble is-top">
                    {x.l}: {x.v}. {x.tip}
                    {(x.t === "amber" || x.t === "red") && Number(x.v) > 0
                      ? " Click to open the customer's amber/red issues."
                      : ""}
                  </span>
                </button>
              ))}
            </div>
            </div>
          </section>

          <section className={cn("rpma-pane is-tile", coverStats.n && (coverStats.syspro + coverStats.rmm + coverStats.cove + coverStats.epp + coverStats.csp) / (coverStats.n * 5) < 0.4 ? "is-amber" : "is-green")} id="exco-cover" {...wgt("cover")}>
              <PaneHead tip="Scope only — not live health. Chip on the tenant rail is Cover / No Cover. This tile lights amber if estate cover is thin.">
                Services On Cover
              </PaneHead>
              <ul className="rpma-pane-body space-y-2">
                {[
                  ["SYSPRO", coverStats.syspro],
                  ["Remote Management", coverStats.rmm],
                  ["Cloud Backup", coverStats.cove],
                  ["RPM EPP", coverStats.epp],
                  ["Microsoft 365 CSP", coverStats.csp],
                ].map(([name, n]) => (
                  <li key={String(name)}>
                    <HoverTip
                      className="flex w-full items-center gap-2 text-[12px]"
                      text={`${name}: ${n} of ${coverStats.n} customers on cover (${coverStats.n ? Math.round((Number(n) / coverStats.n) * 100) : 0}%). Scope only — not live health.`}
                    >
                      <span className="min-w-0 flex-1 truncate font-medium text-fg">{name}</span>
                      <span className="font-mono text-[12px] font-bold tabular-nums">{n}</span>
                      <span className="w-16 text-right text-[10px] text-muted">of {coverStats.n}</span>
                      <span className="rpma-impact-track !h-1.5 w-16">
                        <span className="rpma-impact-bar is-green" style={{ width: `${coverStats.n ? Math.round((Number(n) / coverStats.n) * 100) : 0}%` }} />
                      </span>
                    </HoverTip>
                  </li>
                ))}
              </ul>
            </section>
            <section className={cn("rpma-pane is-tile is-click", slaAvg >= 80 ? "is-green" : slaAvg >= 55 ? "is-amber" : "is-red")} id="exco-sla" {...wgt("sla")} onClick={() => openTile(slaAvg >= 80 ? "green" : slaAvg >= 55 ? "amber" : "red", "sla")}>
              <PaneHead tip="Live SLA for covered services. Amber/red tile opens the customers missing target.">
                SLA By Service
              </PaneHead>
              <ul className="rpma-pane-body space-y-2">
                {[
                  ["SYSPRO", slaByService.syspro],
                  ["Remote Management", slaByService.rmm],
                  ["Cloud Backup", slaByService.cove],
                  ["RPM EPP", slaByService.epp],
                ].map(([name, pct]) => {
                  const n = pct as number | null;
                  const target =
                    name === "Remote Management" ? 99.9 : name === "Cloud Backup" ? 99.5 : name === "RPM EPP" ? 98 : 90;
                  const tone = n == null ? "" : n >= target ? "text-rag-green" : n >= target - 5 ? "text-rag-amber" : "text-rag-red";
                  const bar = n == null ? "" : n >= target ? "is-green" : n >= target - 5 ? "is-amber" : "is-red";
                  return (
                    <li key={String(name)}>
                      <HoverTip
                        className="flex w-full items-center gap-2 text-[12px]"
                        text={`${name} SLA ${n == null ? "not scored (no cover)" : n + "%"}. Target ${target}%. ${n == null ? "" : n >= target ? "On target." : n >= target - 5 ? "Amber — within 5 points of target." : "Red — below target."}`}
                      >
                        <span className="min-w-0 flex-1 truncate font-medium text-fg">{name}</span>
                        <span className={cn("font-mono text-[12px] font-bold tabular-nums", tone)}>{n == null ? "—" : `${n}%`}</span>
                        <span className="rpma-impact-track !h-1.5 w-20">
                          <span className={cn("rpma-impact-bar", bar)} style={{ width: `${n ?? 0}%` }} />
                        </span>
                      </HoverTip>
                    </li>
                  );
                })}
              </ul>
            </section>
            <section className={cn("rpma-pane is-tile", (serversOffline > 0 || (exco.coveFailedTotal ?? 0) > 0) ? "is-red" : ((exco.coveStaleTotal ?? 0) > 0 || (exco.rmmDiskHighTotal ?? 0) > 0 || (exco.eppUnmanagedTotal ?? 0) > 0) ? "is-amber" : "is-green")} {...wgt("pulse")}>
              <PaneHead tip="Operations pulse. The tile glows the worst live signal. Click an amber KPI above to jump to that customer's issue.">
                Operations Pulse
              </PaneHead>
              <div className="rpma-pane-body grid grid-cols-2 gap-2">
                <div className="rpma-metric-cell rpma-hovertip rounded-md bg-surface-2 px-2 py-1.5">
                  <MetricLabel showIcon={false} tip="Pulseway servers reporting online on the latest collect.">Online</MetricLabel>
                  <span role="tooltip" className="rpma-help-bubble is-top">Online: Pulseway servers reporting online on the latest collect.</span>
                  <p className="font-mono text-[15px] font-bold text-rag-green">{serversOnline}</p>
                </div>
                <div className="rpma-metric-cell rpma-hovertip rounded-md bg-surface-2 px-2 py-1.5">
                  <MetricLabel showIcon={false} tip="Pulseway servers that have not checked in. Any count above 0 is red.">Servers Offline</MetricLabel>
                  <span role="tooltip" className="rpma-help-bubble is-top">Servers Offline: Pulseway servers that have not checked in. Any count above 0 is red.</span>
                  <p className={cn("font-mono text-[15px] font-bold", serversOffline > 0 ? "text-rag-red" : "text-fg")}>{serversOffline}</p>
                </div>
                <div className="rpma-metric-cell rpma-hovertip rounded-md bg-surface-2 px-2 py-1.5">
                  <MetricLabel showIcon={false} tip="Online servers ÷ (online + offline). Target 99.9%. Below 99% is amber.">Server Availability</MetricLabel>
                  <span role="tooltip" className="rpma-help-bubble is-top">Server Availability: Online servers ÷ (online + offline). Target 99.9%. Below 99% is amber.</span>
                  <p className={cn("font-mono text-[15px] font-bold", (exco.rmmServerAvailabilityPct ?? 100) < 99 ? "text-rag-amber" : "text-rag-green")}>
                    {exco.rmmServerAvailabilityPct == null ? "—" : `${exco.rmmServerAvailabilityPct}%`}
                  </p>
                </div>
                <div className="rpma-metric-cell rpma-hovertip rounded-md bg-surface-2 px-2 py-1.5">
                  <MetricLabel showIcon={false} tip="Share of servers with current OS patches. Below 90% is amber.">Patch Compliance</MetricLabel>
                  <span role="tooltip" className="rpma-help-bubble is-top">Patch Compliance: Share of servers with current OS patches. Below 90% is amber.</span>
                  <p className={cn("font-mono text-[15px] font-bold", (exco.rmmPatchCompliancePct ?? 100) < 90 ? "text-rag-amber" : "text-rag-green")}>
                    {exco.rmmPatchCompliancePct == null ? "—" : `${exco.rmmPatchCompliancePct}%`}
                  </p>
                </div>
                <div className="rpma-metric-cell rpma-hovertip rounded-md bg-surface-2 px-2 py-1.5">
                  <MetricLabel showIcon={false} tip="Servers with a volume over the disk-risk threshold (typically 85%+ used).">Disk At Risk</MetricLabel>
                  <span role="tooltip" className="rpma-help-bubble is-top">Disk At Risk: Servers with a volume over the disk-risk threshold (typically 85%+ used).</span>
                  <p className={cn("font-mono text-[15px] font-bold", (exco.rmmDiskHighTotal ?? 0) > 0 ? "text-rag-amber" : "text-fg")}>
                    {exco.rmmDiskHighTotal ?? 0}
                  </p>
                </div>
                <div className="rpma-metric-cell rpma-hovertip rounded-md bg-surface-2 px-2 py-1.5">
                  <MetricLabel showIcon={false} tip="Cove devices whose last backup failed or has no success in 72 hours.">Backup Failed</MetricLabel>
                  <span role="tooltip" className="rpma-help-bubble is-top">Backup Failed: Cove devices whose last backup failed or has no success in 72 hours.</span>
                  <p className={cn("font-mono text-[15px] font-bold", (exco.coveFailedTotal ?? 0) > 0 ? "text-rag-red" : "text-fg")}>
                    {exco.coveFailedTotal ?? 0}
                  </p>
                </div>
                <div className="rpma-metric-cell rpma-hovertip rounded-md bg-surface-2 px-2 py-1.5">
                  <MetricLabel showIcon={false} tip="Cove devices whose last successful backup is older than 36 hours.">Backup Stale</MetricLabel>
                  <span role="tooltip" className="rpma-help-bubble is-top">Backup Stale: Cove devices whose last successful backup is older than 36 hours.</span>
                  <p className={cn("font-mono text-[15px] font-bold", (exco.coveStaleTotal ?? 0) > 0 ? "text-rag-amber" : "text-fg")}>
                    {exco.coveStaleTotal ?? 0}
                  </p>
                </div>
                <div className="rpma-metric-cell rpma-hovertip rounded-md bg-surface-2 px-2 py-1.5">
                  <MetricLabel showIcon={false} tip="RPM EPP endpoints not under a managed policy, versus all mapped endpoints.">EPP Unmanaged</MetricLabel>
                  <span role="tooltip" className="rpma-help-bubble is-top">EPP Unmanaged: RPM EPP endpoints not under a managed policy, versus all mapped endpoints.</span>
                  <p className={cn("font-mono text-[15px] font-bold", (exco.eppUnmanagedTotal ?? 0) > 0 ? "text-rag-amber" : "text-fg")}>
                    {exco.eppUnmanagedTotal ?? 0}
                    <span className="ml-1 text-[10px] font-semibold text-muted">/ {exco.eppEndpointTotal ?? 0}</span>
                  </p>
                </div>
                <div className="rpma-metric-cell rpma-hovertip rounded-md bg-surface-2 px-2 py-1.5">
                  <MetricLabel showIcon={false} tip="Customers whose last SYSPRO / agent collect is within 24 hours.">Collect Fresh</MetricLabel>
                  <span role="tooltip" className="rpma-help-bubble is-top">Collect Fresh: Customers whose last SYSPRO / agent collect is within 24 hours.</span>
                  <p className="font-mono text-[15px] font-bold text-rag-green">{exco.collectFreshCount}</p>
                </div>
                <div className="rpma-metric-cell rpma-hovertip rounded-md bg-surface-2 px-2 py-1.5">
                  <MetricLabel showIcon={false} tip="Customers whose last collect is older than 24 hours. Check the edge agent.">Collect Stale</MetricLabel>
                  <span role="tooltip" className="rpma-help-bubble is-top">Collect Stale: Customers whose last collect is older than 24 hours. Check the edge agent.</span>
                  <p className={cn("font-mono text-[15px] font-bold", exco.collectStaleCount > 0 ? "text-rag-amber" : "text-fg")}>{exco.collectStaleCount}</p>
                </div>
                <div className="rpma-metric-cell rpma-hovertip rounded-md bg-surface-2 px-2 py-1.5">
                  <MetricLabel showIcon={false} tip="SYSPRO companies with no FinSight out-of-balance lines on the latest close.">FinSight Clear</MetricLabel>
                  <span role="tooltip" className="rpma-help-bubble is-top">FinSight Clear: SYSPRO companies with no FinSight out-of-balance lines on the latest close.</span>
                  <p className="font-mono text-[15px] font-bold text-rag-green">{finsightEstate.clearCustomers}</p>
                </div>
                <div className="rpma-metric-cell rpma-hovertip rounded-md bg-surface-2 px-2 py-1.5">
                  <MetricLabel showIcon={false} tip="Total out-of-balance FinSight control lines across the estate. Each line needs a finance owner.">OOB Lines</MetricLabel>
                  <span role="tooltip" className="rpma-help-bubble is-top">OOB Lines: Total out-of-balance FinSight control lines across the estate. Each line needs a finance owner.</span>
                  <p className={cn("font-mono text-[15px] font-bold", finsightEstate.totalOobLines > 0 ? "text-rag-amber" : "text-fg")}>{finsightEstate.totalOobLines}</p>
                </div>
              </div>
            </section>

            <section className={cn("rpma-pane is-tile", (matrixCells.get("High|High") ?? []).length ? "is-red" : (matrixCells.get("High|Medium") ?? []).length || (matrixCells.get("Medium|High") ?? []).length ? "is-amber" : "is-green")} {...wgt("matrix")}>
              <PaneHead tip="Impact versus likelihood. Click a cell. Amber/red cells with one customer open that tenant's issues.">
                Risk Matrix
              </PaneHead>
              <div className="rpma-pane-body">
              <div className="rpma-heat">
                <span className="rpma-heat-ylab">Impact</span>
                <div className="rpma-heat-grid">
                  <span />
                  <span className="rpma-heat-axis">Low</span>
                  <span className="rpma-heat-axis">Med</span>
                  <span className="rpma-heat-axis">High</span>
                  {(["High", "Medium", "Low"] as RiskAxis[]).map((impact) => (
                    <div key={impact} className="contents">
                      <span className="rpma-heat-axis is-y">{impact}</span>
                      {(["Low", "Medium", "High"] as RiskAxis[]).map((likelihood) => {
                        const pts = matrixCells.get(`${impact}|${likelihood}`) ?? [];
                        const tone = matrixTone(impact, likelihood);
                        const key = `matrix-${impact}-${likelihood}` as DrillKind;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => toggleDrill(key)}
                            className={cn("rpma-heat-cell rpma-hovertip", `is-${tone}`, drill === key && "is-on")}
                          >
                            <span className="rpma-heat-n">{pts.length}</span>
                            <span role="tooltip" className="rpma-help-bubble is-top">
                              Impact {impact} · Likelihood {likelihood}: {pts.length} customer{pts.length === 1 ? "" : "s"}
                              {pts.length ? ` — ${pts.slice(0, 3).map((x) => x.displayName).join(", ")}` : ""}.
                              {tone !== "green" && pts.length === 1 ? " Click opens that customer's issues." : ""}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
              </div>
            </section>

            <section className={cn("rpma-pane is-tile", riskPoints.some((p) => p.healthRag === "Red") ? "is-red" : riskPoints.some((p) => p.healthRag === "Amber") ? "is-amber" : "is-green")} {...wgt("impact")}>
              <PaneHead tip="Customers ranked by impact. Click an amber/red name to open that customer's issues.">
                Impact
              </PaneHead>
              <ol className="rpma-impact rpma-pane-body">
                {[...riskPoints]
                  .sort((a, b) => b.impactScore - a.impactScore || b.likeScore - a.likeScore)
                  .slice(0, 7)
                  .map((p) => {
                    const max = Math.max(1, ...riskPoints.map((x) => x.impactScore));
                    const pct = Math.round((p.impactScore / max) * 100);
                    return (
                      <li key={p.customerCode}>
                        <SpaLink href={customerIssueTo(p.customerCode, p.healthRag)} className="rpma-impact-row rpma-hovertip">
                          <span className="rpma-impact-name">{p.displayName}</span>
                          <span className="rpma-impact-track">
                            <span className={cn("rpma-impact-bar",
                              p.healthRag === "Red" && "is-red",
                              p.healthRag === "Amber" && "is-amber",
                              p.healthRag === "Green" && "is-green")}
                              style={{ width: `${Math.max(8, pct)}%` }} />
                          </span>
                          <span className="rpma-impact-score">{p.impactScore}</span>
                          <span role="tooltip" className="rpma-help-bubble is-top">
                            {p.displayName} is {p.healthRag}. Impact {p.impactScore}. {p.drivers.slice(0, 3).join(" · ") || "No drivers"}.
                            {p.healthRag !== "Green" ? " Click to open amber/red issues." : ""}
                          </span>
                        </SpaLink>
                      </li>
                    );
                  })}
              </ol>
            </section>

            <section className={cn("rpma-pane is-tile", m365Estate.mfaGap > 0 || m365Estate.highGa > 0 ? "is-amber" : "is-green")} {...wgt("m365")}>
              <PaneHead tip="Microsoft 365 CSP estate posture. Amber means MFA gaps or too many Global Admins.">
                Microsoft 365 CSP
              </PaneHead>
              <div className="rpma-pane-body">
              <div className="grid grid-cols-2 gap-2">
                <div className="rpma-metric-cell rpma-hovertip rounded-md bg-surface-2 px-2 py-1.5">
                  <MetricLabel showIcon={false} tip="Customers with an active Microsoft 365 CSP tenant mapped in Assure.">Tenants</MetricLabel>
                  <span role="tooltip" className="rpma-help-bubble is-top">Tenants: Customers with an active Microsoft 365 CSP tenant mapped in Assure.</span>
                  <p className="font-mono text-[15px] font-bold">{m365Estate.tenants}</p>
                </div>
                <div className="rpma-metric-cell rpma-hovertip rounded-md bg-surface-2 px-2 py-1.5">
                  <MetricLabel showIcon={false} tip="Average Microsoft Secure Score across mapped tenants. Higher is better.">Secure Score</MetricLabel>
                  <span role="tooltip" className="rpma-help-bubble is-top">Secure Score: Average Microsoft Secure Score across mapped tenants. Higher is better.</span>
                  <p className="font-mono text-[15px] font-bold">{m365Estate.avgScore == null ? "—" : `${m365Estate.avgScore}%`}</p>
                </div>
                <div className="rpma-metric-cell rpma-hovertip rounded-md bg-surface-2 px-2 py-1.5">
                  <MetricLabel showIcon={false} tip="Licensed users who are not registered for MFA. Each one is a credential-risk conversation.">MFA Gaps</MetricLabel>
                  <span role="tooltip" className="rpma-help-bubble is-top">MFA Gaps: Licensed users who are not registered for MFA. Each one is a credential-risk conversation.</span>
                  <p className={cn("font-mono text-[15px] font-bold", m365Estate.mfaGap > 0 ? "text-rag-amber" : "text-fg")}>{m365Estate.mfaGap}</p>
                </div>
                <div className="rpma-metric-cell rpma-hovertip rounded-md bg-surface-2 px-2 py-1.5">
                  <MetricLabel showIcon={false} tip="Tenants with more Global Admins than the agreed control (typically more than 4).">High GA Count</MetricLabel>
                  <span role="tooltip" className="rpma-help-bubble is-top">High GA Count: Tenants with more Global Admins than the agreed control (typically more than 4).</span>
                  <p className={cn("font-mono text-[15px] font-bold", m365Estate.highGa > 0 ? "text-rag-amber" : "text-fg")}>{m365Estate.highGa}</p>
                </div>
              </div>
              <p className="mt-3 text-[12px] text-muted">
                Seats {m365Estate.assigned} / {m365Estate.seats || "—"} assigned
              </p>
              </div>
            </section>

            <section className={cn("rpma-pane is-tile", (drill ? drillRows : attention).some((b) => b.healthRag === "Red") ? "is-red" : (drill ? drillRows : attention).length ? "is-amber" : "is-green")} id="exco-decisions" {...wgt("decisions")}>
              <PaneHead tip="Who needs a decision. Click an amber customer to go straight to their amber issues.">
                {drill ? drillTitle : "Who Needs A Decision"}
              </PaneHead>
              <div className="rpma-pane-body">
              {(drill ? drillRows : attention).length === 0 ? (
                <p className="text-[12px] text-muted">
                  {drill ? "No customers in this view." : "Customer Eco-System is clear."}
                </p>
              ) : (
                <ul className="space-y-1">
                  {(drill ? drillRows : attention).slice(0, 8).map((b) => (
                    <li key={b.customerCode}>
                      <SpaLink href={customerIssueTo(b.customerCode, b.healthRag)} className="rpma-exco-row flex items-center gap-2 rounded px-1.5 py-1">
                        <RagBadge rag={b.healthRag} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12px] font-semibold text-fg">{b.displayName}</span>
                          <span className="line-clamp-1 text-[10px] text-muted">{b.attentionReasons.slice(0, 2).join(" · ")}</span>
                        </span>
                        <span className="font-mono text-[10px] text-muted">{b.slaOverallPct != null ? `${b.slaOverallPct}%` : "—"}</span>
                      </SpaLink>
                    </li>
                  ))}
                </ul>
              )}
              </div>
            </section>

            <section className={cn("rpma-pane is-tile", incidents.some((i) => i.severity === "Red") ? "is-red" : incidents.length ? "is-amber" : "is-green")} {...wgt("incidents")}>
              <div className="rpma-pane-head-row">
                <h2 className="rpma-pane-head">
                  <span className="rpma-pane-head-inner">
                    {drill ? drillTitle : "Major Incidents"}
                    <HelpTip text="P1/P2 style incidents from Customer Assurance. Click a row to open that tenant. Use Clear after a KPI drill." />
                  </span>
                </h2>
                {drill ? (
                  <button type="button" onClick={() => setDrill(null)} className="text-[11px] font-bold text-fg">Clear</button>
                ) : null}
              </div>
              <div className="rpma-pane-body">
              {!drill ? (
                incidents.length === 0 ? (
                  <p className="text-[12px] text-muted">No major incidents.</p>
                ) : (
                  <ul className="space-y-1">
                    {incidents.slice(0, 7).map((it, i) => (
                      <li key={`${it.customerCode}-${i}`}>
                        <Link to={it.to} className="flex items-center gap-1.5 rounded px-1 py-1 text-[12px] hover:bg-surface-2">
                          <Badge variant={it.severity === "Red" ? "red" : "amber"}>{it.severity}</Badge>
                          <span className="min-w-0 truncate font-semibold text-fg">{it.displayName}</span>
                          <span className="min-w-0 truncate text-muted">{it.text}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )
              ) : drillRows.length === 0 ? (
                <p className="text-[12px] text-muted">Nothing in this slice.</p>
              ) : (
                <ul className="max-h-56 space-y-1 overflow-y-auto">
                  {drillRows.map((b) => (
                    <li key={b.customerCode}>
                      <SpaLink href={customerIssueTo(b.customerCode, b.healthRag)} className="rpma-exco-row flex items-center gap-2 rounded px-1.5 py-1">
                        <RagBadge rag={b.healthRag} />
                        <span className="min-w-0 flex-1 truncate text-[12px] font-semibold">{b.displayName}</span>
                      </SpaLink>
                    </li>
                  ))}
                </ul>
              )}
              </div>
            </section>

            <section className={cn("rpma-pane is-tile is-click", finsightEstate.oobCustomers ? "is-amber" : "is-green")} {...wgt("finsight")} onClick={() => openTile(finsightEstate.oobCustomers ? "amber" : "green", "finsight")}>
              <PaneHead tip="FinSight close. Amber tile opens the customer with out-of-balance lines (or the list if several).">
                FinSight Close
              </PaneHead>
              <div className="rpma-pane-body">
              {finsightEstate.worst.length === 0 ? (
                <p className="text-[12px] text-muted">Control accounts clear on covered SYSPRO tenants.</p>
              ) : (
                <ul className="space-y-1" onClick={(e) => e.stopPropagation()}>
                  {finsightEstate.worst.map((b) => (
                    <li key={b.customerCode}>
                      <Link to="/customers/$code/syspro/dtr" params={{ code: b.customerCode }} className="flex items-center gap-2 rounded px-1 py-1 text-[12px] hover:bg-surface-2">
                        <span className="min-w-0 flex-1 truncate font-semibold">{b.displayName}</span>
                        <span className="font-mono text-[11px] font-bold text-rag-amber">{b.dtrVarianceLines}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              </div>
            </section>
          </div>
        </div>
            </div>
          </div>
        </div>
      </AppShell>
    </RequireAuth>
  );
}
