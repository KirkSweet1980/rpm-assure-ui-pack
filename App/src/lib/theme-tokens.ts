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
  { css: "--color-brand-slate", label: "Logo slate", group: "brand", kind: "color", used: "R in RPM, left of wordmark and Sign in" },
  { css: "--color-brand-teal", label: "Logo teal", group: "brand", kind: "color", used: "P in RPM, accent, mark, charts" },
  { css: "--color-brand-lime", label: "Logo lime", group: "brand", kind: "color", used: "M in RPM, kickers, selected chip edge" },
  { css: "--color-brand-ink", label: "Brand ink", group: "brand", kind: "color", used: "Login field text" },
  { css: "--color-field", label: "Field fill", group: "surface", kind: "color", used: "Username / password fill" },

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

export type PaletteId =
  | "slate"
  | "trader"
  | "ocean"
  | "teal"
  | "ink"
  | "contrast"
  | "lime"
  | "dusk"
  | "coastal"
  | "porcelain"
  | "sage"
  | "apricot"
  | "glacier";

export const PALETTE_IDS: PaletteId[] = [
  "slate",
  "trader",
  "ocean",
  "teal",
  "ink",
  "contrast",
  "lime",
  "dusk",
  "coastal",
  "porcelain",
  "sage",
  "apricot",
  "glacier",
];

export const PASTEL_IDS: PaletteId[] = [
  "coastal",
  "porcelain",
  "sage",
  "apricot",
  "glacier",
];

export type UiTemplateId = PaletteId;

export const UI_TEMPLATES: {
  id: PaletteId;
  name: string;
  blurb: string;
  theme: "light" | "dark" | "auto";
  density: "comfortable" | "compact";
}[] = [
  { id: "ink", name: "RPM Navy", blurb: "Boardroom navy. Default for EXCO screens.", theme: "dark", density: "comfortable" },
  { id: "slate", name: "Daylight", blurb: "Snow canvas, sky accent. Daytime ops.", theme: "light", density: "comfortable" },
  { id: "ocean", name: "RPM logo", blurb: "Brand teal / lime on a light hall.", theme: "light", density: "comfortable" },
  { id: "teal", name: "Teal ops", blurb: "Teal chrome, compact tables.", theme: "dark", density: "compact" },
  { id: "trader", name: "Bitcoin Trader", blurb: "High-contrast trading desk.", theme: "dark", density: "compact" },
  { id: "contrast", name: "High contrast", blurb: "Accessible ink on paper.", theme: "light", density: "comfortable" },
  { id: "lime", name: "Lime", blurb: "RPM lime kickers.", theme: "dark", density: "comfortable" },
  { id: "dusk", name: "Dusk", blurb: "Warm evening palette.", theme: "dark", density: "comfortable" },
  { id: "coastal", name: "Coastal Mist", blurb: "Pastel teal / powder / sand. Light and dark.", theme: "auto", density: "comfortable" },
  { id: "porcelain", name: "Porcelain Navy", blurb: "Lilac and blush on slate navy.", theme: "auto", density: "comfortable" },
  { id: "sage", name: "Sage Ledger", blurb: "Sage, cream, muted gold — assurance.", theme: "auto", density: "comfortable" },
  { id: "apricot", name: "Apricot Fog", blurb: "Warm white, apricot, baby blue.", theme: "auto", density: "comfortable" },
  { id: "glacier", name: "Glacier", blurb: "Ice aqua, sky, pale violet.", theme: "auto", density: "comfortable" },
];

type PastelFace = {
  bg: string;
  surface: string;
  surface2: string;
  fg: string;
  muted: string;
  subtle: string;
  border: string;
  borderStrong: string;
  nav: string;
  navDeep: string;
  navFg: string;
  rail: string;
  railFg: string;
  pane: string;
  paneFg: string;
  accent: string;
  accentFg: string;
  sel: string;
  selFg: string;
  hover: string;
  hoverFg: string;
  chart1: string;
  chart2: string;
  chart3: string;
};

