import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  fetchAgentStatus,
  requestAgentSync,
  type AgentStatusRow,
} from "@/lib/settings/settings-api";
import { cn } from "@/lib/utils";

type SyncState = { phase: "queued" | "running" | "done" | "error"; pct: number; note: string };

function lamp(status: string) {
  if (status === "ONLINE") return "bg-emerald-500 shadow-[0_0_8px_#10b981]";
  if (status === "STALE" || status === "QUEUED" || status === "SYNCING") return "bg-amber-400";
  return "bg-red-500";
}

function fmt(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-ZA", {
      timeZone: "Africa/Johannesburg",
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function AgentFleetPanel({ compact = false }: { compact?: boolean }) {
  const [rows, setRows] = useState<AgentStatusRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sync, setSync] = useState<Record<string, SyncState>>({});

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const r = await fetchAgentStatus();
      setMsg(r.message);
      setRows(r.rows ?? []);
      setSync((prev) => {
        const next = { ...prev };
        for (const row of r.rows ?? []) {
          const st = next[row.agentId];
          if (!st || st.phase === "done" || st.phase === "error") continue;
          if (row.lastStatus === "QUEUED") {
            next[row.agentId] = { phase: "queued", pct: 20, note: "Waiting for agent…" };
          } else if (row.lastStatus === "SYNCING") {
            next[row.agentId] = { phase: "running", pct: 65, note: "Collect running…" };
          } else if (
            row.requestSyncUtc &&
            row.lastJobUtc &&
            new Date(row.lastJobUtc).getTime() >= new Date(row.requestSyncUtc).getTime() - 2000
          ) {
            next[row.agentId] = { phase: "done", pct: 100, note: "Sync complete" };
          } else if (row.lastStatus === "OK" && st.phase === "running") {
            next[row.agentId] = { phase: "done", pct: 100, note: "Sync complete" };
          }
        }
        return next;
      });
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const polling = Object.values(sync).some((s) => s.phase === "queued" || s.phase === "running");
  useEffect(() => {
    if (!polling) return;
    const id = window.setInterval(() => void load(), 3000);
    return () => window.clearInterval(id);
  }, [polling, load]);

  async function syncOne(row: AgentStatusRow) {
    if (!row.hostName) return;
    setSync((p) => ({
      ...p,
      [row.agentId]: { phase: "queued", pct: 8, note: "Queueing…" },
    }));
    const r = await requestAgentSync({
      data: { customerCode: row.customerCode, hostName: row.hostName },
    });
    if (!r.ok) {
      setSync((p) => ({
        ...p,
        [row.agentId]: { phase: "error", pct: 0, note: r.message },
      }));
      return;
    }
    setSync((p) => ({
      ...p,
      [row.agentId]: { phase: "queued", pct: 20, note: "Waiting for agent (up to 1 min)…" },
    }));
    void load();
  }

  return (
    <div className="rpma-panel space-y-3 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[13px] font-semibold text-fg">RPM Assure Agent · SYSPRO</p>
          <p className="text-[11px] text-muted">
            Per-customer agent ID · green = connected · red = not installed. Other services use APIs.
          </p>
        </div>
        <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => void load()}>
          <RefreshCw className={cn("size-3.5", busy && "animate-spin")} />
          Refresh
        </Button>
      </div>
      {msg ? <p className="text-[11px] text-muted">{msg}</p> : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-[12px]">
          <thead className="text-[10px] uppercase tracking-wide text-muted">
            <tr>
              <th className="px-2 py-1.5">Customer</th>
              <th className="px-2 py-1.5">Agent ID</th>
              <th className="px-2 py-1.5">Link</th>
              {!compact ? <th className="px-2 py-1.5">Heartbeat</th> : null}
              <th className="px-2 py-1.5">Sync</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={compact ? 4 : 5} className="px-2 py-3 text-muted">
                  No active customers, or agent tables not applied.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const st = sync[r.agentId];
                const online = r.healthStatus === "ONLINE";
                return (
                  <tr key={r.agentId} className="border-t border-border/60">
                    <td className="px-2 py-2">
                      <span className="font-semibold text-fg">{r.displayName}</span>
                      <span className="ml-1.5 font-mono text-[10px] text-muted">{r.customerCode}</span>
                    </td>
                    <td className="px-2 py-2 font-mono text-[11px] text-fg">{r.agentId}</td>
                    <td className="px-2 py-2">
                      <span className="inline-flex items-center gap-1.5">
                        <span className={cn("inline-block h-2.5 w-2.5 rounded-full", lamp(r.healthStatus))} />
                        <span className={cn("text-[11px] font-semibold", online ? "text-emerald-400" : "text-red-400")}>
                          {online ? "Connected" : r.healthStatus === "NOT_INSTALLED" ? "Not installed" : r.healthStatus}
                        </span>
                      </span>
                    </td>
                    {!compact ? <td className="px-2 py-2 text-muted">{fmt(r.lastHeartbeatUtc)}</td> : null}
                    <td className="px-2 py-2">
                      <div className="flex min-w-[180px] flex-col gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={!r.hostName || !online || st?.phase === "queued" || st?.phase === "running"}
                          onClick={() => void syncOne(r)}
                        >
                          Sync
                        </Button>
                        {st ? (
                          <div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all duration-500",
                                  st.phase === "error" ? "bg-red-500" : st.phase === "done" ? "bg-emerald-500" : "bg-sky-400",
                                )}
                                style={{ width: `${st.pct}%` }}
                              />
                            </div>
                            <p className="mt-0.5 text-[10px] text-muted">{st.note}</p>
                          </div>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
