import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarClock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfigPageHead } from "@/components/settings/config-page";

export const Route = createFileRoute("/settings/reports")({
  component: ReportSchedulesPage,
});

function ReportSchedulesPage() {
  return (
    <div className="space-y-6">
      <ConfigPageHead title="Report Packs" icon={CalendarClock} />

      <section className="rpma-panel overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="rpma-xls">
            <thead>
              <tr>
                <th>Pack</th>
                <th>Delivery</th>
                <th>Open</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Estate Report Packs</td>
                <td>Browser / Print — email schedules off</td>
                <td>
                  <Button asChild size="sm" className="h-7 px-2.5 text-[11px]">
                    <Link to="/reports" search={{ format: undefined, customer: undefined }}>
                      <FileText className="size-3.5" />
                      Open Reports
                    </Link>
                  </Button>
                </td>
              </tr>
              <tr>
                <td>Monthly Pack</td>
                <td>On-screen preview</td>
                <td>
                  <Button asChild size="sm" variant="secondary" className="h-7 px-2.5 text-[11px]">
                    <Link to="/reports" search={{ format: "ams-monthly", customer: undefined }}>
                      Monthly
                    </Link>
                  </Button>
                </td>
              </tr>
              <tr>
                <td>Weekly RPM Assure</td>
                <td>On-screen preview</td>
                <td>
                  <Button asChild size="sm" variant="secondary" className="h-7 px-2.5 text-[11px]">
                    <Link to="/reports" search={{ format: "ams-weekly", customer: undefined }}>
                      Weekly
                    </Link>
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