function pastelFace(f: PastelFace): Record<string, string> {
  return {
    "--color-bg": f.bg,
    "--color-surface": f.surface,
    "--color-surface-2": f.surface2,
    "--color-fg": f.fg,
    "--color-muted": f.muted,
    "--color-subtle": f.subtle,
    "--color-border": f.border,
    "--color-border-strong": f.borderStrong,
    "--color-nav": f.nav,
    "--color-nav-deep": f.navDeep,
    "--color-nav-fg": f.navFg,
    "--color-accent": f.accent,
    "--color-accent-soft": `${f.accent}26`,
    "--color-accent-fg": f.accentFg,
    "--color-card-head": f.surface2,
    "--color-chart-1": f.chart1,
    "--color-chart-2": f.chart2,
    "--color-chart-3": f.chart3,
    "--color-chart-4": "#F59E0B",
    "--color-chart-5": "#EF4444",
    "--ui-tab-active-bg": f.sel,
    "--ui-tab-active-fg": f.selFg,
    "--ui-tab-active-border": f.accent,
    "--ui-tab-active-bar": f.accent,
    "--ui-nav-link-active-bg": f.sel,
    "--ui-nav-link-active-border": f.accent,
    "--ui-nav-link-active-fg": f.selFg,
    "--nav-bg": f.nav,
    "--nav-fg": f.navFg,
    "--nav-hover-bg": f.hover,
    "--nav-hover-fg": f.hoverFg,
    "--pane-bg": f.pane,
    "--pane-fg": f.paneFg,
    "--pane-muted": f.muted,
    "--pane-line": f.border,
    "--rail-mod-bg": f.rail,
    "--rail-mod-fg": f.railFg,
    "--page-bg": f.bg,
    "--sel-bg": f.sel,
    "--sel-fg": f.selFg,
    "--hover-bg": f.hover,
    "--hover-fg": f.hoverFg,
  };
}

