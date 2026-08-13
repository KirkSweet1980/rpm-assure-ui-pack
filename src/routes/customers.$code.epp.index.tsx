import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHead } from "@/components/ui/card";
import { Route as PillarRoute } from "./customers.$code.epp";
import { NoCoverPanel } from "@/components/ui/no-cover";

export const Route = createFileRoute("/customers/$code/epp/")({
  component: function CustomerChild() {
    const data = PillarRoute.useLoaderData();
    if (!data?.customer) {
      return (
        <p className="text-sm text-muted">
          Loading customer workspace… If this stays blank, use Refresh in the top bar.
        </p>
      );
    }
    const epp = data.epp;
    const deviceCount = epp?.devices?.length ?? 0;
    const covered = deviceCount > 0;
    if (!covered) {
      return (
        <NoCoverPanel
          service="Endpoint Protection (EPP)"
          hint={
            epp?.message ||
            "No cover — no Bitdefender endpoints mapped to this customer. Run EPP collect and name-map patterns."
          }
        />
      );
    }
    const s = epp?.summary;
    const devices = epp?.devices ?? [];
    return (
      <div className="space-y-3">
        <Card>
          <CardHead>RPM End Point Protection · Overview</CardHead>
          <CardContent className="space-y-3 p-4 text-sm">
            {epp?.message && deviceCount === 0 ? (
              <p className="text-muted">{epp.message}</p>
            ) : null}
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Protected endpoints" value={s?.deviceCount ?? devices.length} />
              <Stat label="Managed" value={s?.managedCount ?? "—"} tone="green" />
              <Stat label="Servers (type 6)" value={s?.serverCount ?? "—"} />
              <Stat label="Workstations (type 5)" value={s?.workstationCount ?? "—"} />
            </div>
            {epp?.license ? (
              <p className="text-[12px] text-muted">
                Estate license slots:{" "}
                <span className="font-medium text-fg">
                  {epp.license.usedSlots ?? "—"} / {epp.license.totalSlots ?? "—"}
                </span>
                {epp.license.endSubscription
                  ? ` · subscription to ${epp.license.endSubscription}`
                  : null}
              </p>
            ) : null}
            {s?.asOfDate ? (
              <p className="text-[12px] text-muted">Snapshot: {s.asOfDate}</p>
            ) : null}
            {epp?.feedStatus ? (
              <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-[12px] text-muted">
                <span className="font-medium text-fg">Security feeds: </span>
                Incidents{" "}
                {epp.feedStatus.incidentsOk === true
                  ? "OK"
                  : epp.feedStatus.incidentsOk === false
                    ? "API unavailable"
                    : "—"}
                {" · "}
                Quarantine{" "}
                {epp.feedStatus.quarantineOk === true
                  ? "OK"
                  : epp.feedStatus.quarantineOk === false
                    ? "API unavailable"
                    : "—"}
                {epp.feedStatus.incidentsMessage || epp.feedStatus.quarantineMessage ? (
                  <span className="mt-1 block text-[11px] text-subtle">
                    {[epp.feedStatus.incidentsMessage, epp.feedStatus.quarantineMessage]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHead>Endpoints ({devices.length})</CardHead>
          <CardContent className="p-0">
            {devices.length === 0 ? (
              <p className="p-4 text-sm text-muted">
                Cover is on from portfolio counts, but no endpoint rows returned for this customer.
                Re-run Bitdefender collect.
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

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone?: "green";
}) {
  return (
    <div className="rounded-lg border border-border bg-card/40 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-muted">{label}</p>
      <p
        className={
          tone === "green"
            ? "text-lg font-semibold tabular-nums text-rag-green"
            : "text-lg font-semibold tabular-nums text-fg"
        }
      >
        {value}
      </p>
    </div>
  );
}
