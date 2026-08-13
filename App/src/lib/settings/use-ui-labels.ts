import { useCallback, useEffect, useState } from "react";
import { fetchSettingsBundle } from "@/lib/settings/settings-api";
import { DEFAULT_UI_LABELS, type UiLabelsConfig } from "@/lib/settings/types";

const CACHE_KEY = "rpma_ui_labels_v1";
const TTL_MS = 30_000;

function readCache(): UiLabelsConfig | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const box = JSON.parse(raw) as { at: number; data: UiLabelsConfig };
    if (!box?.at || Date.now() - box.at > TTL_MS) return null;
    return { ...DEFAULT_UI_LABELS, ...box.data };
  } catch {
    return null;
  }
}

function writeCache(data: UiLabelsConfig) {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data }));
  } catch {
    /* */
  }
}

/** Client hook — pillar / cover labels from settings (with defaults). */
export function useUiLabels(): {
  labels: UiLabelsConfig;
  loading: boolean;
  reload: () => void;
} {
  const cached = readCache();
  const [labels, setLabels] = useState<UiLabelsConfig>(
    cached ?? { ...DEFAULT_UI_LABELS },
  );
  const [loading, setLoading] = useState(!cached);

  const load = useCallback(async () => {
    try {
      const b = await fetchSettingsBundle();
      const next = { ...DEFAULT_UI_LABELS, ...((b as any).labels ?? {}) };
      setLabels(next);
      writeCache(next);
    } catch {
      /* keep defaults */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    labels,
    loading,
    reload: () => {
      try {
        sessionStorage.removeItem(CACHE_KEY);
      } catch {
        /* */
      }
      setLoading(true);
      void load();
    },
  };
}

export function clearUiLabelsCache() {
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch {
    /* */
  }
}
