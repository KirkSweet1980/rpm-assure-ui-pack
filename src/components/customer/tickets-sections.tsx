import { Ticket } from "lucide-react";
import { SpaLink } from "@/components/nav/spa-link";
import { StatCard } from "@/components/portfolio/stat-card";
import { formatSastDateTime } from "@/lib/utils";
import type { CustomerDetailPayload, FactIncidentRow } from "@/lib/data/types";
import {
  ticketStats,
  ticketsInBucket,
  type TicketBucket,
} from "@/lib/data/ticket-feed";
import { NoCoverPanel } from "@/components/ui/no-cover";

function slaChip(met: boolean | null | undefined, label: string) {
  if (met === true) {
    return (
      <span className="rounded bg-rag-green-bg px-1.5 py-0.5 text-[10px] font-bold text-rag-green">
        {label} met
      </span>
    );
  }
  if (met === false) {
    return (
      <span className="rounded bg-rag-red-bg px-1.5 py-0.5 text-[10px] font-bold text-rag-red">
        {label} breach
      </span>
    );
  }
  return (
    <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-muted">
      {label} open
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
            <th className="px-2 py-1.5">SLA</th>
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
                <td className="px-2 py-1.5">
                  <span className="inline-flex flex-wrap gap-1">
                    {slaChip(i.responseSlaMet, "Resp")}
                    {slaChip(i.resolveSlaMet, "Res")}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function TicketsHubSection({ data }: { data: CustomerDetailPayload }) {
  const code = data.customer.customerCode;
  const rows = data.incidents ?? [];
  const s = ticketStats(rows);
  const sla = data.amsSlaSummary;
  if (s.total === 0) {
    return (
      <NoCoverPanel
        service="Customer Tickets"
        hint="No Freshdesk tickets mapped to this customer yet. Map the Freshdesk company and run collect."
      />
    );
  }
  return (
    <div className="space-y-3">
      <div className="rpma-glass flex flex-wrap items-center gap-3 px-4 py-3">
        <Ticket className="h-5 w-5 text-primary" aria-hidden />
        <div className="min-w-0">
          <p className="text-lg font-bold tracking-tight text-fg">Customer Tickets</p>
          <p className="text-[12px] text-muted">
            {data.customer.displayName} · Freshdesk feed · last 90 days
          </p>
        </div>
        <div className="ml-auto grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatCard label="Open" value={s.open} tone={s.open > 0 ? "amber" : "green"} />
          <StatCard label="Resolved" value={s.resolved} />
          <StatCard label="Closed" value={s.closed} />
          <StatCard label="SLA breach" value={s.breaches} tone={s.breaches > 0 ? "red" : "green"} />
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {[
          { label: "Open Tickets", href: `/customers/${code}/tickets/open`, n: s.open, hint: "New / in progress" },
          { label: "Resolved Tickets", href: `/customers/${code}/tickets/resolved`, n: s.resolved, hint: "Waiting close" },
          { label: "Closed Tickets", href: `/customers/${code}/tickets/closed`, n: s.closed, hint: "Completed" },
        ].map((t) => (
          <SpaLink key={t.href} href={t.href} className="rpma-glass block px-3 py-2.5 hover:shadow-md">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">{t.label}</p>
            <p className="font-mono text-xl font-bold text-fg">{t.n}</p>
            <p className="text-[11px] text-muted">{t.hint}</p>
          </SpaLink>
        ))}
      </div>

      <div className="rpma-glass p-3">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">
          SLA clocks (from ticket timestamps)
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatCard
            label="Response"
            value={sla?.responsePct != null ? `${sla.responsePct}%` : "—"}
            tone={(sla?.responsePct ?? 100) < 90 ? "amber" : "green"}
          />
          <StatCard
            label="Resolve"
            value={sla?.resolvePct != null ? `${sla.resolvePct}%` : "—"}
            tone={(sla?.resolvePct ?? 100) < 90 ? "amber" : "green"}
          />
          <StatCard label="Tickets 30d" value={sla?.incidentCount30d ?? s.total} />
          <StatCard label="Open now" value={sla?.openCount ?? s.open} tone={s.open > 0 ? "amber" : "green"} />
        </div>
      </div>

      <div className="rpma-glass">
        <p className="px-3 pt-3 text-[11px] font-bold uppercase tracking-wide text-muted">Latest tickets</p>
        <TicketTable rows={rows.slice(0, 12)} empty="No tickets on the live feed." />
      </div>
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
  const empty =
    bucket === "open"
      ? "No open Freshdesk tickets for this customer."
      : bucket === "resolved"
        ? "No resolved tickets in the current window."
        : "No closed tickets in the current window.";
  return (
    <div className="space-y-3">
      <div className="rpma-glass flex flex-wrap items-center gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="text-lg font-bold tracking-tight text-fg">{title}</p>
          <p className="text-[12px] text-muted">
            {data.customer.displayName} · {rows.length} ticket{rows.length === 1 ? "" : "s"}
          </p>
        </div>
        <StatCard label={title} value={rows.length} tone={bucket === "open" && rows.length > 0 ? "amber" : "green"} />
      </div>
      <div className="rpma-glass">
        <TicketTable rows={rows} empty={empty} />
      </div>
    </div>
  );
}

export function ticketBucketFromPath(path: string): TicketBucket {
  if (path.includes("/resolved")) return "resolved";
  if (path.includes("/closed")) return "closed";
  return "open";
}
