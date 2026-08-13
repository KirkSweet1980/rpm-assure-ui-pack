import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Plug, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHead } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchIntegrations } from "@/lib/settings/settings-api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings/integrations")({
  component: IntegrationsPage,
});

type Row = {
  connectionCode: string;
  displayName: string;
  sourceKind: string;
  status: string;
  notes: string | null;
  lastSyncAt: string | null;
};

const STATUS_CLASS: Record<string, string> = {
  Active: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
  Configured: "bg-sky-500/15 text-sky-800 dark:text-sky-200",
  Planned: "bg-muted text-muted-foreground",
  Error: "bg-red-500/15 text-red-700 dark:text-red-300",
  Disabled: "bg-muted text-muted-foreground",
};

function IntegrationsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const r = await fetchIntegrations();
      setRows(r.rows ?? []);
      setMsg(r.message);
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
    <div className="space-y-4">
      <Card>
        <CardHead className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2">
            <Plug className="size-4 text-primary" />
            Connections
          </span>
          <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => void load()}>
            <RefreshCw className={cn("size-4", busy && "animate-spin")} />
            Refresh
          </Button>
        </CardHead>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted">
            Live collect under one <strong className="text-fg">Customer</strong> spine:{" "}
            <strong className="text-fg">SYSPRO Deployment</strong>,{" "}
            <strong className="text-fg">RPM Remote Management</strong> (Pulseway),{" "}
            <strong className="text-fg">RPM Cloud Backup</strong> (Cove),{" "}
            <strong className="text-fg">RPM End Point Protection</strong> (Bitdefender), and{" "}
            <strong className="text-fg">Microsoft 365 Tenant</strong> (CSP pilot).
            Status reflects product readiness — not separate domains.
          </p>
          {msg ? <p className="text-xs text-muted">{msg}</p> : null}
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-3 py-2 font-semibold">Connection</th>
                  <th className="px-3 py-2 font-semibold">Kind</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-muted">
                      No connections loaded. Refresh or check SQL connectivity.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.connectionCode} className="border-b border-border/70 last:border-0">
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-fg">{r.displayName}</div>
                        <div className="font-mono text-[11px] text-muted">{r.connectionCode}</div>
                      </td>
                      <td className="px-3 py-2.5 text-muted">{r.sourceKind}</td>
                      <td className="px-3 py-2.5">
                        <Badge className={cn("font-medium", STATUS_CLASS[r.status] ?? STATUS_CLASS.Planned)}>
                          {r.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted">{r.notes ?? "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
