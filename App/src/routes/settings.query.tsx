import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHead } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
    <div className="space-y-3">
      <Card>
        <CardHead>
          <span className="inline-flex items-center gap-2">
            SQL Query
            <Badge variant="muted">SELECT only</Badge>
          </span>
        </CardHead>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted">
            Read-only explorer against the <strong>primary</strong> connection. Blocked: INSERT,
            UPDATE, DELETE, DDL, EXEC, multiple batches. Max 200 rows (cap 1000).
          </p>
          <div className="flex flex-wrap gap-1.5">
            {SAMPLES.map((s, i) => (
              <button
                key={i}
                type="button"
                className="rounded-md border border-border bg-surface-2 px-2 py-1 text-[10px] text-muted hover:text-fg"
                onClick={() => setSqlText(s)}
              >
                Sample {i + 1}
              </button>
            ))}
          </div>
          <textarea
            className="min-h-[140px] w-full rounded-lg border border-border bg-bg p-3 font-mono text-xs text-fg"
            value={sqlText}
            onChange={(e) => setSqlText(e.target.value)}
            spellCheck={false}
          />
          <Button type="button" disabled={busy} onClick={() => void run()}>
            <Play className="h-4 w-4" /> Run query
          </Button>
          {message ? (
            <p className={`text-xs ${ok ? "text-rag-green" : "text-rag-red"}`}>{message}</p>
          ) : null}
        </CardContent>
      </Card>

      {columns.length > 0 ? (
        <Card>
          <CardHead>Results ({rows.length})</CardHead>
          <CardContent className="overflow-auto p-0">
            <table className="w-full text-left text-[11px]">
              <thead className="sticky top-0 bg-card-head text-[10px] uppercase text-subtle">
                <tr>
                  {columns.map((c) => (
                    <th key={c} className="whitespace-nowrap px-2 py-1.5 font-semibold">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t border-border/80">
                    {columns.map((c) => (
                      <td key={c} className="max-w-[220px] truncate px-2 py-1 font-mono">
                        {formatCell(r[c])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function formatCell(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
