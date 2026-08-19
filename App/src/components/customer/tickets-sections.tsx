import { useState } from "react";
import { StickyPickSplit } from "@/components/customer/tenant-tree";
import { EcoKpis } from "@/components/customer/eco-kpis";
import { DataWindow } from "@/components/customer/data-window";
import { formatSastDateTime } from "@/lib/utils";
import type { CustomerDetailPayload, FactIncidentRow } from "@/lib/data/types";
import {
  ticketStats,
  ticketsInBucket,
  type TicketBucket,
} from "@/lib/data/ticket-feed";
import { scoreTicket, scoreTicketSet } from "@/lib/data/ticket-sla";
import { RPM_CONTRACT_CLOCKS, RPM_CONTRACT_RULES } from "@/lib/data/sla-metrics";

function slaChip(met: boolean | null | undefined) {
  if (met === true) {
    return (
      <span className="inline-block rounded bg-rag-green-bg px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rag-green">
        Met
      </span>
    );
  }
  if (met === false) {
    return (
      <span className="inline-block rounded bg-rag-red-bg px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rag-red">
        Breach
      </span>
    );
  }
  return (
    <span className="inline-block rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
      Open
    </span>
  );
}

function TicketTable({ rows, empty }: { rows: FactIncidentRow[]; empty: string }) {
  if (rows.length === 0) {
    return <p className="p-4 text-[12px] text-muted">{empty}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[12px]">
        <thead className="rpma-table-head">
          <tr>
            <th className="px-2 py-1.5">Ticket</th>
            <th className="px-2 py-1.5">Subject</th>
            <th className="px-2 py-1.5">Priority</th>
            <th className="px-2 py-1.5">Status</th>
            <th className="px-2 py-1.5">Opened</th>
            <th className="px-2 py-1.5">Response</th>
            <th className="px-2 py-1.5">Resolve</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((i, idx) => {
            const ref = i.externalRef || (i.incidentId ? `#${String(i.incidentId).slice(0, 8)}` : `row-${idx}`);
            const fd = /^FD-(\d+)$/i.exec(i.externalRef || "");
            return (
              <tr key={ref} className="border-t border-border">
                <td className="px-2 py-1.5 font-mono text-[11px] text-muted">
                  {fd ? (
                    <a
                      href={`https://rpmresourceshelp.freshdesk.com/a/tickets/${fd[1]}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-primary hover:underline"
                    >
                      {i.externalRef}
                    </a>
                  ) : (
                    i.externalRef || "—"
                  )}
                </td>
                <td className="max-w-[28rem] truncate px-2 py-1.5 text-fg">{i.title || "Untitled"}</td>
                <td className="px-2 py-1.5">{i.priority || i.severity || "—"}</td>
                <td className="px-2 py-1.5">{i.status}</td>
                <td className="whitespace-nowrap px-2 py-1.5 text-muted">{formatSastDateTime(i.openedAt)}</td>
                <td className="px-2 py-1.5">{slaChip(scoreTicket(i).response)}</td>
                <td className="px-2 py-1.5">{slaChip(scoreTicket(i).resolve)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function EmptyTickets({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="rpma-panel px-4 py-8 text-center">
      <p className="text-sm font-bold text-fg">{title}</p>
      <p className="mt-2 text-[13px] text-muted">{body}</p>
    </div>
  );
}

export function TicketsHubSection({ data }: { data: CustomerDetailPayload }) {
  const rows = data.incidents ?? [];
  const s = ticketStats(rows);
  const sla = s.sla;
  if (s.total === 0) {
    return (
      <EmptyTickets
        title="Customer Tickets"
        body="No tickets exist for this customer."
      />
    );
  }
  const code = data.customer.customerCode;
  const base = `/customers/${code}/tickets`;
  return (
    <div className="rpma-win-stack">
      <DataWindow
        title="Customer Tickets"
        subtitle={`${data.customer.displayName} · Freshdesk · last 90 days · ${s.total} tickets`}
      >
        <div className="p-2">
          <EcoKpis
            items={[
              { label: "Open", value: s.open, tone: s.open > 0 ? "amber" : "green", href: `${base}/open` },
              { label: "Resolved", value: s.resolved, href: `${base}/resolved` },
              { label: "Closed", value: s.closed, href: `${base}/closed` },
              {
                label: "SLA",
                value: sla.overallPct != null ? `${sla.overallPct}%` : "—",
                tone: (sla.overallPct ?? 100) < 90 ? "amber" : "green",
                href: `${base}/sla`,
              },
              {
                label: "Response",
                value: sla.responsePct != null ? `${sla.responsePct}%` : "—",
                tone: (sla.responsePct ?? 100) < 90 ? "amber" : "green",
                href: `${base}/sla`,
              },
              {
                label: "Restore",
                value: sla.resolvePct != null ? `${sla.resolvePct}%` : "—",
                tone: (sla.resolvePct ?? 100) < 90 ? "amber" : "green",
                href: `${base}/sla`,
              },
            ]}
          />
        </div>
      </DataWindow>
      <DataWindow title="Latest tickets" fill>
        <TicketTable rows={rows.slice(0, 16)} empty="No tickets exist for this customer." />
      </DataWindow>
    </div>
  );
}

export function TicketsListSection({
  data,
  bucket,
}: {
  data: CustomerDetailPayload;
  bucket: TicketBucket;
}) {
  const rows = ticketsInBucket(data.incidents, bucket);
  const title =
    bucket === "open" ? "Open Tickets" : bucket === "resolved" ? "Resolved Tickets" : "Closed Tickets";
  const empty = "No tickets for this customer.";
  const [sel, setSel] = useState(rows[0]?.incidentId ?? rows[0]?.externalRef ?? "");
  const items = rows.map((r, i) => ({
    id: String(r.incidentId ?? r.externalRef ?? i),
    label: r.title || r.externalRef || `Ticket ${i + 1}`,
    meta: r.status ?? r.priority ?? "",
    tone: r.isMajor ? ("red" as const) : bucket === "open" ? ("amber" as const) : ("green" as const),
  }));
  const picked =
    rows.find((r, i) => String(r.incidentId ?? r.externalRef ?? i) === sel) ?? rows[0] ?? null;
  const all = ticketStats(data.incidents ?? []);
  const code = data.customer.customerCode;
  const base = `/customers/${code}/tickets`;
  return (
    <div className="rpma-win-stack">
      <DataWindow
        title={title}
        subtitle={`${data.customer.displayName} · ${rows.length} ticket${rows.length === 1 ? "" : "s"}`}
      >
        <div className="p-2">
          <EcoKpis
            items={[
              { label: "Open", value: all.open, tone: all.open > 0 ? "amber" : "green", href: `${base}/open` },
              { label: "Resolved", value: all.resolved, href: `${base}/resolved` },
              { label: "Closed", value: all.closed, href: `${base}/closed` },
              {
                label: "SLA",
                value: all.sla.overallPct != null ? `${all.sla.overallPct}%` : "—",
                tone: (all.sla.overallPct ?? 100) < 90 ? "amber" : "green",
                href: `${base}/sla`,
              },
            ]}
          />
        </div>
      </DataWindow>
      {rows.length === 0 ? (
        <DataWindow title={title} fill>
          <p className="px-3 py-4 text-[12px] text-muted">{empty}</p>
        </DataWindow>
      ) : (
        <DataWindow title={title} fill>
          <StickyPickSplit title={title} items={items} selected={items.some((i) => i.id === sel) ? sel : items[0].id} onSelect={setSel}>
            {picked ? <TicketTable rows={[picked]} empty={empty} /> : null}
          </StickyPickSplit>
        </DataWindow>
      )}
    </div>
  );
}

export function ticketBucketFromPath(path: string): TicketBucket {
  if (path.includes("/resolved")) return "resolved";
  if (path.includes("/closed")) return "closed";
  return "open";
}

export function TicketsSlaSection({ data }: { data: CustomerDetailPayload }) {
  const pack = scoreTicketSet(data.incidents);
  if (pack.total === 0) {
    return (
      <EmptyTickets
        title="Customer Tickets · SLA"
        body="No tickets exist for this customer. SLA clocks appear when tickets land."
      />
    );
  }
  const code = data.customer.customerCode;
  const base = `/customers/${code}/tickets`;
  return (
    <div className="rpma-win-stack">
      <DataWindow
        title="Customer Tickets · SLA"
        subtitle="SAST 08:00–17:00 · 90% target · open clocks are not misses"
      >
        <div className="p-2">
          <EcoKpis
            items={[
              {
                label: "SLA",
                value: pack.overallPct != null ? `${pack.overallPct}%` : "—",
                tone: (pack.overallPct ?? 100) < 90 ? "amber" : "green",
              },
              {
                label: "Response",
                value: pack.responsePct != null ? `${pack.responsePct}%` : "—",
                tone: (pack.responsePct ?? 100) < 90 ? "amber" : "green",
              },
              {
                label: "Restore",
                value: pack.resolvePct != null ? `${pack.resolvePct}%` : "—",
                tone: (pack.resolvePct ?? 100) < 90 ? "amber" : "green",
              },
              { label: "Open", value: pack.open, tone: pack.open > 0 ? "amber" : "green", href: `${base}/open` },
              { label: "Met", value: `${pack.responseMet}/${pack.responseScored || 0}` },
              {
                label: "Breach",
                value: pack.responseBreach + pack.resolveBreach,
                tone: pack.responseBreach + pack.resolveBreach > 0 ? "red" : "green",
              },
            ]}
          />
        </div>
      </DataWindow>
      <DataWindow title="Actual vs signed clock (30 days)" fill>
        <table className="w-full text-left text-[12px]">
          <thead className="rpma-table-head">
            <tr>
              <th className="px-2 py-1">Priority</th>
              <th className="px-2 py-1">Tickets</th>
              <th className="px-2 py-1">Ack target</th>
              <th className="px-2 py-1">Response</th>
              <th className="px-2 py-1">Restore target</th>
              <th className="px-2 py-1">Restore</th>
            </tr>
          </thead>
          <tbody>
            {RPM_CONTRACT_CLOCKS.map((row) => {
              const a = pack.byPriority.find((p) => p.priority === row.priority);
              return (
                <tr key={row.priority} className="border-t border-border">
                  <td className="px-2 py-1 font-semibold">
                    {row.priority} {row.name}
                  </td>
                  <td className="px-2 py-1">{a?.n ?? 0}</td>
                  <td className="px-2 py-1 text-muted">{row.acknowledge}</td>
                  <td className="px-2 py-1 font-medium">
                    {a?.responsePct != null ? `${a.responsePct}%` : "—"}
                  </td>
                  <td className="px-2 py-1 text-muted">{row.restore}</td>
                  <td className="px-2 py-1 font-medium">
                    {a?.resolvePct != null ? `${a.resolvePct}%` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="px-3 py-2 text-[11px] text-subtle">
          {RPM_CONTRACT_RULES.businessHours} {RPM_CONTRACT_RULES.measuredAs}
        </p>
      </DataWindow>
    </div>
  );
}
