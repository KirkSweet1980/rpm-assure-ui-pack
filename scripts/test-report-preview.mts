import { getDemoPortfolio } from "../src/lib/data/demo-portfolio";
import { fillCustomerPanels } from "../src/lib/data/fill-customer-panels";
import { buildApplicationsAmsHtml } from "../src/lib/mail/ams-report-html";
import type { CustomerDetailPayload, PortfolioRow } from "../src/lib/data/types";

function emptyCustomerDetail(row: PortfolioRow): CustomerDetailPayload {
  return {
    customer: row,
    operators: [],
    recentLogins: [],
    jobErrors: [],
    dtrLevel1: [],
    license: null,
    healthLogs: [],
    taskGroups: [],
    taskItems: [],
    incidents: [],
    problems: [],
    risks: [],
    issues: [],
    priorities: [],
    slaPolicies: [],
    availabilitySla: null,
    changes: [],
    csat: null,
    operGroups: [],
    operAmends: [],
    securitySummary: {
      groupMemberships: 0,
      distinctOperatorsInGroups: 0,
      distinctGroups: 0,
      amendCount90d: 0,
    },
    execSummary: null,
    execNarratives: [],
    auditEvents: [],
    diagSummaries: [],
    sqlHealthRows: [],
    extraSummary: {
      auditCount: 0,
      diagCount: 0,
      sqlHealthCount: 0,
      sqlHealthFailCount: 0,
      lastAuditImport: null,
    },
    operationalAssurance: {
      collectAgeHours: null,
      collectFresh: false,
      jobErrorCount: row.sysproJobErrorCount,
      activeUserRatioPct: null,
      dtrOutOfBalance: row.sysproDtrVarianceLines,
      scorePct: 55,
      summary: row.healthSummary || "portfolio only",
    },
    sqlBackups: [],
    sqlBackupFailures: [],
    sysproVersion: null,
    sysproHotfixes: [],
    hotfixGap: [],
    hotfixGapSummary: null,
    dataMode: "live",
  };
}

const portfolio = getDemoPortfolio();
const row = portfolio.rows[0]!;
const customer = fillCustomerPanels(emptyCustomerDetail(row));
const pack = buildApplicationsAmsHtml({ customer, portfolio });
console.log("fallback ams ok", pack.html.length, pack.subject);
console.log("SUCCESS");
