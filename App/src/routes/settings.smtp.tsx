import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Mail, Save, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfigPageHead } from "@/components/settings/config-page";
import {
  fetchSettingsBundle,
  saveSmtpSettings,
  sendTestEmail,
} from "@/lib/settings/settings-api";
import { DEFAULT_SMTP, type SmtpConfig } from "@/lib/settings/types";

export const Route = createFileRoute("/settings/smtp")({
  component: SmtpSettingsPage,
});

function SmtpSettingsPage() {
  const [smtp, setSmtp] = useState<SmtpConfig>({ ...DEFAULT_SMTP });
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const b = await fetchSettingsBundle();
    setSmtp({ ...DEFAULT_SMTP, ...(b.smtp ?? {}), password: "" });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave() {
    setBusy(true);
    setMsg(null);
    try {
      await saveSmtpSettings({ data: { smtp } });
      setMsg("Saved. Enable SMTP and set Report To, then use Report Packs → Send now.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onTest() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await sendTestEmail({ data: { to: smtp.reportTo || smtp.fromEmail } });
      setMsg(r.ok ? "Test email sent." : r.error || "Send failed");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <ConfigPageHead title="Email / SMTP" icon={Mail} />
      <section className="rpma-glass space-y-3 p-4">
        <p className="text-[12px] text-muted">
          Outbound mail for report packs and, when you arm helpdesk, ticket alerts on Amber/Red.
          Saved values stay on this server. Ticket send is stored now; it does not open Freshdesk until helpdesk is armed.
        </p>
        <label className="flex items-center gap-2 text-[12px] font-semibold text-fg">
          <input
            type="checkbox"
            checked={smtp.enabled}
            onChange={(e) => setSmtp((s) => ({ ...s, enabled: e.target.checked }))}
          />
          Outbound email on
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Host" value={smtp.host} onChange={(v) => setSmtp((s) => ({ ...s, host: v }))} />
          <Field
            label="Port"
            value={String(smtp.port)}
            onChange={(v) => setSmtp((s) => ({ ...s, port: Number(v) || 587 }))}
          />
          <Field label="User" value={smtp.user} onChange={(v) => setSmtp((s) => ({ ...s, user: v }))} />
          <Field
            label="Password"
            value={smtp.password}
            type="password"
            onChange={(v) => setSmtp((s) => ({ ...s, password: v }))}
          />
          <Field label="From email" value={smtp.fromEmail} onChange={(v) => setSmtp((s) => ({ ...s, fromEmail: v }))} />
          <Field label="From name" value={smtp.fromName} onChange={(v) => setSmtp((s) => ({ ...s, fromName: v }))} />
          <Field
            label="Reply-To"
            value={smtp.replyTo}
            onChange={(v) => setSmtp((s) => ({ ...s, replyTo: v }))}
          />
          <Field
            label="Report To"
            value={smtp.reportTo}
            onChange={(v) => setSmtp((s) => ({ ...s, reportTo: v }))}
          />
          <label className="flex items-center gap-2 text-[12px] font-semibold">
            <input
              type="checkbox"
              checked={smtp.secure}
              onChange={(e) => setSmtp((s) => ({ ...s, secure: e.target.checked }))}
            />
            TLS / secure
          </label>
        </div>
        <div className="space-y-2 rounded-md border border-border bg-surface-2 p-3">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted">Ticketing prep</p>
          <label className="flex items-center gap-2 text-[12px] font-semibold text-fg">
            <input
              type="checkbox"
              checked={Boolean(smtp.ticketAlertsEnabled)}
              onChange={(e) => setSmtp((s) => ({ ...s, ticketAlertsEnabled: e.target.checked }))}
            />
            Enable mail when RAG turns Amber or Red (helpdesk not armed — save now, send later)
          </label>
          <label className="flex items-center gap-2 text-[12px] font-semibold text-fg">
            <input
              type="checkbox"
              checked={Boolean(smtp.ticketOnAmber)}
              onChange={(e) => setSmtp((s) => ({ ...s, ticketOnAmber: e.target.checked }))}
            />
            On Amber
          </label>
          <label className="flex items-center gap-2 text-[12px] font-semibold text-fg">
            <input
              type="checkbox"
              checked={smtp.ticketOnRed !== false}
              onChange={(e) => setSmtp((s) => ({ ...s, ticketOnRed: e.target.checked }))}
            />
            On Red
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={busy} onClick={() => void onSave()}>
            <Save className="size-3.5" /> Save
          </Button>
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => void onTest()}>
            <Send className="size-3.5" /> Send test
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link to="/settings/reports">Report schedules</Link>
          </Button>
        </div>
        {msg ? <p className="text-[12px] text-muted">{msg}</p> : null}
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block text-[11px] font-bold uppercase tracking-wide text-muted">
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-border bg-surface px-2 py-1.5 text-[13px] font-medium text-fg"
      />
    </label>
  );
}
