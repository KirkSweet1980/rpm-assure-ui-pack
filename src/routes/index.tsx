import { Link, createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { cn, formatSastDateTime } from "@/lib/utils";
import { ChevronRight, RefreshCw } from "lucide-react";

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
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "green" | "amber" | "red";
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
      <p className="truncate text-[10px] font-bold uppercase tracking-wide text-subtle">
        {label}
      </p>
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
    setDrill((cur) => (cur === k ? null : k));

  return (
    <RequireAuth>
      <AppShell
        title="Executive Summary"
        subtitle={
          (dash.estateSubtitle || "").trim() ||
          `Estate posture · ${liveLabel} · ${formatSastDateTime(exco.generatedAt || summary.generatedAt)}`
        }
      >
        <div className="rpma-exco space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={summary.dataMode === "demo" ? "amber" : "green"}>
              {liveLabel}
            </Badge>
            {source.liveOk ? (
              <Badge variant="green">SQL connected</Badge>
            ) : source.error ? (
              <Badge variant="red">SQL issue</Badge>
            ) : null}
            <span className="text-[11px] text-subtle">
              {exco.boards.length} customers
            </span>
            <span className="ml-auto flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-subtle">
                Updated{" "}
                {ageSec < 5
                  ? "just now"
                  : ageSec < 60
                    ? `${ageSec}s ago`
                    : `${Math.floor(ageSec / 60)}m ${ageSec % 60}s ago`}
                {nextIn != null ? ` · next ${nextIn}s` : " · auto off"}
              </span>
              <button
                type="button"
                onClick={() => setAutoEnabled((v) => !v)}
                className={
                  "min-h-9 rounded-md border px-2 py-1 text-[11px] font-semibold transition " +
                  (autoEnabled && autoSec > 0
                    ? "border-accent/40 bg-accent-soft/50 text-fg"
                    : "border-border bg-surface text-muted")
                }
              >
                {autoEnabled && autoSec > 0 ? `Auto ${autoSec}s` : "Auto off"}
              </button>
              <button
                type="button"
                disabled={refreshing}
                onClick={() => void refreshEstate(true)}
                className="inline-flex min-h-9 items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 text-[11px] font-semibold text-fg transition hover:border-accent/40 disabled:opacity-50"
              >
                <RefreshCw
                  className={
                    "h-3.5 w-3.5 " + (refreshing ? "animate-spin text-accent" : "")
                  }
                />
                {refreshing ? "Updating…" : "Refresh now"}
              </button>
            </span>
          </div>
          {refreshError ? (
            <p className="rounded-lg border border-rag-amber/40 bg-rag-amber/10 px-3 py-2 text-xs text-fg">
              Auto-update: {refreshError}
            </p>
          ) : null}

          {/* 1. Overall RAG */}
          <section className="rounded-xl border border-border bg-surface p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-[13px] font-bold text-fg">Overall RAG Status</h2>
              <RagBadge rag={rag.overall} />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <DrillTile
                label="Overall"
                value={rag.overall}
                sub={`${rag.total} in view`}
                tone={
                  rag.overall === "Green"
                    ? "green"
                    : rag.overall === "Amber"
                      ? "amber"
                      : "red"
                }
              />
              <DrillTile
                label="Green"
                value={rag.green}
                sub="click to list"
                tone="green"
                active={drill === "rag-green"}
                onClick={() => toggleDrill("rag-green")}
              />
              <DrillTile
                label="Amber"
                value={rag.amber}
                sub="click to list"
                tone="amber"
                active={drill === "rag-amber"}
                onClick={() => toggleDrill("rag-amber")}
              />
              <DrillTile
                label="Red"
                value={rag.red}
                sub="click to list"
                tone="red"
                active={drill === "rag-red"}
                onClick={() => toggleDrill("rag-red")}
              />
            </div>
          </section>

          {/* 2. KPIs */}
          <section className="rounded-xl border border-border bg-surface p-3">
            <h2 className="mb-2 text-[13px] font-bold text-fg">
              Key Performance Indicators
            </h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10">
              <DrillTile
                label="Assurance"
                value={`${exco.estateAssurancePct}%`}
                tone={estateTone}
                sub="estate health"
              />
              <DrillTile
                label="Attention"
                value={exco.customersNeedingAttention}
                tone={exco.customersNeedingAttention > 0 ? "amber" : "green"}
                sub="customers"
                active={drill === "attention"}
                onClick={() => toggleDrill("attention")}
              />
              <DrillTile
                label="Job errors"
                value={scoreboard.reduce((s, b) => s + (b.jobErrorCount || 0), 0)}
                tone={
                  scoreboard.some((b) => (b.jobErrorCount || 0) > 0) ? "red" : "green"
                }
                sub="SYSPRO jobs"
                active={drill === "jobs"}
                onClick={() => toggleDrill("jobs")}
              />
              <DrillTile
                label="FinSight OOB"
                value={finsightEstate.totalOobLines}
                tone={finsightEstate.oobCustomers > 0 ? "amber" : "green"}
                sub={`${finsightEstate.oobCustomers} customers`}
                active={drill === "finsight"}
                onClick={() => toggleDrill("finsight")}
              />
              <DrillTile
                label="Servers online"
                value={exco.rmmServerOnlineTotal ?? 0}
                tone="green"
                sub="Pulseway"
              />
              <DrillTile
                label="Servers offline"
                value={exco.rmmServerOfflineTotal ?? 0}
                tone={(exco.rmmServerOfflineTotal ?? 0) > 0 ? "red" : "green"}
                sub="click to list"
                active={drill === "rmm-offline"}
                onClick={() => toggleDrill("rmm-offline")}
              />
              <DrillTile
                label="Critical alerts"
                value={exco.rmmCriticalTotal ?? 0}
                tone={(exco.rmmCriticalTotal ?? 0) > 0 ? "red" : "green"}
                sub="RMM"
                active={drill === "rmm-critical"}
                onClick={() => toggleDrill("rmm-critical")}
              />
              <DrillTile
                label="Backup issues"
                value={exco.backupUnhealthyCount}
                tone={exco.backupUnhealthyCount > 0 ? "amber" : "green"}
                sub="customers"
                active={drill === "backup"}
                onClick={() => toggleDrill("backup")}
              />
              <DrillTile
                label="Stale collect"
                value={exco.collectStaleCount}
                tone={exco.collectStaleCount > 0 ? "amber" : "green"}
                sub="older than 24h"
                active={drill === "stale"}
                onClick={() => toggleDrill("stale")}
              />
              <DrillTile
                label="Risks / issues"
                value={`${exco.openRisksTotal} / ${exco.openIssuesTotal}`}
                tone={exco.openRisksTotal > 0 ? "amber" : "green"}
                sub="open"
                active={drill === "risks"}
                onClick={() => toggleDrill("risks")}
              />
            </div>
          </section>

          {/* Risk matrix + drill-down */}
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
            <section className="rounded-xl border border-border bg-surface p-3 xl:col-span-7">
              <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="text-[13px] font-bold text-fg">Risk matrix</h2>
                  <p className="text-[11px] text-muted">
                    Impact vs likelihood from live signals. Click a cell to drill.
                  </p>
                </div>
                <p className="text-[10px] text-subtle">
                  High impact + high likelihood = treat first
                </p>
              </div>
              <div className="overflow-x-auto">
                <div className="min-w-[520px]">
                  <div className="mb-1 grid grid-cols-[72px_repeat(3,minmax(0,1fr))] gap-1 text-center text-[10px] font-semibold uppercase tracking-wide text-muted">
                    <span />
                    <span>Low likelihood</span>
                    <span>Medium</span>
                    <span>High likelihood</span>
                  </div>
                  {(["High", "Medium", "Low"] as RiskAxis[]).map((impact) => (
                    <div
                      key={impact}
                      className="mb-1 grid grid-cols-[72px_repeat(3,minmax(0,1fr))] gap-1"
                    >
                      <div className="flex items-center justify-end pr-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
                        {impact}
                        {impact === "High" ? (
                          <span className="sr-only"> impact</span>
                        ) : null}
                      </div>
                      {(["Low", "Medium", "High"] as RiskAxis[]).map((likelihood) => {
                        const pts = matrixCells.get(`${impact}|${likelihood}`) ?? [];
                        const tone = matrixTone(impact, likelihood);
                        const key = `matrix-${impact}-${likelihood}` as DrillKind;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => toggleDrill(key)}
                            className={cn(
                              "min-h-[88px] rounded-lg border px-2 py-2 text-left transition",
                              drill === key && "ring-2 ring-accent",
                              tone === "red" &&
                                "border-rag-red/35 bg-rag-red/10 hover:bg-rag-red/15",
                              tone === "amber" &&
                                "border-rag-amber/35 bg-rag-amber/10 hover:bg-rag-amber/15",
                              tone === "green" &&
                                "border-rag-green/30 bg-rag-green/10 hover:bg-rag-green/15",
                            )}
                          >
                            <div className="flex items-baseline justify-between gap-1">
                              <span className="font-mono text-xl font-bold tabular-nums text-fg">
                                {pts.length}
                              </span>
                              <span className="text-[10px] text-muted">cust.</span>
                            </div>
                            <p className="mt-1 line-clamp-2 text-[10px] text-muted">
                              {pts.length === 0
                                ? "Clear"
                                : pts
                                    .slice(0, 3)
                                    .map((p) => p.displayName)
                                    .join(" · ")}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                  <p className="mt-1 text-right text-[10px] text-subtle">
                    Likelihood →
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-surface p-3 xl:col-span-5">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="text-[13px] font-bold text-fg">
                  {drill ? drillTitle : "Drill-down"}
                </h2>
                {drill ? (
                  <button
                    type="button"
                    onClick={() => setDrill(null)}
                    className="rounded-md border border-border px-2 py-1 text-[11px] font-semibold text-muted hover:text-fg"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
              {!drill ? (
                <p className="text-sm text-muted">
                  Click a RAG tile, KPI, or risk-matrix cell. Matching customers
                  appear here with a path into their workspace.
                </p>
              ) : drillRows.length === 0 ? (
                <p className="text-sm text-muted">No customers in this slice.</p>
              ) : (
                <ul className="max-h-[28rem] space-y-1.5 overflow-y-auto">
                  {drillRows.map((b) => {
                    const point = riskPoints.find(
                      (p) => p.customerCode === b.customerCode,
                    );
                    const dest =
                      drill === "jobs"
                        ? `/customers/${b.customerCode}/syspro/jobs`
                        : drill === "finsight"
                          ? `/customers/${b.customerCode}/syspro/dtr`
                          : drill === "rmm-offline" || drill === "rmm-critical"
                            ? `/customers/${b.customerCode}/rmm`
                            : drill === "backup"
                              ? `/customers/${b.customerCode}/cove`
                              : drill === "risks"
                                ? `/customers/${b.customerCode}/ams/risks`
                                : `/customers/${b.customerCode}`;
                    return (
                      <li key={b.customerCode}>
                        <Link
                          to={dest}
                          className="flex items-start gap-2 rounded-lg border border-border/80 bg-bg/40 px-2.5 py-2 transition hover:border-accent/40"
                        >
                          <RagBadge rag={b.healthRag} />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-fg">
                              {b.displayName}
                            </span>
                            <span className="mt-0.5 flex flex-wrap gap-1">
                              {(point?.drivers.length
                                ? point.drivers
                                : b.attentionReasons
                              )
                                .slice(0, 3)
                                .map((r) => (
                                  <Badge key={r} variant="muted">
                                    {r}
                                  </Badge>
                                ))}
                            </span>
                          </span>
                          <span className="shrink-0 text-right">
                            <span className="block font-mono text-xs font-semibold text-muted">
                              {b.assuranceScorePct}%
                            </span>
                            {point ? (
                              <span className="text-[10px] text-subtle">
                                {point.impact[0]}/{point.likelihood[0]}
                              </span>
                            ) : null}
                          </span>
                          <ChevronRight className="mt-0.5 h-4 w-4 text-subtle" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>

          {/* 3. Business Health */}
          <section className="rounded-xl border border-border bg-surface p-3">
            <h2 className="mb-2 text-[13px] font-bold text-fg">Business Health</h2>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[760px] text-left text-[12px]">
                <thead className="bg-surface-2 text-muted">
                  <tr>
                    <th className="px-3 py-2 font-medium">Customer</th>
                    <th className="px-3 py-2 font-medium">Health</th>
                    <th className="px-3 py-2 font-medium">Collect</th>
                    <th className="px-3 py-2 font-medium">Jobs</th>
                    <th className="px-3 py-2 font-medium">FinSight</th>
                    <th className="px-3 py-2 font-medium">RMM</th>
                    <th className="px-3 py-2 font-medium">Risk cell</th>
                    <th className="px-3 py-2 font-medium">Open</th>
                  </tr>
                </thead>
                <tbody>
                  {scoreboard.map((b) => {
                    const p = riskPoints.find(
                      (x) => x.customerCode === b.customerCode,
                    );
                    return (
                      <tr key={b.customerCode} className="border-t border-border">
                        <td className="px-3 py-2">
                          <CustLink code={b.customerCode} name={b.displayName} />
                        </td>
                        <td className="px-3 py-2">
                          <RagBadge rag={b.healthRag} />
                        </td>
                        <td className="px-3 py-2 text-muted">
                          {b.collectAgeHours == null
                            ? "None"
                            : b.collectFresh
                              ? `${b.collectAgeHours}h`
                              : `${b.collectAgeHours}h stale`}
                        </td>
                        <td className="px-3 py-2">
                          {(b.jobErrorCount || 0) > 0 ? (
                            <Link
                              to="/customers/$code/syspro/jobs"
                              params={{ code: b.customerCode }}
                              className="font-mono font-semibold text-rag-red hover:underline"
                            >
                              {b.jobErrorCount}
                            </Link>
                          ) : (
                            0
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {(b.dtrVarianceLines || 0) > 0 ? (
                            <Link
                              to="/customers/$code/syspro/dtr"
                              params={{ code: b.customerCode }}
                              className="font-mono font-semibold text-rag-amber hover:underline"
                            >
                              {b.dtrVarianceLines}
                            </Link>
                          ) : (
                            <span className="text-rag-green">Clear</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <Link
                            to="/customers/$code/rmm"
                            params={{ code: b.customerCode }}
                            className="text-fg hover:text-accent"
                          >
                            {(b.pulsewayServerOnline || 0) +
                              (b.pulsewayServerOffline || 0)}{" "}
                            srv
                            {(b.pulsewayServerOffline || 0) > 0
                              ? ` · ${b.pulsewayServerOffline} off`
                              : ""}
                          </Link>
                        </td>
                        <td className="px-3 py-2 text-[11px] text-muted">
                          {p ? `${p.impact} / ${p.likelihood}` : "—"}
                        </td>
                        <td className="px-3 py-2">
                          <Link
                            to="/customers/$code/ams/risks"
                            params={{ code: b.customerCode }}
                            className="font-mono text-muted hover:text-accent"
                          >
                            {b.openRiskCount || 0}/{b.openIssueCount || 0}
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* 4+5 Service + SLA */}
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <section className="rounded-xl border border-border bg-surface p-3">
              <h2 className="mb-2 text-[13px] font-bold text-fg">
                Service Performance
              </h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <KpiMini
                  label="RMM on cover"
                  value={coverStats.rmm}
                  sub={`of ${coverStats.n}`}
                />
                <KpiMini
                  label="Backup on cover"
                  value={coverStats.cove}
                  sub={`of ${coverStats.n}`}
                />
                <KpiMini
                  label="EPP on cover"
                  value={coverStats.epp}
                  sub={`of ${coverStats.n}`}
                />
                <KpiMini
                  label="M365 on cover"
                  value={coverStats.csp}
                  sub={`of ${coverStats.n}`}
                />
              </div>
              <p className="mt-2 text-[11px] text-muted">
                Names in the health table drill into RMM, Cove, jobs and FinSight.
              </p>
            </section>

            <section className="rounded-xl border border-border bg-surface p-3">
              <h2 className="mb-2 text-[13px] font-bold text-fg">
                SLA Performance
              </h2>
              <p className="mb-2 text-[11px] text-muted">
                RPM SYSPRO + AMS Rev 5.0 clocks. Click a customer for their SLA page.
              </p>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-left text-[12px]">
                  <thead className="bg-surface-2 text-muted">
                    <tr>
                      <th className="px-3 py-2 font-medium">Priority</th>
                      <th className="px-3 py-2 font-medium">Ack</th>
                      <th className="px-3 py-2 font-medium">Remote</th>
                      <th className="px-3 py-2 font-medium">Restore</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-border">
                      <td className="px-3 py-1.5 font-medium">P1</td>
                      <td className="px-3 py-1.5">30 min</td>
                      <td className="px-3 py-1.5">1 BH</td>
                      <td className="px-3 py-1.5">8 BH</td>
                    </tr>
                    <tr className="border-t border-border">
                      <td className="px-3 py-1.5 font-medium">P2</td>
                      <td className="px-3 py-1.5">30 min</td>
                      <td className="px-3 py-1.5">2 BH</td>
                      <td className="px-3 py-1.5">2 BD</td>
                    </tr>
                    <tr className="border-t border-border">
                      <td className="px-3 py-1.5 font-medium">P3</td>
                      <td className="px-3 py-1.5">2 BH</td>
                      <td className="px-3 py-1.5">8 BH</td>
                      <td className="px-3 py-1.5">5 BD</td>
                    </tr>
                    <tr className="border-t border-border">
                      <td className="px-3 py-1.5 font-medium">P4</td>
                      <td className="px-3 py-1.5">4 BH</td>
                      <td className="px-3 py-1.5">2 BD</td>
                      <td className="px-3 py-1.5">By agreement</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <ul className="mt-2 flex flex-wrap gap-2">
                {scoreboard.slice(0, 8).map((b) => (
                  <li key={b.customerCode}>
                    <Link
                      to="/customers/$code/ams/sla"
                      params={{ code: b.customerCode }}
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] hover:border-accent/40"
                    >
                      {b.displayName}
                      <span className="font-mono text-muted">
                        {b.slaOverallPct != null ? `${b.slaOverallPct}%` : "—"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* 6+7 Incidents + Risks */}
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <section className="rounded-xl border border-border bg-surface p-3">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-[13px] font-bold text-fg">Major Incidents</h2>
                <button
                  type="button"
                  className="text-[11px] font-semibold text-accent hover:underline"
                  onClick={() => toggleDrill("incidents")}
                >
                  {incidents.length} open
                </button>
              </div>
              {incidents.length === 0 ? (
                <p className="text-sm text-muted">
                  No major incidents on the current snapshot.
                </p>
              ) : (
                <ul className="max-h-72 space-y-1 overflow-y-auto">
                  {incidents.slice(0, 12).map((it, i) => (
                    <li key={`${it.customerCode}-${i}`}>
                      <Link
                        to={it.to}
                        className="flex flex-wrap items-center gap-2 rounded-md px-1 py-1.5 text-[13px] hover:bg-surface-2"
                      >
                        <Badge variant={it.severity === "Red" ? "red" : "amber"}>
                          {it.severity}
                        </Badge>
                        <span className="font-medium text-fg">{it.displayName}</span>
                        <span className="text-muted">{it.text}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-xl border border-border bg-surface p-3">
              <h2 className="mb-2 text-[13px] font-bold text-fg">
                Key Risks & Issues
              </h2>
              {attention.length === 0 ? (
                <p className="text-sm text-muted">No open attention items.</p>
              ) : (
                <ul className="max-h-72 space-y-1.5 overflow-y-auto">
                  {attention.slice(0, 10).map((b) => (
                    <li key={b.customerCode}>
                      <Link
                        to="/customers/$code/ams/risks"
                        params={{ code: b.customerCode }}
                        className="flex items-start gap-2 rounded-lg border border-border/70 px-2.5 py-2 hover:border-accent/40"
                      >
                        <RagBadge rag={b.healthRag} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-fg">
                            {b.displayName}
                          </span>
                          <span className="text-[11px] text-muted">
                            {b.attentionReasons.slice(0, 3).join(" · ")}
                          </span>
                        </span>
                        <ChevronRight className="mt-0.5 h-4 w-4 text-subtle" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </AppShell>
    </RequireAuth>
  );
}
