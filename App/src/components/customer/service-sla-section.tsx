import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHead } from "@/components/ui/card";
import { NoCoverPanel } from "@/components/ui/no-cover";
import { EcoHead, EcoKpis } from "@/components/customer/eco-kpis";
import { buildServiceSla, type ServiceSlaPack } from "@/lib/data/service-sla";
import { fetchCustomerSlaContract } from "@/lib/data/customer-sla-contract";
import { kpisOnCover, withSlaKpis, type SlaKpiOverrides } from "@/lib/data/apply-sla-kpis";
import { coverFromDetail } from "@/lib/data/cover";
import { INDUSTRY_SLA_DOC } from "@/lib/data/sla-metrics";
import { TenantTree } from "@/components/customer/tenant-tree";
import type { IndustryPillarKey } from "@/lib/data/sla-metrics";
import type { CustomerDetailPayload } from "@/lib/data/types";
import { cn } from "@/lib/utils";

const TITLES: Record<IndustryPillarKey, string> = {
  rmm: "RPM Remote Management · Service SLA",
  cove: "RPM Cloud Backup · Service SLA",
  epp: "RPM EndPoint Protection · Service SLA",
  syspro: "SYSPRO · Service SLA",
  csp: "Microsoft 365 · Not on SLA",
  tickets: "RPM Service Desk · Service SLA",
};

function toneClass(tone: ServiceSlaPack["lines"][number]["tone"]) {
  if (tone === "green") return "text-rag-green";
  if (tone === "amber") return "text-rag-amber";
  if (tone === "red") return "text-rag-red";
  return "text-muted";
}

