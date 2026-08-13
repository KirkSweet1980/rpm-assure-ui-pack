import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Plus, Save, Trash2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHead } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  fetchSettingsBundle,
  saveSqlConnections,
  testSqlConnection,
} from "@/lib/settings/settings-api";
import { emptySqlConnection, type SqlConnectionConfig } from "@/lib/settings/types";

export const Route = createFileRoute("/settings/sql")({
  component: SqlSettingsPage,
});

function SqlSettingsPage() {
  const [rows, setRows] = useState<SqlConnectionConfig[]>([]);
  const [runtime, setRuntime] = useState<
    Awaited<ReturnType<typeof fetchSettingsBundle>>["runtime"] | null
  >(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const b = await fetchSettingsBundle();
    setRows(
      b.sqlConnections.length
        ? b.sqlConnections.map((c) => ({
            ...c,
            // Always empty in the form — type a new password to change it
            password: "",
          }))
        : [
            emptySqlConnection({
              name: "Primary central",
              server: "102.222.21.220",
              port: 14333,
              database: "RPMAssure_App",
              user: "Rpm_collect",
              encrypt: false,
              trustServerCertificate: true,
            }),
          ],
    );
    setRuntime(b.runtime);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function update(i: number, patch: Partial<SqlConnectionConfig>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function setPrimary(i: number) {
    setRows((prev) => prev.map((r, idx) => ({ ...r, isPrimary: idx === i })));
  }

  async function onSave() {
    setBusy(true);
    setMsg(null);
    try {
      const primary = rows.find((r) => r.isPrimary) ?? rows[0];
      if (primary && !primary.password?.trim() && !primary.passwordConfigured) {
        setMsg(
          "Type the full SQL password in the Password field before Save (field is blank on purpose so a mask is never re-saved).",
        );
        setBusy(false);
        return;
      }
      const res = await saveSqlConnections({ data: { connections: rows } });
      setMsg(
        res.passwordSaved
          ? "Saved. Password saved to data/rpma-settings.json. Pool reset — page should stay up."
          : "Saved (kept previous password). Pool reset — page should stay up.",
      );
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onTest(i: number) {
    setBusy(true);
    setMsg(null);
    try {
      const r = await testSqlConnection({ data: { connection: rows[i] } });
      setMsg(r.message);
      if (r.ok) {
        await load();
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }


  return (
    <div className="space-y-3">
      <Card>
        <CardHead>SQL Server configuration</CardHead>
        <CardContent className="space-y-3">
          <p className="text-xs leading-relaxed text-muted">
            Primary connection feeds Global Overview and customer dashboards. Stored in{" "}
            <span className="font-mono">data/rpma-settings.json</span>. On Save, settings are also
            synced to <span className="font-mono">.env.local</span> so both stay aligned.
          </p>
          <p className="rounded-md border border-border bg-surface-2 px-3 py-2 text-xs text-fg">
            <strong>Password tip:</strong> the password box is always empty when the page loads
            (security). Type the full password, then <strong>Save</strong> or <strong>Test</strong>.
            Leave blank on later saves only if a password is already stored.
          </p>
          {runtime ? (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant={runtime.liveTest.ok ? "green" : "amber"}>
                {runtime.liveTest.ok ? "Live OK" : "Live issue"}
              </Badge>
              <span className={runtime.liveTest.ok ? "text-muted" : "text-rag-red"}>
                {runtime.liveTest.message}
              </span>
              <span className="text-subtle">· mode {runtime.dataMode}</span>
              <span className="text-subtle">
                · effective {runtime.debug.effectiveSource ?? runtime.debug.source}
              </span>
              {runtime.debug.server ? (
                <span className="font-mono text-subtle">
                  · {runtime.debug.user}@{runtime.debug.server}:{runtime.debug.port}/
                  {runtime.debug.database}
                </span>
              ) : null}
            </div>
          ) : null}
          {msg ? (
            <p
              className={`rounded-md px-3 py-2 text-xs ${
                msg.startsWith("OK") || msg.startsWith("Saved")
                  ? "bg-rag-green-bg text-rag-green"
                  : "bg-rag-red-bg text-rag-red"
              }`}
            >
              {msg}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {rows.map((c, i) => (
        <Card key={c.id}>
          <CardHead>
            <span className="inline-flex flex-wrap items-center gap-2">
              {c.name || `Connection ${i + 1}`}
              {c.isPrimary ? <Badge variant="green">Primary</Badge> : null}
              {c.passwordConfigured ? (
                <Badge variant="muted">Password on file</Badge>
              ) : (
                <Badge variant="amber">No password saved yet</Badge>
              )}
            </span>
          </CardHead>
          <CardContent className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Display name">
                <input
                  className="field"
                  value={c.name}
                  onChange={(e) => update(i, { name: e.target.value })}
                />
              </Field>
              <Field label="Data mode">
                <select
                  className="field"
                  value={c.dataMode}
                  onChange={(e) =>
                    update(i, { dataMode: e.target.value as SqlConnectionConfig["dataMode"] })
                  }
                >
                  <option value="auto">auto</option>
                  <option value="live">live</option>
                  <option value="demo">demo</option>
                </select>
              </Field>
              <Field label="Server host (no port here)">
                <input
                  className="field font-mono"
                  value={c.server}
                  onChange={(e) => update(i, { server: e.target.value })}
                  placeholder="102.222.21.220"
                  autoComplete="off"
                />
              </Field>
              <Field label="Port">
                <input
                  className="field font-mono"
                  type="number"
                  value={c.port}
                  onChange={(e) => update(i, { port: Number(e.target.value) || 1433 })}
                />
              </Field>
              <Field label="Database">
                <input
                  className="field font-mono"
                  value={c.database}
                  onChange={(e) => update(i, { database: e.target.value })}
                  autoComplete="off"
                />
              </Field>
              <Field label="User">
                <input
                  className="field font-mono"
                  value={c.user}
                  onChange={(e) => update(i, { user: e.target.value })}
                  autoComplete="username"
                />
              </Field>
              <Field label="Password (type full password to set / change)">
                <input
                  className="field font-mono"
                  type="password"
                  value={c.password}
                  onChange={(e) => update(i, { password: e.target.value })}
                  placeholder={
                    c.passwordConfigured
                      ? "Leave blank to keep saved password — or type a new one"
                      : "Type SQL password, then Save"
                  }
                  autoComplete="new-password"
                />
              </Field>
              <div className="flex flex-wrap items-end gap-3 pb-1 text-xs">
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={c.trustServerCertificate}
                    onChange={(e) => update(i, { trustServerCertificate: e.target.checked })}
                  />
                  Trust server certificate
                </label>
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={c.encrypt}
                    onChange={(e) => update(i, { encrypt: e.target.checked })}
                  />
                  Encrypt (off for most on-prem)
                </label>
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="radio"
                    name="primarySql"
                    checked={c.isPrimary}
                    onChange={() => setPrimary(i)}
                  />
                  Primary for dashboard
                </label>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={() => void onTest(i)}
              >
                <Zap className="h-3.5 w-3.5" /> Test connection
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={rows.length <= 1}
                onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            setRows((prev) => [
              ...prev,
              emptySqlConnection({
                name: `Connection ${prev.length + 1}`,
                isPrimary: false,
                encrypt: false,
              }),
            ])
          }
        >
          <Plus className="h-4 w-4" /> Add SQL server
        </Button>
        <Button type="button" disabled={busy} onClick={() => void onSave()}>
          <Save className="h-4 w-4" /> Save SQL settings
        </Button>
      </div>

      <style>{`
        .field {
          width: 100%;
          height: var(--control-h);
          border-radius: 0.5rem;
          border: 1px solid var(--color-border);
          background: var(--color-bg);
          padding: 0 0.65rem;
          font-size: 0.8125rem;
          color: var(--color-fg);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs">
      <span className="mb-1 block font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}
