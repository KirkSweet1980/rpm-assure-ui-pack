import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Route as PillarRoute } from "./customers.$code.epp";
import { NoCoverPanel } from "@/components/ui/no-cover";
import { DataWindow } from "@/components/customer/data-window";
import { ServerKindIcon } from "@/components/customer/server-kind-icon";
import { formatSastDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

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
          service="RPM End Point Protection · EndPoint Agents"
          hint={epp?.message || "No cover — no RPM End Point Protection endpoints mapped to this customer."}
        />
      );
    }
    const picked = devices.find((d) => d.endpointId === sel) ?? devices[0];
    const updateLabel = (d: (typeof devices)[0] | undefined) => {
      if (!d) return "—";
      const bits: string[] = [];
      if (d.productOutdated) bits.push("Product Outdated");
      if (d.signatureOutdated) bits.push("Signature Outdated");
      if (bits.length) return bits.join(" · ");
      if (d.lastSuccessfulScanAt) return `Current · Last Scan ${formatSastDateTime(d.lastSuccessfulScanAt)}`;
      return "Current · Definitions";
    };
    const scanLabel = (d: (typeof devices)[0] | undefined) => {
      if (!d?.lastSuccessfulScanAt) return "No Last Scan on last collect";
      const when = formatSastDateTime(d.lastSuccessfulScanAt);
      return d.lastSuccessfulScanName ? `${when} · ${d.lastSuccessfulScanName}` : when;
    };
    return (
      <div className="rpma-win-row" style={{ minHeight: 0 }}>
        <DataWindow title="EndPoint Agents" subtitle={`${devices.length} agent${devices.length === 1 ? "" : "s"}`} fill>
          <ul className="rpma-epp-agent-list">
            {devices.map((d) => {
              const threat = Boolean(d.infected || d.malwareDetected);
              const on = d.endpointId === picked?.endpointId;
              return (
                <li key={d.endpointId}>
                  <button
                    type="button"
                    className={cn("rpma-epp-agent", on && "is-on", threat && "is-bad")}
                    onClick={() => setSel(d.endpointId)}
                  >
                    <ServerKindIcon
                      device={{
                        name: d.deviceName,
                        osName: d.operatingSystem,
                        deviceType: d.machineType === 6 ? "Server" : "Workstation",
                      }}
                      size={18}
                    />
                    <span>
                      <strong>{d.deviceName ?? d.fqdn ?? d.endpointId}</strong>
                      <em>
                        {threat ? "Threat" : "Clean"}
                        {d.lastSuccessfulScanAt ? ` · Scan ${scanLabel(d)}` : " · No Last Scan"}
                      </em>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </DataWindow>
        <DataWindow
          title={picked?.deviceName ?? "Agent"}
          subtitle={picked?.fqdn ?? picked?.operatingSystem ?? "EndPoint Detail"}
          fill
        >
          {picked ? (
            <dl className="rpma-epp-detail">
              <div>
                <em>Device</em>
                <p>{picked.deviceName ?? "—"}</p>
              </div>
              <div>
                <em>FQDN</em>
                <p>{picked.fqdn ?? "—"}</p>
              </div>
              <div className="is-wide">
                <em>Operating System</em>
                <p>{picked.operatingSystem ?? "—"}</p>
              </div>
              <div>
                <em>Managed</em>
                <p>{picked.isManaged === true ? "Yes" : picked.isManaged === false ? "No" : "—"}</p>
              </div>
              <div>
                <em>Policy</em>
                <p>{picked.policyName ?? "—"}</p>
              </div>
              <div>
                <em>Last Scan</em>
                <p>{scanLabel(picked)}</p>
              </div>
              <div>
                <em>Threat</em>
                <p>{picked.infected || picked.malwareDetected ? "Detected" : "Clean"}</p>
              </div>
              <div>
                <em>Update</em>
                <p>{updateLabel(picked)}</p>
              </div>
            </dl>
          ) : (
            <p className="p-4 text-[12px] text-muted">Select an agent.</p>
          )}
        </DataWindow>
      </div>
    );
  },
});
