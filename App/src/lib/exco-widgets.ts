export type ExcoWidgetId =
  | "brief"
  | "cover"
  | "sla"
  | "pulse"
  | "matrix"
  | "impact"
  | "m365"
  | "decisions"
  | "incidents"
  | "finsight";

export type ExcoWidgetMeta = {
  id: ExcoWidgetId;
  label: string;
  span: 3 | 4 | 5 | 12;
};

export const EXCO_WIDGETS: ExcoWidgetMeta[] = [
  { id: "brief", label: "Executive Brief", span: 12 },
  { id: "cover", label: "Services On Cover", span: 4 },
  { id: "sla", label: "SLA By Service", span: 4 },
  { id: "pulse", label: "Operations Pulse", span: 4 },
  { id: "matrix", label: "Risk Matrix", span: 4 },
  { id: "impact", label: "Impact", span: 4 },
  { id: "m365", label: "Microsoft 365 CSP", span: 4 },
  { id: "decisions", label: "Who Needs A Decision", span: 5 },
  { id: "incidents", label: "Major Incidents", span: 4 },
  { id: "finsight", label: "FinSight Close", span: 3 },
];

export type ExcoWidgetLayout = {
  order: ExcoWidgetId[];
  hidden: ExcoWidgetId[];
};

const KEY = "rpma-exco-widgets-v1";
const ALL_IDS = EXCO_WIDGETS.map((w) => w.id);

export const DEFAULT_EXCO_WIDGET_LAYOUT: ExcoWidgetLayout = {
  order: [...ALL_IDS],
  hidden: [],
};

export function widgetMeta(id: ExcoWidgetId): ExcoWidgetMeta {
  return EXCO_WIDGETS.find((w) => w.id === id) ?? EXCO_WIDGETS[0];
}

export function normalizeExcoWidgetLayout(raw: unknown): ExcoWidgetLayout {
  const base = { ...DEFAULT_EXCO_WIDGET_LAYOUT, hidden: [] as ExcoWidgetId[] };
  if (!raw || typeof raw !== "object") return base;
  const o = raw as { order?: unknown; hidden?: unknown };
  const orderIn = Array.isArray(o.order) ? o.order.filter((x): x is ExcoWidgetId => ALL_IDS.includes(x as ExcoWidgetId)) : [];
  const hidden = Array.isArray(o.hidden)
    ? o.hidden.filter((x): x is ExcoWidgetId => ALL_IDS.includes(x as ExcoWidgetId))
    : [];
  const seen = new Set<ExcoWidgetId>();
  const order: ExcoWidgetId[] = [];
  for (const id of [...orderIn, ...ALL_IDS]) {
    if (seen.has(id)) continue;
    seen.add(id);
    order.push(id);
  }
  return { order, hidden };
}

export function readExcoWidgetLayout(): ExcoWidgetLayout {
  if (typeof window === "undefined") return DEFAULT_EXCO_WIDGET_LAYOUT;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? normalizeExcoWidgetLayout(JSON.parse(raw)) : DEFAULT_EXCO_WIDGET_LAYOUT;
  } catch {
    return DEFAULT_EXCO_WIDGET_LAYOUT;
  }
}

export function persistExcoWidgetLayout(layout: ExcoWidgetLayout) {
  try {
    localStorage.setItem(KEY, JSON.stringify(normalizeExcoWidgetLayout(layout)));
  } catch {
    /* */
  }
}

export function visibleExcoWidgets(layout: ExcoWidgetLayout): ExcoWidgetId[] {
  const hidden = new Set(layout.hidden);
  return layout.order.filter((id) => !hidden.has(id));
}
