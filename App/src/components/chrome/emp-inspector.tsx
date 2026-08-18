import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import { SpaLink } from "@/components/nav/spa-link";
import { fetchCustomerSlaContract } from "@/lib/data/customer-sla-contract";
import type { LiveTone } from "@/lib/data/live-status";
import { formatSastDateTime } from "@/lib/utils";

export function EmpInspector({
  name,
  customerCode,
  service,
  module,
  cover,
  health,
  lastUtc,
  slaHref,
}: {
  name: string;
  customerCode: string;
  service: string;
  module: string;
  cover: boolean;
  health: LiveTone;
  lastUtc?: string | null;
  slaHref: string;
}) {
  const [signed, setSigned] = useState(false);
  const [signedLabel, setSignedLabel] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetchCustomerSlaContract({ data: { code: customerCode } }).then((r) => {
      if (!live) return;
      setSigned(r.status === "signed");
      setSignedLabel(r.documentName);
    });
    return () => {
      live = false;
    };
  }, [customerCode]);

  const healthLabel =
    !cover || health === "Off"
      ? "—"
      : health === "Green"
        ? "Healthy"
        : health === "Amber"
          ? "Watch"
          : health === "Red"
            ? "Miss"
            : "—";

  return (
    <aside className="rpma-emp-inspector" aria-label="Service inspector">
      <div className={signed ? "rpma-sla-banner is-signed" : "rpma-sla-banner is-prov"}>
        {signed ? (
          <>
            <strong>Signed SLA</strong>
            <span>{signedLabel ?? "Contract on file"}</span>
          </>
        ) : (
          <>
            <strong>Provisional Cover | No Signed SLA</strong>
          </>
        )}
      </div>
      <div className="rpma-amx-card">
        <span className="rpma-amx-ico lg">
          <Building2 className="size-5" />
        </span>
        <div>
          <strong>{name}</strong>
          <em>
            {service}
            {module ? ` · ${module}` : ""}
          </em>
        </div>
      </div>
      <dl className="rpma-amx-dl">
        <div>
          <dt>SLA cover</dt>
          <dd className={signed ? "text-emerald-400" : "text-rag-amber"}>
            {signed ? "Signed SLA" : "Provisional Cover | No Signed SLA"}
          </dd>
        </div>
        <div>
          <dt>Health</dt>
          <dd>{healthLabel}</dd>
        </div>
        <div>
          <dt>Last updated</dt>
          <dd>{formatSastDateTime(lastUtc)}</dd>
        </div>
      </dl>
      <SpaLink href={slaHref} className="rpma-amx-sla">
        {signed ? "View SLA history" : "Import Signed SLA"}
      </SpaLink>
    </aside>
  );
}
