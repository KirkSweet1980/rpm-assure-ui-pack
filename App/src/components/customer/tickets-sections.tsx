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
import { ticketStats, ticketsInBucket, type TicketBucket } from "@/lib/data/ticket-feed";
import { RPM_CONTRACT_CLOCKS, RPM_CONTRACT_RULES } from "@/lib/data/sla-metrics";
import { scoreTicket, scoreTicketSet } from "@/lib/data/ticket-sla";

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
  const code = data.customer.customerCode;
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
            value={sla.responsePct != null ? `${sla.responsePct}%` : "—"}
            tone={(sla.responsePct ?? 100) < 90 ? "amber" : "green"}
            hint={`${sla.responseMet}/${sla.responseScored} scored`}
          />
          <StatCard
            label="Resolve"
            value={sla.resolvePct != null ? `${sla.resolvePct}%` : "—"}
            tone={(sla.resolvePct ?? 100) < 90 ? "amber" : "green"}
            hint={`${sla.resolveMet}/${sla.resolveScored} scored`}
          />
          <StatCard label="Tickets 30d" value={sla.last30d} hint={`${sla.total} on feed`} />
          <StatCard label="Open now" value={sla.open} tone={sla.open > 0 ? "amber" : "green"} />
        </div>
      </div>

      <div className="rpma-glass">
        <p className="px-3 pt-3 text-[11px] font-bold uppercase tracking-wide text-muted">Latest tickets</p>
        <TicketTable rows={rows.slice(0, 12)} empty="No tickets exist for this customer." />
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
      ? "No tickets for this customer."
      : bucket === "resolved"
        ? "No tickets for this customer."
        : "No tickets for this customer.";
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
  return (
    <div className="space-y-3">
      <div className="rpma-glass px-4 py-3">
        <p className="text-lg font-bold tracking-tight text-fg">Customer Tickets · SLA</p>
        <p className="text-[12px] text-muted">
          Layer A · SAST business hours 08:00–17:00. Score = average of response-met % and restore-met % (90% target).
          Open clocks are not misses. P4 restore is by agreement and is not scored.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <StatCard
          label="Tickets SLA"
          value={pack.overallPct != null ? `${pack.overallPct}%` : "70%"}
          tone={
            pack.overallPct == null ? "amber" : pack.overallPct >= 90 ? "green" : pack.overallPct >= 70 ? "amber" : "red"
          }
          hint={pack.overallPct == null ? "Clocks not closed yet — held at 70%" : `${pack.last30d} tickets in 30d`}
        />
        <StatCard
          label="Response 30d"
          value={pack.responsePct != null ? `${pack.responsePct}%` : "—"}
          tone={(pack.responsePct ?? 100) < 90 ? "amber" : "green"}
          hint={`${pack.responseMet} met · ${pack.responseBreach} breach`}
        />
        <StatCard
          label="Restore 30d"
          value={pack.resolvePct != null ? `${pack.resolvePct}%` : "—"}
          tone={(pack.resolvePct ?? 100) < 90 ? "amber" : "green"}
          hint={`${pack.resolveMet} met · ${pack.resolveBreach} breach`}
        />
        <StatCard label="Open now" value={pack.open} tone={pack.open > 0 ? "amber" : "green"} />
      </div>
      <div className="rpma-glass overflow-x-auto p-3">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">
          Actual vs signed clock (30 days)
        </p>
        <table className="w-full text-left text-[12px]">
          <thead className="rpma-table-head">
            <tr>
              <th className="px-2 py-1.5">Priority</th>
              <th className="px-2 py-1.5">Tickets</th>
              <th className="px-2 py-1.5">Ack target</th>
              <th className="px-2 py-1.5">Response</th>
              <th className="px-2 py-1.5">Restore target</th>
              <th className="px-2 py-1.5">Restore</th>
            </tr>
          </thead>
          <tbody>
            {RPM_CONTRACT_CLOCKS.map((row) => {
              const a = pack.byPriority.find((p) => p.priority === row.priority);
              return (
                <tr key={row.priority} className="border-t border-border">
                  <td className="px-2 py-1.5 font-semibold">
                    {row.priority} {row.name}
                  </td>
                  <td className="px-2 py-1.5">{a?.n ?? 0}</td>
                  <td className="px-2 py-1.5 text-muted">{row.acknowledge}</td>
                  <td className="px-2 py-1.5 font-medium">
                    {a?.responsePct != null ? `${a.responsePct}%` : "—"}
                  </td>
                  <td className="px-2 py-1.5 text-muted">{row.restore}</td>
                  <td className="px-2 py-1.5 font-medium">
                    {a?.resolvePct != null ? `${a.resolvePct}%` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-2 text-[11px] text-subtle">
          {RPM_CONTRACT_RULES.businessHours} {RPM_CONTRACT_RULES.measuredAs}
        </p>
      </div>
    </div>
  );
}
