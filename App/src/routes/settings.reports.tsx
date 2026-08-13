import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarClock, FileText } from "lucide-react";
import { Card, CardContent, CardHead } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/settings/reports")({
  component: ReportSchedulesPage,
});

function ReportSchedulesPage() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHead className="inline-flex items-center gap-2">
          <CalendarClock className="size-4 text-primary" />
          Reports
        </CardHead>
        <CardContent className="space-y-4 text-sm">
          <p className="text-muted">
            Packs are built from Live SQL + RPM Assure facts and viewed{" "}
            <strong className="text-fg">in the browser / print</strong>. Outbound
            email schedules are not enabled in this release.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link to="/reports" search={{ format: undefined, customer: undefined }}>
                <FileText className="size-4" />
                Open Reports
              </Link>
            </Button>
            <Button asChild size="sm" variant="secondary">
              <Link to="/reports" search={{ format: "ams-monthly", customer: undefined }}>
                Monthly pack UI
              </Link>
            </Button>
            <Button asChild size="sm" variant="secondary">
              <Link to="/reports" search={{ format: "ams-weekly", customer: undefined }}>
                Weekly RPM Assure UI
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
