import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Cloud, Database, Mail, RefreshCw, Server, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SpaLink } from "@/components/nav/spa-link";
import {
  fetchConfigHealth,
  fetchIntegrations,
  requestAgentSync,
  requestAgentUpdate,
  fetchApiFeedSyncStatus,
  recheckInfrastructure,
  type ConfigHealthItem,
  type ApiFeedSyncStatus,
} from "@/lib/settings/settings-api";
import { fetchInfraAgents, type InfraAgentRow } from "@/lib/settings/infra-status";
import type { LucideIcon } from "lucide-react";
import { cn, formatSastDateTime } from "@/lib/utils";

export const Route = createFileRoute("/settings/infrastructure")({
  component: InfrastructureStatusPage,
});

function healthTitle(item: ConfigHealthItem) {
  if (item.id === "cove") return "N-Able Cove Backup";
  if (item.id === "sql") return "SQL Server";
  return item.label;
}

function agentStatus(row: InfraAgentRow): { label: string; tone: "green" | "amber" | "red" | "muted" } {
  if (!row.cover.syspro) return { label: "Not required", tone: "muted" };
  const s = row.healthStatus.toUpperCase();
  if (s === "ONLINE") return { label: "Online", tone: "green" };
  if (s === "UPDATE" || s === "UPDATING" || s === "QUEUED" || s === "SYNCING") {
    return { label: "Busy", tone: "amber" };
  }
  if (s === "NOT_INSTALLED" || s === "NEVER") return { label: "Not installed", tone: "muted" };
  return { label: "Disconnected", tone: "red" };
}

function syncToneOf(
  row: InfraAgentRow,
  phase?: "idle" | "queued" | "running" | "done" | "error",
): { label: string; tone: "green" | "amber" | "red" | "muted" } {
  if (!row.cover.syspro) return { label: "N/A", tone: "muted" };
  if (phase === "queued" || phase === "running") return { label: "Syncing", tone: "amber" };
  if (phase === "error") return { label: "Error", tone: "red" };
  if (phase === "done") return { label: "OK", tone: "green" };
  const last = (row.lastStatus ?? "").toUpperCase();
  const health = row.healthStatus.toUpperCase();
  if (health === "ONLINE") return { label: "OK", tone: "green" };
  if (last === "QUEUED" || last === "SYNCING" || last === "UPDATE" || last === "UPDATING") {
    return { label: "Syncing", tone: "amber" };
  }
  if (health === "NOT_INSTALLED" || health === "NEVER") return { label: "N/A", tone: "muted" };
  return { label: "Offline", tone: "red" };
}

const COVER_CHIPS: Array<{ key: keyof InfraAgentRow["cover"]; label: string; icon: LucideIcon }> = [
  { key: "syspro", label: "SYSPRO", icon: Database },
  { key: "rmm", label: "RMM", icon: Server },
  { key: "cove", label: "Backup", icon: Cloud },
  { key: "epp", label: "RPM EndPoint Protection", icon: Shield },
  { key: "csp", label: "CSP", icon: Mail },
];

const KIND_LABEL: Record<string, string> = {
  erp: "SYSPRO",
  rmm: "RMM",
  epp: "RPM EndPoint Protection",
  backup: "BACKUP",
  licensing: "CSP",
};

function kindLabel(raw: string) {
  return KIND_LABEL[raw.trim().toLowerCase()] ?? raw.trim().toUpperCase();
}

function kindToHealthId(raw: string) {
  const k = raw.trim().toLowerCase();
  if (k === "erp") return "syspro";
  if (k === "rmm") return "rmm";
  if (k === "epp") return "epp";
  if (k === "backup") return "cove";
  if (k === "licensing") return "csp";
  return "";
}

function newerIso(a: string | null | undefined, b: string | null | undefined): string | null {
  const ta = a ? new Date(a).getTime() : NaN;
  const tb = b ? new Date(b).getTime() : NaN;
  if (Number.isFinite(ta) && Number.isFinite(tb)) return ta >= tb ? (a as string) : (b as string);
  if (Number.isFinite(ta)) return a as string;
  if (Number.isFinite(tb)) return b as string;
  return null;
}

