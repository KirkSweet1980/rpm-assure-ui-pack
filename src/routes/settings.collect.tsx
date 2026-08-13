import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHead } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  fetchCollectInventory,
  type CollectInventoryRow,
} from "@/lib/settings/settings-api";
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
  if (r === "Red") return "bg-red-500/15 text-red-700 dark:text-red-300";
  if (r === "Amber") return "bg-amber-500/15 text-amber-800 dark:text-amber-200";
  if (r === "None") return "bg-muted/40 text-muted-foreground";
  return "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200";
}

function CollectInventoryPage() {
  const [rows, setRows] = useState<CollectInventoryRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [staleHours, setStaleHours] = useState(48);
  const [busy, setBusy] = useState(false);

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
    <Card>
      <CardHead className="flex flex-wrap items-center justify-between gap-2">
        <span>Collect inventory</span>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={() => void load()}
        >
          <RefreshCw className={cn("size-4", busy && "animate-spin")} />
          Refresh
        </Button>
      </CardHead>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted">
          SYSPRO collect status by customer. <strong>Stale</strong> only applies
          when the customer is on SYSPRO cover and operators were not imported
          within {staleHours} hours. Customers without SYSPRO show{" "}
          <strong>No Cover</strong> (not stale).
        </p>
        {msg && <p className="text-xs text-muted">{msg}</p>}
        {covered.length > 0 && (
          <p className="text-xs text-muted">
            On cover: {covered.length} · Stale: {stale.length}
            {stale.length > 0 && (
              <span className="text-amber-700 dark:text-amber-300">
                {" "}
                (
                {stale.map((s) => s.customerCode).join(", ")})
              </span>
            )}
          </p>
        )}
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="bg-surface-2 text-[11px] uppercase tracking-wide text-muted">
              <tr>
                <th className="px-2 py-2">Customer</th>
                <th className="px-2 py-2">Instance</th>
                <th className="px-2 py-2">Health</th>
                <th className="px-2 py-2">Ops last</th>
                <th className="px-2 py-2">Age (h)</th>
                <th className="px-2 py-2">Jobs / err</th>
                <th className="px-2 py-2">FinSight Out of Balance</th>
                <th className="px-2 py-2">License</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-2 py-6 text-center text-muted">
                    No rows — check SQL connection and Dim_Customer.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.customerCode}
                    className="border-t border-border/80 hover:bg-surface-2/60"
                  >
                    <td className="px-2 py-2">
                      <Link
                        to="/customers/$code"
                        params={{ code: row.customerCode }}
                        className="font-medium text-primary hover:underline"
                      >
                        {row.displayName}
                      </Link>
                      <div className="text-[10px] text-muted">
                        {row.customerCode}
                        {!row.active && " · inactive"}
                      </div>
                    </td>
                    <td className="px-2 py-2 font-mono text-[11px]">
                      {row.sqlInstanceName || "—"}
                    </td>
                    <td className="px-2 py-2">
                      {!row.sysproCovered ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] font-bold text-amber-700 dark:text-amber-300 border-amber-500/40"
                        >
                          No Cover
                        </Badge>
                      ) : (
                        <>
                          <span
                            className={cn(
                              "inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold",
                              ragClass(row.healthRag),
                            )}
                          >
                            {row.healthRag}
                          </span>
                          {row.stale && (
                            <Badge variant="outline" className="ml-1 text-[10px]">
                              Stale
                            </Badge>
                          )}
                        </>
                      )}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      {row.sysproCovered ? (
                        <>
                          {fmt(row.lastOpsUtc)}
                          <div className="text-[10px] text-muted">
                            {row.opsCount} ops
                          </div>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-2 py-2">
                      {!row.sysproCovered
                        ? "—"
                        : row.hoursSinceOps == null
                          ? "—"
                          : row.hoursSinceOps}
                    </td>
                    <td className="px-2 py-2">
                      {!row.sysproCovered ? (
                        "—"
                      ) : (
                        <>
                          {row.jobsCount}
                          {row.jobErrors > 0 && (
                            <span className="text-red-600 dark:text-red-400">
                              {" "}
                              / {row.jobErrors} err
                            </span>
                          )}
                          <div className="text-[10px] text-muted">
                            {fmt(row.lastJobsUtc)}
                          </div>
                        </>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      {row.sysproCovered ? row.dtrVarLines : "—"}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      {row.sysproCovered ? fmt(row.lastLicenseUtc) : "—"}
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
