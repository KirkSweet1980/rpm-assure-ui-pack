import { useCallback, useEffect, useRef, useState } from "react";
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
  if (status === "STALE") return "bg-red-500";
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
  const [selected, setSelected] = useState<string | null>(null);
  const armed = useRef<Set<string>>(new Set());
  const startedAt = useRef<Record<string, number>>({});

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const r = await fetchAgentStatus();
      setMsg(r.message);
      setRows(r.rows ?? []);
      setSync((prev) => {
        const next = { ...prev };
        for (const row of r.rows ?? []) {
          if (!armed.current.has(row.agentId)) continue;
          const st = next[row.agentId];
          if (!st || st.phase === "done" || st.phase === "error") continue;
          const elapsed = Date.now() - (startedAt.current[row.agentId] ?? Date.now());
          if (row.lastStatus === "QUEUED") {
            next[row.agentId] = { phase: "queued", pct: 18, note: "Queued — waiting for this agent…" };
          } else if (row.lastStatus === "SYNCING") {
            next[row.agentId] = {
              phase: "running",
              pct: Math.min(88, 35 + Math.round(elapsed / 800)),
              note: "Collect running on this customer…",
            };
          } else if (row.lastStatus === "OK" || row.lastStatus === "ONLINE") {
            if (st.phase === "queued" || st.phase === "running") {
              next[row.agentId] = { phase: "done", pct: 100, note: "Sync complete" };
              armed.current.delete(row.agentId);
            }
          } else if (row.lastStatus === "JOB_FAIL") {
            next[row.agentId] = { phase: "error", pct: 100, note: row.lastMessage ?? "Collect failed" };
            armed.current.delete(row.agentId);
          } else if (elapsed > 180000) {
            next[row.agentId] = { phase: "error", pct: 100, note: "Timed out waiting for this agent" };
            armed.current.delete(row.agentId);
          } else {
            next[row.agentId] = {
              phase: "running",
              pct: Math.min(80, 15 + Math.round(elapsed / 1000)),
              note: "Waiting for this customer only…",
            };
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
    const id = window.setInterval(() => void load(), 2500);
    return () => window.clearInterval(id);
  }, [polling, load]);

  async function syncOne(row: AgentStatusRow) {
    if (!row.hostName) return;
    setSelected(row.agentId);
    armed.current = new Set([row.agentId]);
    startedAt.current[row.agentId] = Date.now();
    setSync({
      [row.agentId]: { phase: "queued", pct: 8, note: "Queueing this customer…" },
    });
    const r = await requestAgentSync({
      data: { customerCode: row.customerCode, hostName: row.hostName },
    });
    if (!r.ok) {
      armed.current.delete(row.agentId);
      setSync({ [row.agentId]: { phase: "error", pct: 0, note: r.message } });
      return;
    }
    setSync({
      [row.agentId]: { phase: "queued", pct: 20, note: "Waiting for this agent (up to 1 min)…" },
    });
    void load();
  }

  return (
    <div className="rpma-panel space-y-3 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[13px] font-semibold text-fg">RPM Assure Agent · SYSPRO</p>
          <p className="text-[11px] text-muted">
            Sync Now runs one customer only. Progress shows on that row.
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
                const isSel = selected === r.agentId;
                const showBar = Boolean(st);
                return (
                  <tr
                    key={r.agentId}
                    className={cn(
                      "border-t border-border/60 cursor-pointer",
                      isSel && "bg-sky-500/10",
                    )}
                    onClick={() => setSelected(r.agentId)}
                  >
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
                      <div className="flex min-w-[220px] flex-col gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant={isSel ? "default" : "secondary"}
                          disabled={!r.hostName || !online || st?.phase === "queued" || st?.phase === "running"}
                          onClick={(e) => {
                            e.stopPropagation();
                            void syncOne(r);
                          }}
                        >
                          Sync Now
                        </Button>
                        {showBar ? (
                          <div>
                            <div className="flex items-center justify-between text-[10px] text-muted">
                              <span>{st.note}</span>
                              <span className="font-mono">{st.pct}%</span>
                            </div>
                            <div className="mt-0.5 h-2 overflow-hidden rounded-full bg-black/30">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all duration-500",
                                  st.phase === "error"
                                    ? "bg-red-500"
                                    : st.phase === "done"
                                      ? "bg-emerald-500"
                                      : "bg-sky-400",
                                )}
                                style={{ width: `${st.pct}%` }}
                              />
                            </div>
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
