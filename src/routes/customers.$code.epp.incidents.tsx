import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHead } from "@/components/ui/card";
import { Route as PillarRoute } from "./customers.$code.epp";
import { NoCoverPanel } from "@/components/ui/no-cover";
import { formatSastDateTime } from "@/lib/utils";

function cleanDeviceName(name: string | null | undefined): string {
  if (!name) return "—";
  // Strip GravityZone name-MAC suffix e.g. HOST-00155d151217
  const m = name.match(/^(.*)-([0-9a-f]{12})$/i);
  return m ? m[1] : name;
}

export const Route = createFileRoute("/customers/$code/epp/incidents")({
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
          service="Endpoint Protection (EPP) · Incidents"
          hint={
            epp?.message ||
            "No cover — no Bitdefender endpoints mapped to this customer."
          }
        />
      );
    }
    const rows = epp?.incidents ?? [];
    const feed = epp?.feedStatus;
    return (
      <div className="space-y-3">
        <Card>
          <CardHead>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>RPM End Point Protection · Incidents ({rows.length})</span>
              {feed?.incidentsOk != null ? (
                <span
                  className={
                    feed.incidentsOk
                      ? "text-[11px] font-medium text-emerald-600 dark:text-emerald-400"
                      : "text-[11px] font-medium text-amber-600 dark:text-amber-400"
                  }
                >
                  Feed {feed.incidentsOk ? "OK" : "fail"}
                  {feed.incidentsCount != null
                    ? ` · estate ${feed.incidentsCount}`
                    : ""}
                </span>
              ) : null}
            </div>
          </CardHead>
          <CardContent className="p-0">
            {rows.length === 0 ? (
              <div className="space-y-2 p-4 text-sm text-muted">
                <p className="font-medium text-fg">No open incidents for this customer.</p>
                {feed?.incidentsOk === false ? (
                  <p className="text-[12px] text-subtle">
                    GravityZone incidents feed failed
                    {feed.incidentsMessage ? `: ${feed.incidentsMessage}` : "."}
                  </p>
                ) : (
                  <p className="text-[12px] text-subtle">
                    Latest collect returned no open incidents mapped to{" "}
                    <span className="font-medium text-fg">
                      {data.customer.displayName || data.customer.customerCode}
                    </span>
                    . Estate feed is{" "}
                    {feed?.incidentsOk === true ? "healthy" : "unknown"}
                    {feed?.incidentsCount != null
                      ? ` (${feed.incidentsCount} total open estate-wide)`
                      : ""}
                    .
                  </p>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-3 py-2">Detected</th>
                      <th className="px-3 py-2">Device</th>
                      <th className="px-3 py-2">Severity</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Summary</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.incidentId} className="border-b border-border/70">
                        <td className="px-3 py-2 text-xs text-muted">
                          {r.detectedAt ? formatSastDateTime(r.detectedAt) : "—"}
                        </td>
                        <td className="px-3 py-2 font-medium">
                          {cleanDeviceName(r.deviceName)}
                        </td>
                        <td className="px-3 py-2 text-xs">{r.severity ?? "—"}</td>
                        <td className="px-3 py-2 text-xs">{r.status ?? "—"}</td>
                        <td className="px-3 py-2 text-xs text-muted">
                          {r.incidentType ?? "—"}
                        </td>
                        <td
                          className="max-w-[280px] truncate px-3 py-2 text-xs text-muted"
                          title={r.summary ?? undefined}
                        >
                          {r.summary ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  },
});
