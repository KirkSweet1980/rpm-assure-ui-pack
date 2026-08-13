/** CSS custom-property catalog for RPM Assure theming. */

export type TokenGroupId =
  | "brand"
  | "surface"
  | "ink"
  | "frame"
  | "nav"
  | "accent"
  | "selected"
  | "rag"
  | "chart";

export type TokenDef = {
  css: string;
  label: string;
  group: TokenGroupId;
  kind: "color" | "size";
  used: string;
};

export const TOKEN_GROUPS: { id: TokenGroupId; title: string; blurb: string }[] =
  [
    { id: "brand", title: "Brand", blurb: "Fixed RPM palette. Rarely override." },
    { id: "surface", title: "Surfaces", blurb: "Page, cards, raised panels." },
    { id: "ink", title: "Ink", blurb: "Text steps: body, muted, subtle." },
    { id: "frame", title: "Frames", blurb: "Borders and stroke weight." },
    { id: "nav", title: "Top nav", blurb: "Navy bar behind Exco / Reports." },
    { id: "accent", title: "Accent", blurb: "Focus rings, links, teal brand." },
    { id: "selected", title: "Selected chrome", blurb: "Active tab / nav chip." },
    { id: "rag", title: "RAG", blurb: "Health only — not decoration." },
    { id: "chart", title: "Charts", blurb: "Series colours on Exco." },
  ];

export const THEME_TOKENS: TokenDef[] = [
  { css: "--color-brand-blue", label: "Brand navy", group: "brand", kind: "color", used: "Header bar, logo-adjacent chrome" },
  { css: "--color-brand-blue-deep", label: "Brand deep", group: "brand", kind: "color", used: "Utility strip, active nav fill" },
  { css: "--color-brand-teal", label: "Logo steel", group: "brand", kind: "color", used: "Mark, primary buttons, chart 1" },
  { css: "--color-brand-lime", label: "Light steel", group: "brand", kind: "color", used: "Kickers, active underline" },
  { css: "--color-brand-cyan", label: "Cyan", group: "brand", kind: "color", used: "Reserved highlight" },

  { css: "--color-bg", label: "Page", group: "surface", kind: "color", used: "body, .antler-shell, main canvas" },
  { css: "--color-surface", label: "Card", group: "surface", kind: "color", used: ".rpma-card, settings cards" },
  { css: "--color-surface-2", label: "Raised", group: "surface", kind: "color", used: "Hero, raised tiles" },
  { css: "--color-card-head", label: "Card head", group: "surface", kind: "color", used: "Panel headers" },

  { css: "--color-fg", label: "Body", group: "ink", kind: "color", used: "Headings and primary type" },
  { css: "--color-muted", label: "Muted", group: "ink", kind: "color", used: "Subtitles, helper text" },
  { css: "--color-subtle", label: "Subtle", group: "ink", kind: "color", used: "Meta, timestamps" },

  { css: "--color-border", label: "Hairline", group: "frame", kind: "color", used: "Card edges, table rules" },
  { css: "--color-border-strong", label: "Panel", group: "frame", kind: "color", used: "Strong frames" },
  { css: "--ui-stroke", label: "Stroke", group: "frame", kind: "size", used: "Border width token" },

  { css: "--color-nav", label: "Nav", group: "nav", kind: "color", used: "Top header background" },
  { css: "--color-nav-deep", label: "Nav deep", group: "nav", kind: "color", used: "Header gradient end" },
  { css: "--color-nav-fg", label: "Nav type", group: "nav", kind: "color", used: "EcoSystem / Reporting labels" },

  { css: "--color-accent", label: "Accent", group: "accent", kind: "color", used: "Focus rings, links, Client Area" },
  { css: "--color-accent-soft", label: "Accent soft", group: "accent", kind: "color", used: "Selection wash" },
  { css: "--color-accent-fg", label: "Accent type", group: "accent", kind: "color", used: "Type on accent buttons" },

  { css: "--ui-tab-active-bg", label: "Tab fill", group: "selected", kind: "color", used: "Active module / tab fill" },
  { css: "--ui-tab-active-fg", label: "Tab type", group: "selected", kind: "color", used: "Active tab label" },
  { css: "--ui-tab-active-border", label: "Tab edge", group: "selected", kind: "color", used: "Active tab border" },
  { css: "--ui-tab-active-bar", label: "Tab bar", group: "selected", kind: "color", used: "Pillar underline" },
  { css: "--ui-nav-link-active-bg", label: "Nav chip", group: "selected", kind: "color", used: "EcoSystem selected chip" },
  { css: "--ui-nav-link-active-border", label: "Nav chip edge", group: "selected", kind: "color", used: "Selected chip border" },
  { css: "--ui-nav-link-active-fg", label: "Nav chip type", group: "selected", kind: "color", used: "Selected chip text" },

  { css: "--color-rag-green", label: "Green", group: "rag", kind: "color", used: "Health only — not chrome" },
  { css: "--color-rag-green-bg", label: "Green wash", group: "rag", kind: "color", used: "Green badge background" },
  { css: "--color-rag-amber", label: "Amber", group: "rag", kind: "color", used: "Health / cover-off dots" },
  { css: "--color-rag-amber-bg", label: "Amber wash", group: "rag", kind: "color", used: "Amber badge background" },
  { css: "--color-rag-red", label: "Red", group: "rag", kind: "color", used: "Health / critical" },
  { css: "--color-rag-red-bg", label: "Red wash", group: "rag", kind: "color", used: "Red badge background" },

  { css: "--color-chart-1", label: "Series 1", group: "chart", kind: "color", used: "Donut / line primary" },
  { css: "--color-chart-2", label: "Series 2", group: "chart", kind: "color", used: "Second series" },
  { css: "--color-chart-3", label: "Series 3", group: "chart", kind: "color", used: "Third series" },
  { css: "--color-chart-4", label: "Series 4", group: "chart", kind: "color", used: "Amber series" },
  { css: "--color-chart-5", label: "Series 5", group: "chart", kind: "color", used: "Red series" },
];

