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

export type EcoWidgetMeta = {
  id: EcoWidgetId;
  label: string;
  span: 3 | 4 | 6 | 8 | 12;
  hint: string;
};

export const ECO_WIDGETS: EcoWidgetMeta[] = [
  { id: "hero", label: "Customer Header", span: 12, hint: "RAG, assurance score, services on cover" },
  { id: "cover", label: "Service Cover", span: 4, hint: "Which RPM services are in scope" },
  { id: "attention", label: "Needs Attention", span: 4, hint: "Jobs, FinSight, risks, incidents" },
  { id: "fleet", label: "Fleet Mix", span: 4, hint: "RMM, backup or operators mix" },
  { id: "sla", label: "SLA By Service", span: 6, hint: "Covered-pillar SLA scores" },
  { id: "rmm", label: "RPM RMM", span: 6, hint: "Servers, workstations, critical alerts" },
  { id: "backup", label: "Cloud Backup", span: 4, hint: "Cove healthy vs failed or stale" },
  { id: "epp", label: "RPM EndPoint Protection", span: 4, hint: "Managed endpoints and infections" },
  { id: "csp", label: "Microsoft CSP", span: 4, hint: "Secure Score, MFA, seats" },
  { id: "tickets", label: "Customer Tickets", span: 4, hint: "Open / resolved / closed" },
  { id: "finsight", label: "FinSight Close", span: 12, hint: "Out-of-balance modules" },
  { id: "jumps", label: "Assurance Shortcuts", span: 12, hint: "Incidents, risks, SLA, issues" },
  { id: "incidents", label: "Open Incidents", span: 6, hint: "Latest open / major incidents" },
  { id: "risks", label: "Open Risks", span: 6, hint: "Risk register still open" },
  { id: "freshness", label: "Data Freshness", span: 6, hint: "Last collect per service" },
  { id: "license", label: "SYSPRO Licence", span: 3, hint: "Product and expiry" },
  { id: "dayend", label: "Day End", span: 3, hint: "Automated close status" },
  { id: "jobs", label: "Job Logging", span: 6, hint: "SYSPRO job errors" },
  { id: "patch", label: "Server Patch", span: 6, hint: "Missing patches on servers" },
  { id: "operators", label: "SYSPRO Operators", span: 4, hint: "Active vs quiet operators" },
  { id: "hotfixes", label: "SYSPRO Hotfixes", span: 4, hint: "Applied hotfix count" },
  { id: "sqlhealth", label: "SQL Health", span: 4, hint: "SYSPRO SQL health checks" },
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

export function visibleEcoWidgets(layout: EcoWidgetLayout): EcoWidgetId[] {
  const hidden = new Set(layout.hidden);
  return layout.order.filter((id) => !hidden.has(id));
}
