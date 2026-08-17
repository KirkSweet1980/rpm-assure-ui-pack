import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHead } from "@/components/ui/card";
import { Route as PillarRoute } from "./customers.$code.epp";
import { NoCoverPanel } from "@/components/ui/no-cover";

export const Route = createFileRoute("/customers/$code/epp/modules")({
  component: function CustomerChild() {
    const data = PillarRoute.useLoaderData();
    if (!data?.customer) {
      return <p className="text-sm text-muted">Loading customer workspace…</p>;
    }
    const epp = data.epp;
    const devices = epp?.devices ?? [];
    const covered = devices.length > 0 || (data.customer?.eppDeviceCount ?? 0) > 0;
    if (!covered) {
      return (
        <NoCoverPanel
          service="RPM EndPoint Protection · Policies"
          hint={
            epp?.message ||
            "No cover — enable RPM EPP for this customer to collect this module."
          }
        />
      );
    }
    const byPolicy = new Map<string, number>();
    for (const d of devices) {
      const k = d.policyName?.trim() || "(no policy name)";
      byPolicy.set(k, (byPolicy.get(k) ?? 0) + 1);
    }
    const policies = [...byPolicy.entries()].sort((a, b) => b[1] - a[1]);
    return (
      <div className="space-y-3">
        <Card>
          <CardHead>RPM EPP · Policies</CardHead>
          <CardContent className="p-4 text-sm">
            <p className="mb-3 text-muted">
              Security policies assigned on RPM EPP (from the latest collect).
            </p>
            {policies.length === 0 ? (
              <p className="text-muted">No endpoint/policy rows for this customer on latest snapshot.</p>
            ) : (
              <ul className="space-y-1">
                {policies.map(([name, n]) => (
                  <li
                    key={name}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                  >
                    <span className="font-medium text-fg">{name}</span>
                    <span className="tabular-nums text-muted">{n} device(s)</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    );
  },
});
