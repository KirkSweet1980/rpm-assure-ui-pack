import { createFileRoute } from "@tanstack/react-router";
import { SpaLink } from "@/components/nav/spa-link";

export const Route = createFileRoute("/settings/")({
  component: SettingsHub,
});

const OPTIONS: { href: string; title: string; blurb: string }[] = [
  { href: "/settings/sql", title: "SQL Server", blurb: "Central connections and credentials." },
  { href: "/settings/ssl", title: "SSL / HTTPS", blurb: "Certificate for the public hostname." },
  { href: "/settings/integrations", title: "Integrations", blurb: "SYSPRO, RMM, Cove, EPP, Microsoft 365." },
  { href: "/settings/users", title: "Users", blurb: "Staff accounts, roles, and scope." },
  { href: "/settings/collect", title: "Collect", blurb: "Last import and schedule health." },
  { href: "/settings/query", title: "SQL Query", blurb: "Read-only explorer." },
  { href: "/settings/theme", title: "CSS variables", blurb: "Live tokens, where they paint, RPM logo palette." },
  { href: "/settings/dashboard", title: "Dashboard", blurb: "Which panels show on Exco." },
  { href: "/settings/rag", title: "RAG thresholds", blurb: "Red / Amber / Green rules." },
  { href: "/settings/alerts", title: "Alerts", blurb: "Health, jobs, and stale collect." },
  { href: "/settings/labels", title: "UI Labels", blurb: "Rename modules and cover chips." },
  { href: "/settings/reports", title: "Report schedules", blurb: "On-screen report packs." },
  { href: "/settings/audit", title: "Audit log", blurb: "Who changed platform settings." },
];

function SettingsHub() {
  return (
    <div className="mx-auto max-w-5xl">
      <p className="antler-kicker">Configuration</p>
      <h2 className="mb-6 text-2xl font-semibold tracking-tight text-white">
        Configuration
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {OPTIONS.map((o) => (
          <SpaLink
            key={o.href}
            href={o.href}
            className="rounded-md border border-[#4a6278] bg-[#34495E] p-5 text-left transition hover:border-[#1ABC9C]"
          >
            <p className="text-[15px] font-semibold text-white">{o.title}</p>
            <p className="mt-1 text-[13px] leading-5 text-[#9aa3b0]">{o.blurb}</p>
          </SpaLink>
        ))}
      </div>
    </div>
  );
}
