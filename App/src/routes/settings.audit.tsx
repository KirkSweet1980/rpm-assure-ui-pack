import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHead } from "@/components/ui/card";
import { fetchAdminAuditLog } from "@/lib/settings/settings-api";
import type { AdminAuditEntry } from "@/lib/settings/admin-audit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings/audit")({
  component: AuditLogPage,
});

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-ZA", {
      timeZone: "Africa/Johannesburg",
      dateStyle: "short",
      timeStyle: "medium",
    });
  } catch {
    return iso;
  }
}

function AuditLogPage() {
  const [entries, setEntries] = useState<AdminAuditEntry[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const r = await fetchAdminAuditLog({ data: { limit: 300 } });
      setEntries(r.entries ?? []);
    } catch {
      setEntries([]);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Card>
      <CardHead className="flex flex-wrap items-center justify-between gap-2">
        <span>Admin audit log</span>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={() => void load()}
        >
          <RefreshCw className={cn("size-4", busy && "animate-spin")} />
          Refresh
        </Button>
      </CardHead>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted">
          Who changed platform settings / users. Stored on the app host as{" "}
          <code className="text-fg">data/admin-audit.jsonl</code> (not customer SQL).
        </p>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="bg-surface-2 text-[11px] uppercase tracking-wide text-muted">
              <tr>
                <th className="px-2 py-2">When (SAST)</th>
                <th className="px-2 py-2">Actor</th>
                <th className="px-2 py-2">Action</th>
                <th className="px-2 py-2">Target</th>
                <th className="px-2 py-2">Detail</th>
                <th className="px-2 py-2">OK</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-2 py-6 text-center text-muted">
                    No audit entries yet — create/update a user or save RAG/alerts.
                  </td>
                </tr>
              ) : (
                entries.map((e, i) => (
                  <tr
                    key={`${e.atUtc}-${i}`}
                    className="border-t border-border/80 align-top"
                  >
                    <td className="px-2 py-2 whitespace-nowrap">{fmt(e.atUtc)}</td>
                    <td className="px-2 py-2">{e.actorEmail}</td>
                    <td className="px-2 py-2 font-mono text-[11px]">{e.action}</td>
                    <td className="px-2 py-2">{e.target ?? "—"}</td>
                    <td className="max-w-[280px] truncate px-2 py-2 text-muted" title={e.detail}>
                      {e.detail ?? "—"}
                    </td>
                    <td className="px-2 py-2">{e.ok ? "Y" : "N"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
