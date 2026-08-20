export type FontPackId = "source" | "inter" | "plex" | "jakarta" | "nunito";

export type FontPack = {
  id: FontPackId;
  name: string;
  blurb: string;
  sans: string;
  display: string;
  mono: string;
};

export const FONT_PACKS: FontPack[] = [
  {
    id: "source",
    name: "Source Sans Pro",
    blurb: "Site default. Adobe UI — readable tables and menus.",
    sans: '"Source Sans 3", "Source Sans Pro", system-ui, sans-serif',
    display: '"Source Sans 3", "Source Sans Pro", system-ui, sans-serif',
    mono: '"Source Code Pro", ui-monospace, monospace',
  },
  {
    id: "inter",
    name: "Inter",
    blurb: "Neutral, tight, built for admin UI.",
    sans: '"Inter", system-ui, sans-serif',
    display: '"Inter", system-ui, sans-serif',
    mono: '"IBM Plex Mono", ui-monospace, monospace',
  },
  {
    id: "plex",
    name: "IBM Plex",
    blurb: "Ops / data. Strong figures, slightly technical.",
    sans: '"IBM Plex Sans", system-ui, sans-serif',
    display: '"IBM Plex Sans", system-ui, sans-serif',
    mono: '"IBM Plex Mono", ui-monospace, monospace',
  },
  {
    id: "jakarta",
    name: "Plus Jakarta",
    blurb: "Modern SaaS. Softer than Inter, still sharp headings.",
    sans: '"Plus Jakarta Sans", system-ui, sans-serif',
    display: '"Plus Jakarta Sans", system-ui, sans-serif',
    mono: '"IBM Plex Mono", ui-monospace, monospace',
  },
  {
    id: "nunito",
    name: "Nunito Sans",
    blurb: "Rounder and friendlier. Least “developer console”.",
    sans: '"Nunito Sans", system-ui, sans-serif',
    display: '"Nunito Sans", system-ui, sans-serif',
    mono: '"IBM Plex Mono", ui-monospace, monospace',
  },
];

const KEY = "rpma-font-pack";

export function readFontPack(): FontPackId {
  if (typeof window === "undefined") return "source";
  try {
    const v = localStorage.getItem(KEY);
    if (FONT_PACKS.some((p) => p.id === v)) return v as FontPackId;
  } catch {
    /* */
  }
  return "source";
}

export function applyFontPack(id: FontPackId) {
  const pack = FONT_PACKS.find((p) => p.id === id) ?? FONT_PACKS[0];
  const r = document.documentElement;
  r.style.setProperty("--font-sans", pack.sans);
  r.style.setProperty("--font-display", pack.display);
  r.style.setProperty("--font-mono", pack.mono);
  r.dataset.font = pack.id;
}

export function persistFontPack(id: FontPackId) {
  applyFontPack(id);
  try {
    localStorage.setItem(KEY, id);
  } catch {
    /* */
  }
}
