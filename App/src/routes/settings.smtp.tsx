import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHead } from "@/components/ui/card";

export const Route = createFileRoute("/settings/smtp")({
  component: SmtpRemovedPage,
});

/** Outbound email removed from RPM Assure for now. */
function SmtpRemovedPage() {
  return (
    <Card>
      <CardHead>Email / SMTP removed</CardHead>
      <CardContent className="space-y-3 text-sm text-muted">
        <p>
          Outbound email (SMTP, test send, weekly digest mail) is not part of this
          release. Reports stay <strong className="text-fg">on-screen / print</strong>{" "}
          under Reports.
        </p>
        <p>
          Sign-in username/email and Let's Encrypt contact email (SSL) are
          unchanged — those are not outbound mail.
        </p>
        <Link
          to="/settings/sql"
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          Back to Settings → SQL Server
        </Link>
      </CardContent>
    </Card>
  );
}
