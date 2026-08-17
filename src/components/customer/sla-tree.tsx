import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHead } from "@/components/ui/card";
import { NoCoverPanel } from "@/components/ui/no-cover";
import { StatCard } from "@/components/portfolio/stat-card";
import { SignedSlaPanel } from "@/components/customer/signed-sla-panel";
import { TenantTree } from "@/components/customer/tenant-tree";
import { ServiceSlaTable } from "@/components/customer/service-sla-section";
import {
  buildCoveServiceSla,
  buildCspServiceSla,
  buildEppServiceSla,
  buildRmmServiceSla,
  buildSysproServiceSla,
  buildTicketsServiceSla,
} from "@/lib/data/service-sla";
import { fetchCustomerSlaContract } from "@/lib/data/customer-sla-contract";
import { kpisOnCover, withSlaKpis, type SlaKpiOverrides } from "@/lib/data/apply-sla-kpis";
import { coverFromDetail, isDormantCover, type CustomerCover } from "@/lib/data/cover";
import { buildExcoPillarSla, slaInputFromDetail } from "@/lib/data/exco-sla-stats";
import {
  INDUSTRY_MEASURES,
  RPM_CONTRACT_CLOCKS,
  RPM_CONTRACT_RULES,
  RPM_SECURITY_ADMIN,
  RPM_SLA_DATE,
  RPM_SLA_REVISION,
  RPM_SLA_TITLE,
} from "@/lib/data/sla-metrics";
import type { CustomerDetailPayload } from "@/lib/data/types";
import { cn } from "@/lib/utils";

function effectiveCover(data: CustomerDetailPayload): CustomerCover {
  return coverFromDetail(data);
}

function vsIndustryTone(pct: number | null | undefined, target: number) {
  if (pct == null) return "default" as const;
  if (pct >= target) return "green" as const;
  if (pct >= target - 10) return "amber" as const;
  return "red" as const;
}

