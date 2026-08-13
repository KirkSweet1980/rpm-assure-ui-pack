/** RPM Assure FinSight — financial integrity product language. */

export const FINSIGHT_PRODUCT = "RPM Assure FinSight";
export const FINSIGHT_SHORT = "FinSight";

export const FINSIGHT_TAGLINE =
  "Control account recons and sub-ledger to GL integrity — exceptions identified, sized, and managed.";

/**
 * Clear RPM Assure proposition (use on decks, about, Exco).
 */
export const AMS_LINE_SHORT =
  "RPM Assure shows that SYSPRO is operating — and FinSight shows whether control accounts and sub-ledger integration to GL are holding.";

export const AMS_LINE_FULL =
  "As RPM Assure we do more than confirm SYSPRO is up. Through RPM Assure FinSight we evidence financial data-integrity controls: control-account reconciliations and sub-ledger integration to the general ledger (inventory, AR, AP, WIP, cashbook and related modules). Day-end packs surface exceptions daily; period-end packs summarise close readiness. Out-of-balance conditions are identified, sized, and managed — not left as silent risk.";

export const AMS_LINE_VS_OPS_ONLY =
  'Not only "SYSPRO is operational" — FinSight supports "control accounts reconcile and sub-ledger postings to GL are under control."';

/** What each FinSight module row means */
export const FINSIGHT_CONTROL_WHAT =
  "Each FinSight module is a control account recon: does the sub-ledger (or module balance) agree with the GL control at L1?";

export const FINSIGHT_INTEGRATION_WHAT =
  "Sub-ledger integration: movements should post from the module into GL. Unexplained L1 variance often means incomplete integration, timing, or unposted journals.";

export const FINSIGHT_DAY_END_PURPOSE =
  "Daily operational close: confirm collect succeeded, run control-account recons via FinSight, and flag SQL backup risk before the next trading day.";

export const FINSIGHT_PERIOD_END_PURPOSE =
  "Month-end financial integrity: which control accounts reconcile, material out-of-balance exposure, and whether ops gates support a clean close.";

/** Exco-facing short copy */
export const FINSIGHT_EXCO_TITLE = "RPM FinSight - Control Account Integrity";
export const FINSIGHT_EXCO_BLURB =
  "Estate view of SYSPRO control accounts: which customers have out-of-balance recons, and how many control lines need finance attention.";
export const FINSIGHT_EXCO_TIP =
  "FinSight compares each sub-ledger (stock, creditors, debtors, WIP) to its GL control. Out of balance means the books do not agree at control level — not just that SYSPRO is online.";

/** Level names for UI (never raw L1/L2/L3 alone) */
export const FINSIGHT_LEVEL_LABELS: Record<1 | 2 | 3, string> = {
  1: "Control total (L1)",
  2: "Mid rollup (L2)",
  3: "Detail lines (L3)",
};

export const FINSIGHT_LEVEL_HINTS: Record<1 | 2 | 3, string> = {
  1: "Control account recon status — does sub-ledger close equal GL control?",
  2: "Mid-level rollup (warehouse, branch, bank group) that feeds the control total",
  3: "Lowest-level lines (stock item, supplier, customer, job) that drive variance",
};

export function finsightLevelLabel(level: number | null | undefined): string {
  const n = Number(level);
  if (n === 1 || n === 2 || n === 3) return FINSIGHT_LEVEL_LABELS[n as 1 | 2 | 3];
  return "Balance level";
}

export function finsightLevelHint(level: number | null | undefined): string {
  const n = Number(level);
  if (n === 1 || n === 2 || n === 3) return FINSIGHT_LEVEL_HINTS[n as 1 | 2 | 3];
  return "Sub-ledger / GL balance row";
}

/** Table column headers */
export const FINSIGHT_COL = {
  keyGl: "Account / key",
  description: "Description",
  company: "Company",
  subClose: "Sub-ledger close",
  glClose: "GL control close",
  variance: "Variance",
  control: "Control",
  module: "Module",
  whatWeRecon: "What we recon",
  closeL1: "Close (control)",
  absVariance: "Absolute variance",
  oobLines: "Out-of-balance lines",
  status: "Status",
} as const;

/** Status chips */
export const FINSIGHT_STATUS = {
  inBalance: "In balance",
  outOfBalance: "Out of balance",
  noData: "No data yet",
  noCover: "No cover",
} as const;

