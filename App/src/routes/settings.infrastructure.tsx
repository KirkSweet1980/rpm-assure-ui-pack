import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SpaLink } from "@/components/nav/spa-link";
import {
  fetchConfigHealth,
  fetchIntegrations,
  requestAgentSync,
  type ConfigHealthItem,
} from "@/lib/settings/settings-api";
import { fetchInfraAgents, type InfraAgentRow } from "@/lib/settings/infra-status";
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
  const s = row.healthStatus.toUpperCase();
  if (s === "ONLINE") return { label: "Online", tone: "green" };
  if (s === "UPDATE" || s === "UPDATING" || s === "QUEUED" || s === "SYNCING") {
    return { label: "Busy", tone: "amber" };
  }
  if (s === "NOT_INSTALLED") return { label: "Not installed", tone: "muted" };
  return { label: "Disconnected", tone: "red" };
}

function syncToneOf(
  row: InfraAgentRow,
  phase?: "idle" | "queued" | "running" | "done" | "error",
): { label: string; tone: "green" | "amber" | "red" } {
  if (phase === "queued" || phase === "running") return { label: "Syncing", tone: "amber" };
  if (phase === "error") return { label: "Error", tone: "amber" };
  if (phase === "done") return { label: "OK", tone: "green" };
  const last = (row.lastStatus ?? "").toUpperCase();
  const health = row.healthStatus.toUpperCase();
  if (last === "QUEUED" || last === "SYNCING" || last === "UPDATE" || last === "UPDATING") {
    return { label: "Syncing", tone: "amber" };
  }
  if (last === "JOB_FAIL") return { label: "Error", tone: "amber" };
  if (health === "ONLINE" && (last === "OK" || last === "ONLINE" || last === "")) {
    return { label: "OK", tone: "green" };
  }
  if (health === "ONLINE") return { label: "OK", tone: "green" };
  return { label: "Offline", tone: "red" };
}

const COVER_CHIPS: Array<{ key: keyof InfraAgentRow["cover"]; label: string }> = [
  { key: "syspro", label: "SYSPRO" },
  { key: "rmm", label: "RMM" },
  { key: "cove", label: "Backup" },
  { key: "epp", label: "EPP" },
  { key: "csp", label: "CSP" },
];

