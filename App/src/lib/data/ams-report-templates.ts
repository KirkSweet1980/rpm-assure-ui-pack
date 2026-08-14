/**
 * RPM Assure report templates — board / ops packs for managed customers.
 * Used by Reports nav dropdown and /reports page.
 */

export type AmsReportTemplate = {
  id: string;
  name: string;
  audience: "ExCo" | "Ops" | "Technical" | "Board";
  cadence: "On demand" | "Weekly" | "Monthly";
  summary: string;
  sections: string[];
};

export const AMS_REPORT_TEMPLATES: AmsReportTemplate[] = [
  {
    id: "monthly-ams",
    name: "Monthly AMS pack",
    audience: "ExCo",
    cadence: "Monthly",
    summary: "Signed SYSPRO+AMS evidence: health, day-end, jobs, FinSight, operators, hotfixes, clause 7 clocks. No 99.5%.",
    sections: [
      "Health and collect",
      "Day-end (4.5)",
      "Job errors",
      "FinSight controls",
      "Operators and security admin (7.4)",
      "Hotfixes and licence (4.6)",
      "Signed SLA clocks (7.2)",
    ],
  },
  {
    id: "period-end-finsight",
    name: "Period end · FinSight readiness",
    audience: "ExCo",
    cadence: "Monthly",
    summary: "Close readiness: sub-ledger vs GL control matrix, Out of Balance register, ops gates, actions.",
    sections: [
      "Close readiness summary",
      "Financial control matrix",
      "Exception register",
      "Operational gates",
      "Recommended actions",
    ],
  },
  {
    id: "day-end-finsight",
    name: "Day end · FinSight",
    audience: "Ops",
    cadence: "On demand",
    summary: "Daily collect, FinSight control strip, exception register, SQL backups.",
    sections: [
      "Control strip",
      "Day-end operations",
      "FinSight control matrix",
      "Exception register",
      "SQL backups",
    ],
  },
  {
    id: "exec-dashboard",
    name: "Executive Dashboard",
    audience: "ExCo",
    cadence: "Weekly",
    summary: "RAG health, availability, SLA, incidents, users, risks, priorities.",
    sections: [
      "Overall health (RAG)",
      "Application availability",
      "SLA compliance",
      "Incidents (total / critical)",
      "Open problems",
      "Change success",
      "Active users",
      "CSAT",
      "Open vendor cases",
      "Top business risks",
      "Key priorities",
    ],
  },
  {
    id: "exec-summary",
    name: "Executive Summary",
    audience: "Board",
    cadence: "Monthly",
    summary: "Narrative board pack — achievements, incidents, impact, decisions.",
    sections: [
      "Reporting period",
      "Key achievements",
      "Major incidents",
      "Business impact",
      "Risks and issues",
      "Decisions required",
      "Priorities next period",
    ],
  },
  {
    id: "availability",
    name: "Application Availability",
    audience: "Ops",
    cadence: "Weekly",
    summary: "Uptime, planned/unplanned downtime, SLA, logins, interruptions.",
    sections: [
      "Application uptime",
      "Planned downtime",
      "Unplanned downtime",
      "Availability vs SLA",
      "Login success rate",
      "Service interruptions",
    ],
  },
  {
    id: "performance",
    name: "Application Performance",
    audience: "Technical",
    cadence: "Weekly",
    summary: "Login, transaction, screen, report, posting, batch trends.",
    sections: [
      "Login performance",
      "Transaction response",
      "Screen load",
      "Report execution",
      "Posting performance",
      "Batch processing",
      "UX trends",
    ],
  },
  {
    id: "user-activity",
    name: "User Activity",
    audience: "Ops",
    cadence: "Weekly",
    summary: "Active / concurrent users, growth, module utilisation, peaks.",
    sections: [
      "Active users",
      "Concurrent users",
      "User growth",
      "Login trends",
      "Module utilisation",
      "Peak usage",
    ],
  },
  {
    id: "security-access",
    name: "Security & Access",
    audience: "Technical",
    cadence: "Monthly",
    summary: "New/disabled users, permissions, SoD, failed logins, access reviews.",
    sections: [
      "New / disabled users",
      "Permission changes",
      "SoD reviews",
      "Failed logins",
      "User access reviews",
    ],
  },
  {
    id: "sla-performance",
    name: "SLA Performance",
    audience: "Ops",
    cadence: "Weekly",
    summary: "Response / resolution SLA, breaches, reasons, escalations.",
    sections: [
      "Response SLA",
      "Resolution SLA",
      "SLA breaches",
      "Breach reasons",
      "Escalations",
    ],
  },
  {
    id: "module-health",
    name: "Module Health (FinSight)",
    audience: "Technical",
    cadence: "Weekly",
    summary: "Financials, inventory, procurement, sales, manufacturing, WIP, CRM.",
    sections: [
      "Financials",
      "Inventory",
      "Procurement",
      "Sales orders",
      "Manufacturing",
      "Planning",
      "Distribution",
      "CRM",
      "Reporting",
      "Workflow",
    ],
  },
  {
    id: "risks-issues",
    name: "Risks & Issues",
    audience: "ExCo",
    cadence: "Monthly",
    summary: "Application and process risks, vendor issues, mitigations, owners.",
    sections: [
      "Application risks",
      "Business process risks",
      "Open issues",
      "Vendor issues",
      "Mitigation actions",
      "Risk owners",
      "Target dates",
    ],
  },
  {
    id: "weekly-assurance",
    name: "Weekly Assurance Pack",
    audience: "ExCo",
    cadence: "Weekly",
    summary: "Estate snapshot — all services on cover, attention list, jobs, FinSight, collect freshness.",
    sections: [
      "Services on cover",
      "Ecosystem health",
      "RMM / Backup / EPP / M365",
      "Customers needing attention",
      "Job errors",
      "FinSight Out of Balance",
      "Collect freshness",
      "Priorities",
    ],
  },
  {
    id: "monthly-board",
    name: "Monthly Board Pack",
    audience: "Board",
    cadence: "Monthly",
    summary: "Month-to-date assurance for board review — print ready.",
    sections: [
      "MTD executive snapshot",
      "RAG movement",
      "Major incidents",
      "Risk register",
      "License & capacity",
      "Decisions required",
    ],
  },
  {
    id: "custom",
    name: "Custom report",
    audience: "Ops",
    cadence: "On demand",
    summary: "Build your own pack — pick sections and customers, then print.",
    sections: [],
  },
];

export function getAmsTemplate(id: string | null | undefined) {
  return AMS_REPORT_TEMPLATES.find((t) => t.id === id) ?? null;
}
