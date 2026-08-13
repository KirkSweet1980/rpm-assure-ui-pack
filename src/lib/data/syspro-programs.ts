/**
 * Friendly SYSPRO program labels for RPM Assure UI.
 * Codes are technical; titles/descriptions are operator-friendly.
 */
export type SysproProgramInfo = {
  code: string;
  name: string;
  description: string;
  area?: string;
};

const CATALOG: Record<string, Omit<SysproProgramInfo, "code">> = {
  // —— Inventory / imports ——
  IMP010: {
    name: "Inventory import",
    description:
      "Imports stock / inventory transactions into SYSPRO. Failures often block warehouse and finance posting.",
    area: "Inventory",
  },
  IMP041: {
    name: "Import processing",
    description:
      "Related import / interface step. Check with IMP010 if errors cluster on the same operators.",
    area: "Inventory",
  },
  IMPFRM: {
    name: "Import forms",
    description: "Form-driven import utility used for batch loads into SYSPRO.",
    area: "Inventory",
  },
  IMP012: {
    name: "Inventory interface",
    description: "Inventory interface program for external or batch stock updates.",
    area: "Inventory",
  },
  IMPP10: {
    name: "Inventory import (variant)",
    description: "Related inventory import path used by some company databases.",
    area: "Inventory",
  },
  INVTMA: {
    name: "Inventory transactions",
    description: "Stock movements, issues, receipts and adjustments.",
    area: "Inventory",
  },
  INVQRY: {
    name: "Inventory enquiry",
    description: "Stock enquiry / on-hand lookups.",
    area: "Inventory",
  },
  INVTJQ: {
    name: "Inventory journal enquiry",
    description: "Review inventory journals and movements.",
    area: "Inventory",
  },
  // —— Sales ——
  SORTOI: {
    name: "Sales order entry",
    description: "Sales order capture and maintenance.",
    area: "Sales",
  },
  SORTIN: {
    name: "Sales order invoice",
    description: "Invoice sales orders / delivery notes.",
    area: "Sales",
  },
  QOTTOI: {
    name: "Quotations",
    description: "Sales quotation entry.",
    area: "Sales",
  },
  // —— AP / AR / GL ——
  APSSIN: {
    name: "AP invoice entry",
    description: "Accounts payable invoice capture.",
    area: "Financials",
  },
  APSPYR: {
    name: "AP payments",
    description: "Supplier payment processing.",
    area: "Financials",
  },
  APSP01: {
    name: "AP balances / enquiry",
    description: "Accounts payable balances and enquiry.",
    area: "Financials",
  },
  ARSSIN: {
    name: "AR invoice entry",
    description: "Accounts receivable invoice capture.",
    area: "Financials",
  },
  ARSPYR: {
    name: "AR receipts",
    description: "Customer receipt and cash application.",
    area: "Financials",
  },
  GENJNL: {
    name: "General ledger journals",
    description: "GL journal entry and posting.",
    area: "Financials",
  },
  GENQRY: {
    name: "GL enquiry",
    description: "General ledger enquiry and balances.",
    area: "Financials",
  },
  // —— Procurement / manufacturing ——
  PORTOI: {
    name: "Purchase orders",
    description: "Purchase order entry and maintenance.",
    area: "Procurement",
  },
  PORGRN: {
    name: "Goods received notes",
    description: "GRN capture against purchase orders.",
    area: "Procurement",
  },
  WIPTJO: {
    name: "WIP job transactions",
    description: "Work-in-progress job booking and manufacturing postings.",
    area: "Manufacturing",
  },
  WIPTJQ: {
    name: "WIP job enquiry",
    description: "Work-in-progress job status enquiry.",
    area: "Manufacturing",
  },
  BOMTOI: {
    name: "Bill of materials",
    description: "BOM maintenance for manufactured items.",
    area: "Manufacturing",
  },
  MRPTPL: {
    name: "MRP planning",
    description: "Material requirements planning run / review.",
    area: "Planning",
  },
  // —— Admin / system ——
  ADMJBL: {
    name: "Job logging",
    description: "System job / batch log viewer (administration).",
    area: "Admin",
  },
  ADMJOB: {
    name: "Job control",
    description: "SYSPRO job scheduling and control.",
    area: "Admin",
  },
  ADMOPR: {
    name: "Operator maintenance",
    description: "Operator / security maintenance.",
    area: "Admin",
  },
  ADMDIA: {
    name: "Diagnostics",
    description: "SYSPRO system diagnostics.",
    area: "Admin",
  },
  IMPSQL: {
    name: "SQL import",
    description: "SQL-driven import into SYSPRO tables.",
    area: "Integration",
  },
  CSHTOI: {
    name: "Cash book entry",
    description: "Cash book transaction entry.",
    area: "Financials",
  },
  ASSTMA: {
    name: "Asset transactions",
    description: "Fixed asset movements and adjustments.",
    area: "Assets",
  },
  // —— Common batch / company programs seen in job logging ——
  IMP070: {
    name: "Inventory import (extended)",
    description: "Extended inventory import path; often used for warehouse interfaces.",
    area: "Inventory",
  },
  IMP080: {
    name: "Stock take import",
    description: "Stock take / count import into inventory.",
    area: "Inventory",
  },
  SORQRY: {
    name: "Sales order enquiry",
    description: "Sales order status and enquiry.",
    area: "Sales",
  },
  SORDIS: {
    name: "Sales order dispatch",
    description: "Dispatch notes / delivery against sales orders.",
    area: "Sales",
  },
  APSSQN: {
    name: "AP query",
    description: "Accounts payable enquiry.",
    area: "Financials",
  },
  ARSSQN: {
    name: "AR query",
    description: "Accounts receivable enquiry.",
    area: "Financials",
  },
  GENPAL: {
    name: "GL period end",
    description: "General ledger period-end processing.",
    area: "Financials",
  },
  COMCTL: {
    name: "Company control",
    description: "Company-level control / system options.",
    area: "Admin",
  },
  TASKS: {
    name: "Task list",
    description: "Operator task group / scheduled task runner.",
    area: "Admin",
  },
  // —— Frequently seen in AMS job error panels ——
  IMPQRY: {
    name: "Import enquiry",
    description: "Enquiry against import batches and interface status.",
    area: "Inventory",
  },
  IMPBAL: {
    name: "Import balances",
    description: "Balance / control totals for import interfaces.",
    area: "Inventory",
  },
  INVTOI: {
    name: "Inventory entry",
    description: "Interactive inventory transaction entry.",
    area: "Inventory",
  },
  INVTJR: {
    name: "Inventory journals",
    description: "Inventory journal capture and posting.",
    area: "Inventory",
  },
  PORTOQ: {
    name: "Purchase order enquiry",
    description: "PO status and enquiry.",
    area: "Procurement",
  },
  WIPTMA: {
    name: "WIP maintenance",
    description: "Work-in-progress job maintenance.",
    area: "Manufacturing",
  },
  MRPRUN: {
    name: "MRP run",
    description: "Material requirements planning calculation run.",
    area: "Planning",
  },
  ADMTAS: {
    name: "Task scheduler",
    description: "SYSPRO automated task groups and scheduled jobs.",
    area: "Admin",
  },
  ADMLOG: {
    name: "Operator logon",
    description: "Operator login / session related activity.",
    area: "Admin",
  },
  RPTGEN: {
    name: "Report generator",
    description: "Standard or custom SYSPRO report execution.",
    area: "Reporting",
  },
  RPTQRY: {
    name: "Report enquiry",
    description: "Report status / output enquiry.",
    area: "Reporting",
  },
  DTRBAL: {
    name: "FinSight balances",
    description: "FinSight sub-ledger vs GL balance extract / review.",
    area: "Finance control",
  },
  // —— Extra codes commonly seen in job logging ——
  IMP099: {
    name: "Import utility",
    description: "Generic inventory/interface import step.",
    area: "Inventory",
  },
  IMPTRN: {
    name: "Import transactions",
    description: "Transaction-level import into SYSPRO.",
    area: "Inventory",
  },
  INVTRF: {
    name: "Inventory transfer",
    description: "Warehouse or site stock transfer.",
    area: "Inventory",
  },
  INVADJ: {
    name: "Inventory adjustment",
    description: "Stock quantity or value adjustment.",
    area: "Inventory",
  },
  SORTOQ: {
    name: "Sales order query",
    description: "Sales order enquiry / status.",
    area: "Sales",
  },
  SORINV: {
    name: "Sales invoicing",
    description: "Sales order billing / invoice run.",
    area: "Sales",
  },
  APSGRN: {
    name: "AP goods received",
    description: "Link GRN activity into accounts payable.",
    area: "Financials",
  },
  APSSJN: {
    name: "AP journals",
    description: "Accounts payable journal entry.",
    area: "Financials",
  },
  ARSSJN: {
    name: "AR journals",
    description: "Accounts receivable journal entry.",
    area: "Financials",
  },
  GENPST: {
    name: "GL post",
    description: "General ledger posting run.",
    area: "Financials",
  },
  PORRCV: {
    name: "Purchase receipts",
    description: "Purchase order receipt / GRN processing.",
    area: "Procurement",
  },
  WIPLAB: {
    name: "WIP labour booking",
    description: "Labour capture against manufacturing jobs.",
    area: "Manufacturing",
  },
  WIPMAT: {
    name: "WIP material issue",
    description: "Material issues to work-in-progress jobs.",
    area: "Manufacturing",
  },
  ADMMNU: {
    name: "Menu / security",
    description: "Operator menu and security administration.",
    area: "Admin",
  },
  ADMPWD: {
    name: "Password maintenance",
    description: "Operator password change / policy.",
    area: "Admin",
  },
  SYSBKP: {
    name: "System backup task",
    description: "SYSPRO-related backup or archive task.",
    area: "Admin",
  },
  EFTPAY: {
    name: "EFT payments",
    description: "Electronic funds transfer payment generation.",
    area: "Financials",
  },
  TAXRET: {
    name: "Tax return / VAT",
    description: "Tax or VAT reporting extract.",
    area: "Financials",
  },
  DTRRUN: {
    name: "FinSight run",
    description: "FinSight balance refresh or control run.",
    area: "Financials",
  },
};

