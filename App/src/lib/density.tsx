import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Density = "comfortable" | "compact";

const STORAGE_KEY = "rpma-density";

type DensityContextValue = {
  density: Density;
  setDensity: (d: Density) => void;
  toggle: () => void;
  isCompact: boolean;
};

const DensityContext = createContext<DensityContextValue | null>(null);

function readStored(): Density {
  if (typeof window === "undefined") return "compact";
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "comfortable" || v === "compact") return v;
  } catch {
    /* ignore */
  }
  // Desktop ops default: compact; narrow viewports: comfortable
  if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
    return "comfortable";
  }
  return "compact";
}

export function DensityProvider({ children }: { children: ReactNode }) {
  const [density, setDensityState] = useState<Density>("compact");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setDensityState(readStored());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.dataset.density = density;
    try {
      localStorage.setItem(STORAGE_KEY, density);
    } catch {
      /* ignore */
    }
  }, [density, ready]);

  const setDensity = useCallback((d: Density) => setDensityState(d), []);
  const toggle = useCallback(
    () => setDensityState((d) => (d === "compact" ? "comfortable" : "compact")),
    [],
  );

  const value = useMemo(
    () => ({
      density,
      setDensity,
      toggle,
      isCompact: density === "compact",
    }),
    [density, setDensity, toggle],
  );

  return <DensityContext.Provider value={value}>{children}</DensityContext.Provider>;
}

export function useDensity() {
  const ctx = useContext(DensityContext);
  if (!ctx) {
    return {
      density: "compact" as Density,
      setDensity: (_: Density) => {},
      toggle: () => {},
      isCompact: true,
    };
  }
  return ctx;
}