const KIND_LABEL: Record<string, string> = {
  erp: "SYSPRO",
  rmm: "RMM",
  epp: "EPP",
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

function feedTone(iso: string | null): { tone: "green" | "amber" | "red"; result: string } {
  if (!iso) return { tone: "red", result: "Never" };
  const h = (Date.now() - new Date(iso).getTime()) / 3600000;
  if (!Number.isFinite(h) || h < 0) return { tone: "red", result: "Never" };
  if (h <= 24) return { tone: "green", result: "OK" };
  if (h <= 72) return { tone: "amber", result: "Stale" };
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
  const armed = useRef<Set<string>>(new Set());

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const [h, i, a] = await Promise.all([
        fetchConfigHealth(),
        fetchIntegrations(),
        fetchInfraAgents(),
      ]);
      setItems(h.items ?? []);
      setConns(i.rows ?? []);
      setAgents(a.rows ?? []);
      setAgentMsg(a.ok ? null : a.message);
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

  const polling = Object.values(sync).some((s) => s === "queued" || s === "running");
  useEffect(() => {
    if (!polling) return;
    const id = window.setInterval(() => void load(), 2500);
    return () => window.clearInterval(id);
  }, [polling, load]);

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
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Configuration</p>
          <h1 className="mt-1 flex items-center gap-2 text-[18px] font-extrabold tracking-tight text-fg">
            <Server className="h-5 w-5 text-muted" />
            Assure Infrastructure Status
          </h1>
        </div>
        <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => void load()}>
          <RefreshCw className={cn("size-3.5", busy && "animate-spin")} />
          Recheck
        </Button>
      </div>

      <section className="rpma-panel overflow-hidden p-0">
        <div className="px-4 py-3">
          <h2 className="text-[16px] font-extrabold text-fg">Assure API Feed Status</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px]">
            <thead className="rpma-table-head">
              <tr>
                <th className="px-4 py-2 font-extrabold">Connection</th>
                <th className="px-4 py-2 font-extrabold">Kind</th>
                <th className="px-4 py-2 font-extrabold">Status</th>
                <th className="px-4 py-2 font-extrabold">Last Sync</th>
                <th className="px-4 py-2 font-extrabold">Result</th>
              </tr>
            </thead>
            <tbody>
              {connRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-muted">
                    No API feeds yet.
                  </td>
                </tr>
              ) : (
                connRows.map((r) => {
                  const hid = kindToHealthId(r.sourceKind);
                  const live = items.find((h) => h.id === hid);
                  const lastAt = r.lastSyncAt || live?.lastAt || null;
                  const { tone, result } = feedTone(lastAt);
                  return (
                    <tr key={r.connectionCode} className="border-t border-border/40">
                      <td className="px-4 py-2.5 font-semibold text-fg">{r.displayName}</td>
                      <td className="px-4 py-2.5 text-muted">{kindLabel(r.sourceKind)}</td>
                      <td className="px-4 py-2.5">{r.status}</td>
                      <td className="px-4 py-2.5 text-muted">
                        {lastAt ? formatSastDateTime(lastAt) : "No collect yet"}
                      </td>
                      <td className="px-4 py-2.5">
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
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rpma-panel overflow-hidden p-0">
        <div className="flex items-end justify-between gap-3 px-4 py-3">
          <h2 className="text-[16px] font-extrabold text-fg">Assure Platform Agent Status</h2>
          <p className="text-[12px] text-muted">{agents.length} customers</p>
        </div>
        {agentMsg ? <p className="px-4 pb-2 text-[12px] text-muted">{agentMsg}</p> : null}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px]">
            <thead className="rpma-table-head">
              <tr>
                <th className="px-4 py-2 font-extrabold">Customer Name</th>
                <th className="px-4 py-2 font-extrabold">Agent Version Installed</th>
                <th className="px-4 py-2 font-extrabold">Agent Status</th>
                <th className="px-4 py-2 text-center font-extrabold">Agent Sync</th>
                <th className="px-4 py-2 font-extrabold">Service Cover</th>
                <th className="px-4 py-2 text-right font-extrabold"> </th>
              </tr>
            </thead>
            <tbody>
              {agents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-muted">
                    No customers listed.
                  </td>
                </tr>
              ) : (
                agents.map((row) => {
                  const st = agentStatus(row);
                  const sy = syncToneOf(row, sync[row.customerCode]);
                  const on = COVER_CHIPS.filter((c) => row.cover[c.key]);
                  const canSync = Boolean(row.hostName) && st.tone === "green" && sy.tone !== "amber";
                  return (
                    <tr key={row.customerCode} className="border-t border-border/40">
                      <td className="px-4 py-2.5">
                        <SpaLink
                          href={`/customers/${encodeURIComponent(row.customerCode)}`}
                          className="font-semibold text-fg no-underline hover:underline"
                        >
                          {row.displayName}
                        </SpaLink>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[12px] text-muted">
                        {row.agentVersion ? `v${row.agentVersion}` : "Not installed"}
                      </td>
                      <td className="px-4 py-2.5">
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
                      <td className="px-4 py-2.5 text-center">
                        <span
                          className={cn(
                            "inline-flex items-center justify-center gap-1.5 font-semibold",
                            sy.tone === "green" && "text-rag-green",
                            sy.tone === "amber" && "text-amber-400",
                            sy.tone === "red" && "text-rag-red",
                          )}
                        >
                          <Lamp tone={sy.tone} />
                          {sy.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        {on.length === 0 ? (
                          <span className="text-muted">No Cover</span>
                        ) : (
                          <span className="flex flex-wrap gap-1">
                            {on.map((c) => (
                              <span
                                key={c.key}
                                className="rounded-md bg-rag-green/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rag-green"
                              >
                                {c.label}
                              </span>
                            ))}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 px-2.5 text-[11px]"
                          disabled={!canSync}
                          onClick={() => void syncOne(row)}
                        >
                          Sync
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