/** Prefix heuristics when exact code is unknown */
const PREFIX_HINTS: { prefix: string; name: string; description: string; area: string }[] = [
  {
    prefix: "IMP",
    name: "Import / interface",
    description: "Data import or interface program. Check operators and source files when errors repeat.",
    area: "Integration",
  },
  {
    prefix: "INV",
    name: "Inventory",
    description: "Inventory enquiry or transaction program.",
    area: "Inventory",
  },
  {
    prefix: "SOR",
    name: "Sales order",
    description: "Sales order processing program.",
    area: "Sales",
  },
  {
    prefix: "APS",
    name: "Accounts payable",
    description: "AP entry, payment or enquiry program.",
    area: "Financials",
  },
  {
    prefix: "ARS",
    name: "Accounts receivable",
    description: "AR entry, receipt or enquiry program.",
    area: "Financials",
  },
  {
    prefix: "GEN",
    name: "General ledger",
    description: "GL journal, enquiry or posting program.",
    area: "Financials",
  },
  {
    prefix: "POR",
    name: "Purchase order",
    description: "Procurement / PO program.",
    area: "Procurement",
  },
  {
    prefix: "WIP",
    name: "Work in progress",
    description: "Manufacturing / WIP program.",
    area: "Manufacturing",
  },
  {
    prefix: "BOM",
    name: "Bill of materials",
    description: "BOM maintenance or enquiry.",
    area: "Manufacturing",
  },
  {
    prefix: "MRP",
    name: "MRP / planning",
    description: "Planning or requirements program.",
    area: "Planning",
  },
  {
    prefix: "ADM",
    name: "Administration",
    description: "System administration or security program.",
    area: "Admin",
  },
  {
    prefix: "QOT",
    name: "Quotation",
    description: "Sales quotation program.",
    area: "Sales",
  },
  {
    prefix: "CSH",
    name: "Cash book",
    description: "Cash book program.",
    area: "Financials",
  },
  {
    prefix: "ASS",
    name: "Assets",
    description: "Fixed assets program.",
    area: "Assets",
  },
  {
    prefix: "CRM",
    name: "CRM",
    description: "Customer relationship program.",
    area: "CRM",
  },
];

