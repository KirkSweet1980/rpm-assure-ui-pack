import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  fetchCollectInventory,
  runAllApiSync,
  type CollectInventoryRow,
} from "@/lib/settings/settings-api";
import { SpaLink } from "@/components/nav/spa-link";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings/collect")({
  component: CollectInventoryPage,
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

function ragClass(r: string) {
  if (r === "Red") return "text-rag-red";
  if (r === "Amber") return "text-amber-400";
  if (r === "None") return "text-muted";
  return "text-rag-green";
}

const SOURCE_MAP: Array<[string, string, string]> = [
  ["SYSPRO EcoSystem", "Overview / Operators / Jobs / FinSight / Licence / Day End", "RPM Assure Agent"],
  ["RPM Remote Management", "Overview / Servers / Workstations / Patch / Alerts", "RMM API"],
  ["RPM Cloud Backup", "Overview / Devices / Recovery / Retention", "N-Able Cove Backup"],
  ["RPM EndPoint Protection", "Overview / Endpoints / Incidents / Quarantine", "RPM EndPoint Protection API"],
  ["Microsoft 365 CSP", "Tenant / Secure Score / MFA / Admins / Licences", "Microsoft Graph API"],
  ["Customer Assurance", "Customer Incidents / Risks / SLA", "Assure AMS"],
];

function CollectInventoryPage() {
  const [rows, setRows] = useState<CollectInventoryRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [staleHours, setStaleHours] = useState(48);
  const [busy, setBusy] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const r = await fetchCollectInventory();
      setMsg(r.message);
      setRows(r.rows ?? []);
      setStaleHours(r.staleHours ?? 48);
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

  const covered = rows.filter((r) => r.sysproCovered);
  const stale = covered.filter((r) => r.stale);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Configuration</p>
          <h1 className="mt-1 text-[18px] font-semibold tracking-tight text-fg">Collect Inventory</h1>
          <p className="mt-1 text-[13px] text-muted">
            SYSPRO last import by customer. Stale only applies on SYSPRO cover when operators
            are older than {staleHours} hours.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={syncing}
            onClick={() => {
              setSyncing(true);
              setSyncMsg(null);
              void runAllApiSync()
                .then((r) => setSyncMsg(r.message))
                .catch((e) => setSyncMsg(e instanceof Error ? e.message : String(e)))
                .finally(() => setSyncing(false));
            }}
          >
            {syncing ? "Starting sync…" : "Sync All APIs"}
          </Button>
          <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => void load()}>
            <RefreshCw className={cn("size-3.5", busy && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {syncMsg ? <p className="text-[12px] font-semibold text-fg">{syncMsg}</p> : null}

      <section className="rpma-panel overflow-hidden p-0">
        <div className="px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Sources</p>
          <h2 className="mt-0.5 text-[16px] font-semibold text-fg">Where each service is collected from</h2>
        </div>
        <table className="w-full text-left text-[12px]">
          <thead className="rpma-table-head">
            <tr>
              <th className="px-4 py-2 font-semibold">Service</th>
              <th className="px-4 py-2 font-semibold">Modules</th>
              <th className="px-4 py-2 font-semibold">Source</th>
            </tr>
          </thead>
          <tbody>
            {SOURCE_MAP.map((r) => (
              <tr key={r[0]} className="border-t border-border/40">
                <td className="px-4 py-2 font-semibold text-fg">{r[0]}</td>
                <td className="px-4 py-2 text-muted">{r[1]}</td>
                <td className="px-4 py-2">{r[2]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rpma-panel overflow-hidden p-0">
        <div className="flex flex-wrap items-end justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">SYSPRO</p>
            <h2 className="mt-0.5 text-[16px] font-semibold text-fg">Customer Collect</h2>
          </div>
          <p className="text-[12px] text-muted">
            On cover {covered.length} · Stale {stale.length}
            {stale.length > 0 ? ` (${stale.map((s) => s.customerCode).join(", ")})` : ""}
          </p>
        </div>
        {msg ? <p className="px-4 pb-2 text-[12px] text-muted">{msg}</p> : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[12px]">
            <thead className="rpma-table-head">
              <tr>
                <th className="px-4 py-2 font-semibold">Customer</th>
                <th className="px-4 py-2 font-semibold">Instance</th>
                <th className="px-4 py-2 font-semibold">Health</th>
                <th className="px-4 py-2 font-semibold">Ops Last</th>
                <th className="px-4 py-2 font-semibold">Age (h)</th>
                <th className="px-4 py-2 font-semibold">Jobs / Err</th>
                <th className="px-4 py-2 font-semibold">FinSight OOB</th>
                <th className="px-4 py-2 font-semibold">Licence</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-muted">
                    No rows — check SQL connection and Dim_Customer.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.customerCode} className="border-t border-border/40">
                    <td className="px-4 py-2.5">
                      <SpaLink
                        href={`/customers/${encodeURIComponent(row.customerCode)}`}
                        className="font-semibold text-fg no-underline hover:underline"
                      >
                        {row.displayName}
                      </SpaLink>
                      <div className="text-[10px] text-muted">
                        {row.customerCode}
                        {!row.active ? " · inactive" : ""}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-muted">
                      {row.sqlInstanceName || "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      {!row.sysproCovered ? (
                        <span className="text-muted">No RPM Cloud Backupr</span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5">
                          <span className={cn("font-semibold", ragClass(row.healthRag))}>{row.healthRag}</span>
                          {row.stale ? <span className="text-[11px] text-amber-400">Stale</span> : null}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {row.sysproCovered ? (
                        <>
                          {fmt(row.lastOpsUtc)}
                          <div className="text-[10px] text-muted">{row.opsCount} ops</div>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {!row.sysproCovered ? "—" : row.hoursSinceOps == null ? "—" : row.hoursSinceOps}
                    </td>
                    <td className="px-4 py-2.5">
                      {!row.sysproCovered ? (
                        "—"
                      ) : (
                        <>
                          {row.jobsCount}
                          {row.jobErrors > 0 ? (
                            <span className="text-rag-red"> / {row.jobErrors} err</span>
                          ) : null}
                          <div className="text-[10px] text-muted">{fmt(row.lastJobsUtc)}</div>
                        </>
                      )}
                    </td>
                    <td className="px-4 py-2.5">{row.sysproCovered ? row.dtrVarLines : "—"}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {row.sysproCovered ? fmt(row.lastLicenseUtc) : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
