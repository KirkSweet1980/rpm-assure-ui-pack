import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Bell, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHead } from "@/components/ui/card";
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
    <div className="space-y-4">
      <Card>
        <CardHead className="inline-flex items-center gap-2">
          <Bell className="size-4 text-primary" />
          Alert rules
        </CardHead>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted">
            Evaluate estate health and collect freshness in the app.{" "}
            <strong className="text-fg">Outbound email is disabled</strong> — matches
            show on this page only.
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={alerts.enabled}
              onChange={(e) =>
                setAlerts((s) => ({ ...s, enabled: e.target.checked }))
              }
            />
            Enable alert evaluation
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={alerts.alertOnRed}
              onChange={(e) =>
                setAlerts((s) => ({ ...s, alertOnRed: e.target.checked }))
              }
            />
            Flag Red health
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-fg">
              Job errors threshold (min)
            </span>
            <input
              type="number"
              className="w-full max-w-xs rounded-lg border border-border bg-bg px-3 py-2"
              value={alerts.jobErrorMin}
              onChange={(e) =>
                setAlerts((s) => ({
                  ...s,
                  jobErrorMin: Number(e.target.value) || 0,
                }))
              }
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-fg">
              Collect stale after (hours)
            </span>
            <input
              type="number"
              className="w-full max-w-xs rounded-lg border border-border bg-bg px-3 py-2"
              value={alerts.collectStaleHours}
              onChange={(e) =>
                setAlerts((s) => ({
                  ...s,
                  collectStaleHours: Number(e.target.value) || 0,
                }))
              }
            />
          </label>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="button" disabled={busy} onClick={() => void onSave()}>
              <Save className="h-4 w-4" /> Save rules
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => void onEvaluate()}
            >
              Evaluate now
            </Button>
          </div>
          {msg ? <p className="text-sm text-fg">{msg}</p> : null}
          {matches.length > 0 ? (
            <ul className="list-inside list-disc text-sm text-muted">
              {matches.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
