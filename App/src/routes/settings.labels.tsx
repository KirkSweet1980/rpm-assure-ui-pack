import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RotateCcw, Save, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfigPageHead } from "@/components/settings/config-page";
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
    setLabels({ ...DEFAULT_UI_LABELS, ...((b as { labels?: Partial<UiLabelsConfig> }).labels ?? {}) });
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
    <div className="space-y-6">
      <ConfigPageHead
        title="UI Labels"
        icon={Tags}
        actions={
          <>
            <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={onReset}>
              <RotateCcw className="size-3.5" />
              Reset
            </Button>
            <Button type="button" size="sm" disabled={busy || !dirty} onClick={() => void onSave()}>
              <Save className="size-3.5" />
              Save
            </Button>
          </>
        }
      />
      {msg ? <p className="text-[12px] text-muted">{msg}</p> : null}

      {groups.map(([group, fields]) => (
        <section key={group} className="rpma-panel overflow-hidden p-0">
          <div className="px-4 py-3">
            <h2 className="text-[16px] font-extrabold text-fg">{group}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="rpma-xls">
              <thead>
                <tr>
                  <th>Label</th>
                  <th>Value</th>
                  <th>Used For</th>
                </tr>
              </thead>
              <tbody>
                {fields.map((f) => (
                  <tr key={f.key}>
                    <td>{f.label}</td>
                    <td>
                      <input
                        className="w-full border-0 bg-transparent px-0 py-0 text-[12px] text-fg outline-none"
                        value={labels[f.key]}
                        maxLength={80}
                        onChange={(e) => setField(f.key, e.target.value)}
                      />
                    </td>
                    <td>{f.help}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <section className="rpma-panel overflow-hidden p-0">
        <div className="px-4 py-3">
          <h2 className="text-[16px] font-extrabold text-fg">Live Preview</h2>
        </div>
        <div className="flex flex-wrap gap-1.5 px-4 pb-4">
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
              className="inline-flex items-center rounded-md bg-rag-green/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rag-green"
            >
              {name}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
