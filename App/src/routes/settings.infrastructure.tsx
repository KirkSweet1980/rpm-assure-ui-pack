import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Server, X } from "lucide-react";
import { SpaLink } from "@/components/nav/spa-link";
import { fetchConfigHealth, type ConfigHealthItem } from "@/lib/settings/settings-api";
import { AgentFleetPanel } from "@/components/settings/agent-fleet-panel";
import { cn, formatSastDateTime } from "@/lib/utils";

export const Route = createFileRoute("/settings/infrastructure")({
  component: InfrastructureStatusPage,
});

function healthTitle(item: ConfigHealthItem) {
  if (item.id === "cove") return "N-Able Cove Backup";
  if (item.id === "sql") return "SQL Server";
  return item.label;
}

function healthSource(item: ConfigHealthItem) {
  if (item.source === "sql") return item.detail;
  if (item.source === "agent") return "SYSPRO · RPM Assure Agent";
  if (item.source === "api") return "API";
  return "Platform";
}

function InfrastructureStatusPage() {
  const [items, setItems] = useState<ConfigHealthItem[]>([]);

  useEffect(() => {
    void fetchConfigHealth()
      .then((r) => setItems(r.items ?? []))
      .catch(() => setItems([]));
  }, []);

  const okN = items.filter((i) => i.ok).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Configuration</p>
          <h1 className="mt-1 flex items-center gap-2 text-[18px] font-semibold tracking-tight text-fg">
            <Server className="h-5 w-5 text-muted" />
            Assure Infrastructure Status
          </h1>
          <p className="mt-1 text-[13px] text-muted">
            {items.length ? `${okN} of ${items.length} platform connections healthy` : "Checking connections…"}
          </p>
        </div>
      </div>

      {items.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((i) => (
            <SpaLink
              key={i.id}
              href={i.href}
              className={cn(
                "rpma-panel flex min-h-[7.25rem] flex-col justify-between gap-3 px-4 py-4 no-underline",
                i.ok ? "ring-1 ring-rag-green/25" : "ring-1 ring-rag-red/25",
              )}
            >
              <span className="flex items-start gap-3">
                <span
                  className={cn(
                    "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full text-white",
                    i.ok ? "bg-rag-green" : "bg-rag-red",
                  )}
                >
                  {i.ok ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                </span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-semibold leading-snug text-fg">{healthTitle(i)}</span>
                  <span className="mt-1 block text-[11px] uppercase tracking-wide text-muted">{healthSource(i)}</span>
                </span>
              </span>
              <span className="flex items-end justify-between gap-2">
                <span className={cn("text-[13px] font-semibold", i.ok ? "text-rag-green" : "text-rag-red")}>
                  {i.ok ? "Connected" : "Not connected"}
                </span>
                {i.lastAt ? (
                  <span className="text-[11px] text-subtle">Last {formatSastDateTime(i.lastAt)}</span>
                ) : null}
              </span>
            </SpaLink>
          ))}
        </div>
      ) : null}

      <AgentFleetPanel />
    </div>
  );
}
