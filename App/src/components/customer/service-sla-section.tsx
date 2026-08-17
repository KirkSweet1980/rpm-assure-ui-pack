import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHead } from "@/components/ui/card";
import { NoCoverPanel } from "@/components/ui/no-cover";
import { StatCard } from "@/components/portfolio/stat-card";
import { buildServiceSla, type ServiceSlaPack } from "@/lib/data/service-sla";
import { INDUSTRY_SLA_DOC } from "@/lib/data/sla-metrics";
import type { IndustryPillarKey } from "@/lib/data/sla-metrics";
import type { CustomerDetailPayload } from "@/lib/data/types";
import { cn } from "@/lib/utils";

const TITLES: Record<IndustryPillarKey, string> = {
  rmm: "RPM Remote Management · Service SLA",
  cove: "RPM Cloud Backup · Service SLA",
  epp: "RPM EndPoint Protection · Service SLA",
  syspro: "SYSPRO · Service SLA",
  csp: "Microsoft 365 · Tenant posture",
  tickets: "Customer Tickets · Service SLA",
};

function toneClass(tone: ServiceSlaPack["lines"][number]["tone"]) {
  if (tone === "green") return "text-rag-green";
  if (tone === "amber") return "text-rag-amber";
  if (tone === "red") return "text-rag-red";
  return "text-muted";
}

export function ServiceSlaTable({ pack }: { pack: ServiceSlaPack }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <StatCard
          label="Scored vs target"
          value={pack.overallPct != null ? `${pack.overallPct}%` : "—"}
          tone={
            pack.overallPct == null
              ? "default"
              : pack.overallPct >= (pack.lines.find((l) => l.contractual && l.targetPct)?.targetPct ?? 95)
                ? "green"
                : pack.overallPct >= 90
                  ? "amber"
                  : "red"
          }
          hint={pack.headline}
        />
        <StatCard
          label="Measured lines"
          value={pack.lines.filter((l) => l.measured).length}
          hint={`${pack.lines.filter((l) => !l.measured).length} not scored this period`}
        />
        <StatCard label="Source" value="Collect" hint={pack.source} />
      </div>

      <Card>
        <CardHead>Metrics · actual vs industry target</CardHead>
        <CardContent className="overflow-x-auto">
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
                      <Badge variant="muted">Not measured</Badge>
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
        </CardContent>
      </Card>

      <Card>
        <CardHead>Exclusions (not scored as downtime / miss)</CardHead>
        <CardContent>
          <ul className="list-disc space-y-1 pl-4 text-[12px] text-muted">
            {pack.exclusions.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-subtle">
            {INDUSTRY_SLA_DOC}. These are operational targets, not the signed SYSPRO + AMS contract.
          </p>
        </CardContent>
      </Card>
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
  return (
    <div className="grid gap-2 sm:grid-cols-4">
      <StatCard
        label="SLA"
        value={pack.overallPct != null ? `${pack.overallPct}%` : "—"}
        tone={
          pack.overallPct == null
            ? "default"
            : pack.overallPct >= 95
              ? "green"
              : pack.overallPct >= 85
                ? "amber"
                : "red"
        }
        hint={pack.headline}
      />
      {pack.lines.slice(0, 3).map((l) => (
        <StatCard
          key={l.id}
          label={l.metric}
          value={l.actualPct != null ? `${l.actualPct}%` : "—"}
          tone={l.tone === "default" ? "default" : l.tone}
          hint={l.actualLabel}
        />
      ))}
    </div>
  );
}

export function ServiceSlaSection({
  data,
  pillar,
}: {
  data: CustomerDetailPayload;
  pillar: IndustryPillarKey;
}) {
  const pack = buildServiceSla(pillar, data);
  if (!pack.covered) {
    return (
      <NoCoverPanel
        service={TITLES[pillar]}
        hint="No cover — SLA is not scored for this service."
      />
    );
  }
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-[15px] font-bold text-fg">{TITLES[pillar]}</h2>
        <p className="text-[12px] text-muted">{pack.headline}</p>
      </div>
      <ServiceSlaTable pack={pack} />
    </div>
  );
}
