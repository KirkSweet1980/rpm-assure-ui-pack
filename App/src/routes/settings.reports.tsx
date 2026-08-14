import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { CalendarClock, FileText, Save, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfigPageHead } from "@/components/settings/config-page";
import {
  fetchSettingsBundle,
  runReportSlotNow,
  saveReportSchedule,
} from "@/lib/settings/settings-api";
import { DEFAULT_REPORT_SCHEDULE, type ReportScheduleConfig } from "@/lib/settings/types";

export const Route = createFileRoute("/settings/reports")({
  component: ReportSchedulesPage,
});

function ReportSchedulesPage() {
  const [sched, setSched] = useState<ReportScheduleConfig>({ ...DEFAULT_REPORT_SCHEDULE });
  const [smtpOn, setSmtpOn] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const b = await fetchSettingsBundle();
    setSched({ ...DEFAULT_REPORT_SCHEDULE, ...(b.reportSchedule ?? {}) });
    setSmtpOn(Boolean(b.smtp?.enabled));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave() {
    setBusy(true);
    setMsg(null);
    try {
      await saveReportSchedule({ data: { schedule: sched } });
      setMsg("Schedule saved. App server tasks call /api/cron/weekly-report?slot=daily|weekly|monthly");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onRun(slot: "daily" | "weekly" | "monthly") {
    setBusy(true);
    setMsg(null);
    try {
      const r = await runReportSlotNow({ data: { slot } });
      setMsg(
        `${slot}: sent ${r.sent}` +
          (r.errors.length ? ` · ${r.errors.slice(0, 3).join("; ")}` : ""),
      );
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <ConfigPageHead title="Report Packs" icon={CalendarClock} />

      <section className="rpma-panel space-y-3 p-4">
        <p className="text-[12px] text-muted">
          Packs go to Kirk (SMTP Report To). Daily 18:00 Day End · Friday weekly digest + RMM / Cove / EPP ·
          1st of month AMS. SMTP must be on.
        </p>
        {!smtpOn ? (
          <p className="text-[12px] font-semibold text-rag-amber">
            SMTP is off. Configure it under{" "}
            <Link to="/settings/smtp" className="underline">
              Email
            </Link>
            .
          </p>
        ) : null}
        <label className="flex items-center gap-2 text-[13px] font-semibold">
          <input
            type="checkbox"
            checked={sched.enabled}
            onChange={(e) => setSched((s) => ({ ...s, enabled: e.target.checked }))}
          />
          Schedules on
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          <Toggle label="Daily Day End (SYSPRO)" checked={sched.dayEnd} onChange={(v) => setSched((s) => ({ ...s, dayEnd: v }))} />
          <Toggle label="Weekly estate digest" checked={sched.weeklyDigest} onChange={(v) => setSched((s) => ({ ...s, weeklyDigest: v }))} />
          <Toggle label="Weekly RMM packs" checked={sched.rmmWeekly} onChange={(v) => setSched((s) => ({ ...s, rmmWeekly: v }))} />
          <Toggle label="Weekly Cove packs" checked={sched.coveWeekly} onChange={(v) => setSched((s) => ({ ...s, coveWeekly: v }))} />
          <Toggle label="Weekly EPP packs" checked={sched.eppWeekly} onChange={(v) => setSched((s) => ({ ...s, eppWeekly: v }))} />
          <Toggle label="Monthly AMS packs" checked={sched.monthlyAms} onChange={(v) => setSched((s) => ({ ...s, monthlyAms: v }))} />
        </div>
        <label className="block text-[11px] font-bold uppercase tracking-wide text-muted">
          Override To
          <input
            value={sched.to}
            onChange={(e) => setSched((s) => ({ ...s, to: e.target.value }))}
            placeholder="Blank = SMTP Report To"
            className="mt-1 w-full rounded-md border border-border bg-surface px-2 py-1.5 text-[13px] text-fg"
          />
        </label>
        <p className="text-[11px] text-muted">
          Last run: {sched.lastRunAt ? `${sched.lastSlot || "—"} · ${sched.lastResult || ""}` : "never"}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={busy} onClick={() => void onSave()}>
            <Save className="size-3.5" /> Save
          </Button>
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => void onRun("daily")}>
            <Send className="size-3.5" /> Send daily now
          </Button>
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => void onRun("weekly")}>
            Send weekly now
          </Button>
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => void onRun("monthly")}>
            Send monthly now
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link to="/reports" search={{ format: undefined, customer: undefined }}>
              <FileText className="size-3.5" /> Open catalog
            </Link>
          </Button>
        </div>
        {msg ? <p className="text-[12px] text-muted">{msg}</p> : null}
      </section>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-[12px] font-semibold text-fg">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
