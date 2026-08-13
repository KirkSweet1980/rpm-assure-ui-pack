export const MENU_STYLES = [
  "teal",
  "underline",
  "navy",
  "rail",
  "lime",
  "cyan",
  "punch",
  "spectrum",
  "ocean",
  "amber",
  "sunset",
  "pills",
  "candy",
  "flag",
  "coral",
  "mosaic",
] as const;
export type MenuStyle = (typeof MENU_STYLES)[number];

export const MENU_STYLE_META: Record<
  MenuStyle,
  { name: string; blurb: string }
> = {
  teal: {
    name: "A — Teal chip",
    blurb: "Solid teal selected chip, lime edge.",
  },
  underline: {
    name: "B — Ink underline",
    blurb: "Quiet 3px teal bar, no fill.",
  },
  navy: {
    name: "C — Navy block",
    blurb: "Solid navy, white type.",
  },
  rail: {
    name: "D — Left rail",
    blurb: "4px teal bar on the left.",
  },
  lime: {
    name: "E — Lime punch",
    blurb: "Bright lime selected chip. Highest energy.",
  },
  cyan: {
    name: "F — Cyan ice",
    blurb: "Cool cyan fill, navy type. Fresh, less green.",
  },
  punch: {
    name: "G — Teal + lime",
    blurb: "Teal fill, thick lime bar, lime edge. Brand pair.",
  },
  spectrum: {
    name: "H — Spectrum",
    blurb: "Each pillar keeps its own colour when selected.",
  },
  ocean: {
    name: "I — Ocean blue",
    blurb: "Brand blue fill. Default. Light and dark variants.",
  },
  amber: {
    name: "J — Amber signal",
    blurb: "Warm amber selected chip. High contrast on the navy bar.",
  },
  sunset: {
    name: "K — Teal + amber",
    blurb: "Teal fill with an amber bar. Two brand colours at once.",
  },
  pills: {
    name: "L — Colour pills",
    blurb: "Idle items keep a tinted outline. Selected goes full colour.",
  },
  candy: {
    name: "M — Candy row",
    blurb: "Every tab keeps a pastel fill. Selected goes saturated.",
  },
  flag: {
    name: "N — Brand flag",
    blurb: "Selected chip with a teal / lime / blue stripe under it.",
  },
  coral: {
    name: "O — Coral",
    blurb: "Warm coral selected. Most colour-shift from the navy bar.",
  },
  mosaic: {
    name: "P — Mosaic",
    blurb: "Idle tabs are filled pastels. Selected is the bold sibling.",
  },
};

const KEY = "rpma-menu-style";
const ALLOWED = new Set<string>(MENU_STYLES);

export function readMenuStyle(): MenuStyle {
  if (typeof window === "undefined") return "ocean";
  try {
    const v = localStorage.getItem(KEY);
    if (v && ALLOWED.has(v)) return v as MenuStyle;
  } catch {
    /* ignore */
  }
  return "ocean";
}

export function applyMenuStyle(style: MenuStyle) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.menuStyle = style;
}

export function persistMenuStyle(style: MenuStyle) {
  applyMenuStyle(style);
  try {
    localStorage.setItem(KEY, style);
  } catch {
    /* ignore */
  }
}
