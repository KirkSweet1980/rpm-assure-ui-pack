import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ClipboardList, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfigPageHead } from "@/components/settings/config-page";
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
    <div className="space-y-6">
      <ConfigPageHead
        kicker="Settings"
        title="Audit Log"
        icon={ClipboardList}
        actions={
          <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => void load()}>
            <RefreshCw className={cn("size-3.5", busy && "animate-spin")} />
            Recheck
          </Button>
        }
      />

      <section className="rpma-panel overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="rpma-xls">
            <thead>
              <tr>
                <th>When (SAST)</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Target</th>
                <th>Detail</th>
                <th>OK</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={6}>No audit entries yet.</td>
                </tr>
              ) : (
                entries.map((e, i) => (
                  <tr key={`${e.atUtc}-${i}`}>
                    <td className="whitespace-nowrap">{fmt(e.atUtc)}</td>
                    <td>{e.actorEmail}</td>
                    <td className="font-mono">{e.action}</td>
                    <td>{e.target ?? "—"}</td>
                    <td className="max-w-[280px] truncate" title={e.detail}>
                      {e.detail ?? "—"}
                    </td>
                    <td>{e.ok ? "Y" : "N"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
