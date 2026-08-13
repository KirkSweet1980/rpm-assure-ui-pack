import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHead } from "@/components/ui/card";

export const Route = createFileRoute("/settings/about")({
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="space-y-3">
      <Card>
        <CardHead>What we shipped in Settings</CardHead>
        <CardContent className="space-y-2 text-sm text-muted">
          <ul className="list-disc space-y-1 pl-5">
            <li><strong className="text-fg">RPM Assure:</strong> SYSPRO operating + FinSight financial controls — not uptime alone.</li>
            <li>SQL Server connections (multi-entry, primary, test, data mode)</li>
                        <li>Read-only SQL query explorer</li>
            <li>
              Full user account control — create sign-in, roles, enable/disable, password reset,
              customer scope (PlatformAdmin only; no public self-registration)
            </li>
          </ul>
        </CardContent>
      </Card>
      <Card>
        <CardHead>Suggested next settings (priority order)</CardHead>
        <CardContent className="text-sm">
          <ol className="list-decimal space-y-2 pl-5 text-muted">
            <li>
              <strong className="text-fg">RAG thresholds</strong> — job error red/amber, FinSight rules
              without code deploy.
            </li>
            <li>
              <strong className="text-fg">Alert rules</strong> (in-app evaluation; email off) — </li>
            <li>
              <strong className="text-fg">Collect inventory</strong> — last import per customer /
              instance, schedule health.
            </li>
            <li>
              <strong className="text-fg">Audit log of admin actions</strong> — who created/disabled
              users and when.
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
