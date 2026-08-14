export type EstateViewId = string;

export type EstateView = {
  id: EstateViewId;
  label: string;
  drill: string | null;
  builtin?: boolean;
};

export const ESTATE_VIEWS: EstateView[] = [
  { id: "all", label: "Entire Assure Eco-System", drill: null, builtin: true },
  { id: "attention", label: "Attention", drill: "attention", builtin: true },
  { id: "finsight", label: "FinSight OOB", drill: "finsight", builtin: true },
  { id: "sla", label: "SLA Breach", drill: "sla", builtin: true },
  { id: "stale", label: "Stale Collect", drill: "stale", builtin: true },
];

const ACTIVE_KEY = "rpma-estate-view";
const CUSTOM_KEY = "rpma-estate-views-custom";
