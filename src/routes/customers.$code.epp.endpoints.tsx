import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHead } from "@/components/ui/card";
import { Route as PillarRoute } from "./customers.$code.epp";
import { NoCoverPanel } from "@/components/ui/no-cover";

export const Route = createFileRoute("/customers/$code/epp/endpoints")({
  component: function CustomerChild() {
    const data = PillarRoute.useLoaderData();
    if (!data?.customer) {
      return <p className="text-sm text-muted">Loading customer workspace…</p>;
    }
    const epp = data.epp;
    const devices = epp?.devices ?? [];
    const covered = (devices.length > 0 || (data.customer?.eppDeviceCount ?? 0) > 0);
    if (!covered) {
      return (
        <NoCoverPanel
          service="Endpoint Protection (EPP) · Endpoints"
          hint={
            epp?.message ||
            "No cover — no Bitdefender endpoints mapped to this customer."
          }
        />
      );
    }
    return (
      <div className="space-y-3">
        <Card>
          <CardHead>RPM End Point Protection · Endpoints ({devices.length})</CardHead>
          <CardContent className="p-0">
            {devices.length === 0 ? (
              <p className="p-4 text-sm text-muted">
                No endpoint rows for this customer on the latest snapshot. Re-run Bitdefender collect.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-3 py-2">Device</th>
                      <th className="px-3 py-2">FQDN</th>
                      <th className="px-3 py-2">IP</th>
                      <th className="px-3 py-2">OS</th>
                      <th className="px-3 py-2">Managed</th>
                      <th className="px-3 py-2">Policy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {devices.map((d) => (
                      <tr key={d.endpointId} className="border-b border-border/70">
                        <td className="px-3 py-2 font-medium">{d.deviceName ?? "—"}</td>
                        <td className="px-3 py-2 text-xs text-muted">{d.fqdn ?? "—"}</td>
                        <td className="px-3 py-2 text-xs tabular-nums">{d.ipAddress ?? "—"}</td>
                        <td
                          className="max-w-[180px] truncate px-3 py-2 text-xs text-muted"
                          title={d.operatingSystem ?? undefined}
                        >
                          {d.operatingSystem ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {d.isManaged === true ? (
                            <span className="font-semibold text-rag-green">Yes</span>
                          ) : d.isManaged === false ? (
                            <span className="font-semibold text-rag-amber">No</span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted">{d.policyName ?? "—"}</td>
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
