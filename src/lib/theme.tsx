import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { applyMenuStyle, readMenuStyle } from "@/lib/nav/menu-style";
import { applyFontPack, readFontPack } from "@/lib/font-pack";
import { applyPalette, readPalette } from "@/lib/theme-tokens";

/** User preference: light, dark, or follow OS */
export type ThemePreference = "light" | "dark" | "auto";
/** Resolved paint mode after applying auto */
export type ThemeMode = "light" | "dark";

const STORAGE_KEY = "rpma-theme";
const DAYNIGHT_KEY = "daynight-theme";

type ThemeContextValue = {
  preference: ThemePreference;
  theme: ThemeMode;
  setPreference: (t: ThemePreference) => void;
  setTheme: (t: ThemeMode) => void;
  toggle: () => void;
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function readStoredPreference(): ThemePreference {
  if (typeof window === "undefined") return "dark";
  try {
    const dn = localStorage.getItem(DAYNIGHT_KEY);
    if (dn === "carbon") return "dark";
    if (dn === "snow") return "light";
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "auto") return v;
    if (v === "system") return "auto";
  } catch {
    /* ignore */
  }
  return "dark";
}

function resolve(pref: ThemePreference): ThemeMode {
  if (pref === "auto") return systemPrefersDark() ? "dark" : "light";
  return pref;
}

/** TemplateMo 608: Carbon = html.carbon + body.carbon. Snow = classes removed. */
function applyDom(mode: ThemeMode) {
  const root = document.documentElement;
  const body = document.body;
  root.dataset.theme = mode;
  root.style.colorScheme = mode;
  root.classList.toggle("dark", mode === "dark");
  root.classList.toggle("carbon", mode === "dark");
  root.classList.toggle("snow", mode === "light");
  if (body) {
    body.classList.toggle("carbon", mode === "dark");
    body.classList.toggle("snow", mode === "light");
  }
  try {
    localStorage.setItem(DAYNIGHT_KEY, mode === "dark" ? "carbon" : "snow");
  } catch {
    /* ignore */
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>("dark");
  const [theme, setThemeResolved] = useState<ThemeMode>("dark");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const pref = readStoredPreference();
    setPreferenceState(pref);
    const mode = resolve(pref);
    setThemeResolved(mode);
    applyDom(mode);
    applyMenuStyle(readMenuStyle());
    applyFontPack(readFontPack());
    applyPalette(readPalette(), mode);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (preference === "auto") {
        const mode = resolve("auto");
        setThemeResolved(mode);
        applyDom(mode);
        applyPalette(readPalette(), mode);
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [preference, ready]);

  useEffect(() => {
    if (!ready) return;
    const mode = resolve(preference);
    setThemeResolved(mode);
    applyDom(mode);
    applyPalette(readPalette(), mode);
    try {
      localStorage.setItem(STORAGE_KEY, preference);
    } catch {
      /* ignore */
    }
  }, [preference, ready]);

  const setPreference = useCallback((t: ThemePreference) => {
    setPreferenceState(t);
  }, []);

  const setTheme = useCallback((t: ThemeMode) => {
    setPreferenceState(t);
  }, []);

  const toggle = useCallback(() => {
    setPreferenceState((p) => {
      const current = resolve(p);
      return current === "light" ? "dark" : "light";
    });
  }, []);

  const value = useMemo(
    () => ({
      preference,
      theme,
      setPreference,
      setTheme,
      toggle,
      isDark: theme === "dark",
    }),
    [preference, theme, setPreference, setTheme, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      preference: "auto" as ThemePreference,
      theme: "light" as ThemeMode,
      setPreference: (_: ThemePreference) => {},
      setTheme: (_: ThemeMode) => {},
      toggle: () => {},
      isDark: false,
    };
  }
  return ctx;
}
