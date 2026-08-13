import { Link, createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { RequireAuth } from "@/components/portfolio/require-auth";
import { AppShell } from "@/components/portfolio/app-shell";
import { InfoTag } from "@/components/portfolio/info-tag";
import { RagBadge } from "@/components/portfolio/rag-badge";
import { StatCard } from "@/components/portfolio/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHead } from "@/components/ui/card";
import {
  FINSIGHT_EXCO_TIP,
  FINSIGHT_EXCO_TITLE,
  FINSIGHT_SHORT,
  finsightOobAttention,
} from "@/lib/brand/finsight";
import { fetchDataSourceStatus, fetchPortfolio } from "@/lib/data/portfolio";
import { useStaffProfile } from "@/lib/auth/use-staff-profile";
import { useDashboardConfig } from "@/lib/settings/use-dashboard-config";
import type { ExcoCustomerBoard, ExcoInsightPayload } from "@/lib/data/types";
import { auditPortfolioRows } from "@/lib/data/pillar-audit";
import { buildExcoPillarSla, hasSlaCover } from "@/lib/data/exco-sla-stats";
import { cn, formatSastDateTime } from "@/lib/utils";
import { ChevronDown, ChevronRight, RefreshCw } from "lucide-react";

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


function PillarAuditPanel({
  audit,
  rows,
}: {
  audit: import("@/lib/data/types").PillarAuditSummary | null;
  rows: import("@/lib/data/types").PortfolioRow[];
}) {
  const data = useMemo(() => {
    if (audit && audit.rows?.length) return audit;
    return auditPortfolioRows(rows);
  }, [audit, rows]);

  const mismatches = data.rows.filter((r) => r.mismatchCount > 0);
  const tone =
    data.mismatchCellCount === 0
      ? "green"
      : data.mismatchCellCount <= 3
        ? "amber"
        : "red";

  return (
    <div>
      <div className="flex items-center gap-2 px-3 pt-2">
        <InfoTag title="Compares Covered / No Cover in the UI to warehouse evidence (devices, operators, endpoints). Mismatches mean a customer would show the wrong cover state.">
          ?
        </InfoTag>
      </div>
      <CardContent className="space-y-3 p-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatCard
            label="Customers checked"
            value={data.customerCount}
            tip="Active portfolio rows in this view"
          />
          <StatCard
            label="Customers with mismatch"
            value={data.mismatchCustomerCount}
            tone={tone}
            tip="At least one pillar where cover flag disagrees with data"
          />
          <StatCard
            label="Mismatch cells"
            value={data.mismatchCellCount}
            tone={tone}
            tip="Total pillar cells that disagree (SYSPRO/RMM/Backup/EPP/M365)"
          />
          <StatCard
            label="Audit as of"
            value={
              data.generatedAt
                ? new Date(data.generatedAt).toLocaleString("en-ZA", {
                    hour12: false,
                  })
                : "—"
            }
            tip="When this audit was computed"
          />
        </div>

        {mismatches.length === 0 ? (
          <p className="rounded-lg border border-rag-green/30 bg-rag-green/5 px-3 py-2 text-[13px] text-fg">
            All cover chips match warehouse evidence. No Cover means no data for that pillar.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[720px] text-left text-[12px]">
              <thead className="rpma-table-head border-b border-border bg-muted/30">
                <tr>
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">SYSPRO</th>
                  <th className="px-3 py-2">RMM</th>
                  <th className="px-3 py-2">Backup</th>
                  <th className="px-3 py-2">EPP</th>
                  <th className="px-3 py-2">M365</th>
                </tr>
              </thead>
              <tbody>
                {mismatches.map((r) => (
                  <tr
                    key={r.customerCode}
                    className="rpma-data-row border-b border-border/60"
                  >
                    <td className="px-3 py-2">
                      <CustLink code={r.customerCode} name={r.displayName} />
                      <span className="ml-2 text-[10px] text-muted">
                        {r.mismatchCount} issue{r.mismatchCount === 1 ? "" : "s"}
                      </span>
                    </td>
                    {(
                      [
                        r.syspro,
                        r.rmm,
                        r.cove,
                        r.epp,
                        r.csp,
                      ] as import("@/lib/data/types").PillarAuditCell[]
                    ).map((c, i) => (
                      <td
                        key={i}
                        className={
                          c.mismatch
                            ? "px-3 py-2 font-semibold text-rag-amber"
                            : "px-3 py-2 text-muted"
                        }
                        title={c.note}
                      >
                        {c.mismatch ? c.note : c.covered ? "OK" : "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-[11px] text-subtle">
          SYSPRO hard-off (PillarSyspro=0) is intentional No Cover even if residual rows exist.
          Hover a mismatch cell for detail. Fix with collect re-run, name maps, or AmsConfig flags.
        </p>
      </CardContent>
    </div>
  );
}

function ExcoFold({
  title,
  summary,
  defaultOpen,
  badge,
  children,
}: {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  badge?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(Boolean(defaultOpen));
  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition hover:bg-muted/20"
        aria-expanded={open}
      >
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted transition-transform duration-200",
            open && "rotate-180",
          )}
        />
        <span className="text-[13px] font-bold text-fg">{title}</span>
        {badge}
        {summary ? (
          <span className="ml-auto min-w-0 truncate text-[11px] text-muted">
            {summary}
          </span>
        ) : (
          <span className="ml-auto text-[11px] text-subtle">
            {open ? "Hide" : "Show"}
          </span>
        )}
      </button>
      {open ? <div className="border-t border-border/70">{children}</div> : null}
    </Card>
  );
}

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

  return (
    <RequireAuth>
      <AppShell
        title={dash.estateTitle || "Exco Insight"}
        subtitle={
          (dash.estateSubtitle || "").trim() ||
          "High-Level Customer Estate View - EXCO"
        }
      >
        <div className="rpma-exco space-y-3">
          {/* Status */}
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
              As of {formatSastDateTime(exco.generatedAt || summary.generatedAt)}
            </span>
            <span className="text-[11px] text-subtle">
              · {exco.boards.length} customers
            </span>
            <span className="ml-auto flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-subtle" title="Last successful estate reload">
                Updated {ageSec < 5 ? "just now" : ageSec < 60 ? `${ageSec}s ago` : `${Math.floor(ageSec / 60)}m ${ageSec % 60}s ago`}
                {nextIn != null ? ` · next ${nextIn}s` : " · auto off"}
              </span>
              <button
                type="button"
                onClick={() => setAutoEnabled((v) => !v)}
                className={
                  "rounded-md border px-2 py-1 text-[11px] font-semibold transition " +
                  (autoEnabled && autoSec > 0
                    ? "border-accent/40 bg-accent-soft/50 text-fg"
                    : "border-border bg-surface text-muted")
                }
                title={
                  autoSec <= 0
                    ? "Auto-refresh disabled in Settings (Exco auto-refresh = 0)"
                    : autoEnabled
                      ? `Auto-refresh every ${autoSec}s (pause)`
                      : "Resume auto-refresh"
                }
              >
                {autoEnabled && autoSec > 0 ? `Auto ${autoSec}s` : "Auto off"}
              </button>
              <button
                type="button"
                disabled={refreshing}
                onClick={() => void refreshEstate(true)}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 text-[11px] font-semibold text-fg transition hover:border-accent/40 disabled:opacity-50"
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

          {/* Glance layer — one screen, no scroll */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
            <KpiMini
              label="Assurance"
              value={`${exco.estateAssurancePct}%`}
              tone={estateTone}
              sub="estate health"
            />
            <KpiMini
              label="Attention"
              value={exco.customersNeedingAttention}
              tone={exco.customersNeedingAttention > 0 ? "amber" : "green"}
              sub="customers"
            />
            <KpiMini
              label="RMM servers"
              value={exco.rmmServerOnlineTotal ?? 0}
              tone={(exco.rmmServerOfflineTotal ?? 0) > 0 ? "red" : "green"}
              sub={
                (exco.rmmServerOfflineTotal ?? 0) > 0
                  ? `${exco.rmmServerOfflineTotal} offline`
                  : "all online"
              }
            />
            <KpiMini
              label="Critical alerts"
              value={exco.rmmCriticalTotal ?? 0}
              tone={(exco.rmmCriticalTotal ?? 0) > 0 ? "red" : "green"}
              sub="Pulseway"
            />
            <KpiMini
              label="Backup issues"
              value={exco.backupUnhealthyCount}
              tone={exco.backupUnhealthyCount > 0 ? "amber" : "green"}
              sub="customers"
            />
            <KpiMini
              label="FinSight"
              value={finsightEstate.oobCustomers}
              tone={finsightEstate.oobCustomers > 0 ? "amber" : "green"}
              sub={`${finsightEstate.totalOobLines} oob lines`}
            />
            <KpiMini
              label="Risks / issues"
              value={`${exco.openRisksTotal} / ${exco.openIssuesTotal}`}
              tone={exco.openRisksTotal > 0 ? "amber" : "green"}
              sub="open"
            />
            <KpiMini
              label="Freshness"
              value={exco.collectFreshCount}
              tone={(exco.collectStaleCount ?? 0) > 0 ? "amber" : "green"}
              sub={
                (exco.collectStaleCount ?? 0) > 0
                  ? `${exco.collectStaleCount} stale`
                  : "within 24h"
              }
            />
          </div>

          {/* Service modules — compact chips */}
          <div className="rounded-xl border border-border/80 bg-card/30 px-3 py-2.5">
            <div className="mb-2 flex items-center gap-2">
              <p className="text-[12px] font-bold text-fg">RPM Service Modules - On Cover</p>
              <InfoTag title="Customers with live data on each module. Covered means warehouse evidence exists.">
                ?
              </InfoTag>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {(
                [
                  ["SYSPRO", coverStats.syspro],
                  ["RMM", coverStats.rmm],
                  ["Backup", coverStats.cove],
                  ["EPP", coverStats.epp],
                  ["M365", coverStats.csp],
                ] as const
              ).map(([label, n]) => (
                <div
                  key={label}
                  className="flex items-baseline justify-between gap-2 rounded-lg border border-border/70 bg-bg/40 px-2.5 py-1.5"
                >
                  <span className="text-[11px] font-semibold text-muted">{label}</span>
                  <span className="font-mono text-sm font-bold tabular-nums text-fg">
                    {n}
                    <span className="text-[11px] font-medium text-muted">/{coverStats.n}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Microsoft 365 EXCO posture (lean) */}
          <ExcoFold
            title="Microsoft CSP | Customer Posture"
            summary={
              m365Estate.tenants === 0
                ? "No tenants on cover"
                : `${m365Estate.tenants} tenant(s) · score ${m365Estate.avgScore ?? "—"}% · MFA gaps ${m365Estate.mfaGap}`
            }
            defaultOpen={m365Estate.mfaGap > 0 || m365Estate.highGa > 0}
          >
            <CardContent>
              {m365Estate.tenants === 0 ? (
                <p className="text-sm text-muted">
                  No Microsoft 365 tenants on cover yet. Map Graph collect to a
                  customer (pilot: RPMINT).
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  <div className="rounded-xl border border-border bg-muted/20 px-3 py-3">
                    <p className="text-[11px] font-semibold text-muted">Tenants on cover</p>
                    <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-fg">
                      {m365Estate.tenants}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/20 px-3 py-3">
                    <p className="text-[11px] font-semibold text-muted">Avg Secure Score</p>
                    <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-fg">
                      {m365Estate.avgScore != null ? `${m365Estate.avgScore}%` : "—"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/20 px-3 py-3">
                    <p className="text-[11px] font-semibold text-muted">MFA below 90%</p>
                    <p
                      className={`mt-1 font-mono text-2xl font-bold tabular-nums ${
                        m365Estate.mfaGap > 0 ? "text-rag-amber" : "text-fg"
                      }`}
                    >
                      {m365Estate.mfaGap}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/20 px-3 py-3">
                    <p className="text-[11px] font-semibold text-muted">
                      More than 2 Global Admins
                    </p>

                    <p
                      className={`mt-1 font-mono text-2xl font-bold tabular-nums ${
                        m365Estate.highGa > 0 ? "text-rag-amber" : "text-fg"
                      }`}
                    >
                      {m365Estate.highGa}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/20 px-3 py-3">
                    <p className="text-[11px] font-semibold text-muted">Seats used</p>
                    <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-fg">
                      {m365Estate.assigned}
                      <span className="text-sm font-medium text-muted">
                        /{m365Estate.seats}
                      </span>
                    </p>
                  </div>
                </div>
              )}
              {m365Estate.tenants > 0 ? (
                <div className="mt-4 overflow-x-auto rounded-xl border border-border">
                  <table className="w-full min-w-[36rem] text-left text-[12px]">
                    <thead className="bg-muted/40 text-[10px] font-semibold uppercase tracking-wide text-muted">
                      <tr>
                        <th className="px-3 py-2">Customer</th>
                        <th className="px-3 py-2">Domain</th>
                        <th className="px-3 py-2">Secure Score</th>
                        <th className="px-3 py-2">Users</th>
                        <th className="px-3 py-2">Seats</th>
                        <th className="px-3 py-2">Last collect</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows
                        .filter(
                          (r) =>
                            r.cover?.csp ||
                            (r.cspUserCount ?? 0) > 0 ||
                            (r.cspLicenseSkuCount ?? 0) > 0 ||
                            r.cspSecureScorePct != null,
                        )
                        .sort((a, b) =>
                          a.displayName.localeCompare(b.displayName),
                        )
                        .map((r) => (
                          <tr
                            key={r.customerCode}
                            className="border-t border-border/70"
                          >
                            <td className="px-3 py-2 font-medium text-fg">
                              {r.displayName}
                            </td>
                            <td className="px-3 py-2 text-muted">
                              {r.cspPrimaryDomain ?? "—"}
                            </td>
                            <td className="px-3 py-2 font-mono font-semibold tabular-nums text-fg">
                              {r.cspSecureScorePct != null
                                ? `${r.cspSecureScorePct}%`
                                : "—"}
                            </td>
                            <td className="px-3 py-2 font-mono tabular-nums">
                              {r.cspUserCount ?? 0}
                            </td>
                            <td className="px-3 py-2 font-mono tabular-nums">
                              {r.cspAssignedSeats ?? 0}/{r.cspTotalSeats ?? 0}
                            </td>
                            <td className="px-3 py-2 text-muted">
                              {r.cspLastImportAt
                                ? new Date(r.cspLastImportAt).toLocaleString(
                                    "en-ZA",
                                    { hour12: false },
                                  )
                                : "—"}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </CardContent>
          </ExcoFold>

          {/* 4. Priority list */}
          <ExcoFold
            title="Priority | Customers Needing Attention"
            summary={
              attention.length === 0
                ? "All clear"
                : `${attention.length} customer(s)`
            }
            defaultOpen={attention.length > 0}
            badge={
              attention.length > 0 ? (
                <Badge variant="amber">{attention.length}</Badge>
              ) : (
                <Badge variant="green">0</Badge>
              )
            }
          >
              <CardContent className="max-h-72 overflow-y-auto">
                {attention.length === 0 ? (
                  <p className="text-sm text-muted">
                    All customers are clear on current signals.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {attention.slice(0, 12).map((b) => (
                      <li key={b.customerCode}>
                        <Link
                          to="/customers/$code"
                          params={{ code: b.customerCode }}
                          className="flex items-start gap-2.5 rounded-lg border border-border/80 bg-bg/40 px-2.5 py-2 transition hover:border-accent/40"
                        >
                          <RagBadge rag={b.healthRag} />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-fg">
                              {b.displayName}
                            </span>
                            <span className="mt-0.5 flex flex-wrap gap-1">
                              {b.attentionReasons.slice(0, 4).map((r) => (
                                <Badge key={r} variant="muted">
                                  {r}
                                </Badge>
                              ))}
                            </span>
                          </span>
                          <span className="font-mono text-xs font-semibold text-muted">
                            {b.assuranceScorePct}%
                          </span>
                          <ChevronRight className="mt-0.5 h-4 w-4 text-subtle" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
          </ExcoFold>

          <ExcoFold
            title={FINSIGHT_EXCO_TITLE}
            summary={`${finsightEstate.oobCustomers} need recon · ${finsightEstate.totalOobLines} oob lines · ${finsightEstate.clearCustomers} clear`}
            defaultOpen={finsightEstate.oobCustomers > 0}
          >
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <StatCard
                  label="SYSPRO on cover"
                  value={finsightEstate.sysproCovered}
                  tip="Customers with SYSPRO Deployment cover (FinSight in scope)"
                />
                <StatCard
                  label="Controls clear"
                  value={finsightEstate.clearCustomers}
                  tone="green"
                  tip="Covered customers with zero out-of-balance FinSight lines"
                />
                <StatCard
                  label="Need recon attention"
                  value={finsightEstate.oobCustomers}
                  tone={finsightEstate.oobCustomers > 0 ? "amber" : "green"}
                  tip="Covered customers with at least one out-of-balance control line"
                />
                <StatCard
                  label="Out-of-balance lines"
                  value={finsightEstate.totalOobLines}
                  tone={finsightEstate.totalOobLines > 0 ? "amber" : "green"}
                  tip="Sum of FinSight out-of-balance lines across the estate"
                />
              </div>
              {finsightEstate.worst.length > 0 ? (
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-subtle">
                    Highest FinSight exposure
                  </p>
                  <ul className="space-y-1.5">
                    {finsightEstate.worst.map((b) => (
                      <li key={b.customerCode}>
                        <Link
                          to="/customers/$code/syspro/dtr"
                          params={{ code: b.customerCode }}
                          className="flex items-center gap-2 rounded-lg border border-border/70 bg-bg/30 px-2.5 py-1.5 text-[12px] transition hover:border-accent/40"
                        >
                          <span className="min-w-0 flex-1 font-semibold text-fg">
                            {b.displayName}
                          </span>
                          <span className="font-mono text-xs font-bold text-rag-amber">
                            {b.dtrVarianceLines} line
                            {(b.dtrVarianceLines || 0) === 1 ? "" : "s"}
                          </span>
                          <span className="text-[10px] text-subtle">{FINSIGHT_SHORT}</span>
                          <ChevronRight className="h-3.5 w-3.5 text-subtle" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : finsightEstate.sysproCovered > 0 ? (
                <p className="text-sm text-rag-green">
                  All SYSPRO-covered customers are clear on FinSight control recons.
                </p>
              ) : (
                <p className="text-sm text-muted">No SYSPRO cover in portfolio — FinSight not in scope.</p>
              )}
            </CardContent>
          </ExcoFold>

          <ExcoFold
            title="RPM Service Cover Audit"
            summary="Covered vs warehouse evidence"
          >
          <PillarAuditPanel
            audit={
              portfolio.pillarAudit ??
              exco.pillarAudit ??
              null
            }
            rows={rows}
          />
          </ExcoFold>

          {/* 4c. SLA Stats by Customer — covered pillars only, M365 excluded */}
          <ExcoFold
            title="Operational SLA by customer"
            summary="RPM contract is SYSPRO+AMS clocks. RMM / Backup / EPP scored vs industry measures. M365 excluded."
          >
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full min-w-[880px] text-left text-[12px]">
                <thead className="rpma-table-head border-b border-border bg-muted/30">
                  <tr>
                    <th className="px-3 py-2">Customer</th>
                    <th className="px-3 py-2 text-right" title="Average of covered operational pillars (not the signed RPM ticket table). Excludes M365 and No Cover.">
                      Overall
                    </th>
                    <th className="px-3 py-2 text-right">SYSPRO</th>
                    <th className="px-3 py-2 text-right">RMM</th>
                    <th className="px-3 py-2 text-right">Backup</th>
                    <th className="px-3 py-2 text-right">EPP</th>
                    <th className="px-3 py-2">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {scoreboard.map((b) => {
                    const cell = (
                      p:
                        | {
                            pillar?: string;
                            covered: boolean;
                            pct: number | null;
                            note: string | null;
                          }
                        | null
                        | undefined,
                    ) => {
                      if (!p || !p.covered) {
                        return (
                          <span className="text-[11px] font-extrabold uppercase tracking-wide text-amber-500">
                            No Cover
                          </span>
                        );
                      }
                      if (p.pct == null) {
                        return (
                          <span
                            className="text-[11px] font-semibold text-subtle"
                            title={p.note ?? "No servers (workstations excluded)"}
                          >
                            —
                          </span>
                        );
                      }
                      const tone =
                        p.pillar === "rmm"
                          ? p.pct >= 99.9
                            ? "text-rag-green"
                            : p.pct >= 94.9
                              ? "text-rag-amber"
                              : "text-rag-red"
                          : p.pillar === "cove"
                            ? p.pct >= 99.5
                              ? "text-rag-green"
                              : p.pct >= 94.5
                                ? "text-rag-amber"
                                : "text-rag-red"
                            : p.pillar === "epp"
                              ? p.pct >= 95
                                ? "text-rag-green"
                                : p.pct >= 90
                                  ? "text-rag-amber"
                                  : "text-rag-red"
                              : p.pct >= 90
                                ? "text-rag-green"
                                : p.pct >= 70
                                  ? "text-rag-amber"
                                  : "text-rag-red";
                      return (
                        <span
                          className={"font-mono font-semibold tabular-nums " + tone}
                          title={p.note ?? undefined}
                        >
                          {p.pct}%
                        </span>
                      );
                    };

                    const notes = (b.pillarSla ?? [])
                      .filter((p) => p.covered && p.pct != null && p.pct < 90)
                      .map((p) => p.note)
                      .filter(Boolean)
                      .slice(0, 2);
                    return (
                      <tr
                        key={"sla-" + b.customerCode}
                        className="rpma-data-row border-b border-border/60"
                      >
                        <td className="px-3 py-2">
                          <CustLink code={b.customerCode} name={b.displayName} />
                        </td>
                        <td className="px-3 py-2 text-right">
                          {!b.hasSlaCover || b.slaOverallPct == null ? (
                            <span className="text-[11px] text-subtle" title="No SYSPRO/RMM/Backup/EPP cover">
                              —
                            </span>
                          ) : (
                            <span
                              className={
                                "font-mono text-sm font-bold tabular-nums " +
                                (b.slaOverallPct >= 90
                                  ? "text-rag-green"
                                  : b.slaOverallPct >= 70
                                    ? "text-rag-amber"
                                    : "text-rag-red")
                              }
                            >
                              {b.slaOverallPct}%
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">{cell(b.slaSyspro)}</td>
                        <td className="px-3 py-2 text-right">{cell(b.slaRmm)}</td>
                        <td className="px-3 py-2 text-right">{cell(b.slaCove)}</td>
                        <td className="px-3 py-2 text-right">{cell(b.slaEpp)}</td>
                        <td className="max-w-[220px] truncate px-3 py-2 text-[11px] text-muted" title={notes.join("; ")}>
                          {!b.hasSlaCover
                            ? "No SLA pillars on cover"
                            : notes.length
                              ? notes.join(" · ")
                              : "On target"}
                        </td>
                      </tr>
                    );
                  })}
                  {scoreboard.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-6 text-center text-muted">
                        No customers in portfolio.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
              <p className="border-t border-border px-3 py-2 text-[11px] text-muted">
                Microsoft 365 CSP is excluded from SLA. Workstations are excluded from RMM availability.
                No Cover modules show yellow and do not enter Overall.
              </p>
            </CardContent>
          </ExcoFold>

          <ExcoFold
            title="Customer Health Assurance"
            summary={`${scoreboard.length} customers · click a name to open`}
            defaultOpen={false}
          >
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full min-w-[960px] text-left text-[12px]">
                <thead className="rpma-table-head border-b border-border bg-muted/30">
                  <tr>
                    <th className="px-3 py-2">Customer</th>
                    <th className="px-3 py-2">Health</th>
                    <th className="px-3 py-2 text-right">Score</th>
                    <th className="px-3 py-2 text-center">SYSPRO</th>
                    <th className="px-3 py-2 text-center">RMM</th>
                    <th className="px-3 py-2 text-center">Backup</th>
                    <th className="px-3 py-2 text-center">EPP</th>
                    <th className="px-3 py-2 text-center">M365</th>
                    <th
                      className="px-3 py-2 text-right"
                      title={FINSIGHT_EXCO_TIP}
                    >
                      FinSight
                    </th>
                    <th className="px-3 py-2">Watch items</th>
                  </tr>
                </thead>
                <tbody>
                  {scoreboard.map((b) => (
                    <tr
                      key={b.customerCode}
                      className="rpma-data-row border-b border-border/60"
                    >
                      <td className="px-3 py-2">
                        <CustLink code={b.customerCode} name={b.displayName} />
                      </td>
                      <td className="px-3 py-2">
                        <RagBadge rag={b.healthRag} />
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-semibold">
                        {b.assuranceScorePct}%
                      </td>
                      {(
                        [
                          b.coverSyspro,
                          b.coverRmm,
                          b.coverCove,
                          b.coverEpp,
                          b.coverCsp,
                        ] as boolean[]
                      ).map((on, i) => (
                        <td key={i} className="px-3 py-2 text-center">
                          {on ? (
                            <span className="font-semibold text-rag-green">Covered</span>
                          ) : (
                            <span className="text-[11px] font-extrabold uppercase tracking-wide text-amber-500">
                              No Cover
                            </span>
                          )}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right">
                        {!b.coverSyspro ? (
                          <span className="text-[11px] text-subtle">—</span>
                        ) : (b.dtrVarianceLines || 0) > 0 ? (
                          <Link
                            to="/customers/$code/syspro/dtr"
                            params={{ code: b.customerCode }}
                            className="font-mono font-bold text-rag-amber hover:underline"
                            title={finsightOobAttention(b.dtrVarianceLines || 0)}
                          >
                            {b.dtrVarianceLines}
                          </Link>
                        ) : (
                          <span
                            className="font-semibold text-rag-green"
                            title="All FinSight control accounts in balance"
                          >
                            Clear
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted">
                        {b.attentionReasons.length === 0 ? (
                          <span className="text-rag-green">Clear</span>
                        ) : (
                          <span className="line-clamp-1" title={b.attentionReasons.join("; ")}>
                            {b.attentionReasons.slice(0, 2).join(" · ")}
                            {b.attentionReasons.length > 2
                              ? ` +${b.attentionReasons.length - 2}`
                              : ""}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {scoreboard.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-3 py-6 text-center text-muted">
                        No customers in portfolio.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </CardContent>
          </ExcoFold>
        </div>
      </AppShell>
    </RequireAuth>
  );
}

