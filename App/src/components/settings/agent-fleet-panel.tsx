import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  fetchAgentStatus,
  requestAgentSync,
  requestAgentUpdate,
  SHIPPED_AGENT_VERSION,
  type AgentStatusRow,
} from "@/lib/settings/settings-api";
import { cn } from "@/lib/utils";

type SyncState = { phase: "queued" | "running" | "done" | "error"; pct: number; note: string };

function toneOf(row: AgentStatusRow, st?: SyncState): "green" | "amber" | "red" {
  if (st?.phase === "queued" || st?.phase === "running") return "amber";
  if (row.lastStatus === "UPDATE" || row.lastStatus === "UPDATING" || row.lastStatus === "QUEUED" || row.lastStatus === "SYNCING") {
    return "amber";
  }
  if (row.healthStatus === "ONLINE") return "green";
  return "red";
}

function labelOf(tone: "green" | "amber" | "red") {
  if (tone === "green") return "Connected";
  if (tone === "amber") return "Busy";
  return "Disconnected";
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
          if (row.lastStatus === "UPDATE") {
            next[row.agentId] = { phase: "queued", pct: 15, note: `Update ${SHIPPED_AGENT_VERSION}` };
            continue;
          }
          if (row.lastStatus === "UPDATING") {
            next[row.agentId] = { phase: "running", pct: 55, note: "Updating" };
            continue;
          }
          if (!armed.current.has(row.agentId)) continue;
          const st = next[row.agentId];
          if (!st || st.phase === "done" || st.phase === "error") continue;
          const elapsed = Date.now() - (startedAt.current[row.agentId] ?? Date.now());
          if (row.lastStatus === "QUEUED") {
            next[row.agentId] = { phase: "queued", pct: 18, note: "Queued" };
          } else if (row.lastStatus === "SYNCING") {
            next[row.agentId] = { phase: "running", pct: Math.min(88, 35 + Math.round(elapsed / 800)), note: "Collect" };
          } else if (row.lastStatus === "OK" || row.lastStatus === "ONLINE") {
            next[row.agentId] = { phase: "done", pct: 100, note: "Done" };
            armed.current.delete(row.agentId);
          } else if (row.lastStatus === "JOB_FAIL") {
            next[row.agentId] = { phase: "error", pct: 100, note: row.lastMessage ?? "Failed" };
            armed.current.delete(row.agentId);
          } else if (elapsed > 180000) {
            next[row.agentId] = { phase: "error", pct: 100, note: "Timed out" };
            armed.current.delete(row.agentId);
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
    setSync({ [row.agentId]: { phase: "queued", pct: 8, note: "Queueing" } });
    const r = await requestAgentSync({
      data: { customerCode: row.customerCode, hostName: row.hostName },
    });
    if (!r.ok) {
      armed.current.delete(row.agentId);
      setSync({ [row.agentId]: { phase: "error", pct: 0, note: r.message } });
      return;
    }
    setSync({ [row.agentId]: { phase: "queued", pct: 20, note: "Waiting" } });
    void load();
  }

  const sel = rows.find((r) => r.agentId === selected);
  const selSt = sel ? sync[sel.agentId] : undefined;
  void compact;

  return (
    <div className="rpma-panel space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Fleet</p>
          <p className="mt-0.5 text-[16px] font-semibold text-fg">RPM Assure SQL Agent Status</p>
        </div>
        <div className="flex items-center gap-1">
          <Button type="button" size="sm" variant="ghost" className="h-8 px-3 text-[12px]" disabled={busy} onClick={() => void load()}>
            <RefreshCw className={cn("size-3.5", busy && "animate-spin")} />
            Refresh
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 px-3 text-[12px]"
            disabled={busy}
            onClick={() => {
              void requestAgentUpdate({ data: { all: true } }).then((r) => {
                setMsg(r.message);
                void load();
              });
            }}
          >
            Update all
          </Button>
        </div>
      </div>
      {msg ? <p className="text-[12px] text-muted">{msg}</p> : null}

      <div className="flex flex-wrap gap-2">
        {rows.length === 0 ? (
          <p className="text-[13px] text-muted">No agents registered.</p>
        ) : (
          rows.map((r) => {
            const st = sync[r.agentId];
            const tone = toneOf(r, st);
            const on = selected === r.agentId;
            return (
              <button
                key={r.agentId}
                type="button"
                title={`${r.displayName} \u00b7 ${r.agentId} \u00b7 ${labelOf(tone)}`}
                onClick={() => setSelected(r.agentId)}
                className={cn(
                  "inline-flex min-h-12 items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors",
                  on ? "border-fg/30 bg-surface-2" : "border-transparent bg-surface-2/70 hover:bg-surface-2",
                )}
              >
                <Bot
                  className={cn(
                    "size-5 shrink-0",
                    tone === "green" && "text-emerald-500",
                    tone === "amber" && "text-amber-400",
                    tone === "red" && "text-red-500",
                  )}
                  strokeWidth={2.25}
                />
                <span className="min-w-0">
                  <span className="block max-w-[12rem] truncate text-[13px] font-semibold leading-tight text-fg">
                    {r.displayName}
                  </span>
                  <span
                    className={cn(
                      "block text-[11px] font-medium leading-tight",
                      tone === "green" && "text-emerald-500",
                      tone === "amber" && "text-amber-500",
                      tone === "red" && "text-red-500",
                    )}
                  >
                    {labelOf(tone)}
                    {r.agentVersion ? ` \u00b7 v${r.agentVersion}` : ""}
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>

      {sel ? (
        <div className="flex flex-wrap items-center gap-3 border-t border-border/40 pt-3">
          <span className="font-mono text-[11px] text-muted">{sel.agentId}</span>
          <Button
            type="button"
            size="sm"
            className="h-8 px-3 text-[12px]"
            disabled={!sel.hostName || toneOf(sel, selSt) === "red" || selSt?.phase === "queued" || selSt?.phase === "running"}
            onClick={() => void syncOne(sel)}
          >
            Sync Now
          </Button>
          {selSt ? (
            <div className="min-w-[160px] flex-1">
              <div className="flex justify-between text-[11px] text-muted">
                <span>{selSt.note}</span>
                <span>{selSt.pct}%</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-black/25">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    selSt.phase === "error" ? "bg-red-500" : selSt.phase === "done" ? "bg-emerald-500" : "bg-amber-400",
                  )}
                  style={{ width: `${selSt.pct}%` }}
                />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
