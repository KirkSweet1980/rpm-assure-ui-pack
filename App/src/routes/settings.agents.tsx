import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHead } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchAgentStatus, type AgentStatusRow } from "@/lib/settings/settings-api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings/agents")({
  component: AgentsPage,
});

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

function AgentsPage() {
  const [rows, setRows] = useState<AgentStatusRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const r = await fetchAgentStatus();
      setMsg(r.message);
      setRows(r.rows ?? []);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
      setRows([]);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Card>
      <CardHead className="flex flex-wrap items-center justify-between gap-2">
        <span>Edge agents</span>
        <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => void load()}>
          <RefreshCw className={cn("size-4", busy && "animate-spin")} />
          Refresh
        </Button>
      </CardHead>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted">
          Windows service <strong>RPMAssure-Edge</strong> on each customer SQL host. Heartbeat plus
          SYSPRO collect every 30 minutes. Apply{" "}
          <code>Sql/agent/470_Ensure_Agent_Tables.sql</code> on central once.
        </p>
        {msg ? <p className="text-xs text-muted">{msg}</p> : null}
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="bg-surface-2 text-[11px] uppercase tracking-wide text-muted">
              <tr>
                <th className="px-2 py-1.5">Customer</th>
                <th className="px-2 py-1.5">Host</th>
                <th className="px-2 py-1.5">Health</th>
                <th className="px-2 py-1.5">Heartbeat</th>
                <th className="px-2 py-1.5">Last job</th>
                <th className="px-2 py-1.5">Message</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-2 py-4 text-muted">
                    No agents registered yet. Install the service on the SQL host.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={`${r.customerCode}-${r.hostName}`} className="border-t border-border">
                    <td className="px-2 py-1.5 font-semibold">{r.customerCode}</td>
                    <td className="px-2 py-1.5 font-mono">{r.hostName}</td>
                    <td className="px-2 py-1.5">
                      <Badge
                        variant={
                          r.healthStatus === "ONLINE"
                            ? "online"
                            : r.healthStatus === "STALE"
                              ? "amber"
                              : "muted"
                        }
                      >
                        {r.healthStatus}
                      </Badge>
                    </td>
                    <td className="px-2 py-1.5">{fmt(r.lastHeartbeatUtc)}</td>
                    <td className="px-2 py-1.5">{fmt(r.lastJobUtc)}</td>
                    <td className="max-w-[280px] truncate px-2 py-1.5 text-muted" title={r.lastMessage ?? ""}>
                      {r.lastMessage ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