function feedTone(iso: string | null): { tone: "green" | "amber" | "red"; result: string } {
  if (!iso) return { tone: "red", result: "Never" };
  const m = (Date.now() - new Date(iso).getTime()) / 60000;
  if (!Number.isFinite(m) || m < 0) return { tone: "red", result: "Never" };
  if (m <= 45) return { tone: "green", result: "OK" };
  if (m <= 360) return { tone: "amber", result: "Due" };
  return { tone: "red", result: "Stale" };
}

type ConnRow = {
  connectionCode: string;
  displayName: string;
  sourceKind: string;
  status: string;
  lastSyncAt: string | null;
};

type SyncPhase = "idle" | "queued" | "running" | "done" | "error";

function Lamp({ tone }: { tone: "green" | "amber" | "red" | "muted" }) {
  return (
    <span
      className={cn(
        "h-2 w-2 shrink-0 rounded-full",
        tone === "green" && "bg-rag-green",
        tone === "amber" && "bg-amber-400",
        tone === "red" && "bg-rag-red",
        tone === "muted" && "bg-muted",
      )}
    />
  );
}

function InfrastructureStatusPage() {
  const [items, setItems] = useState<ConfigHealthItem[]>([]);
  const [conns, setConns] = useState<ConnRow[]>([]);
  const [agents, setAgents] = useState<InfraAgentRow[]>([]);
  const [agentMsg, setAgentMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sync, setSync] = useState<Record<string, SyncPhase>>({});
  const [feed, setFeed] = useState<ApiFeedSyncStatus | null>(null);
  const [feedBusy, setFeedBusy] = useState(false);
  const [feedMsg, setFeedMsg] = useState<string | null>(null);
  const armed = useRef<Set<string>>(new Set());

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const [h, i, a, f] = await Promise.all([
        fetchConfigHealth(),
        fetchIntegrations(),
        fetchInfraAgents(),
        fetchApiFeedSyncStatus(),
      ]);
      setItems(h.items ?? []);
      setConns(i.rows ?? []);
      setAgents(a.rows ?? []);
      setAgentMsg(a.ok ? null : a.message);
      setFeed(f);
      setSync((prev) => {
        const next = { ...prev };
        for (const row of a.rows ?? []) {
          if (!armed.current.has(row.customerCode)) continue;
          const last = (row.lastStatus ?? "").toUpperCase();
          if (last === "QUEUED") next[row.customerCode] = "queued";
          else if (last === "SYNCING") next[row.customerCode] = "running";
          else if (last === "OK" || last === "ONLINE") {
            next[row.customerCode] = "done";
            armed.current.delete(row.customerCode);
          } else if (last === "JOB_FAIL") {
            next[row.customerCode] = "error";
            armed.current.delete(row.customerCode);
          }
        }
        return next;
      });
    } catch (e) {
      setAgentMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const polling = Object.values(sync).some((s) => s === "queued" || s === "running") || Boolean(feed?.running);
  useEffect(() => {
    if (!polling) return;
    const id = window.setInterval(() => void load(), 2000);
    return () => window.clearInterval(id);
  }, [polling, load]);

  async function recheck() {
    setFeedBusy(true);
    setFeedMsg(null);
    setAgentMsg(null);
    try {
      const r = await recheckInfrastructure();
      setFeedMsg(r.message);
      if (r.api?.status) setFeed(r.api.status);
      for (const row of agents) {
        if (row.cover.syspro && row.hostName) {
          armed.current.add(row.customerCode);
          setSync((p) => ({ ...p, [row.customerCode]: "queued" }));
        }
      }
      void load();
    } catch (e) {
      setFeedMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setFeedBusy(false);
    }
  }

  async function syncOne(row: InfraAgentRow) {
    if (!row.hostName) return;
    armed.current.add(row.customerCode);
    setSync((p) => ({ ...p, [row.customerCode]: "queued" }));
    const r = await requestAgentSync({
      data: { customerCode: row.customerCode, hostName: row.hostName },
    });
    if (!r.ok) {
      armed.current.delete(row.customerCode);
      setSync((p) => ({ ...p, [row.customerCode]: "error" }));
      setAgentMsg(r.message);
      return;
    }
    void load();
  }

  async function updateOne(row: InfraAgentRow) {
    if (!row.hostName) return;
    armed.current.add(row.customerCode);
    setSync((p) => ({ ...p, [row.customerCode]: "queued" }));
    const r = await requestAgentUpdate({
      data: { customerCode: row.customerCode, hostName: row.hostName },
    });
    if (!r.ok) {
      armed.current.delete(row.customerCode);
      setSync((p) => ({ ...p, [row.customerCode]: "error" }));
      setAgentMsg(r.message);
      return;
    }
    setAgentMsg(r.message);
    void load();
  }

  const connRows: ConnRow[] =
    conns.length > 0
      ? conns
      : items
          .filter((i) => i.id !== "sql")
          .map((i) => ({
            connectionCode: i.id,
            displayName: healthTitle(i),
            sourceKind: i.id === "syspro" ? "erp" : i.id === "cove" ? "backup" : i.id === "csp" ? "licensing" : i.id,
            status: i.ok ? "Live" : "Down",
            lastSyncAt: i.lastAt,
          }));

  return (
    <div className="rpma-settings-stack">
      <div className="rpma-settings-toolbar">
        <p className="rpma-settings-blurb">API feeds and SQL Edge agents for the estate.</p>
        <div className="rpma-settings-actions">
          <Button type="button" size="sm" variant="secondary" disabled={feedBusy} onClick={() => void recheck()}>
            <RefreshCw className={cn("size-3.5", (feedBusy || feed?.running) && "animate-spin")} />
            Recheck
          </Button>
        </div>
      </div>

      <section className="rpma-panel p-0">
        <div className="rpma-settings-panel-head">
          Assure API Feed Status
          <span className="rpma-settings-count">every 15 min</span>
          <Button
            type="button"
            size="sm"
            className="ml-auto h-7 px-2.5 text-[11px]"
            disabled={feedBusy || Boolean(feed?.running)}
            onClick={() => void recheck()}
          >
            {feed?.running ? "Syncing…" : "Sync APIs"}
          </Button>
        </div>
        <div className="px-3 pb-3">
          <p className="mb-2 text-[11px] text-muted">
            RPM RMM, N-Able Cove Backup, RPM EndPoint Protection and Microsoft Graph. Recheck runs every feed and queues every Assure SQL agent to sync / auto-update.
          </p>
          {(() => {
            const defaultLegs = [
              { name: "RPM RMM", label: "RMM", kind: "rmm", status: "queued", pct: 0, message: "" },
              { name: "Cove", label: "BACKUP", kind: "backup", status: "queued", pct: 0, message: "" },
              { name: "RPM EndPoint Protection", label: "RPM EndPoint Protection", kind: "epp", status: "queued", pct: 0, message: "" },
              { name: "CspGraph", label: "CSP", kind: "licensing", status: "queued", pct: 0, message: "" },
            ];
            const legs = (feed?.legs?.length ? feed.legs : defaultLegs).map((l) => ({
              ...l,
              pct:
                l.status === "ok" || l.status === "error" || l.status === "skip"
                  ? 100
                  : l.status === "running"
                    ? Math.max(12, l.pct || 35)
                    : l.pct || 0,
            }));
            return (
              <div className="space-y-2">
                {legs.map((leg) => {
                  const tone =
                    leg.status === "running"
                      ? "bg-amber-400"
                      : leg.status === "ok"
                        ? "bg-rag-green"
                        : leg.status === "error"
                          ? "bg-rag-red"
                          : "bg-accent/70";
                  return (
                    <div key={leg.name}>
                      <div className="mb-0.5 flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-wide">
                        <span className="text-fg">
                          {leg.label} · {leg.name === "RPM EndPoint Protection" ? "RPM EndPoint Protection" : leg.name}
                        </span>
                        <span
                          className={cn(
                            "normal-case tracking-normal",
                            leg.status === "running" && "text-amber-400",
                            leg.status === "ok" && "text-rag-green",
                            leg.status === "error" && "text-rag-red",
                            (leg.status === "queued" || !leg.status) && "text-muted",
                          )}
                        >
                          {leg.status === "running"
                            ? `Checking ${leg.pct || 0}%`
                            : leg.status === "ok"
                              ? `OK${leg.message ? ` · ${leg.message}` : ""}`
                              : leg.status === "error"
                                ? leg.message || "Error"
                                : leg.status === "skip"
                                  ? "Skip"
                                  : "Idle"}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn("h-full rounded-full transition-all duration-500", tone)}
                          style={{ width: `${Math.min(100, Math.max(leg.pct, 0))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
          <p className="mt-2 text-[11px] text-muted">
            {feed?.running
              ? `${feed.pct}% · ${feed.current || "starting"} · ${feed.message}`
              : feed?.finishedUtc
                ? `Last run ${formatSastDateTime(feed.finishedUtc)} · ${feed.message || "idle"}`
                : feed?.message && feed.message !== "Could not read api-sync-status.json"
                  ? feed.message
                  : "No on-demand run yet. Scheduled every 15 minutes, or click Recheck."}
          </p>
          {feedMsg ? <p className="mt-1 text-[11px] font-semibold text-fg">{feedMsg}</p> : null}
        </div>
          <table className="rpma-xls text-left">
            <thead>
              <tr>
                <th>Connection</th>
                <th>Kind</th>
                <th>Status</th>
                <th>Last Sync</th>
                <th>Result</th>
                <th>Collect</th>
              </tr>
            </thead>
            <tbody>
              {connRows.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    No API feeds yet.
                  </td>
                </tr>
              ) : (
                connRows.map((r) => {
                  const hid = kindToHealthId(r.sourceKind);
                  const live = items.find((h) => h.id === hid);
                  const lastAt = newerIso(r.lastSyncAt, live?.lastAt);
                  const { tone, result } = feedTone(lastAt);
                  const leg = (feed?.legs ?? []).find(
                    (l) =>
                      l.kind.toLowerCase() === r.sourceKind.toLowerCase() ||
                      l.name.toLowerCase() === r.connectionCode.toLowerCase() ||
                      (hid === "rmm" && l.name === "RPM RMM") ||
                      (hid === "cove" && l.name === "Cove") ||
                      (hid === "epp" && (l.name === "RPM EndPoint Protection" || l.name === "RPM EndPoint Protection")) ||
                      (hid === "csp" && l.name === "CspGraph"),
                  );
                  const legLabel =
                    !leg ? "—" : leg.status === "running" ? "Running" : leg.status === "ok" ? "OK" : leg.status === "error" ? "Error" : leg.status === "skip" ? "Skip" : "Queued";
                  return (
                    <tr key={r.connectionCode}>
                      <td>{r.displayName}</td>
                      <td>{kindLabel(r.sourceKind)}</td>
                      <td>{r.status}</td>
                      <td>
                        {lastAt ? formatSastDateTime(lastAt) : "No collect yet"}
                      </td>
                      <td>
                        <span className="inline-flex items-center gap-1.5 font-semibold">
                          <Lamp tone={tone} />
                          <span
                            className={cn(
                              tone === "green" && "text-rag-green",
                              tone === "amber" && "text-amber-400",
                              tone === "red" && "text-rag-red",
                            )}
                          >
                            {result}
                          </span>
                        </span>
                      </td>
                      <td>
                        <span
                          className={cn(
                            "font-semibold",
                            leg?.status === "running" && "text-amber-400",
                            leg?.status === "ok" && "text-rag-green",
                            leg?.status === "error" && "text-rag-red",
                            (!leg || leg.status === "queued") && "text-muted",
                          )}
                        >
                          {legLabel}
                          {leg?.message && leg.status !== "queued" ? ` · ${leg.message}` : ""}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
      </section>

      <section className="rpma-panel p-0">
        <div className="rpma-settings-panel-head">
          Assure Platform Agent Status
          <span className="rpma-settings-count">{agents.length}</span>
        </div>
        {(() => {
          const remaining = agents.filter(
            (a) => a.cover.syspro && (!a.hostName || a.healthStatus.toUpperCase() === "NOT_INSTALLED"),
          );
          if (!remaining.length) return null;
          return (
            <div className="mx-4 mb-3 rounded-md border border-border bg-surface-2 px-3 py-2 text-[12px] text-fg">
              <p className="font-bold">
                {remaining.length} SYSPRO tenant{remaining.length === 1 ? "" : "s"} still need the Edge agent
              </p>
              <p className="mt-1 text-muted">
                {remaining.map((r) => r.displayName).join(" · ")}
              </p>
              <p className="mt-1 font-mono text-[11px] text-muted">
                On each remaining SQL host (admin PowerShell):
              </p>
              <pre className="mt-1 overflow-x-auto rounded bg-surface px-2 py-1.5 font-mono text-[11px] text-fg">
{`$Pack='C:\\RPM-Assure\\deploy\\ui-pack'
$Repo='https://github.com/KirkSweet1980/rpm-assure-ui-pack.git'
$git=(Get-Command git -ErrorAction SilentlyContinue).Source
if (-not $git) { throw 'Install Git for Windows first' }
if (Test-Path "$Pack\\.git") { git -C $Pack fetch --all --prune; git -C $Pack reset --hard origin/main }
if (-not (Test-Path "$Pack\\.git")) { git clone --depth 1 --branch main $Repo $Pack }
powershell -NoProfile -ExecutionPolicy Bypass -File "$Pack\\Sql\\agent\\Deploy-Syspro-Customer-Agent.ps1"`}
              </pre>
            </div>
          );
        })()}
        {agentMsg ? <p className="px-3 pb-2 text-[11px] text-muted">{agentMsg}</p> : null}
        <table className="rpma-xls text-left">
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Agent Version Installed</th>
                <th>Agent Status</th>
                <th className="text-center">Agent Sync</th>
                <th>Service Cover</th>
                <th className="text-right"> </th>
              </tr>
            </thead>
            <tbody>
              {agents.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    No customers listed.
                  </td>
                </tr>
              ) : (
                agents.map((row) => {
                  const st = agentStatus(row);
                  const sy = syncToneOf(row, sync[row.customerCode]);
                  const on = COVER_CHIPS.filter((c) => row.cover[c.key]);
                  const canSync =
                    row.cover.syspro && Boolean(row.hostName) && st.tone === "green" && sy.tone !== "amber";
                  return (
                    <tr key={row.customerCode}>
                      <td>
                        <SpaLink
                          href={`/customers/${encodeURIComponent(row.customerCode)}`}
                          className="font-bold text-fg no-underline hover:underline"
                        >
                          {row.displayName}
                        </SpaLink>
                      </td>
                      <td className="font-mono">
                        {!row.cover.syspro
                          ? "Not required"
                          : row.agentVersion
                            ? `v${row.agentVersion}`
                            : "Not installed"}
                      </td>
                      <td>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 font-semibold",
                            st.tone === "green" && "text-rag-green",
                            st.tone === "amber" && "text-amber-400",
                            st.tone === "red" && "text-rag-red",
                            st.tone === "muted" && "text-muted",
                          )}
                        >
                          <Lamp tone={st.tone} />
                          {st.label}
                        </span>
                      </td>
                      <td className="text-center">
                        <span
                          className={cn(
                            "inline-flex items-center justify-center gap-1.5 font-semibold",
                            sy.tone === "green" && "text-rag-green",
                            sy.tone === "amber" && "text-amber-400",
                            sy.tone === "red" && "text-rag-red",
                            sy.tone === "muted" && "text-muted",
                          )}
                        >
                          <Lamp tone={sy.tone} />
                          {sy.label}
                        </span>
                      </td>
                      <td>
                        {on.length === 0 ? (
                          <span className="text-muted">No Cover</span>
                        ) : (
                          <span className="flex flex-wrap gap-1">
                            {on.map((c) => {
                              const Icon = c.icon;
                              return (
                              <span
                                key={c.key}
                                className="inline-flex items-center gap-1 rounded-md bg-rag-green/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rag-green"
                              >
                                <Icon className="h-3 w-3" />
                                {c.label}
                              </span>
                              );
                            })}
                          </span>
                        )}
                      </td>
                      <td className="text-right">
                        {row.hostName ? (
                          <span className="inline-flex flex-wrap justify-end gap-1">
                          <Button
                            type="button"
                            size="sm"
                            className="h-7 px-2.5 text-[11px]"
                            disabled={!canSync}
                            onClick={() => void syncOne(row)}
                          >
                            Sync
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="h-7 px-2.5 text-[11px]"
                            disabled={!canSync}
                            onClick={() => void updateOne(row)}
                          >
                            Update Agent
                          </Button>
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted">No agent</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
      </section>
    </div>
  );
}
