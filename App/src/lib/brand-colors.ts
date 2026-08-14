/**
 * RPM Assure brand palette — single source for charts / gauges (CSS vars for UI).
 * Logo: blue → teal → lime
 */
export const BRAND = {
  slate: "#2d6a8a",
  blue: "#2d6a8a",
  blueDeep: "#1a4d7a",
  teal: "#1bb8a6",
  cyan: "#3ecfbf",
  lime: "#8fce4a",
  nav: "#1a4d7a",
  navDeep: "#12365a",
  ragGreen: "#2f9e5f",
  ragAmber: "#d4a017",
  ragRed: "#d14b4b",
  track: "#d0dde8",
  trackDark: "#243544",
} as const;

/** Recharts series — brand-aligned */
export const CHART = {
  primary: BRAND.teal,
  secondary: BRAND.blue,
  tertiary: BRAND.lime,
  operators: BRAND.teal,
  active: BRAND.lime,
  dtr: BRAND.ragAmber,
  jobs: BRAND.ragRed,
  red: BRAND.ragRed,
  amber: BRAND.ragAmber,
  green: BRAND.ragGreen,
  grid: "var(--color-border)",
  axis: "var(--color-subtle)",
  tooltipBg: "var(--color-surface)",
} as const;

export const GAUGE = {
  green: BRAND.ragGreen,
  collect: BRAND.blue,
  active: BRAND.teal,
  track: BRAND.track,
} as const;
