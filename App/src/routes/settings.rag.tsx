import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHead } from "@/components/ui/card";
import {
  fetchSettingsBundle,
  saveRagSettings,
  suggestRagFromLive,
} from "@/lib/settings/settings-api";
import { DEFAULT_RAG, type RagThresholdConfig } from "@/lib/settings/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings/rag")({
  component: RagSettingsPage,
});

type TuneSample = {
  customerCode: string;
  displayName: string;
  active: boolean;
  jobErrors: number;
  dtrVarLines: number;
  opsCount: number;
  hoursSinceOps: number | null;
  currentRag: string;
  suggestedRag: string;
};

function ragClass(r: string) {
  if (r === "Red") return "text-red-700 dark:text-red-300";
  if (r === "Amber") return "text-amber-800 dark:text-amber-200";
  return "text-emerald-800 dark:text-emerald-200";
}

function RagSettingsPage() {
  const [rag, setRag] = useState<RagThresholdConfig>({ ...DEFAULT_RAG });
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rationale, setRationale] = useState<string[]>([]);
  const [samples, setSamples] = useState<TuneSample[]>([]);
  const [estateLine, setEstateLine] = useState<string | null>(null);

  const load = useCallback(async () => {
    const b = await fetchSettingsBundle();
    setRag({ ...DEFAULT_RAG, ...(b.rag ?? {}) });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await saveRagSettings({ data: { rag } });
      setMsg("RAG thresholds saved — portfolio health uses these immediately (cache cleared).");
      if (r.rag) setRag(r.rag);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onSuggest() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await suggestRagFromLive();
      if (!r.ok || !r.result) {
        setMsg(r.message || "Could not load live estate metrics.");
        setRationale([]);
        setSamples([]);
        setEstateLine(null);
        return;
      }
      setRag(r.result.suggested);
      setRationale(r.result.rationale);
      setSamples(r.result.samples as TuneSample[]);
      const e = r.result.estate;
      setEstateLine(
        `Active ${e.activeCount} · with collect ${e.withCollect} · max job errors ${e.maxJobErrors} (p75 ${e.p75JobErrors}) · max FinSight Out of Balance ${e.maxDtr}` +
          (e.maxHoursSinceOps != null ? ` · max collect age ${e.maxHoursSinceOps}h` : ""),
      );
      setMsg(
        r.message +
          " — review suggested values and customer RAG preview, then Save thresholds.",
      );
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function num(
    key: keyof RagThresholdConfig,
    label: string,
    help: string,
    min = 0,
  ) {
    return (
      <label className="block text-xs">
        <span className="mb-1 block font-medium text-fg">{label}</span>
        <input
          className="field"
          type="number"
          min={min}
          value={Number(rag[key]) || 0}
          onChange={(e) =>
            setRag((s) => ({
              ...s,
              [key]: Number(e.target.value),
            }))
          }
        />
        <span className="mt-1 block text-[11px] text-muted">{help}</span>
      </label>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHead>RAG thresholds</CardHead>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted">
            Tune estate Red / Amber / Green without redeploying code. Use{" "}
            <strong className="text-fg">Suggest from live estate</strong> to
            set thresholds from current job errors, FinSight variance, and collect age
            (AHIC, UVSS, …). Then Save.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={busy} onClick={() => void onSuggest()}>
              <Sparkles className="size-4" />
              Suggest from live estate
            </Button>
            <Button type="button" disabled={busy} onClick={() => void onSave()}>
              <Save className="size-4" />
              Save thresholds
            </Button>
          </div>
          {estateLine && (
            <p className="rounded-md border border-border bg-surface-2 px-3 py-2 text-[11px] text-fg">
              {estateLine}
            </p>
          )}
          {rationale.length > 0 && (
            <ul className="list-disc space-y-1 pl-5 text-xs text-muted">
              {rationale.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {num(
              "jobErrorsRedAt",
              "Job errors → Red (at or above)",
              "Material job-error volume. Suggest uses live max / p75.",
              1,
            )}
            {num(
              "jobErrorsAmberFrom",
              "Job errors → Amber (from)",
              "Usually 1. Raised only if every site has a noise floor.",
              0,
            )}
            {num(
              "dtrVarianceRedAt",
              "FinSight variance lines → Red (0 = off)",
              "Hard Red for extreme Out of Balance; 0 keeps Out of Balance as Amber-only.",
              0,
            )}
            {num(
              "collectStaleHours",
              "Collect stale after (hours)",
              "Feeds assurance score + Collect inventory + alerts.",
              1,
            )}
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={rag.dtrVarianceIsAmber}
              onChange={(e) =>
                setRag((s) => ({ ...s, dtrVarianceIsAmber: e.target.checked }))
              }
            />
            <span>
              <span className="font-medium text-fg">FinSight variance is Amber</span>
              <span className="mt-0.5 block text-xs text-muted">
                When jobs are clean but any FinSight L1 line has Variance ≠ 0 → Amber.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={rag.noOperatorsIsAmber}
              onChange={(e) =>
                setRag((s) => ({ ...s, noOperatorsIsAmber: e.target.checked }))
              }
            />
            <span>
              <span className="font-medium text-fg">No operators → Amber</span>
              <span className="mt-0.5 block text-xs text-muted">
                Missing operator snapshot treated as Amber (not Green).
              </span>
            </span>
          </label>
          {msg && (
            <p className="rounded-md border border-border bg-surface-2 px-3 py-2 text-xs text-fg">
              {msg}
            </p>
          )}
        </CardContent>
      </Card>

      {samples.length > 0 && (
        <Card>
          <CardHead>Live preview — current vs suggested RAG</CardHead>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead className="bg-surface-2 text-[11px] uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-2 py-2">Customer</th>
                    <th className="px-2 py-2">Jobs err</th>
                    <th className="px-2 py-2">FinSight Out of Balance</th>
                    <th className="px-2 py-2">Ops</th>
                    <th className="px-2 py-2">Age (h)</th>
                    <th className="px-2 py-2">Now</th>
                    <th className="px-2 py-2">Suggested</th>
                  </tr>
                </thead>
                <tbody>
                  {samples.map((s) => (
                    <tr key={s.customerCode} className="border-t border-border/80">
                      <td className="px-2 py-2">
                        <div className="font-medium text-fg">{s.displayName}</div>
                        <div className="text-[10px] text-muted">{s.customerCode}</div>
                      </td>
                      <td className="px-2 py-2">{s.jobErrors}</td>
                      <td className="px-2 py-2">{s.dtrVarLines}</td>
                      <td className="px-2 py-2">{s.opsCount}</td>
                      <td className="px-2 py-2">
                        {s.hoursSinceOps == null ? "—" : s.hoursSinceOps}
                      </td>
                      <td className={cn("px-2 py-2 font-semibold", ragClass(s.currentRag))}>
                        {s.currentRag}
                      </td>
                      <td className={cn("px-2 py-2 font-semibold", ragClass(s.suggestedRag))}>
                        {s.suggestedRag}
                        {s.currentRag !== s.suggestedRag ? " *" : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11px] text-muted">* = RAG would change after Save.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