export type PaletteId = "slate" | "trader" | "ocean" | "teal" | "ink" | "contrast" | "lime" | "dusk";

export const PALETTES: Record<
  PaletteId,
  {
    name: string;
    blurb: string;
    light: Record<string, string>;
    dark: Record<string, string>;
  }
> = {
  slate: {
    name: "DayNight",
    blurb: "TemplateMo 608 — Snow / Carbon, sky #38BDF8.",
    light: {
      "--color-bg": "#F8FAFC",
      "--color-surface": "#FFFFFF",
      "--color-surface-2": "#F1F5F9",
      "--color-fg": "#1E293B",
      "--color-muted": "#64748B",
      "--color-subtle": "#94A3B8",
      "--color-border": "#E2E8F0",
      "--color-border-strong": "#CBD5E1",
      "--color-nav": "#FFFFFF",
      "--color-nav-deep": "#F8FAFC",
      "--color-nav-fg": "#1E293B",
      "--color-accent": "#38BDF8",
      "--color-accent-soft": "rgba(56, 189, 248, 0.1)",
      "--color-accent-fg": "#ffffff",
      "--color-card-head": "#F8FAFC",
      "--color-chart-1": "#38BDF8",
      "--color-chart-2": "#22C55E",
      "--color-chart-3": "#64748B",
      "--color-chart-4": "#F59E0B",
      "--color-chart-5": "#EF4444",
      "--ui-tab-active-bg": "#38BDF8",
      "--ui-tab-active-fg": "#ffffff",
      "--ui-tab-active-border": "#0EA5E9",
      "--ui-tab-active-bar": "#38BDF8",
      "--ui-nav-link-active-bg": "rgba(56, 189, 248, 0.1)",
      "--ui-nav-link-active-border": "#38BDF8",
      "--ui-nav-link-active-fg": "#0EA5E9",
    },
    dark: {
      "--color-bg": "#171717",
      "--color-surface": "#0F0F0F",
      "--color-surface-2": "#1F1F1F",
      "--color-fg": "#F5F5F5",
      "--color-muted": "#A3A3A3",
      "--color-subtle": "#737373",
      "--color-border": "#2E2E2E",
      "--color-border-strong": "#3F3F3F",
      "--color-nav": "#0F0F0F",
      "--color-nav-deep": "#171717",
      "--color-nav-fg": "#F5F5F5",
      "--color-accent": "#38BDF8",
      "--color-accent-soft": "rgba(56, 189, 248, 0.15)",
      "--color-accent-fg": "#0F0F0F",
      "--color-card-head": "#1F1F1F",
      "--color-chart-1": "#38BDF8",
      "--color-chart-2": "#22C55E",
      "--color-chart-3": "#A3A3A3",
      "--color-chart-4": "#F59E0B",
      "--color-chart-5": "#EF4444",
      "--ui-tab-active-bg": "#38BDF8",
      "--ui-tab-active-fg": "#0F0F0F",
      "--ui-tab-active-border": "#38BDF8",
      "--ui-tab-active-bar": "#38BDF8",
      "--ui-nav-link-active-bg": "rgba(56, 189, 248, 0.15)",
      "--ui-nav-link-active-border": "#38BDF8",
      "--ui-nav-link-active-fg": "#7DD3FC",
    },
  },
  trader: {
    name: "Bitcoin Trader",
    blurb: "Wix Bitcoin Trader (Dark) — black, gold, BTC orange.",
    light: {
      "--color-bg": "#f4efe4",
      "--color-surface": "#fffaf0",
      "--color-surface-2": "#ebe4d2",
      "--color-fg": "#14110c",
      "--color-muted": "#5c5346",
      "--color-subtle": "#8a7d68",
      "--color-border": "#d9d0bc",
      "--color-border-strong": "#c4a35a",
      "--color-nav": "#111111",
      "--color-nav-deep": "#0a0a0a",
      "--color-nav-fg": "#f4efe4",
      "--color-accent": "#f7931a",
      "--color-accent-soft": "#f7931a26",
      "--color-accent-fg": "#14110c",
      "--color-card-head": "#ebe4d2",
      "--color-chart-1": "#f7931a",
      "--color-chart-2": "#c4a35a",
      "--color-chart-3": "#e8d9a8",
      "--ui-tab-active-bg": "#f7931a",
      "--ui-tab-active-fg": "#14110c",
      "--ui-tab-active-border": "#c4a35a",
      "--ui-tab-active-bar": "#f7931a",
      "--ui-nav-link-active-bg": "#f7931a",
      "--ui-nav-link-active-border": "#f7931a",
      "--ui-nav-link-active-fg": "#14110c",
    },
    dark: {
      "--color-bg": "#0c0c0c",
      "--color-surface": "#161616",
      "--color-surface-2": "#1c1c1c",
      "--color-fg": "#f4efe4",
      "--color-muted": "#a39880",
      "--color-subtle": "#7a7160",
      "--color-border": "#2a261c",
      "--color-border-strong": "#c4a35a",
      "--color-nav": "#111111",
      "--color-nav-deep": "#0a0a0a",
      "--color-nav-fg": "#f4efe4",
      "--color-accent": "#f7931a",
      "--color-accent-soft": "#f7931a26",
      "--color-accent-fg": "#14110c",
      "--color-card-head": "#1c1c1c",
      "--color-chart-1": "#f7931a",
      "--color-chart-2": "#c4a35a",
      "--color-chart-3": "#e8d9a8",
      "--ui-tab-active-bg": "#f7931a",
      "--ui-tab-active-fg": "#14110c",
      "--ui-tab-active-border": "#c4a35a",
      "--ui-tab-active-bar": "#f7931a",
      "--ui-nav-link-active-bg": "#f7931a",
      "--ui-nav-link-active-border": "#f7931a",
      "--ui-nav-link-active-fg": "#14110c",
    },
  },
  ocean: {
    name: "RPM logo",
    blurb: "Homepage navy #1F4D74 and steel #4478A4.",
    light: {
      "--color-accent": "#4478A4",
      "--color-accent-soft": "#4478A433",
      "--color-accent-fg": "#ffffff",
      "--ui-tab-active-bg": "#1F4D74",
      "--ui-tab-active-fg": "#ffffff",
      "--ui-tab-active-border": "#4478A4",
      "--ui-tab-active-bar": "#739abb",
      "--ui-nav-link-active-bg": "#14324c",
      "--ui-nav-link-active-border": "#4478A4",
      "--ui-nav-link-active-fg": "#ffffff",
    },
    dark: {
      "--color-accent": "#4478A4",
      "--color-accent-soft": "#4478A433",
      "--color-accent-fg": "#ffffff",
      "--ui-tab-active-bg": "#1F4D74",
      "--ui-tab-active-fg": "#ffffff",
      "--ui-tab-active-border": "#4478A4",
      "--ui-tab-active-bar": "#739abb",
      "--ui-nav-link-active-bg": "#14324c",
      "--ui-nav-link-active-border": "#4478A4",
      "--ui-nav-link-active-fg": "#ffffff",
    },
  },
  teal: {
    name: "Teal",
    blurb: "Original RPM teal accent and mint selected tabs.",
    light: {
      "--color-accent": "#1bb8a6",
      "--color-accent-soft": "#1bb8a61f",
      "--color-accent-fg": "#ffffff",
      "--ui-tab-active-bg": "#d8f4ef",
      "--ui-tab-active-fg": "#0d3d36",
      "--ui-tab-active-border": "#1bb8a6",
      "--ui-tab-active-bar": "#1bb8a6",
      "--ui-nav-link-active-bg": "#1bb8a6",
      "--ui-nav-link-active-border": "#8fce4a",
      "--ui-nav-link-active-fg": "#04201c",
    },
    dark: {
      "--color-accent": "#3ecfbf",
      "--color-accent-soft": "#3ecfbf28",
      "--color-accent-fg": "#04201c",
      "--ui-tab-active-bg": "#12362f",
      "--ui-tab-active-fg": "#e8f7f4",
      "--ui-tab-active-border": "#3ecfbf",
      "--ui-tab-active-bar": "#3ecfbf",
      "--ui-nav-link-active-bg": "#1bb8a6",
      "--ui-nav-link-active-border": "#8fce4a",
      "--ui-nav-link-active-fg": "#04201c",
    },
  },
  ink: {
    name: "Ink",
    blurb: "Near-neutral selected chrome. Colour only on RAG.",
    light: {
      "--color-accent": "#1a4d7a",
      "--color-accent-soft": "#1a4d7a18",
      "--color-accent-fg": "#ffffff",
      "--ui-tab-active-bg": "#e8eef3",
      "--ui-tab-active-fg": "#12293c",
      "--ui-tab-active-border": "#8aa6bc",
      "--ui-tab-active-bar": "#1a4d7a",
      "--ui-nav-link-active-bg": "#0a1628",
      "--ui-nav-link-active-border": "#8aa6bc",
      "--ui-nav-link-active-fg": "#f0faf8",
    },
    dark: {
      "--color-accent": "#8aa6bc",
      "--color-accent-soft": "#8aa6bc22",
      "--color-accent-fg": "#0a1219",
      "--ui-tab-active-bg": "#1a2430",
      "--ui-tab-active-fg": "#e6eef5",
      "--ui-tab-active-border": "#4a6580",
      "--ui-tab-active-bar": "#8aa6bc",
      "--ui-nav-link-active-bg": "#0a1628",
      "--ui-nav-link-active-border": "#8aa6bc",
      "--ui-nav-link-active-fg": "#f0faf8",
    },
  },
  contrast: {
    name: "High contrast",
    blurb: "Heavier frames, darker ink, ice selected edge.",
    light: {
      "--color-fg": "#0a1620",
      "--color-muted": "#243848",
      "--color-border": "#7a97ad",
      "--color-border-strong": "#4d6b82",
      "--color-accent": "#163f68",
      "--color-accent-soft": "#163f6822",
      "--ui-tab-active-bg": "#c5daf0",
      "--ui-tab-active-fg": "#0a1628",
      "--ui-tab-active-border": "#163f68",
      "--ui-tab-active-bar": "#163f68",
      "--ui-nav-link-active-bg": "#163f68",
      "--ui-nav-link-active-border": "#ffffff",
      "--ui-nav-link-active-fg": "#ffffff",
      "--ui-stroke": "2px",
    },
    dark: {
      "--color-fg": "#f4f8fc",
      "--color-muted": "#c5d4e0",
      "--color-border": "#6a849c",
      "--color-border-strong": "#8aa6bc",
      "--color-accent": "#8ec5f0",
      "--color-accent-soft": "#8ec5f028",
      "--ui-tab-active-bg": "#0f2740",
      "--ui-tab-active-fg": "#f4f8fc",
      "--ui-tab-active-border": "#8ec5f0",
      "--ui-tab-active-bar": "#8ec5f0",
      "--ui-nav-link-active-bg": "#2b6fae",
      "--ui-nav-link-active-border": "#ffffff",
      "--ui-nav-link-active-fg": "#ffffff",
      "--ui-stroke": "2px",
    },
  },
  lime: {
    name: "Lime",
    blurb: "Highest energy. War-room lime selected chip.",
    light: {
      "--color-accent": "#5ea01e",
      "--color-accent-soft": "#8fce4a24",
      "--color-accent-fg": "#14300a",
      "--ui-tab-active-bg": "#eaf7d4",
      "--ui-tab-active-fg": "#14300a",
      "--ui-tab-active-border": "#5ea01e",
      "--ui-tab-active-bar": "#8fce4a",
      "--ui-nav-link-active-bg": "#8fce4a",
      "--ui-nav-link-active-border": "#d4f0a8",
      "--ui-nav-link-active-fg": "#14300a",
    },
    dark: {
      "--color-accent": "#8fce4a",
      "--color-accent-soft": "#8fce4a28",
      "--color-accent-fg": "#14300a",
      "--ui-tab-active-bg": "#3d6b12",
      "--ui-tab-active-fg": "#eaf7d4",
      "--ui-tab-active-border": "#8fce4a",
      "--ui-tab-active-bar": "#8fce4a",
      "--ui-nav-link-active-bg": "#8fce4a",
      "--ui-nav-link-active-border": "#d4f0a8",
      "--ui-nav-link-active-fg": "#14300a",
    },
  },
  dusk: {
    name: "Dusk",
    blurb: "Slate-violet. Off the blue family.",
    light: {
      "--color-accent": "#5b4b8a",
      "--color-accent-soft": "#5b4b8a22",
      "--color-accent-fg": "#ffffff",
      "--ui-tab-active-bg": "#ece6f7",
      "--ui-tab-active-fg": "#2a2044",
      "--ui-tab-active-border": "#5b4b8a",
      "--ui-tab-active-bar": "#5b4b8a",
      "--ui-nav-link-active-bg": "#5b4b8a",
      "--ui-nav-link-active-border": "#c4b5e8",
      "--ui-nav-link-active-fg": "#f4f0ff",
    },
    dark: {
      "--color-accent": "#c4b5e8",
      "--color-accent-soft": "#c4b5e828",
      "--color-accent-fg": "#1a1426",
      "--ui-tab-active-bg": "#3d3260",
      "--ui-tab-active-fg": "#f4f0ff",
      "--ui-tab-active-border": "#c4b5e8",
      "--ui-tab-active-bar": "#c4b5e8",
      "--ui-nav-link-active-bg": "#5b4b8a",
      "--ui-nav-link-active-border": "#c4b5e8",
      "--ui-nav-link-active-fg": "#f4f0ff",
    },
  },
};

