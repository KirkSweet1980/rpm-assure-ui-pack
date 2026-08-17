import type { CustomerCover } from "@/lib/data/types";

export type EcoWidgetId =
  | "hero"
  | "cover"
  | "attention"
  | "fleet"
  | "sla"
  | "rmm"
  | "backup"
  | "epp"
  | "csp"
  | "tickets"
  | "finsight"
  | "jumps"
  | "incidents"
  | "risks"
  | "freshness"
  | "license"
  | "dayend"
  | "jobs"
  | "patch"
  | "operators"
  | "hotfixes"
  | "sqlhealth";

export type EcoWidgetRequire = keyof CustomerCover | null;

export type EcoWidgetMeta = {
  id: EcoWidgetId;
  label: string;
  span: 3 | 4 | 6 | 8 | 12;
  hint: string;
  /** null = tenant pane, always listed. Else only when that service has Cover. */
  requires: EcoWidgetRequire;
};

export const ECO_WIDGETS: EcoWidgetMeta[] = [
  { id: "hero", label: "Customer Header", span: 12, hint: "RAG, assurance score, services on cover", requires: null },
  { id: "cover", label: "Service Cover", span: 4, hint: "Which RPM services are in scope", requires: null },
  { id: "attention", label: "Needs Attention", span: 4, hint: "Jobs, FinSight, risks, incidents", requires: null },
  { id: "fleet", label: "Fleet Mix", span: 4, hint: "RMM, backup or operators mix", requires: null },
  { id: "sla", label: "SLA By Service", span: 6, hint: "Covered-pillar SLA scores", requires: null },
  { id: "rmm", label: "RPM RMM", span: 6, hint: "Servers, workstations, critical alerts", requires: "rmm" },
  { id: "backup", label: "Cloud Backup", span: 4, hint: "Healthy vs failed or stale", requires: "cove" },
  { id: "epp", label: "RPM EndPoint Protection", span: 4, hint: "Managed endpoints and infections", requires: "epp" },
  { id: "csp", label: "Microsoft CSP", span: 4, hint: "Secure Score, MFA, seats", requires: "csp" },
  { id: "tickets", label: "Customer Tickets", span: 4, hint: "Open / resolved / closed", requires: "tickets" },
  { id: "finsight", label: "FinSight Close", span: 12, hint: "Out-of-balance modules", requires: "syspro" },
  { id: "jumps", label: "Assurance Shortcuts", span: 12, hint: "Incidents, risks, SLA, issues", requires: null },
  { id: "incidents", label: "Open Incidents", span: 6, hint: "Latest open / major incidents", requires: null },
  { id: "risks", label: "Open Risks", span: 6, hint: "Risk register still open", requires: null },
  { id: "freshness", label: "Data Freshness", span: 6, hint: "Last collect per service", requires: null },
  { id: "license", label: "SYSPRO Licence", span: 3, hint: "Product and expiry", requires: "syspro" },
  { id: "dayend", label: "Day End", span: 3, hint: "Automated close status", requires: "syspro" },
  { id: "jobs", label: "Job Logging", span: 6, hint: "SYSPRO job errors", requires: "syspro" },
  { id: "patch", label: "Server Patch", span: 6, hint: "Missing patches on servers", requires: "rmm" },
  { id: "operators", label: "SYSPRO Operators", span: 4, hint: "Active vs quiet operators", requires: "syspro" },
  { id: "hotfixes", label: "SYSPRO Hotfixes", span: 4, hint: "Applied hotfix count", requires: "syspro" },
  { id: "sqlhealth", label: "SQL Health", span: 4, hint: "SYSPRO SQL health checks", requires: "syspro" },
];

export type EcoWidgetLayout = {
  order: EcoWidgetId[];
  hidden: EcoWidgetId[];
};

const KEY = "rpma-eco-widgets-v2";
const ALL_IDS = ECO_WIDGETS.map((w) => w.id);

/** All widgets on — user hides what they do not want. */
export const DEFAULT_ECO_WIDGET_LAYOUT: EcoWidgetLayout = {
  order: [...ALL_IDS],
  hidden: [],
};

export function ecoWidgetMeta(id: EcoWidgetId): EcoWidgetMeta {
  return ECO_WIDGETS.find((w) => w.id === id) ?? ECO_WIDGETS[0];
}

export function normalizeEcoWidgetLayout(raw: unknown): EcoWidgetLayout {
  const base: EcoWidgetLayout = {
    order: [...DEFAULT_ECO_WIDGET_LAYOUT.order],
    hidden: [...DEFAULT_ECO_WIDGET_LAYOUT.hidden],
  };
  if (!raw || typeof raw !== "object") return base;
  const o = raw as { order?: unknown; hidden?: unknown };
  const orderIn = Array.isArray(o.order)
    ? o.order.filter((x): x is EcoWidgetId => ALL_IDS.includes(x as EcoWidgetId))
    : [];
  const hidden = Array.isArray(o.hidden)
    ? o.hidden.filter((x): x is EcoWidgetId => ALL_IDS.includes(x as EcoWidgetId))
    : base.hidden;
  const seen = new Set<EcoWidgetId>();
  const order: EcoWidgetId[] = [];
  for (const id of [...orderIn, ...ALL_IDS]) {
    if (seen.has(id)) continue;
    seen.add(id);
    order.push(id);
  }
  return { order, hidden };
}

export function readEcoWidgetLayout(): EcoWidgetLayout {
  if (typeof window === "undefined") return DEFAULT_ECO_WIDGET_LAYOUT;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? normalizeEcoWidgetLayout(JSON.parse(raw)) : DEFAULT_ECO_WIDGET_LAYOUT;
  } catch {
    return DEFAULT_ECO_WIDGET_LAYOUT;
  }
}

export function persistEcoWidgetLayout(layout: EcoWidgetLayout) {
  try {
    localStorage.setItem(KEY, JSON.stringify(normalizeEcoWidgetLayout(layout)));
  } catch {
    /* */
  }
}

export function ecoWidgetCovered(id: EcoWidgetId, cover?: CustomerCover | null): boolean {
  const req = ecoWidgetMeta(id).requires;
  if (!req) return true;
  if (req === "tickets") return true;
  return Boolean(cover?.[req]);
}

export function coveredEcoWidgetIds(cover?: CustomerCover | null): EcoWidgetId[] {
  return ALL_IDS.filter((id) => ecoWidgetCovered(id, cover));
}

export function visibleEcoWidgets(
  layout: EcoWidgetLayout,
  cover?: CustomerCover | null,
): EcoWidgetId[] {
  const hidden = new Set(layout.hidden);
  return layout.order.filter((id) => !hidden.has(id) && ecoWidgetCovered(id, cover));
}