/** Module codes → plain-English control description */
export const FINSIGHT_CONTROL_HINTS: Record<string, string> = {
  INV: "Inventory sub-ledger vs GL inventory control",
  AP: "Accounts payable (creditors) vs GL AP control",
  AR: "Accounts receivable (debtors) vs GL AR control",
  WIP: "Work in progress vs GL WIP control",
  WPI: "WIP inspection vs GL",
  CB: "Cashbook vs GL bank / cash controls",
  ASS: "Assets sub-ledger vs GL asset controls",
  DN: "Dispatch notes / goods issues vs GL",
  GIT: "Goods in transit vs GL",
  GRN: "GRN suspense vs GL",
};

export function finsightControlHint(code: string | null | undefined): string {
  const c = (code || "").toUpperCase();
  return FINSIGHT_CONTROL_HINTS[c] || "Sub-ledger / module balance vs GL control account";
}

/** Canonical UI labels for module codes (never show bare codes alone) */
export const FINSIGHT_MODULE_NAMES: Record<string, string> = {
  AP: "Accounts Payable",
  AR: "Accounts Receivable",
  ASS: "Assets",
  CB: "Cashbook",
  DN: "Dispatch Notes",
  GIT: "Goods In Transit",
  GRN: "GRN Suspense",
  INV: "Inventory",
  WIP: "Work In Progress",
  WPI: "WIP Inspection",
};

export function finsightModuleName(code: string | null | undefined, fallback?: string | null): string {
  const c = (code || "").toUpperCase();
  if (FINSIGHT_MODULE_NAMES[c]) return FINSIGHT_MODULE_NAMES[c];
  if (fallback && fallback.trim()) return fallback.trim();
  return c || "Module";
}

/** Combined title: "Inventory (INV)" */
export function finsightModuleTitle(code: string | null | undefined, fallback?: string | null): string {
  const c = (code || "").toUpperCase();
  const name = finsightModuleName(c, fallback);
  if (!c) return name;
  if (name.toUpperCase() === c) return c;
  return `${name} (${c})`;
}

/**
 * Clean native-collect / Datarapt descriptions for display.
 * Strips "[Native]" noise and turns GL=System.Object[] style into readable text.
 */
export function finsightCleanDescription(
  raw: string | null | undefined,
  opts?: { moduleCode?: string | null; levelKey?: string | null; glCode?: string | null },
): string {
  let s = (raw || "").trim();
  if (!s) {
    const mod = finsightModuleName(opts?.moduleCode);
    const key = opts?.levelKey || opts?.glCode;
    if (key) return `${mod} · ${key}`;
    return mod !== "Module" ? `${mod} control` : "—";
  }
  s = s.replace(/^\[Native\]\s*/i, "").trim();
  s = s.replace(/\bGL=System\.Object\[[^\]]*\]/gi, "GL control (mapped)");
  s = s.replace(/\bGL=\[([^\]]+)\]/gi, "GL $1");
  s = s.replace(/\s*\|\s*/g, " · ");
  s = s.replace(/\s{2,}/g, " ").trim();
  // Prefer human phrasing for common native templates
  s = s.replace(/^INV control\b/i, "Inventory control");
  s = s.replace(/^AP control\b/i, "Accounts payable control");
  s = s.replace(/^AR control\b/i, "Accounts receivable control");
  s = s.replace(/^WIP control\b/i, "Work in progress control");
  s = s.replace(/\bINV company total\b/i, "Inventory company total");
  s = s.replace(/\bAP company total\b/i, "Accounts payable company total");
  s = s.replace(/\bAR company total\b/i, "Accounts receivable company total");
  s = s.replace(/\bWIP company total\b/i, "WIP company total");
  s = s.replace(/\bINV warehouse\b/i, "Inventory warehouse");
  s = s.replace(/\bAP supplier\b/i, "AP supplier");
  s = s.replace(/\bAR customer\b/i, "AR customer");
  s = s.replace(/\bWIP job\b/i, "WIP job");
  return s || "—";
}

/** Exco attention / badge text for variance lines */
export function finsightOobAttention(lines: number): string {
  if (lines <= 0) return "FinSight clear";
  if (lines === 1) return "1 FinSight control out of balance";
  return `${lines} FinSight out-of-balance lines`;
}
