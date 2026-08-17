import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHead } from "@/components/ui/card";
import { Route as PillarRoute } from "./customers.$code.epp";
import { NoCoverPanel } from "@/components/ui/no-cover";
import { StickyPickSplit } from "@/components/customer/tenant-tree";
import { formatSastDateTime } from "@/lib/utils";

export const Route = createFileRoute("/customers/$code/epp/endpoints")({
  component: function CustomerChild() {
    const data = PillarRoute.useLoaderData();
    if (!data?.customer) {
      return <p className="text-sm text-muted">Loading customer workspace…</p>;
    }
    const epp = data.epp;
    const devices = epp?.devices ?? [];
    const covered = devices.length > 0 || (data.customer?.eppDeviceCount ?? 0) > 0;
    const [sel, setSel] = useState(devices[0]?.endpointId ?? "");
    if (!covered) {
      return (
        <NoCoverPanel
          service="RPM EndPoint Protection · Endpoints"
          hint={epp?.message || "No cover — no RPM EndPoint Protection endpoints mapped to this customer."}
        />
      );
    }
    const picked = devices.find((d) => d.endpointId === sel) ?? devices[0];
    return (
      <div className="space-y-3">
        <Card>
          <CardHead>RPM EndPoint Protection · Endpoints ({devices.length})</CardHead>
          <CardContent>
            {devices.length === 0 ? (
              <p className="text-sm text-muted">No endpoint rows for this customer on the latest snapshot.</p>
            ) : (
              <StickyPickSplit
                title="Endpoints"
                items={devices.map((d) => ({
                  id: d.endpointId,
                  label: d.deviceName ?? d.fqdn ?? d.endpointId,
                  meta: d.infected || d.malwareDetected ? "Threat" : "Clean",
                  tone: d.infected || d.malwareDetected ? "red" : "green",
                }))}
                selected={picked?.endpointId ?? ""}
                onSelect={setSel}
              >
                {picked ? (
                  <dl className="grid gap-2 text-[12px] sm:grid-cols-2">
                    <div><em className="text-muted">Device</em><p className="font-bold">{picked.deviceName ?? "—"}</p></div>
                    <div><em className="text-muted">FQDN</em><p>{picked.fqdn ?? "—"}</p></div>
                    <div className="sm:col-span-2"><em className="text-muted">OS</em><p>{picked.operatingSystem ?? "—"}</p></div>
                    <div><em className="text-muted">Managed</em><p>{picked.isManaged === true ? "Yes" : picked.isManaged === false ? "No" : "—"}</p></div>
                    <div><em className="text-muted">Policy</em><p>{picked.policyName ?? "—"}</p></div>
                    <div><em className="text-muted">Last scan</em><p>{picked.lastSuccessfulScanAt ? formatSastDateTime(picked.lastSuccessfulScanAt) : "—"}</p></div>
                    <div><em className="text-muted">Threat</em><p>{picked.infected || picked.malwareDetected ? "Detected" : "Clean"}</p></div>
                    <div><em className="text-muted">Update</em><p>{picked.productOutdated || picked.signatureOutdated ? "Outdated" : "Current"}</p></div>
                  </dl>
                ) : null}
              </StickyPickSplit>
            )}
          </CardContent>
        </Card>
      </div>
    );
  },
});
