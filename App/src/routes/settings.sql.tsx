import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Database, Plus, Save, Trash2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfigPageHead } from "@/components/settings/config-page";
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
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const b = await fetchSettingsBundle();
    setRows(
      b.sqlConnections.length
        ? b.sqlConnections.map((c) => ({ ...c, password: "" }))
        : [
            emptySqlConnection({
              name: "Primary Central",
              server: "102.222.21.220",
              port: 14333,
              database: "RPMAssure_App",
              user: "Rpm_collect",
              encrypt: false,
              trustServerCertificate: true,
            }),
          ],
    );
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
        setMsg("Type the SQL password before Save.");
        setBusy(false);
        return;
      }
      const res = await saveSqlConnections({ data: { connections: rows } });
      setMsg(res.passwordSaved ? "Saved. Password stored." : "Saved (kept previous password).");
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
      if (r.ok) await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <ConfigPageHead
        kicker="Settings"
        title="SQL Server"
        icon={Database}
        actions={
          <>
            <Button
              type="button"
              variant="secondary"
              size="sm"
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
              <Plus className="size-3.5" />
              Add
            </Button>
            <Button type="button" size="sm" disabled={busy} onClick={() => void onSave()}>
              <Save className="size-3.5" />
              Save
            </Button>
          </>
        }
      />
      {msg ? <p className="text-[12px] text-muted">{msg}</p> : null}

      {rows.map((c, i) => (
        <section key={c.id} className="rpma-panel overflow-hidden p-0">
          <div className="flex flex-wrap items-end justify-between gap-2 px-4 py-3">
            <h2 className="text-[16px] font-extrabold text-fg">
              {c.name || `Connection ${i + 1}`}
              {c.isPrimary ? " · Primary" : ""}
              {c.passwordConfigured ? "" : " · No Password"}
            </h2>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => void onTest(i)}>
                <Zap className="size-3.5" />
                Test
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={rows.length <= 1}
                onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="size-3.5" />
                Remove
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="rpma-xls">
              <thead>
                <tr>
                  <th>Setting</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Display Name</td>
                  <td>
                    <input className="w-full border-0 bg-transparent text-[12px] outline-none" value={c.name} onChange={(e) => update(i, { name: e.target.value })} />
                  </td>
                </tr>
                <tr>
                  <td>Data Mode</td>
                  <td>
                    <select className="border-0 bg-transparent text-[12px] outline-none" value={c.dataMode} onChange={(e) => update(i, { dataMode: e.target.value as SqlConnectionConfig["dataMode"] })}>
                      <option value="auto">auto</option>
                      <option value="live">live</option>
                      <option value="demo">demo</option>
                    </select>
                  </td>
                </tr>
                <tr>
                  <td>Server Host</td>
                  <td>
                    <input className="w-full border-0 bg-transparent font-mono text-[12px] outline-none" value={c.server} onChange={(e) => update(i, { server: e.target.value })} />
                  </td>
                </tr>
                <tr>
                  <td>Port</td>
                  <td>
                    <input className="w-24 border-0 bg-transparent font-mono text-[12px] outline-none" type="number" value={c.port} onChange={(e) => update(i, { port: Number(e.target.value) || 1433 })} />
                  </td>
                </tr>
                <tr>
                  <td>Database</td>
                  <td>
                    <input className="w-full border-0 bg-transparent font-mono text-[12px] outline-none" value={c.database} onChange={(e) => update(i, { database: e.target.value })} />
                  </td>
                </tr>
                <tr>
                  <td>User</td>
                  <td>
                    <input className="w-full border-0 bg-transparent font-mono text-[12px] outline-none" value={c.user} onChange={(e) => update(i, { user: e.target.value })} autoComplete="username" />
                  </td>
                </tr>
                <tr>
                  <td>Password</td>
                  <td>
                    <input
                      className="w-full border-0 bg-transparent font-mono text-[12px] outline-none"
                      type="password"
                      value={c.password}
                      onChange={(e) => update(i, { password: e.target.value })}
                      placeholder={c.passwordConfigured ? "Leave blank to keep" : "Type password, then Save"}
                      autoComplete="new-password"
                    />
                  </td>
                </tr>
                <tr>
                  <td>Trust Server Certificate</td>
                  <td>
                    <input type="checkbox" checked={c.trustServerCertificate} onChange={(e) => update(i, { trustServerCertificate: e.target.checked })} />
                  </td>
                </tr>
                <tr>
                  <td>Encrypt</td>
                  <td>
                    <input type="checkbox" checked={c.encrypt} onChange={(e) => update(i, { encrypt: e.target.checked })} />
                  </td>
                </tr>
                <tr>
                  <td>Primary For Dashboard</td>
                  <td>
                    <input type="radio" name="primarySql" checked={c.isPrimary} onChange={() => setPrimary(i)} />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
