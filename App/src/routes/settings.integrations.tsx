import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Check, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  fetchConfigHealth,
  fetchIntegrations,
  type ConfigHealthItem,
} from "@/lib/settings/settings-api";
import { SpaLink } from "@/components/nav/spa-link";
import { cn, formatSastDateTime } from "@/lib/utils";

export const Route = createFileRoute("/settings/integrations")({
  component: IntegrationsPage,
});

type ConnRow = {
  connectionCode: string;
  displayName: string;
  sourceKind: string;
  status: string;
  notes: string | null;
  lastSyncAt: string | null;
};

function HealthTile({ item }: { item: ConfigHealthItem }) {
  return (
    <SpaLink
      href={item.href}
      className={cn(
        "rpma-panel flex flex-col gap-1 px-3 py-3 no-underline",
        item.ok ? "ring-1 ring-rag-green/30" : "ring-1 ring-rag-red/30",
      )}
    >
      <span className="flex items-center gap-2">
        <span
          className={cn(
            "grid h-6 w-6 place-items-center rounded-full",
            item.ok ? "bg-rag-green text-white" : "bg-rag-red text-white",
          )}
          aria-hidden
        >
          {item.ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
        </span>
        <span className="min-w-0 text-[13px] font-bold leading-snug text-fg">{item.label}</span>
      </span>
      {item.source !== "sql" ? (
        <span className="text-[10px] uppercase tracking-wide text-muted">
          {item.source === "agent" ? "SYSPRO · RPM Assure Agent" : item.source === "api" ? "API" : "Platform"}
        </span>
      ) : null}
      <span className={cn("text-[12px] font-semibold", item.ok ? "text-rag-green" : "text-rag-red")}>
        {item.ok ? "Connected" : "Not connected"}
      </span>
      <span className="text-[11px] text-muted">{item.detail}</span>
      {item.lastAt ? (
        <span className="text-[10px] text-subtle">Last collect {formatSastDateTime(item.lastAt)}</span>
      ) : null}
    </SpaLink>
  );
}

function IntegrationsPage() {
  const [health, setHealth] = useState<ConfigHealthItem[]>([]);
  const [rows, setRows] = useState<ConnRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const [h, r] = await Promise.all([fetchConfigHealth(), fetchIntegrations()]);
      setHealth(h.items ?? []);
      setRows(r.rows ?? []);
      setMsg(r.message ?? null);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const okN = health.filter((i) => i.ok).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Configuration health</p>
          <p className="text-[13px] text-fg">
            {okN} of {health.length || 6} connected
          </p>
        </div>
        <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => void load()}>
          <RefreshCw className={cn("size-4", busy && "animate-spin")} />
          Recheck
        </Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {health.map((item) => (
          <HealthTile key={item.id} item={item} />
        ))}
      </div>

      <div className="rpma-panel overflow-x-auto p-0">
        <table className="w-full min-w-[640px] text-left text-[13px]">
          <thead className="border-b border-border bg-surface-2 text-[10px] uppercase tracking-wide text-muted">
            <tr>
              <th className="px-3 py-2 font-semibold">Connection</th>
              <th className="px-3 py-2 font-semibold">Kind</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2 font-semibold">Last sync</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-muted">
                  {msg || "No Dim_Connection rows. Health tiles above still probe live tables."}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.connectionCode} className="border-b border-border/70 last:border-0">
                  <td className="px-3 py-2.5 font-medium text-fg">{r.displayName}</td>
                  <td className="px-3 py-2.5 text-muted">{r.sourceKind}</td>
                  <td className="px-3 py-2.5">{r.status}</td>
                  <td className="px-3 py-2.5 text-[12px] text-muted">
                    {r.lastSyncAt ? formatSastDateTime(r.lastSyncAt) : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
