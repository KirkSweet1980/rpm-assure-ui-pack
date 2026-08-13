import { useCallback, useEffect, useState } from "react";
import { fetchSettingsBundle } from "@/lib/settings/settings-api";
import { DEFAULT_DASHBOARD, type DashboardConfig } from "@/lib/settings/types";

const CACHE_KEY = "rpma_dashboard_cfg_v1";
const TTL_MS = 30_000;

function readCache(): DashboardConfig | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const box = JSON.parse(raw) as { at: number; data: DashboardConfig };
    if (!box?.at || Date.now() - box.at > TTL_MS) return null;
    return { ...DEFAULT_DASHBOARD, ...box.data };
  } catch {
    return null;
  }
}

function writeCache(data: DashboardConfig) {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data }));
  } catch {
    /* */
  }
}

/** Client hook — estate / customer pages read dashboard layout from settings. */
export function useDashboardConfig(): {
  dashboard: DashboardConfig;
  loading: boolean;
  reload: () => void;
} {
  const cached = readCache();
  const [dashboard, setDashboard] = useState<DashboardConfig>(
    cached ?? { ...DEFAULT_DASHBOARD },
  );
  const [loading, setLoading] = useState(!cached);

  const load = useCallback(async () => {
    try {
      const b = await fetchSettingsBundle();
      const next = { ...DEFAULT_DASHBOARD, ...(b.dashboard ?? {}) };
      setDashboard(next);
      writeCache(next);
    } catch {
      /* keep defaults / cache */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    dashboard,
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

export function clearDashboardConfigCache() {
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch {
    /* */
  }
}
