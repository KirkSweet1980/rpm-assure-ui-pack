import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Bell, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfigPageHead } from "@/components/settings/config-page";
import {
  fetchSettingsBundle,
  runAlertEvaluation,
  saveAlertSettings,
} from "@/lib/settings/settings-api";
import { DEFAULT_ALERTS, type AlertRulesConfig } from "@/lib/settings/types";

export const Route = createFileRoute("/settings/alerts")({
  component: AlertsSettingsPage,
});

function AlertsSettingsPage() {
  const [alerts, setAlerts] = useState<AlertRulesConfig>({ ...DEFAULT_ALERTS });
  const [msg, setMsg] = useState<string | null>(null);
  const [matches, setMatches] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const b = await fetchSettingsBundle();
    setAlerts({ ...DEFAULT_ALERTS, ...(b.alerts ?? {}) });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await saveAlertSettings({ data: { alerts } });
      setMsg("Alert rules saved (in-app evaluation only — email disabled).");
      if (r.alerts) setAlerts(r.alerts);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onEvaluate() {
    setBusy(true);
    setMsg(null);
    setMatches([]);
    try {
      await saveAlertSettings({ data: { alerts } });
      const r = await runAlertEvaluation({ data: { force: true } });
      setMsg(r.message);
      setMatches(r.matches ?? []);
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <ConfigPageHead
        title="Alert Rules"
        icon={Bell}
        actions={
          <>
            <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => void onEvaluate()}>
              Evaluate Now
            </Button>
            <Button type="button" size="sm" disabled={busy} onClick={() => void onSave()}>
              <Save className="size-3.5" />
              Save
            </Button>
          </>
        }
      />

      <section className="rpma-panel overflow-hidden p-0">
        <div className="px-4 py-3">
          <h2 className="text-[16px] font-extrabold text-fg">In-App Rules</h2>
          <p className="text-[12px] text-muted">Outbound email is disabled. Matches show on this page only.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="rpma-xls">
            <thead>
              <tr>
                <th>Rule</th>
                <th>Setting</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Enable Alert Evaluation</td>
                <td>
                  <input
                    type="checkbox"
                    checked={alerts.enabled}
                    onChange={(e) => setAlerts((s) => ({ ...s, enabled: e.target.checked }))}
                  />
                </td>
              </tr>
              <tr>
                <td>Flag Red Health</td>
                <td>
                  <input
                    type="checkbox"
                    checked={alerts.alertOnRed}
                    onChange={(e) => setAlerts((s) => ({ ...s, alertOnRed: e.target.checked }))}
                  />
                </td>
              </tr>
              <tr>
                <td>Job Errors Threshold (Min)</td>
                <td>
                  <input
                    type="number"
                    className="w-24 border-0 bg-transparent text-[12px] outline-none"
                    value={alerts.jobErrorMin}
                    onChange={(e) =>
                      setAlerts((s) => ({ ...s, jobErrorMin: Number(e.target.value) || 0 }))
                    }
                  />
                </td>
              </tr>
              <tr>
                <td>Collect Stale After (Hours)</td>
                <td>
                  <input
                    type="number"
                    className="w-24 border-0 bg-transparent text-[12px] outline-none"
                    value={alerts.collectStaleHours}
                    onChange={(e) =>
                      setAlerts((s) => ({ ...s, collectStaleHours: Number(e.target.value) || 0 }))
                    }
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        {msg ? <p className="px-4 py-3 text-[12px] text-muted">{msg}</p> : null}
        {matches.length > 0 ? (
          <ul className="list-inside list-disc px-4 pb-4 text-[12px] text-muted">
            {matches.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