export function CustomerSlaTree({ data }: { data: CustomerDetailPayload }) {
  const cover = effectiveCover(data);
  const hasTickets = (data.incidents ?? []).length > 0 || (data.amsSlaSummary?.incidentCount30d ?? 0) > 0;
  const [kpis, setKpis] = useState<SlaKpiOverrides>({});
  useEffect(() => {
    let live = true;
    const load = () => {
      fetchCustomerSlaContract({ data: { code: data.customer.customerCode } }).then((r) => {
        if (live) setKpis(kpisOnCover(cover, r.kpis));
      });
    };
    load();
    const on = () => load();
    window.addEventListener("rpma-sla-kpis", on);
    return () => {
      live = false;
      window.removeEventListener("rpma-sla-kpis", on);
    };
  }, [data.customer.customerCode, cover.syspro, cover.rmm, cover.cove, cover.epp, cover.csp]);
  const sla = useMemo(
    () => buildExcoPillarSla({ ...slaInputFromDetail(cover, data), kpis }),
    [cover, data, kpis],
  );
  const packs = useMemo(
    () =>
      withSlaKpis(kpis, () => ({
        syspro: buildSysproServiceSla(data),
        rmm: buildRmmServiceSla(data),
        cove: buildCoveServiceSla(data),
        epp: buildEppServiceSla(data),
        csp: buildCspServiceSla(data),
        tickets: buildTicketsServiceSla(data),
      })),
    [data, kpis],
  );
  const [sel, setSel] = useState("contract");

  if (isDormantCover(cover)) {
    return (
      <NoCoverPanel
        service="SLA"
        hint="Dormant customer — tickets only. No Assure agent and no SYSPRO, RMM, Backup, or EPP cover. SLA stays off until an agent or a covered service lands."
      />
    );
  }
  if (!cover.syspro && !cover.rmm && !cover.cove && !cover.epp && !cover.tickets && !hasTickets) {
    return (
      <NoCoverPanel
        service="SLA"
        hint="No cover — no managed services with data for this customer. SLA is not scored until at least one pillar has cover."
      />
    );
  }

  const a = data.availabilitySla;
  const source = a?.source ?? "stub";
  const ticketMeasured = source === "live-incident" || source === "sla-period" || source === "snapshot";

  const items = [
    { id: "contract", label: "Signed SLA", meta: "Import / Custom", tone: "amber" as const },
    { id: "clocks", label: "Ticket clocks", meta: "P1–P4", tone: "green" as const },
    { id: "security", label: "Security admin", meta: "Clause 7.4", tone: "off" as const },
    {
      id: "score",
      label: "Ticket score",
      meta: ticketMeasured ? "Measured" : "Not measured",
      tone: ticketMeasured ? ("green" as const) : ("off" as const),
    },
    { id: "posture", label: "Industry posture", meta: `${sla.pillars.length} pillars`, tone: "amber" as const },
    { id: "syspro", label: "SYSPRO Landscape", meta: packs.syspro.overallPct != null ? `${packs.syspro.overallPct}%` : "—", tone: cover.syspro ? "green" : "off" },
    { id: "rmm", label: "RMM Infrastructure", meta: packs.rmm.overallPct != null ? `${packs.rmm.overallPct}%` : "—", tone: cover.rmm ? "green" : "off" },
    { id: "cove", label: "RPM Cloud Backup", meta: packs.cove.overallPct != null ? `${packs.cove.overallPct}%` : "—", tone: cover.cove ? "green" : "off" },
    { id: "epp", label: "RPM End Point Protection", meta: packs.epp.overallPct != null ? `${packs.epp.overallPct}%` : "—", tone: cover.epp ? "green" : "off" },
    { id: "csp", label: "Microsoft 365", meta: packs.csp.overallPct != null ? `${packs.csp.overallPct}%` : "—", tone: cover.csp ? "green" : "off" },
    { id: "tickets", label: "RPM Service Desk", meta: packs.tickets.overallPct != null ? `${packs.tickets.overallPct}%` : "—", tone: "green" as const },
  ];

  return (
    <TenantTree title="Customer SLA" items={items} selected={sel} onSelect={setSel}>
      {sel === "contract" ? <SignedSlaPanel code={data.customer.customerCode} cover={cover} /> : null}

      {sel === "clocks" ? (
        <Card>
          <CardHead>Signed ticket clocks — Acknowledge / Remote / Restore</CardHead>
          <CardContent className="overflow-x-auto">
            <p className="mb-2 text-[12px] text-muted">
              RPM SLA Rev {RPM_SLA_REVISION} · {RPM_SLA_TITLE} ({RPM_SLA_DATE}). {RPM_CONTRACT_RULES.notGuarantees}
            </p>
            <table className="w-full text-left text-[12px]">
              <thead className="rpma-table-head">
                <tr>
                  <th className="px-2 py-1.5">Priority</th>
                  <th className="px-2 py-1.5">Acknowledge</th>
                  <th className="px-2 py-1.5">Remote response</th>
                  <th className="px-2 py-1.5">Target restoration</th>
                </tr>
              </thead>
              <tbody>
                {RPM_CONTRACT_CLOCKS.map((row) => (
                  <tr key={row.priority} className="border-t border-border">
                    <td className="px-2 py-1.5">
                      <span className="font-semibold">{row.priority}</span>
                      <span className="text-muted"> {row.name}</span>
                      <p className="mt-0.5 max-w-[220px] text-[11px] text-subtle">{row.definition}</p>
                    </td>
                    <td className="px-2 py-1.5 font-medium">{row.acknowledge}</td>
                    <td className="px-2 py-1.5 font-medium">{row.remote}</td>
                    <td className="px-2 py-1.5 font-medium">{row.restore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-[11px] text-subtle">
              {RPM_CONTRACT_RULES.businessHours} {RPM_CONTRACT_RULES.measuredAs}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {sel === "security" ? (
        <Card>
          <CardHead>Security administration — clause 7.4</CardHead>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-left text-[12px]">
              <thead className="rpma-table-head">
                <tr>
                  <th className="px-2 py-1.5">Task</th>
                  <th className="px-2 py-1.5">Target from a complete authorised request</th>
                </tr>
              </thead>
              <tbody>
                {RPM_SECURITY_ADMIN.map((row) => (
                  <tr key={row.task} className="border-t border-border">
                    <td className="px-2 py-1.5 font-medium">{row.task}</td>
                    <td className="px-2 py-1.5">{row.target}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}

      {sel === "score" ? (
        <div className="space-y-3">
          <div
            className={cn(
              "rounded-xl border px-3 py-2 text-[12px] leading-relaxed",
              ticketMeasured ? "border-rag-green/30 bg-rag-green/10 text-fg" : "border-border bg-surface-2 text-muted",
            )}
          >
            <span className="font-semibold text-fg">
              {ticketMeasured ? "Ticket clocks measured" : "Ticket clocks not measured"}
            </span>
            <span>
              {" "}
              —{" "}
              {ticketMeasured
                ? a?.note || "From helpdesk / period feed against the signed clocks."
                : "Targets from the signed SLA — not measured this period."}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <StatCard label="Incidents (30d)" value={data.amsSlaSummary?.incidentCount30d ?? a?.incidentCount30d ?? "—"} />
            <StatCard
              label="Acknowledge / response met"
              value={
                data.amsSlaSummary?.responsePct != null
                  ? `${data.amsSlaSummary.responsePct}%`
                  : a?.slaResponsePct != null
                    ? `${a.slaResponsePct}%`
                    : "—"
              }
              tone={(data.amsSlaSummary?.responsePct ?? a?.slaResponsePct ?? 100) < 90 ? "amber" : "green"}
            />
            <StatCard
              label="Restore met"
              value={
                data.amsSlaSummary?.resolvePct != null
                  ? `${data.amsSlaSummary.resolvePct}%`
                  : a?.slaResolvePct != null
                    ? `${a.slaResolvePct}%`
                    : "—"
              }
              tone={(data.amsSlaSummary?.resolvePct ?? a?.slaResolvePct ?? 100) < 90 ? "amber" : "green"}
            />
            <StatCard
              label="Open now"
              value={data.amsSlaSummary?.openCount ?? "—"}
              tone={(data.amsSlaSummary?.openCount ?? 0) > 0 ? "amber" : "green"}
            />
          </div>
        </div>
      ) : null}

      {sel === "posture" ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {sla.pillars.map((p) => {
            const industry =
              p.pillar === "rmm"
                ? INDUSTRY_MEASURES.rmm
                : p.pillar === "cove"
                  ? INDUSTRY_MEASURES.cove
                  : p.pillar === "epp"
                    ? INDUSTRY_MEASURES.epp
                    : null;
            const tone = !p.covered
              ? "default"
              : p.pillar === "syspro"
                ? p.pct != null && p.pct >= 90
                  ? "green"
                  : p.pct != null && p.pct >= 70
                    ? "amber"
                    : "red"
                : vsIndustryTone(p.pct, industry?.targetPct ?? 100);
            return (
              <Card key={p.pillar}>
                <CardHead>
                  {p.label}
                  {!p.covered ? (
                    <Badge variant="amber" className="ml-2">
                      No Cover
                    </Badge>
                  ) : null}
                </CardHead>
                <CardContent className="space-y-1.5 text-[12px]">
                  <StatCard
                    label={industry?.metric ?? "AMS health"}
                    value={!p.covered ? "—" : p.pct != null ? `${p.pct}%` : "—"}
                    tone={!p.covered ? "default" : tone}
                    hint={!p.covered ? "Excluded from Overall" : industry ? `Industry target ${industry.targetLabel}` : p.note}
                  />
                  <p className="text-muted">{p.note}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}

      {sel === "syspro" ? <ServiceSlaTable pack={packs.syspro} /> : null}
      {sel === "rmm" ? <ServiceSlaTable pack={packs.rmm} /> : null}
      {sel === "cove" ? <ServiceSlaTable pack={packs.cove} /> : null}
      {sel === "epp" ? <ServiceSlaTable pack={packs.epp} /> : null}
      {sel === "csp" ? <ServiceSlaTable pack={packs.csp} /> : null}
      {sel === "tickets" ? <ServiceSlaTable pack={packs.tickets} /> : null}
    </TenantTree>
  );
}
