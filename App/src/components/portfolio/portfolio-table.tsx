import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ChevronRight,
  Cloud,
  Database,
  HardDrive,
  MonitorSmartphone,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { RagBadge } from "@/components/portfolio/rag-badge";
import { Badge } from "@/components/ui/badge";
import { NoCover } from "@/components/ui/no-cover";
import { Input } from "@/components/ui/input";
import { useDensity } from "@/lib/density";
import type { PortfolioRow } from "@/lib/data/types";
import { cn, formatSastDateTime } from "@/lib/utils";

type RagFilter = "all" | "Red" | "Amber" | "Green" | "attention";
type CollectFilter = "all" | "fresh" | "stale" | "missing";
type DtrFilter = "all" | "oob" | "clear";

function collectBucket(r: PortfolioRow, freshHours = 24): CollectFilter {
  if (!r.lastImportAt) return "missing";
  const h = (Date.now() - new Date(r.lastImportAt).getTime()) / 3600000;
  return h <= freshHours ? "fresh" : "stale";
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function MetricTone({
  value,
  warnAt = 1,
  className,
}: {
  value: number;
  warnAt?: number;
  className?: string;
}) {
  const tone =
    value >= warnAt ? "text-rag-red" : value > 0 ? "text-rag-amber" : "text-fg";
  return (
    <span className={cn("font-mono text-sm font-semibold tabular-nums", tone, className)}>
      {value}
    </span>
  );
}

function RatioMetric({
  bad,
  total,
  critical = 0,
  title,
  emptyLabel = "Covered · —",
}: {
  bad: number;
  total: number;
  critical?: number;
  title?: string;
  emptyLabel?: string;
}) {
  if (total <= 0) {
    return <span className="text-[11px] text-muted">{emptyLabel}</span>;
  }
  const tone =
    critical > 0 || bad > 0
      ? critical > 0
        ? "text-rag-red"
        : "text-rag-amber"
      : "text-rag-green";
  const pct = Math.min(100, Math.round(((total - bad) / total) * 100));
  return (
    <div className="inline-flex min-w-[5.5rem] flex-col items-end gap-1" title={title}>
      <span className={cn("font-mono text-sm font-semibold tabular-nums", tone)}>
        {bad}/{total}
        {critical > 0 ? (
          <span className="ml-1 text-[11px] font-bold">· {critical}c</span>
        ) : null}
      </span>
      <span className="h-1 w-full max-w-[4.5rem] overflow-hidden rounded-full bg-border/80">
        <span
          className={cn(
            "block h-full rounded-full transition-all",
            critical > 0 || bad > 0
              ? critical > 0
                ? "bg-rag-red"
                : "bg-rag-amber"
              : "bg-rag-green",
          )}
          style={{ width: `${pct}%` }}
        />
      </span>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  tone?: "red" | "amber" | "green" | "default";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rpma-eco-chip inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition",
        active
          ? tone === "red"
            ? "border-rag-red/40 bg-rag-red-bg text-rag-red shadow-sm"
            : tone === "amber"
              ? "border-rag-amber/40 bg-rag-amber-bg text-rag-amber shadow-sm"
              : tone === "green"
                ? "border-rag-green/40 bg-rag-green-bg text-rag-green shadow-sm"
                : "border-accent/40 bg-accent text-accent-fg shadow-sm"
          : "border-border/80 bg-surface text-muted hover:border-accent/35 hover:bg-accent-soft/60 hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}

export function PortfolioTable({
  rows,
  freshHours = 24,
  title = "Customer Ecosystem",
}: {
  rows: PortfolioRow[];
  freshHours?: number;
  title?: string;
}) {
  const [q, setQ] = useState("");
  const [rag, setRag] = useState<RagFilter>("all");
  const [collect, setCollect] = useState<CollectFilter>("all");
  const [dtr, setDtr] = useState<DtrFilter>("all");
  const { isCompact } = useDensity();

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (s) {
        const hit =
          r.customerCode.toLowerCase().includes(s) ||
          r.displayName.toLowerCase().includes(s) ||
          r.healthRag.toLowerCase().includes(s);
        if (!hit) return false;
      }
      if (rag === "attention") {
        if (
          r.healthRag === "Green" &&
          r.sysproJobErrorCount === 0 &&
          r.sysproDtrVarianceLines === 0 &&
          (r.pulsewayOfflineCount ?? 0) === 0 &&
          (r.pulsewayCriticalAlerts ?? 0) === 0
        )
          return false;
      } else if (rag !== "all" && r.healthRag !== rag) {
        return false;
      }
      if (collect !== "all" && collectBucket(r, freshHours) !== collect) return false;
      if (dtr === "oob" && (r.sysproDtrVarianceLines ?? 0) <= 0) return false;
      if (dtr === "clear" && (r.sysproDtrVarianceLines ?? 0) > 0) return false;
      return true;
    });
  }, [q, rows, rag, collect, dtr, freshHours]);

  const stats = useMemo(() => {
    let red = 0;
    let amber = 0;
    let green = 0;
    let attention = 0;
    for (const r of rows) {
      if (r.healthRag === "Red") red++;
      else if (r.healthRag === "Amber") amber++;
      else green++;
      if (
        r.healthRag !== "Green" ||
        r.sysproJobErrorCount > 0 ||
        (r.sysproDtrVarianceLines ?? 0) > 0 ||
        (r.pulsewayOfflineCount ?? 0) > 0 ||
        (r.pulsewayCriticalAlerts ?? 0) > 0
      )
        attention++;
    }
    return { red, amber, green, attention };
  }, [rows]);

  const clearFilters = () => {
    setQ("");
    setRag("all");
    setCollect("all");
    setDtr("all");
  };

  const filtersOn = q || rag !== "all" || collect !== "all" || dtr !== "all";

  return (
    <section className="rpma-eco-panel overflow-hidden rounded-2xl border border-border/90 bg-surface shadow-[var(--shadow-card)]">
      {/* Header */}
      <div className="rpma-eco-head relative border-b border-border/80 px-4 py-4 sm:px-5">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <Sparkles className="h-4 w-4" aria-hidden />
              </span>
              <div>
                {title ? (
                <h2 className="text-base font-bold tracking-tight text-fg sm:text-lg">
                  {title}
                </h2>
                ) : null}
                <p className="text-[12px] text-muted">
                  Assure Eco-System health across SYSPRO, remote management, and backup
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2/80 px-2.5 py-1 text-[11px] font-semibold text-fg">
                <span className="tabular-nums text-accent">{filtered.length}</span>
                <span className="text-muted">of {rows.length}</span>
              </span>
              <button
                type="button"
                onClick={() => setRag(rag === "attention" ? "all" : "attention")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition",
                  rag === "attention"
                    ? "border-rag-amber/40 bg-rag-amber-bg text-rag-amber"
                    : "border-border bg-surface-2/80 text-muted hover:text-fg",
                )}
              >
                <AlertTriangle className="h-3 w-3" />
                {stats.attention} need attention
              </button>
              <span className="inline-flex items-center gap-1 rounded-full border border-rag-red/25 bg-rag-red-bg/70 px-2.5 py-1 text-[11px] font-semibold text-rag-red">
                {stats.red} red
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-rag-amber/25 bg-rag-amber-bg/70 px-2.5 py-1 text-[11px] font-semibold text-rag-amber">
                {stats.amber} amber
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-rag-green/25 bg-rag-green-bg/70 px-2.5 py-1 text-[11px] font-semibold text-rag-green">
                {stats.green} green
              </span>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[16rem] sm:items-end">
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-subtle" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name or code…"
                className="h-10 rounded-xl border-border/90 bg-surface-2/50 pl-9 pr-9 shadow-inner"
                aria-label="Search customers"
              />
              {q ? (
                <button
                  type="button"
                  onClick={() => setQ("")}
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-md p-1 text-muted hover:bg-surface hover:text-fg"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
            {filtersOn ? (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 self-end rounded-lg px-2 py-1 text-[11px] font-medium text-muted hover:bg-surface-2 hover:text-fg"
              >
                <X className="h-3 w-3" /> Clear filters
              </button>
            ) : null}
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 flex flex-col gap-2.5 border-t border-border/60 pt-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-subtle">
              Health
            </span>
            <FilterChip active={rag === "all"} onClick={() => setRag("all")}>
              All
            </FilterChip>
            <FilterChip
              active={rag === "attention"}
              onClick={() => setRag("attention")}
              tone="amber"
            >
              Attention
            </FilterChip>
            <FilterChip active={rag === "Red"} onClick={() => setRag("Red")} tone="red">
              Red
            </FilterChip>
            <FilterChip active={rag === "Amber"} onClick={() => setRag("Amber")} tone="amber">
              Amber
            </FilterChip>
            <FilterChip active={rag === "Green"} onClick={() => setRag("Green")} tone="green">
              Green
            </FilterChip>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-subtle">
              Collect
            </span>
            {(
              [
                ["all", "All"],
                ["fresh", "Fresh"],
                ["stale", "Stale"],
                ["missing", "Missing"],
              ] as const
            ).map(([k, label]) => (
              <FilterChip key={k} active={collect === k} onClick={() => setCollect(k)}>
                {label}
              </FilterChip>
            ))}
            <span className="mx-1 hidden h-4 w-px bg-border sm:inline-block" aria-hidden />
            <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-subtle">
              FinSight
            </span>
            {(
              [
                ["all", "All"],
                ["oob", "Out of balance"],
                ["clear", "In balance"],
              ] as const
            ).map(([k, label]) => (
              <FilterChip key={k} active={dtr === k} onClick={() => setDtr(k)}>
                {label}
              </FilterChip>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="grid gap-2.5 p-3 md:hidden">
        {filtered.map((r) => {
          const bucket = collectBucket(r, freshHours);
          return (
            <Link
              key={r.customerCode}
              to="/customers/$code"
              params={{ code: r.customerCode }}
              className={cn(
                "group relative block overflow-hidden rounded-xl border border-border bg-surface-2/40 p-3.5 transition",
                "hover:border-accent/40 hover:shadow-[var(--shadow-card-hover)]",
                r.healthRag === "Red" && "border-l-[3px] border-l-rag-red",
                r.healthRag === "Amber" && "border-l-[3px] border-l-rag-amber",
                r.healthRag === "Green" && "border-l-[3px] border-l-rag-green",
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[12px] font-bold",
                    r.healthRag === "Red" && "bg-rag-red-bg text-rag-red",
                    r.healthRag === "Amber" && "bg-rag-amber-bg text-rag-amber",
                    r.healthRag === "Green" && "bg-rag-green-bg text-rag-green",
                  )}
                >
                  {initials(r.displayName)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-fg">{r.displayName}</p>
                      <p className="font-mono text-[10px] tracking-wide text-muted">
                        {r.customerCode}
                      </p>
                    </div>
                    <RagBadge rag={r.healthRag} />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-border/70 bg-surface px-2.5 py-2">
                      <p className="text-[9px] font-bold uppercase tracking-wide text-subtle">
                        Job errors
                      </p>
                      <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums">
                        {r.cover?.syspro !== true ? "—" : r.sysproJobErrorCount}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-surface px-2.5 py-2">
                      <p className="text-[9px] font-bold uppercase tracking-wide text-subtle">
                        FinSight
                      </p>
                      <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums">
                        {r.cover?.syspro !== true ? "—" : r.sysproDtrVarianceLines ?? 0}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-surface px-2.5 py-2">
                      <p className="text-[9px] font-bold uppercase tracking-wide text-subtle">
                        Remote mgmt
                      </p>
                      <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums">
                        {r.cover?.rmm !== true
                          ? "—"
                          : `${r.pulsewayOfflineCount ?? 0}/${r.pulsewayDeviceCount ?? 0}`}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-surface px-2.5 py-2">
                      <p className="text-[9px] font-bold uppercase tracking-wide text-subtle">
                        Backup
                      </p>
                      <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums">
                        {r.cover?.cove !== true
                          ? "—"
                          : `${(r.coveFailedDeviceCount ?? 0) + (r.coveStaleDeviceCount ?? 0)}/${r.coveDeviceCount ?? 0}`}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <Badge
                      variant={
                        bucket === "fresh" ? "green" : bucket === "stale" ? "amber" : "red"
                      }
                    >
                      {bucket}
                    </Badge>
                    <span className="text-[10px] text-muted">
                      {formatSastDateTime(r.lastImportAt)}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
        {filtered.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
            No customers match your filters.
          </p>
        ) : null}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="rpma-eco-table w-full min-w-[1040px] text-left">
            <thead>
              <tr className="border-b border-border/90 bg-card-head/90">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.08em] text-subtle">
                  Customer
                </th>
                <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.08em] text-subtle">
                  RAG
                </th>
                <th
                  className="px-3 py-3 text-right text-[10px] font-bold uppercase tracking-[0.08em] text-subtle"
                  title="Failed or error SYSPRO jobs on latest snapshot"
                >
                  <span className="inline-flex items-center gap-1">
                    <Database className="h-3 w-3 opacity-70" />
                    Job errors
                  </span>
                </th>
                <th
                  className="px-3 py-3 text-right text-[10px] font-bold uppercase tracking-[0.08em] text-subtle"
                  title="FinSight control-account out-of-balance lines (sub-ledger vs GL)"
                >
                  FinSight
                </th>
                <th
                  className="px-3 py-3 text-right text-[10px] font-bold uppercase tracking-[0.08em] text-subtle"
                  title="Offline / Devices · Critical alerts"
                >
                  <span className="inline-flex items-center gap-1">
                    <MonitorSmartphone className="h-3 w-3 opacity-70" />
                    Remote mgmt
                  </span>
                </th>
                <th
                  className="px-3 py-3 text-right text-[10px] font-bold uppercase tracking-[0.08em] text-subtle"
                  title="Failed+Stale / Devices (RPM Cloud Backup)"
                >
                  <span className="inline-flex items-center gap-1">
                    <Cloud className="h-3 w-3 opacity-70" />
                    Cloud backup
                  </span>
                </th>
                <th
                  className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.08em] text-subtle"
                  title="When data last arrived at central"
                >
                  <span className="inline-flex items-center gap-1">
                    <HardDrive className="h-3 w-3 opacity-70" />
                    Last refresh
                  </span>
                </th>
                <th className="w-12 px-2 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const bucket = collectBucket(r, freshHours);
                return (
                  <tr
                    key={r.customerCode}
                    className={cn(
                      "rpma-eco-row group border-b border-border/50 transition-colors last:border-0",
                      "hover:bg-accent-soft/35",
                      r.healthRag === "Red" && "bg-rag-red-bg/20",
                      r.healthRag === "Amber" && "bg-rag-amber-bg/15",
                    )}
                  >
                    <td className="px-4 py-3">
                      <Link
                        to="/customers/$code"
                        params={{ code: r.customerCode }}
                        className="flex items-center gap-3"
                      >
                        <span
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold ring-1 ring-inset",
                            r.healthRag === "Red" &&
                              "bg-rag-red-bg text-rag-red ring-rag-red/25",
                            r.healthRag === "Amber" &&
                              "bg-rag-amber-bg text-rag-amber ring-rag-amber/25",
                            r.healthRag === "Green" &&
                              "bg-rag-green-bg text-rag-green ring-rag-green/25",
                          )}
                          aria-hidden
                        >
                          {initials(r.displayName)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-fg group-hover:text-accent">
                            {r.displayName}
                          </span>
                          <span className="mt-0.5 block font-mono text-[10px] tracking-wide text-muted">
                            {r.customerCode}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <RagBadge rag={r.healthRag} />
                      {!isCompact && r.healthSummary ? (
                        <p
                          className="mt-1.5 max-w-[11rem] truncate text-[10px] leading-snug text-muted"
                          title={r.healthSummary}
                        >
                          {r.healthSummary}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {r.cover?.syspro !== true ? (
                        <NoCover />
                      ) : (
                        <MetricTone value={r.sysproJobErrorCount} />
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {r.cover?.syspro !== true ? (
                        <NoCover />
                      ) : (
                        <MetricTone value={r.sysproDtrVarianceLines ?? 0} />
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {r.cover?.rmm !== true ? (
                        <NoCover title="Remote Management not in scope for this customer" />
                      ) : (
                        <RatioMetric
                          bad={r.pulsewayOfflineCount ?? 0}
                          total={r.pulsewayDeviceCount ?? 0}
                          critical={r.pulsewayCriticalAlerts ?? 0}
                          title={
                            r.pulsewayHealthSummary ||
                            `Online ${r.pulsewayOnlineCount ?? 0} · Offline ${r.pulsewayOfflineCount ?? 0} · Critical ${r.pulsewayCriticalAlerts ?? 0}`
                          }
                        />
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {r.cover?.cove !== true ? (
                        <NoCover title="RPM Cloud Backup not in scope for this customer" />
                      ) : (
                        <RatioMetric
                          bad={
                            (r.coveFailedDeviceCount ?? 0) + (r.coveStaleDeviceCount ?? 0)
                          }
                          total={r.coveDeviceCount ?? 0}
                          title={`OK ${r.coveOkDeviceCount ?? 0} · Stale ${r.coveStaleDeviceCount ?? 0} · Failed ${r.coveFailedDeviceCount ?? 0}`}
                        />
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col items-start gap-1">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                            bucket === "fresh" &&
                              "bg-rag-green-bg text-rag-green",
                            bucket === "stale" &&
                              "bg-rag-amber-bg text-rag-amber",
                            bucket === "missing" &&
                              "bg-rag-red-bg text-rag-red",
                          )}
                        >
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              bucket === "fresh" && "bg-rag-green",
                              bucket === "stale" && "bg-rag-amber",
                              bucket === "missing" && "bg-rag-red",
                            )}
                          />
                          {bucket}
                        </span>
                        <span className="whitespace-nowrap text-[11px] text-muted">
                          {formatSastDateTime(r.lastImportAt)}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-right">
                      <Link
                        to="/customers/$code"
                        params={{ code: r.customerCode }}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-muted transition group-hover:border-border group-hover:bg-surface group-hover:text-accent"
                        aria-label={`Open ${r.displayName}`}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted">No customers match your filters.</p>
        ) : null}
      </div>
    </section>
  );
}
