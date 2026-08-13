import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHead } from "@/components/ui/card";
import { Route as PillarRoute } from "./customers.$code.epp";
import { NoCoverPanel } from "@/components/ui/no-cover";
import { formatSastDateTime } from "@/lib/utils";

function cleanDeviceName(name: string | null | undefined): string {
  if (!name) return "—";
  const m = name.match(/^(.*)-([0-9a-f]{12})$/i);
  return m ? m[1] : name;
}

export const Route = createFileRoute("/customers/$code/epp/quarantine")({
  component: function CustomerChild() {
    const data = PillarRoute.useLoaderData();
    if (!data?.customer) {
      return <p className="text-sm text-muted">Loading customer workspace…</p>;
    }
    const epp = data.epp;
    const covered =
      data.cover?.epp === true ||
      epp?.enabled === true ||
      (epp?.devices?.length ?? 0) > 0 ||
      (epp?.summary?.deviceCount ?? 0) > 0 ||
      (data.customer?.eppDeviceCount ?? 0) > 0;
    if (!covered) {
      return (
        <NoCoverPanel
          service="Endpoint Protection (EPP) · Quarantine"
          hint={
            epp?.message ||
            "No cover — no Bitdefender endpoints mapped to this customer."
          }
        />
      );
    }
    const rows = epp?.quarantine ?? [];
    const feed = epp?.feedStatus;
    return (
      <div className="space-y-3">
        <Card>
          <CardHead>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>RPM End Point Protection · Quarantine ({rows.length})</span>
              {feed?.quarantineOk != null ? (
                <span
                  className={
                    feed.quarantineOk
                      ? "text-[11px] font-medium text-emerald-600 dark:text-emerald-400"
                      : "text-[11px] font-medium text-amber-600 dark:text-amber-400"
                  }
                >
                  Feed {feed.quarantineOk ? "OK" : "fail"}
                  {feed.quarantineCount != null
                    ? ` · estate ${feed.quarantineCount}`
                    : ""}
                </span>
              ) : null}
            </div>
          </CardHead>
          <CardContent className="p-0">
            {rows.length === 0 ? (
              <div className="space-y-2 p-4 text-sm text-muted">
                <p className="font-medium text-fg">
                  No quarantine items for this customer.
                </p>
                {feed?.quarantineOk === false ? (
                  <p className="text-[12px] text-subtle">
                    GravityZone quarantine feed failed
                    {feed.quarantineMessage ? `: ${feed.quarantineMessage}` : "."}
                  </p>
                ) : (
                  <p className="text-[12px] text-subtle">
                    Nothing quarantined for{" "}
                    <span className="font-medium text-fg">
                      {data.customer.displayName || data.customer.customerCode}
                    </span>{" "}
                    on the latest snapshot.
                    {feed?.quarantineOk === true && feed.quarantineCount
                      ? ` Estate-wide quarantine has ${feed.quarantineCount} item(s) (mostly other customers / internal hosts).`
                      : feed?.quarantineOk === true
                        ? " Estate quarantine feed is healthy."
                        : ""}
                  </p>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-3 py-2">Quarantined</th>
                      <th className="px-3 py-2">Device</th>
                      <th className="px-3 py-2">Threat</th>
                      <th className="px-3 py-2">Path</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.itemId} className="border-b border-border/70">
                        <td className="px-3 py-2 text-xs text-muted">
                          {r.quarantinedAt
                            ? formatSastDateTime(r.quarantinedAt)
                            : "—"}
                        </td>
                        <td className="px-3 py-2 font-medium">
                          {cleanDeviceName(r.deviceName)}
                        </td>
                        <td className="px-3 py-2 text-xs">{r.threatName ?? "—"}</td>
                        <td
                          className="max-w-[320px] truncate px-3 py-2 text-xs text-muted"
                          title={r.filePath ?? undefined}
                        >
                          {r.filePath ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-xs">{r.status ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length >= 500 ? (
                  <p className="border-t border-border px-3 py-2 text-[11px] text-muted">
                    Showing first 500 items for this customer.
                  </p>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  },
});