/** Normalise program code for lookup */
export function normalizeProgramCode(code: string | null | undefined): string | null {
  if (!code) return null;
  const c = code.trim().toUpperCase();
  return c || null;
}

/** Pull first SYSPRO-like code from free text (e.g. priority titles) */
export function extractProgramCode(text: string | null | undefined): string | null {
  if (!text) return null;
  const m = text.toUpperCase().match(/\b([A-Z]{2,6}\d{0,3}[A-Z]{0,3})\b/);
  if (!m) return null;
  const c = m[1];
  // Prefer codes that look like programs (letters + optional digits)
  if (/^[A-Z]{3}/.test(c) || CATALOG[c] || PREFIX_HINTS.some((p) => c.startsWith(p.prefix))) {
    return c;
  }
  return null;
}

function fromPrefix(code: string): Omit<SysproProgramInfo, "code"> | null {
  for (const p of PREFIX_HINTS) {
    if (code.startsWith(p.prefix)) {
      return {
        name: `${p.name} (${code})`,
        description: p.description,
        area: p.area,
      };
    }
  }
  return null;
}

export function getSysproProgram(code: string | null | undefined): SysproProgramInfo | null {
  const c = normalizeProgramCode(code);
  if (!c) return null;
  const hit = CATALOG[c];
  if (hit) return { code: c, ...hit };
  const pref = fromPrefix(c);
  if (pref) {
    return {
      code: c,
      name: pref.name.replace(` (${c})`, ""), // cleaner: "Inventory" not "Inventory (INVXYZ)"
      description: pref.description,
      area: pref.area,
    };
  }
  return {
    code: c,
    name: "SYSPRO program",
    description:
      "Program code from job logging or AMS priority. Add a friendly name in the catalogue if this appears often.",
    area: "Other",
  };
}

/** "IMP010 — Inventory import" */
export function formatProgramLabel(code: string | null | undefined): string {
  const p = getSysproProgram(code);
  if (!p) return "—";
  if (p.name === "SYSPRO program") return p.code;
  return `${p.code} — ${p.name}`;
}

/** Short secondary line for tables */
export function formatProgramHint(code: string | null | undefined): string | null {
  const p = getSysproProgram(code);
  if (!p || p.name === "SYSPRO program") return null;
  return p.description;
}

/** True when we have more than a raw code */
export function isKnownProgram(code: string | null | undefined): boolean {
  const p = getSysproProgram(code);
  return !!p && p.name !== "SYSPRO program";
}
