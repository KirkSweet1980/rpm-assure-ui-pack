import { Building2 } from "lucide-react";
import { SpaLink } from "@/components/nav/spa-link";
import type { LiveTone } from "@/lib/data/live-status";
import { formatSastDateTime } from "@/lib/utils";

export function EmpInspector({
  name,
  service,
  module,
  cover,
  health,
  lastUtc,
  slaHref,
}: {
  name: string;
  service: string;
  module: string;
  cover: boolean;
  health: LiveTone;
  lastUtc?: string | null;
  slaHref: string;
}) {
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
          <dd className={cover ? "text-emerald-400" : "text-muted"}>{cover ? "Covered" : "Out of scope"}</dd>
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
        View SLA history
      </SpaLink>
    </aside>
  );
}
