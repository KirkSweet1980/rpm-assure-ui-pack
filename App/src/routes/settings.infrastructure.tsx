import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Server, X } from "lucide-react";
import { SpaLink } from "@/components/nav/spa-link";
import { fetchConfigHealth, type ConfigHealthItem } from "@/lib/settings/settings-api";
import { fetchInfraAgents, type InfraAgentRow } from "@/lib/settings/infra-status";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings/infrastructure")({
  component: InfrastructureStatusPage,
});

function healthTitle(item: ConfigHealthItem) {
  if (item.id === "cove") return "N-Able Cove Backup";
  if (item.id === "sql") return "SQL Server";
  return item.label;
}

function agentStatus(row: InfraAgentRow): { label: string; tone: "green" | "amber" | "red" | "muted" } {
  const s = row.healthStatus.toUpperCase();
  if (s === "ONLINE") return { label: "Online", tone: "green" };
  if (s === "UPDATE" || s === "UPDATING" || s === "QUEUED" || s === "SYNCING") {
    return { label: "Busy", tone: "amber" };
  }
  if (s === "NOT_INSTALLED") return { label: "Not installed", tone: "muted" };
  return { label: "Disconnected", tone: "red" };
}

const COVER_CHIPS: Array<{ key: keyof InfraAgentRow["cover"]; label: string }> = [
  { key: "syspro", label: "SYSPRO" },
  { key: "rmm", label: "RMM" },
  { key: "cove", label: "Backup" },
  { key: "epp", label: "EPP" },
  { key: "csp", label: "CSP" },
];

function InfrastructureStatusPage() {
  const [items, setItems] = useState<ConfigHealthItem[]>([]);
  const [agents, setAgents] = useState<InfraAgentRow[]>([]);
  const [agentMsg, setAgentMsg] = useState<string | null>(null);

  useEffect(() => {
    void fetchConfigHealth()
      .then((r) => setItems(r.items ?? []))
      .catch(() => setItems([]));
    void fetchInfraAgents()
      .then((r) => {
        setAgents(r.rows ?? []);
        setAgentMsg(r.ok ? null : r.message);
      })
      .catch((e) => setAgentMsg(e instanceof Error ? e.message : String(e)));
  }, []);

  const okN = items.filter((i) => i.ok).length;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Configuration</p>
        <h1 className="mt-1 flex items-center gap-2 text-[18px] font-semibold tracking-tight text-fg">
          <Server className="h-5 w-5 text-muted" />
          Assure Infrastructure Status
        </h1>
      </div>

      <section className="rpma-panel p-4">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Platform</p>
            <h2 className="mt-0.5 text-[16px] font-semibold text-fg">Connections</h2>
          </div>
          <p className="text-[12px] text-muted">
            {items.length ? `${okN} of ${items.length} connected` : "Checking…"}
          </p>
        </div>
        {items.length ? (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((i) => (
              <SpaLink
                key={i.id}
                href={i.href}
                className="flex items-center gap-3 rounded-lg bg-surface-2/70 px-3 py-2.5 no-underline"
              >
                <span
                  className={cn(
                    "grid h-7 w-7 shrink-0 place-items-center rounded-full text-white",
                    i.ok ? "bg-rag-green" : "bg-rag-red",
                  )}
                >
                  {i.ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-fg">{healthTitle(i)}</span>
                  <span className="block truncate text-[11px] text-muted">{i.detail}</span>
                </span>
                <span className={cn("shrink-0 text-[12px] font-semibold", i.ok ? "text-rag-green" : "text-rag-red")}>
                  {i.ok ? "Connected" : "Not connected"}
                </span>
              </SpaLink>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-muted">Checking connections…</p>
        )}
      </section>

      <section className="rpma-panel overflow-hidden p-0">
        <div className="flex items-end justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">SQL hosts</p>
            <h2 className="mt-0.5 text-[16px] font-semibold text-fg">Installed Assure SQL Agents</h2>
          </div>
          <p className="text-[12px] text-muted">{agents.length} customers</p>
        </div>
        {agentMsg ? <p className="px-4 pb-2 text-[12px] text-rag-red">{agentMsg}</p> : null}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px]">
            <thead className="rpma-table-head">
              <tr>
                <th className="px-4 py-2 font-semibold">Customer Name</th>
                <th className="px-4 py-2 font-semibold">Agent Version Installed</th>
                <th className="px-4 py-2 font-semibold">Agent Status</th>
                <th className="px-4 py-2 font-semibold">Service Cover</th>
              </tr>
            </thead>
            <tbody>
              {agents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-muted">
                    No customers listed.
                  </td>
                </tr>
              ) : (
                agents.map((row) => {
                  const st = agentStatus(row);
                  const on = COVER_CHIPS.filter((c) => row.cover[c.key]);
                  return (
                    <tr key={row.customerCode} className="border-t border-border/40">
                      <td className="px-4 py-2.5">
                        <SpaLink
                          href={`/customers/${encodeURIComponent(row.customerCode)}`}
                          className="font-semibold text-fg no-underline hover:underline"
                        >
                          {row.displayName}
                        </SpaLink>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[12px] text-muted">
                        {row.agentVersion ? `v${row.agentVersion}` : "Not installed"}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 font-semibold",
                            st.tone === "green" && "text-rag-green",
                            st.tone === "amber" && "text-amber-400",
                            st.tone === "red" && "text-rag-red",
                            st.tone === "muted" && "text-muted",
                          )}
                        >
                          <span
                            className={cn(
                              "h-2 w-2 rounded-full",
                              st.tone === "green" && "bg-rag-green",
                              st.tone === "amber" && "bg-amber-400",
                              st.tone === "red" && "bg-rag-red",
                              st.tone === "muted" && "bg-muted",
                            )}
                          />
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        {on.length === 0 ? (
                          <span className="text-muted">No Cover</span>
                        ) : (
                          <span className="flex flex-wrap gap-1">
                            {on.map((c) => (
                              <span
                                key={c.key}
                                className="rounded-md bg-rag-green/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rag-green"
                              >
                                {c.label}
                              </span>
                            ))}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