const PALETTE_KEY = "rpma-palette";
const OVERRIDE_KEYS = new Set(
  Object.values(PALETTES).flatMap((p) => [
    ...Object.keys(p.light),
    ...Object.keys(p.dark),
  ]),
);

export function readPalette(): PaletteId {
  if (typeof window === "undefined") return "slate";
  try {
    const v = localStorage.getItem(PALETTE_KEY);
    if (v === "slate" || v === "trader" || v === "ocean" || v === "teal" || v === "ink" || v === "contrast" || v === "lime" || v === "dusk") return v;
  } catch {
    /* ignore */
  }
  return "slate";
}

export function clearPaletteOverrides() {
  if (typeof document === "undefined") return;
  OVERRIDE_KEYS.forEach((k) => {
    document.documentElement.style.removeProperty(k);
  });
}

export function applyPalette(id: PaletteId, mode: "light" | "dark") {
  if (typeof document === "undefined") return;
  clearPaletteOverrides();
  const map = PALETTES[id][mode];
  Object.entries(map).forEach(([k, v]) => {
    document.documentElement.style.setProperty(k, v);
  });
}

export function persistPalette(id: PaletteId, mode: "light" | "dark") {
  applyPalette(id, mode);
  try {
    localStorage.setItem(PALETTE_KEY, id);
  } catch {
    /* ignore */
  }
}

export function readComputedToken(cssVar: string): string {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
}
