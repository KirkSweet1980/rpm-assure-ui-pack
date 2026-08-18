import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHead } from "@/components/ui/card";
import { fetchSettingsBundle, saveVisionSettings } from "@/lib/settings/settings-api";
import { DEFAULT_VISION, type VisionRetrievalConfig, type VisionSourceId } from "@/lib/settings/types";
import { SOURCE_LABEL } from "@/lib/vision/corpus";
import { askVision } from "@/lib/vision/ask-vision";

export const Route = createFileRoute("/settings/vision")({
  component: VisionSettingsPage,
});

const SOURCE_HELP: Record<VisionSourceId, string> = {
  sla: "Signed SLA import, clocks, provisional cover",
  tickets: "Freshdesk / Service Desk",
  rmm: "Infrastructure, IOPS, patches",
  epp: "End Point Protection, last scan, policies",
  backup: "Cloud Backup and recovery tests",
  syspro: "SYSPRO Landscape and FinSight",
  cover: "Cover vs RAG rules",
  agent: "HTTPS agent pack, no Git",
  csp: "Microsoft 365 posture",
  howto: "Where to click in the UI",
};

function VisionSettingsPage() {
  const [cfg, setCfg] = useState<VisionRetrievalConfig>({ ...DEFAULT_VISION });
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [probe, setProbe] = useState("");
  const [probeCode, setProbeCode] = useState("AHIC");
  const [result, setResult] = useState<string | null>(null);
  const [hits, setHits] = useState<{ title: string; source: string; score: number }[]>([]);

  const load = useCallback(async () => {
    const b = await fetchSettingsBundle();
    setCfg({ ...DEFAULT_VISION, ...((b as { vision?: VisionRetrievalConfig }).vision ?? {}) });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await saveVisionSettings({ data: { vision: cfg } });
      if (r.vision) setCfg(r.vision);
      setMsg("Vision retrieval saved. The assistant uses this on the next question.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onProbe() {
    setBusy(true);
    setResult(null);
    try {
      const r = await askVision({ data: { message: probe, path: "/settings/vision", customer: probeCode } });
      setResult(r.text);
      setHits((r.hits ?? []).map((h) => ({ title: h.title, source: h.source, score: h.score })));
    } catch (e) {
      setResult(e instanceof Error ? e.message : String(e));
      setHits([]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHead>Vision retrieval</CardHead>
        <CardContent className="space-y-4 text-[12px]">
          <p className="text-muted">
            Vision answers from ranked help chunks plus a live tenant snapshot (tickets, servers, backup, EPP, last collect). No public LLM. On a customer page it reads that customer only.
          </p>
          <label className="flex items-center gap-2 font-semibold">
            <input
              type="checkbox"
              checked={cfg.enabled}
              onChange={(e) => setCfg({ ...cfg, enabled: e.target.checked })}
            />
            Retrieval enabled
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1">
              <span className="font-semibold">Chunks to use (top K)</span>
              <input
                className="rpma-sla-input"
                type="number"
                min={1}
                max={8}
                value={cfg.topK}
                onChange={(e) => setCfg({ ...cfg, topK: Number(e.target.value) })}
              />
            </label>
            <label className="grid gap-1">
              <span className="font-semibold">Minimum score</span>
              <input
                className="rpma-sla-input"
                type="number"
                min={0.2}
                max={8}
                step={0.1}
                value={cfg.minScore}
                onChange={(e) => setCfg({ ...cfg, minScore: Number(e.target.value) })}
              />
            </label>
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={cfg.includePath}
              onChange={(e) => setCfg({ ...cfg, includePath: e.target.checked })}
            />
            Boost the page the user is on
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={cfg.includeCustomer}
              onChange={(e) => setCfg({ ...cfg, includeCustomer: e.target.checked })}
            />
            Include live tenant snapshot
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            {(Object.keys(SOURCE_LABEL) as VisionSourceId[]).map((id) => (
              <label key={id} className="flex items-start gap-2 rounded-lg border border-border px-2 py-2">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={cfg.sources[id] !== false}
                  onChange={(e) =>
                    setCfg({
                      ...cfg,
                      sources: { ...cfg.sources, [id]: e.target.checked },
                    })
                  }
                />
                <span>
                  <strong>{SOURCE_LABEL[id]}</strong>
                  <span className="mt-0.5 block text-muted">{SOURCE_HELP[id]}</span>
                </span>
              </label>
            ))}
          </div>
          <Button type="button" disabled={busy} onClick={() => void onSave()}>
            <Save className="size-4" />
            Save retrieval
          </Button>
          {msg ? <p className="text-muted">{msg}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHead>Test retrieval</CardHead>
        <CardContent className="space-y-3 text-[12px]">
          <p className="text-muted">Ask what a staff member would ask. Hits show which chunks ranked.</p>
          <div className="flex flex-wrap gap-2">
            <input
              className="rpma-sla-input w-28"
              value={probeCode}
              onChange={(e) => setProbeCode(e.target.value.toUpperCase())}
              placeholder="AHIC"
              aria-label="Customer code for snapshot"
            />
            <input
              className="rpma-sla-input flex-1"
              value={probe}
              onChange={(e) => setProbe(e.target.value)}
              placeholder="e.g. how many open tickets?"
            />
            <Button type="button" disabled={busy} onClick={() => void onProbe()}>
              <Sparkles className="size-4" />
              Retrieve
            </Button>
          </div>
          {hits.length ? (
            <ul className="space-y-1">
              {hits.map((h) => (
                <li key={h.title}>
                  <strong>{h.title}</strong> · {h.source} · score {h.score}
                </li>
              ))}
            </ul>
          ) : null}
          {result ? <p className="whitespace-pre-wrap rounded-lg border border-border bg-surface-2 px-3 py-2">{result}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
