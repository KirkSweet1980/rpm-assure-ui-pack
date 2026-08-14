export type EstateViewId = string;

export type EstateView = {
  id: EstateViewId;
  label: string;
  drill: string | null;
  builtin?: boolean;
};

export const ESTATE_VIEWS: EstateView[] = [
  { id: "all", label: "All Customers", drill: null, builtin: true },
  { id: "attention", label: "Attention", drill: "attention", builtin: true },
  { id: "finsight", label: "FinSight OOB", drill: "finsight", builtin: true },
  { id: "sla", label: "SLA Breach", drill: "sla", builtin: true },
  { id: "stale", label: "Stale Collect", drill: "stale", builtin: true },
];

const ACTIVE_KEY = "rpma-estate-view";
const CUSTOM_KEY = "rpma-estate-views-custom";

export function readActiveEstateView(): EstateViewId {
  if (typeof window === "undefined") return "all";
  try {
    return localStorage.getItem(ACTIVE_KEY) || "all";
  } catch {
    return "all";
  }
}

export function persistActiveEstateView(id: EstateViewId) {
  try {
    localStorage.setItem(ACTIVE_KEY, id);
  } catch {
    /* */
  }
}

export function readCustomEstateViews(): EstateView[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    if (!raw) return [];
    const j = JSON.parse(raw) as unknown;
    if (!Array.isArray(j)) return [];
    return j
      .filter((v) => v && typeof v.id === "string" && typeof v.label === "string")
      .map((v) => ({ id: String(v.id), label: String(v.label), drill: v.drill ?? null }));
  } catch {
    return [];
  }
}

export function persistCustomEstateViews(views: EstateView[]) {
  try {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(views));
  } catch {
    /* */
  }
}

export function allEstateViews(custom: EstateView[]): EstateView[] {
  return [...ESTATE_VIEWS, ...custom];
}