function pastelPair(
  name: string,
  blurb: string,
  light: PastelFace,
  dark: PastelFace,
): { name: string; blurb: string; light: Record<string, string>; dark: Record<string, string> } {
  return { name, blurb, light: pastelFace(light), dark: pastelFace(dark) };
}

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
      "--color-brand-slate": "#2d6a8a",
      "--color-brand-teal": "#1bb8a6",
      "--color-brand-lime": "#8fce4a",
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
      "--color-brand-slate": "#2d6a8a",
      "--color-brand-teal": "#1bb8a6",
      "--color-brand-lime": "#8fce4a",
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
  coastal: pastelPair(
    "Coastal Mist",
    "Teal, powder blue, sand. Navy chrome.",
    {
      bg: "#E8F1F8",
      surface: "#FFFFFF",
      surface2: "#F4F8FC",
      fg: "#1B2838",
      muted: "#4A6074",
      subtle: "#7A90A4",
      border: "#C9D7E4",
      borderStrong: "#A8BDD0",
      nav: "#1B2838",
      navDeep: "#121820",
      navFg: "#F4F8FC",
      rail: "#5C7A96",
      railFg: "#F4F8FC",
      pane: "#FFFFFF",
      paneFg: "#1B2838",
      accent: "#5BB8AC",
      accentFg: "#0F2A28",
      sel: "#DBE7F5",
      selFg: "#1B2838",
      hover: "#C8ECD4",
      hoverFg: "#14301C",
      chart1: "#5BB8AC",
      chart2: "#7EB6F0",
      chart3: "#C4B5FD",
    },
    {
      bg: "#121820",
      surface: "#1B2430",
      surface2: "#243040",
      fg: "#E8F1F8",
      muted: "#9BB0C2",
      subtle: "#6E8498",
      border: "#2E3E50",
      borderStrong: "#3E5268",
      nav: "#0F1620",
      navDeep: "#0A1018",
      navFg: "#E8F1F8",
      rail: "#3D5670",
      railFg: "#E8F1F8",
      pane: "#1B2430",
      paneFg: "#E8F1F8",
      accent: "#7DD3C7",
      accentFg: "#0F2A28",
      sel: "#2A4058",
      selFg: "#E8F1F8",
      hover: "#2D4A3A",
      hoverFg: "#C8ECD4",
      chart1: "#7DD3C7",
      chart2: "#93C5FD",
      chart3: "#FDE68A",
    },
  ),
  porcelain: pastelPair(
    "Porcelain Navy",
    "Lilac and blush on slate navy.",
    {
      bg: "#EEF2F8",
      surface: "#FFFFFF",
      surface2: "#F6F4FB",
      fg: "#24344A",
      muted: "#5A6B82",
      subtle: "#8A97AA",
      border: "#D5DCE8",
      borderStrong: "#B8C3D6",
      nav: "#24344A",
      navDeep: "#1A2536",
      navFg: "#EEF2F8",
      rail: "#6B86A3",
      railFg: "#F6F8FC",
      pane: "#FFFFFF",
      paneFg: "#24344A",
      accent: "#8B7AD6",
      accentFg: "#FFFFFF",
      sel: "#EDE7FB",
      selFg: "#24344A",
      hover: "#F8D7EA",
      hoverFg: "#4A2040",
      chart1: "#8B7AD6",
      chart2: "#A5B4FC",
      chart3: "#F9A8D4",
    },
    {
      bg: "#161822",
      surface: "#1E2230",
      surface2: "#2A3044",
      fg: "#EEF2F8",
      muted: "#A8B4C8",
      subtle: "#7A869A",
      border: "#323848",
      borderStrong: "#444C60",
      nav: "#1A2030",
      navDeep: "#12161E",
      navFg: "#EEF2F8",
      rail: "#4A5F78",
      railFg: "#EEF2F8",
      pane: "#1E2230",
      paneFg: "#EEF2F8",
      accent: "#C4B5FD",
      accentFg: "#1A1426",
      sel: "#3A3260",
      selFg: "#EEF2F8",
      hover: "#4A3050",
      hoverFg: "#F9A8D4",
      chart1: "#C4B5FD",
      chart2: "#A5B4FC",
      chart3: "#F9A8D4",
    },
  ),
  sage: pastelPair(
    "Sage Ledger",
    "Sage, cream, muted gold — assurance.",
    {
      bg: "#F4F7F2",
      surface: "#FFFFFF",
      surface2: "#EAEFE6",
      fg: "#1F2A24",
      muted: "#4E6358",
      subtle: "#7A8F84",
      border: "#D4DDD4",
      borderStrong: "#B4C4B8",
      nav: "#1F2A24",
      navDeep: "#141C18",
      navFg: "#F4F7F2",
      rail: "#6B8F80",
      railFg: "#F4F7F2",
      pane: "#FFFFFF",
      paneFg: "#1F2A24",
      accent: "#5B9A78",
      accentFg: "#FFFFFF",
      sel: "#D8F3E4",
      selFg: "#1F2A24",
      hover: "#F5E8B8",
      hoverFg: "#3A3010",
      chart1: "#5B9A78",
      chart2: "#93C5FD",
      chart3: "#E8C96A",
    },
    {
      bg: "#141A16",
      surface: "#1C2420",
      surface2: "#26322C",
      fg: "#F4F7F2",
      muted: "#A3B8AC",
      subtle: "#738878",
      border: "#2C3A34",
      borderStrong: "#3E5048",
      nav: "#121814",
      navDeep: "#0C100E",
      navFg: "#F4F7F2",
      rail: "#4A6B5E",
      railFg: "#F4F7F2",
      pane: "#1C2420",
      paneFg: "#F4F7F2",
      accent: "#A7F3D0",
      accentFg: "#14301C",
      sel: "#2A4438",
      selFg: "#F4F7F2",
      hover: "#3A4830",
      hoverFg: "#FDE68A",
      chart1: "#A7F3D0",
      chart2: "#93C5FD",
      chart3: "#FDE68A",
    },
  ),
  apricot: pastelPair(
    "Apricot Fog",
    "Warm white, apricot, baby blue.",
    {
      bg: "#FFF7F0",
      surface: "#FFFFFF",
      surface2: "#F8EEE4",
      fg: "#2C3340",
      muted: "#5C6574",
      subtle: "#8A909C",
      border: "#E8DCD0",
      borderStrong: "#D4C4B4",
      nav: "#2C3340",
      navDeep: "#1E242E",
      navFg: "#FFF7F0",
      rail: "#7A8899",
      railFg: "#FFF7F0",
      pane: "#FFFFFF",
      paneFg: "#2C3340",
      accent: "#E8A090",
      accentFg: "#2C1814",
      sel: "#FFE4DC",
      selFg: "#2C3340",
      hover: "#DCEBFA",
      hoverFg: "#1E3048",
      chart1: "#E8A090",
      chart2: "#93C5FD",
      chart3: "#FDE68A",
    },
    {
      bg: "#1A1C20",
      surface: "#24262C",
      surface2: "#30343C",
      fg: "#FFF7F0",
      muted: "#B4B8C0",
      subtle: "#888C94",
      border: "#3A3E46",
      borderStrong: "#4C5058",
      nav: "#1E2228",
      navDeep: "#14161A",
      navFg: "#FFF7F0",
      rail: "#5A6575",
      railFg: "#FFF7F0",
      pane: "#24262C",
      paneFg: "#FFF7F0",
      accent: "#FECACA",
      accentFg: "#3A2018",
      sel: "#4A3840",
      selFg: "#FFF7F0",
      hover: "#3A4858",
      hoverFg: "#BFDBFE",
      chart1: "#FECACA",
      chart2: "#BFDBFE",
      chart3: "#FDE68A",
    },
  ),
  glacier: pastelPair(
    "Glacier",
    "Ice aqua, sky, pale violet.",
    {
      bg: "#F0F7FC",
      surface: "#FFFFFF",
      surface2: "#E4F0F8",
      fg: "#16324F",
      muted: "#4A6A84",
      subtle: "#7A96AC",
      border: "#C8DCE8",
      borderStrong: "#A8C4D8",
      nav: "#16324F",
      navDeep: "#0E2438",
      navFg: "#F0F7FC",
      rail: "#4E7A9A",
      railFg: "#F0F7FC",
      pane: "#FFFFFF",
      paneFg: "#16324F",
      accent: "#3DB8B0",
      accentFg: "#FFFFFF",
      sel: "#D4F5F0",
      selFg: "#16324F",
      hover: "#D6ECFA",
      hoverFg: "#16324F",
      chart1: "#3DB8B0",
      chart2: "#7EB6F0",
      chart3: "#C4B5FD",
    },
    {
      bg: "#0E1A28",
      surface: "#162433",
      surface2: "#1E3044",
      fg: "#F0F7FC",
      muted: "#9BB4C8",
      subtle: "#6E8AA0",
      border: "#243848",
      borderStrong: "#345068",
      nav: "#0C1824",
      navDeep: "#081018",
      navFg: "#F0F7FC",
      rail: "#3A5F7A",
      railFg: "#F0F7FC",
      pane: "#162433",
      paneFg: "#F0F7FC",
      accent: "#99F6E4",
      accentFg: "#0E2A28",
      sel: "#1E4858",
      selFg: "#F0F7FC",
      hover: "#2A3858",
      hoverFg: "#DDD6FE",
      chart1: "#99F6E4",
      chart2: "#BAE6FD",
      chart3: "#DDD6FE",
    },
  ),
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
    if (v && (PALETTE_IDS as string[]).includes(v)) return v as PaletteId;
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
  const pack = PALETTES[id];
  if (!pack) return;
  const map = pack[mode] ?? pack.light;
  Object.entries(map).forEach(([k, v]) => {
    document.documentElement.style.setProperty(k, v);
  });
  document.documentElement.dataset.palette = id;
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
