import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { SpaLink } from "@/components/nav/spa-link";
import { fetchConfigHealth, type ConfigHealthItem } from "@/lib/settings/settings-api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings/")({
  component: SettingsHub,
});

const OPTIONS: { href: string; title: string; blurb: string }[] = [
  { href: "/settings/integrations", title: "Integrations", blurb: "Health ticks for SQL, Pulseway, Cove, EPP, Graph." },
  { href: "/settings/sql", title: "SQL Server", blurb: "Central connections and credentials." },
  { href: "/settings/ssl", title: "SSL / HTTPS", blurb: "Certificate for the public hostname." },
  { href: "/settings/users", title: "Users", blurb: "Staff accounts, roles, and scope." },
  { href: "/settings/collect", title: "Collect", blurb: "Last import and schedule health." },
  { href: "/settings/agents", title: "Edge agents", blurb: "SQL-host Windows service heartbeats." },
  { href: "/settings/query", title: "SQL Query", blurb: "Read-only explorer." },
  { href: "/settings/theme", title: "Theme", blurb: "Light / dark and palette." },
  { href: "/settings/dashboard", title: "Dashboard", blurb: "Which panels show on Exco." },
  { href: "/settings/rag", title: "RAG thresholds", blurb: "Red / Amber / Green rules." },
  { href: "/settings/alerts", title: "Alerts", blurb: "Health, jobs, and stale collect." },
  { href: "/settings/labels", title: "UI Labels", blurb: "Rename modules and cover chips." },
  { href: "/settings/reports", title: "Report schedules", blurb: "On-screen report packs." },
  { href: "/settings/audit", title: "Audit log", blurb: "Who changed platform settings." },
];

function SettingsHub() {
  const [items, setItems] = useState<ConfigHealthItem[]>([]);

  useEffect(() => {
    void fetchConfigHealth()
      .then((r) => setItems(r.items ?? []))
      .catch(() => setItems([]));
  }, []);

  return (
    <div className="space-y-4">
      {items.length ? (
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-6">
          {items.map((i) => (
            <SpaLink
              key={i.id}
              href={i.href}
              className="rpma-panel flex items-center gap-2 px-2.5 py-2 no-underline"
            >
              <span
                className={cn(
                  "grid h-5 w-5 shrink-0 place-items-center rounded-full text-white",
                  i.ok ? "bg-rag-green" : "bg-rag-red",
                )}
              >
                {i.ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[11px] font-bold text-fg">{i.label}</span>
                <span className={cn("block truncate text-[10px]", i.ok ? "text-rag-green" : "text-rag-red")}>
                  {i.ok ? "Connected" : "Not connected"}
                </span>
              </span>
            </SpaLink>
          ))}
        </div>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {OPTIONS.map((o) => (
          <SpaLink key={o.href} href={o.href} className="rpma-panel block px-4 py-3 no-underline">
            <p className="text-[13px] font-semibold text-fg">{o.title}</p>
            <p className="mt-1 text-[12px] text-muted">{o.blurb}</p>
          </SpaLink>
        ))}
      </div>
    </div>
  );
}
