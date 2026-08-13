export type AssistantContext = {
  pathname: string;
  pageTitle?: string;
  customerCode?: string | null;
  customerName?: string | null;
  healthRag?: string | null;
  cover?: {
    syspro?: boolean;
    rmm?: boolean;
    cove?: boolean;
    epp?: boolean;
    csp?: boolean;
  } | null;
  jobErrors?: number | null;
  finsightOob?: number | null;
  rmmOffline?: number | null;
};

export type AssistantLink = { label: string; href: string };

export type AssistantReply = {
  text: string;
  links?: AssistantLink[];
  source: "local" | "model";
};
