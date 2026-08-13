import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RotateCcw, Save, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHead } from "@/components/ui/card";
import { fetchSettingsBundle, saveUiLabels } from "@/lib/settings/settings-api";
import {
  DEFAULT_UI_LABELS,
  UI_LABEL_FIELDS,
  type UiLabelsConfig,
} from "@/lib/settings/types";
import { clearUiLabelsCache } from "@/lib/settings/use-ui-labels";

export const Route = createFileRoute("/settings/labels")({
  component: LabelsSettingsPage,
});

function LabelsSettingsPage() {
  const [labels, setLabels] = useState<UiLabelsConfig>({ ...DEFAULT_UI_LABELS });
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    const b = await fetchSettingsBundle();
    setLabels({ ...DEFAULT_UI_LABELS, ...((b as any).labels ?? {}) });
    setDirty(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const groups = useMemo(() => {
    const map = new Map<string, typeof UI_LABEL_FIELDS>();
    for (const f of UI_LABEL_FIELDS) {
      const list = map.get(f.group) ?? [];
      list.push(f);
      map.set(f.group, list);
    }
    return Array.from(map.entries());
  }, []);

  function setField(key: keyof UiLabelsConfig, value: string) {
    setLabels((s) => ({ ...s, [key]: value }));
    setDirty(true);
  }

  async function onSave() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await saveUiLabels({ data: { labels } });
      if (res.ok) {
        setLabels(res.labels);
        clearUiLabelsCache();
        setDirty(false);
        setMsg("Labels saved. Refresh customer pages to see new names.");
      } else {
        setMsg("Save failed");
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function onReset() {
    setLabels({ ...DEFAULT_UI_LABELS });
    setDirty(true);
    setMsg("Defaults loaded — click Save to apply.");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Card>
        <CardHead className="flex items-center gap-2">
          <Tags className="h-4 w-4 text-accent" />
          <span>UI labels</span>
        </CardHead>
        <CardContent className="space-y-6">
          <p className="text-sm text-muted">
            Rename modules and cover chips without a code deploy. Stored in{" "}
            <code className="text-fg">data/rpma-settings.json</code>. URLs stay
            the same (e.g. <code className="text-fg">/ams</code>,{" "}
            <code className="text-fg">/rmm</code>).
          </p>

          {groups.map(([group, fields]) => (
            <div key={group} className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
                {group}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {fields.map((f) => (
                  <label key={f.key} className="block space-y-1">
                    <span className="text-sm font-medium text-fg">{f.label}</span>
                    <input
                      className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-accent"
                      value={labels[f.key]}
                      maxLength={80}
                      onChange={(e) => setField(f.key, e.target.value)}
                    />
                    <span className="block text-[11px] text-muted">{f.help}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}

          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
            <Button type="button" disabled={busy || !dirty} onClick={() => void onSave()}>
              <Save className="mr-1.5 h-4 w-4" />
              Save labels
            </Button>
            <Button type="button" variant="secondary" disabled={busy} onClick={onReset}>
              <RotateCcw className="mr-1.5 h-4 w-4" />
              Reset to defaults
            </Button>
            {msg ? (
              <span className="text-sm text-muted">{msg}</span>
            ) : dirty ? (
              <span className="text-sm text-amber-600">Unsaved changes</span>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHead>Live preview</CardHead>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {[
              labels.ecosystem,
              labels.syspro,
              labels.rmm,
              labels.cove,
              labels.epp,
              labels.csp,
              labels.assurePack,
            ].map((name) => (
              <span
                key={name}
                className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-fg"
              >
                {name}
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">
            Cover: <strong className="text-fg">{labels.servicesOnCover}</strong> · chips use{" "}
            <strong className="text-fg">{labels.coverOn}</strong> /{" "}
            <strong className="text-fg">{labels.noCover}</strong>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
