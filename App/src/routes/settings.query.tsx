import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Play, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfigPageHead } from "@/components/settings/config-page";
import { runSqlQuery, type SqlQueryResult } from "@/lib/settings/settings-api";

export const Route = createFileRoute("/settings/query")({
  component: QueryPage,
});

const SAMPLES = [
  "SELECT TOP 20 CustomerCode, DisplayName, Active, SqlInstanceName FROM dbo.Dim_Customer ORDER BY CustomerCode",
  "SELECT TOP 50 SnapshotDate, InstanceName, OperatorCode, LastLoginDate FROM dbo.Syspro_Operators ORDER BY ImportedAt DESC",
  "SELECT InstanceName, COUNT(*) AS JobRows FROM dbo.Syspro_JobLogging GROUP BY InstanceName",
];

function QueryPage() {
  const [sqlText, setSqlText] = useState(SAMPLES[0]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [ok, setOk] = useState<boolean | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<SqlQueryResult["rows"]>([]);

  async function run() {
    setBusy(true);
    setMessage(null);
    try {
      const r: SqlQueryResult = await runSqlQuery({ data: { sqlText, maxRows: 200 } });
      setOk(r.ok);
      setMessage(r.message);
      setColumns(r.columns);
      setRows(r.rows);
    } catch (e) {
      setOk(false);
      setMessage(e instanceof Error ? e.message : String(e));
      setColumns([]);
      setRows([]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <ConfigPageHead
        kicker="Settings"
        title="SQL Query"
        icon={Terminal}
        actions={
          <Button type="button" size="sm" disabled={busy} onClick={() => void run()}>
            <Play className="size-3.5" />
            Run
          </Button>
        }
      />

      <section className="rpma-panel overflow-hidden p-0">
        <div className="flex flex-wrap gap-1.5 px-4 py-3">
          {SAMPLES.map((s, i) => (
            <button
              key={i}
              type="button"
              className="rounded-md border border-border bg-surface px-2 py-1 text-[11px] font-semibold text-muted hover:text-fg"
              onClick={() => setSqlText(s)}
            >
              Sample {i + 1}
            </button>
          ))}
        </div>
        <textarea
          className="min-h-[140px] w-full border-t border-border bg-transparent p-3 font-mono text-[12px] text-fg outline-none"
          value={sqlText}
          onChange={(e) => setSqlText(e.target.value)}
          spellCheck={false}
        />
        {message ? (
          <p className={`px-4 py-2 text-[12px] ${ok ? "text-rag-green" : "text-rag-red"}`}>{message}</p>
        ) : null}
      </section>

      {columns.length > 0 ? (
        <section className="rpma-panel overflow-hidden p-0">
          <div className="px-4 py-3">
            <h2 className="text-[16px] font-extrabold text-fg">Results ({rows.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="rpma-xls">
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    {columns.map((c) => (
                      <td key={c} className="max-w-[220px] truncate font-mono">
                        {formatCell(r[c])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function formatCell(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
