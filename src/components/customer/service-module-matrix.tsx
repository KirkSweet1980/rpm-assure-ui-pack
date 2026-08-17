import { useMemo, useState } from "react";
import { Building2 } from "lucide-react";
import { SpaLink } from "@/components/nav/spa-link";
import { CUSTOMER_PILLARS } from "@/components/nav/customer-modules-panel";
import { coverFromDetail, isPillarCovered, type PillarId } from "@/lib/data/cover";
import { customerLiveStatus } from "@/lib/data/live-status";
import type { CustomerDetailPayload } from "@/lib/data/types";
import { cn, formatSastDateTime } from "@/lib/utils";

const PILLAR_SUB: Record<string, string> = {
  syspro: "ERP Platform",
  rmm: "Remote Monitoring & Management",
  cove: "Backup & Disaster Recovery",
  epp: "Endpoint Protection",
  csp: "Microsoft 365",
  tickets: "Service Desk",
};

export function ServiceModuleMatrix({
  data,
  pillar,
}: {
  data: CustomerDetailPayload;
  pillar: PillarId;
}) {
  const { customer } = data;
  const cover = coverFromDetail(data);
  const live = customerLiveStatus(customer.customerCode, customer, cover, data);
  const on = isPillarCovered(cover, pillar);
  const rag = live.pillars[pillar]?.rag ?? "Off";
  const def = CUSTOMER_PILLARS.find((p) => p.id === pillar);
  const base = `/customers/${encodeURIComponent(customer.customerCode)}`;
  const mods = (def?.modules ?? []).filter((m) => m.path !== def?.overview);
  const [sel, setSel] = useState(mods[0]?.path ?? "");
  const active = mods.find((m) => m.path === sel) ?? mods[0];
  const last = customer.lastImportAt;

  const rows = useMemo(
    () =>
      mods.map((m) => {
        const flag = live.modules[m.path] ?? live.modules[`${base}${m.path}`];
        const hr = flag?.rag ?? rag;
        return {
          ...m,
          hint: flag?.hint ?? (on ? "On cover" : "Out of scope"),
          hr,
        };
      }),
    [mods, live.modules, rag, on, base],
  );

  return (
    <div className="rpma-amx">
      <div className="rpma-amx-main">
        <header className="rpma-amx-head">
          <h2>{customer.displayName}</h2>
          <p>
            {def?.title ?? pillar} · module matrix
          </p>
        </header>
        <div className="rpma-amx-table-wrap">
          <table className="rpma-amx-table">
            <thead>
              <tr>
                <th>Module</th>
                <th>Cover</th>
                <th>Health</th>
                <th>Signal</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => {
                const Icon = m.icon;
                return (
                  <tr
                    key={m.path}
                    className={cn(sel === m.path && "is-on")}
                    onClick={() => setSel(m.path)}
                  >
                    <td>
                      <SpaLink href={`${base}${m.path}`} className="rpma-amx-svc">
                        <span className="rpma-amx-ico">
                          <Icon className="size-4" />
                        </span>
                        <span>
                          <strong>{m.label}</strong>
                          <em>{PILLAR_SUB[pillar]}</em>
                        </span>
                      </SpaLink>
                    </td>
                    <td>
                      <span className={cn("rpma-amx-pill", on ? "is-cover" : "is-off")}>
                        {on ? "Cover" : "—"}
                      </span>
                    </td>
                    <td>
                      {on ? (
                        <>
                          <span className="rpma-amx-dot" data-rag={m.hr} />
                          {m.hr === "Green" ? "Healthy" : m.hr === "Amber" ? "Watch" : m.hr === "Red" ? "Miss" : "—"}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="text-muted">{m.hint}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <aside className="rpma-amx-side">
        <div className="rpma-amx-card">
          <span className="rpma-amx-ico lg">
            <Building2 className="size-5" />
          </span>
          <div>
            <strong>{customer.displayName}</strong>
            <em>
              {def?.title} · {active?.label}
            </em>
          </div>
        </div>
        <dl className="rpma-amx-dl">
          <div>
            <dt>SLA cover</dt>
            <dd className={on ? "text-emerald-400" : "text-muted"}>{on ? "Covered" : "Out of scope"}</dd>
          </div>
          <div>
            <dt>Health</dt>
            <dd>
              {on
                ? rag === "Green"
                  ? "Healthy"
                  : rag === "Amber"
                    ? "Watch"
                    : rag === "Red"
                      ? "Miss"
                      : "—"
                : "—"}
            </dd>
          </div>
          <div>
            <dt>Last updated</dt>
            <dd>{formatSastDateTime(last)}</dd>
          </div>
        </dl>
        <SpaLink href={`${base}${def?.overview ?? ""}/sla`} className="rpma-amx-sla">
          View SLA history
        </SpaLink>
      </aside>
    </div>
  );
}