export function ServiceSlaTable({ pack }: { pack: ServiceSlaPack }) {
  const measured = pack.lines.filter((l) => l.measured).length;
  const miss = pack.lines.filter((l) => l.measured && (l.tone === "red" || l.tone === "amber")).length;
  return (
    <div className="rpma-exco">
      <EcoHead
        title={pack.title || "Service SLA"}
        subtitle={pack.headline}
        kpis={[
          {
            label: "SLA",
            value: pack.overallPct != null ? `${pack.overallPct}%` : "—",
            tone:
              pack.overallPct == null
                ? "default"
                : pack.overallPct >= 90
                  ? "green"
                  : pack.overallPct >= 70
                    ? "amber"
                    : "red",
          },
          { label: "Measured", value: measured },
          { label: "Watch / miss", value: miss, tone: miss > 0 ? "amber" : "green" },
          { label: "Source", value: "Collect", hint: pack.source },
        ]}
      />

      <div className="rpma-glass overflow-x-auto">
        <p className="px-3 pt-2 text-[10px] font-extrabold uppercase tracking-wide text-muted">
          Metrics · actual vs industry target
        </p>
        <table className="w-full text-left text-[12px]">
          <thead className="rpma-table-head">
            <tr>
              <th className="px-2 py-1.5">Metric</th>
              <th className="px-2 py-1.5">Target</th>
              <th className="px-2 py-1.5">Actual</th>
              <th className="px-2 py-1.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {pack.lines.map((l) => (
              <tr key={l.id} className="border-t border-border align-top">
                <td className="px-2 py-1.5">
                  <p className="font-semibold text-fg">{l.metric}</p>
                  <p className="mt-0.5 max-w-[280px] text-[11px] text-subtle">{l.how}</p>
                </td>
                <td className="px-2 py-1.5 text-muted">{l.targetLabel}</td>
                <td className={cn("px-2 py-1.5 font-medium", toneClass(l.tone))}>
                  {l.actualPct != null ? `${l.actualPct}%` : "—"}
                  <p className="mt-0.5 text-[11px] font-normal text-subtle">{l.actualLabel}</p>
                </td>
                <td className="px-2 py-1.5">
                  {!l.measured ? (
                    <Badge variant="muted">{l.badge ?? (l.excluded ? "No plan" : "Not scored")}</Badge>
                  ) : l.tone === "green" ? (
                    <Badge variant="green">Met</Badge>
                  ) : l.tone === "amber" ? (
                    <Badge variant="amber">Watch</Badge>
                  ) : (
                    <Badge variant="red">Miss</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rpma-glass px-3 py-2">
        <p className="text-[10px] font-extrabold uppercase tracking-wide text-muted">Exclusions</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px] text-muted">
          {pack.exclusions.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
        <p className="mt-1 text-[11px] text-subtle">
          {INDUSTRY_SLA_DOC}. These are operational targets, not the signed SYSPRO + AMS contract.
        </p>
      </div>
    </div>
  );
}

/** Compact score row for service hubs and modules. */
export function SlaStrip({
  data,
  pillar,
}: {
  data: CustomerDetailPayload;
  pillar: IndustryPillarKey;
}) {
  const pack = buildServiceSla(pillar, data);
  if (!pack.covered) return null;
  const tiles = [
    {
      label: "SLA",
      value: pack.overallPct != null ? `${pack.overallPct}%` : "—",
      tone:
        pack.overallPct == null
          ? ("default" as const)
          : pack.overallPct >= 90
            ? ("green" as const)
            : pack.overallPct >= 70
              ? ("amber" as const)
              : ("red" as const),
    },
    ...pack.lines.slice(0, 3).map((l) => ({
      label: l.metric,
      value: l.actualPct != null ? `${l.actualPct}%` : "—",
      tone: l.tone === "default" ? undefined : l.tone,
    })),
  ];
  return <EcoKpis items={tiles} />;
}

export function ServiceSlaSection({
  data,
  pillar,
}: {
  data: CustomerDetailPayload;
  pillar: IndustryPillarKey;
}) {
  const cover = coverFromDetail(data);
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
  const pack = withSlaKpis(kpis, () => buildServiceSla(pillar, data));
  if (!pack.covered) {
    return (
      <NoCoverPanel
        service={TITLES[pillar]}
        hint="No cover — SLA is not scored for this service."
      />
    );
  }
  return (
    <div className="space-y-2">
      <ServiceSlaTree pack={pack} title={TITLES[pillar]} />
    </div>
  );
}

function ServiceSlaTree({ pack, title }: { pack: ServiceSlaPack; title: string }) {
  const [sel, setSel] = useState(pack.lines[0]?.id ?? "");
  const line = pack.lines.find((l) => l.id === sel) ?? pack.lines[0];
  const measured = pack.lines.filter((l) => l.measured).length;
  const miss = pack.lines.filter((l) => l.measured && (l.tone === "red" || l.tone === "amber")).length;
  return (
    <div className="rpma-exco">
      <EcoHead
        title={title}
        subtitle={pack.headline}
        kpis={[
          {
            label: "SLA",
            value: pack.overallPct != null ? `${pack.overallPct}%` : "—",
            tone:
              pack.overallPct == null
                ? "default"
                : pack.overallPct >= 90
                  ? "green"
                  : pack.overallPct >= 70
                    ? "amber"
                    : "red",
          },
          { label: "Measured", value: measured },
          { label: "Watch / miss", value: miss, tone: miss > 0 ? "amber" : "green" },
        ]}
      />
      <TenantTree
        title="Metrics"
        items={pack.lines.map((l) => ({
          id: l.id,
          label: l.metric,
          meta: l.actualPct != null ? `${l.actualPct}%` : l.badge ?? "—",
          tone: l.tone === "green" || l.tone === "amber" || l.tone === "red" ? l.tone : "off",
        }))}
        selected={line?.id ?? ""}
        onSelect={setSel}
      >
        {line ? (
          <Card>
            <CardHead>{line.metric}</CardHead>
            <CardContent className="space-y-2 text-[12px]">
              <EcoKpis
                items={[
                  { label: "Target", value: line.targetLabel },
                  {
                    label: "Actual",
                    value: line.actualPct != null ? `${line.actualPct}%` : "—",
                    tone: line.tone === "default" ? undefined : line.tone,
                    hint: line.actualLabel,
                  },
                  { label: "Status", value: line.measured ? line.tone : (line.badge ?? "Not scored") },
                ]}
              />
              <p className="text-muted">{line.how}</p>
            </CardContent>
          </Card>
        ) : (
          <ServiceSlaTable pack={pack} />
        )}
      </TenantTree>
    </div>
  );
}
