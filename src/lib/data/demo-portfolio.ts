import type {
  PortfolioPayload,
  CustomerDetailPayload,
  PortfolioRow,
  OperatorRow,
  JobErrorRow,
  DtrLevel1Row,
} from "./types";
import { formatSastDate } from "@/lib/utils";
import { fillCustomerPanels } from "./fill-customer-panels";

const NOW = new Date().toISOString();
const TODAY = NOW.slice(0, 10);
const EXPIRY = new Date(Date.now() + 200 * 86400000).toISOString();

const baseRows: PortfolioRow[] = [
  {
    customerCode: "AHIC",
    displayName: "AHI Carriers",
    asOfDate: TODAY,
    healthRag: "Amber",
    healthSummary: "6 SYSPRO job error(s) — below Red threshold (10). Ops 80.",
    activeUserCount: 19,
    operatorCount: 80,
    sysproJobErrorCount: 6,
    sysproDtrVarianceLines: 68,
    lastImportAt: NOW,
    reportingPeriod: formatSastDate(NOW),
    coveDeviceCount: 4,
    coveOkDeviceCount: 3,
    coveStaleDeviceCount: 1,
    coveFailedDeviceCount: 0,
    coveLastImportAt: NOW,
  },
  {
    customerCode: "UVSS",
    displayName: "Unique Ventilation Systems",
    asOfDate: TODAY,
    healthRag: "Amber",
    healthSummary: "6 SYSPRO job error(s) — below Red threshold (10). Ops 35.",
    activeUserCount: 20,
    operatorCount: 35,
    sysproJobErrorCount: 6,
    sysproDtrVarianceLines: 0,
    lastImportAt: NOW,
    reportingPeriod: formatSastDate(NOW),
    coveDeviceCount: 2,
    coveOkDeviceCount: 2,
    coveStaleDeviceCount: 0,
    coveFailedDeviceCount: 0,
    coveLastImportAt: NOW,
  },
  {
    customerCode: "RSR",
    displayName: "Redsun Raisins",
    asOfDate: TODAY,
    healthRag: "Green",
    healthSummary: "Healthy — operators collected, no job errors / FinSight variance.",
    activeUserCount: 8,
    operatorCount: 24,
    sysproJobErrorCount: 0,
    sysproDtrVarianceLines: 0,
    lastImportAt: NOW,
    reportingPeriod: formatSastDate(NOW),
  },
  {
    customerCode: "SIRF",
    displayName: "Sir Fruit",
    asOfDate: TODAY,
    healthRag: "Green",
    healthSummary: "Pilot — clean jobs and Out of Balance.",
    activeUserCount: 6,
    operatorCount: 18,
    sysproJobErrorCount: 0,
    sysproDtrVarianceLines: 0,
    lastImportAt: NOW,
    reportingPeriod: formatSastDate(NOW),
  },
  {
    customerCode: "RPMINT",
    displayName: "RPM Resources",
    asOfDate: TODAY,
    healthRag: "Green",
    healthSummary: "Internal reference estate.",
    activeUserCount: 4,
    operatorCount: 12,
    sysproJobErrorCount: 0,
    sysproDtrVarianceLines: 0,
    lastImportAt: NOW,
    reportingPeriod: formatSastDate(NOW),
  },
];

const sampleOperatorsAhic: OperatorRow[] = [
  { operatorCode: "ADMIN", operatorName: "RPM RESOURCES", lastLoginDate: NOW, operatorStatus: "Active", snapshotDate: TODAY },
  { operatorCode: "AHIADMIN", operatorName: "AHI ADMIN - SUPER USER", lastLoginDate: NOW, operatorStatus: "Active", snapshotDate: TODAY },
  { operatorCode: "AHITEST", operatorName: "TEST", lastLoginDate: NOW, operatorStatus: "Active", snapshotDate: TODAY },
  { operatorCode: "CHANTAL", operatorName: "Chantal Govender", lastLoginDate: NOW, operatorStatus: "Active", snapshotDate: TODAY },
  { operatorCode: "LEVONA", operatorName: "Levona", lastLoginDate: NOW, operatorStatus: "Active", snapshotDate: TODAY },
  { operatorCode: "AADIL", operatorName: "AADIL ELAVIA", lastLoginDate: null, operatorStatus: "Active", snapshotDate: TODAY },
];

const sampleJobs: JobErrorRow[] = [
  { programName: "IMP010", operator: "CHANTAL", message: "Program attempted to begin a SQL transaction but already started", errorStatusCode: "R", progErrorCode: 99, progRunDate: NOW },
  { programName: "IMP010", operator: "CHANTAL", message: "SQL transaction conflict", errorStatusCode: "R", progErrorCode: 99, progRunDate: NOW },
  { programName: "IMPFRM", operator: "CHANTAL", message: "Form import warning", errorStatusCode: null, progErrorCode: 7, progRunDate: NOW },
  { programName: "IMP041", operator: "LEVONA", message: "Import validation", errorStatusCode: null, progErrorCode: 13, progRunDate: NOW },
];

const sampleDtrAhic: DtrLevel1Row[] = [
  { balanceTypeCode: "AP", balanceTypeName: "Accounts Payable", varianceLineCount: 8, totalLineCount: 9, totalVariance: 29058399, absVariance: 30701906, totalCloseBalance: 135538082, asOfDate: TODAY },
  { balanceTypeCode: "AR", balanceTypeName: "Accounts Receivable", varianceLineCount: 3, totalLineCount: 9, totalVariance: 66, absVariance: 15974, totalCloseBalance: 266492765, asOfDate: TODAY },
  { balanceTypeCode: "CB", balanceTypeName: "Cashbook", varianceLineCount: 20, totalLineCount: 20, totalVariance: 29223358, absVariance: 29223358, totalCloseBalance: 242607296, asOfDate: TODAY },
  { balanceTypeCode: "DN", balanceTypeName: "Dispatch Notes", varianceLineCount: 19, totalLineCount: 21, totalVariance: 3085329, absVariance: 50917860, totalCloseBalance: 0, asOfDate: TODAY },
  { balanceTypeCode: "INV", balanceTypeName: "Inventory", varianceLineCount: 8, totalLineCount: 9, totalVariance: 22708, absVariance: 62508, totalCloseBalance: 393437095, asOfDate: TODAY },
  { balanceTypeCode: "WIP", balanceTypeName: "Work In Progress", varianceLineCount: 8, totalLineCount: 9, totalVariance: -33955728, absVariance: 36974630, totalCloseBalance: 18517461, asOfDate: TODAY },
  { balanceTypeCode: "GIT", balanceTypeName: "Goods In Transit", varianceLineCount: 1, totalLineCount: 13, totalVariance: 30587, absVariance: 30587, totalCloseBalance: 1524246, asOfDate: TODAY },
  { balanceTypeCode: "GRN", balanceTypeName: "GRN Suspense", varianceLineCount: 1, totalLineCount: 10, totalVariance: -56700, absVariance: 56700, totalCloseBalance: 63180712, asOfDate: TODAY },
];

function ragOrder(r: string) {
  return r === "Red" ? 0 : r === "Amber" ? 1 : 2;
}

export function getDemoPortfolio(): PortfolioPayload {
  const rows = [...baseRows].sort(
    (a, b) => ragOrder(a.healthRag) - ragOrder(b.healthRag) || a.customerCode.localeCompare(b.customerCode),
  );
  const boards = rows.map((row, i) => {
    const collectFresh = !!row.lastImportAt;
    const healthScorePct =
      row.healthRag === "Green" ? 90 : row.healthRag === "Amber" ? 58 : 30;
    const assuranceScorePct = Math.round(
      healthScorePct * 0.55 + (collectFresh ? 100 : 30) * 0.25 + (row.sysproJobErrorCount === 0 ? 100 : 45) * 0.2,
    );
    const attentionReasons: string[] = [];
    if (row.healthRag !== "Green") attentionReasons.push(`Health ${row.healthRag}`);
    if (!collectFresh) attentionReasons.push("No collect");
    if (row.sysproJobErrorCount > 0) attentionReasons.push(`${row.sysproJobErrorCount} job error(s)`);
    if (row.sysproDtrVarianceLines > 0) attentionReasons.push(`${row.sysproDtrVarianceLines} FinSight Out of Balance`);
    const licenseDays = 45 + i * 40;
    if (licenseDays <= 90) attentionReasons.push(`License ${licenseDays}d`);
    return {
      customerCode: row.customerCode,
      displayName: row.displayName,
      healthRag: row.healthRag,
      healthSummary: row.healthSummary,
      healthScorePct,
      assuranceScorePct,
      collectAgeHours: collectFresh ? 1 + i : null,
      collectFresh,
      lastImportAt: row.lastImportAt,
      activeUserCount: row.activeUserCount,
      operatorCount: row.operatorCount,
      jobErrorCount: row.sysproJobErrorCount,
      dtrVarianceLines: row.sysproDtrVarianceLines,
      slaCompliancePct: row.healthRag === "Green" ? 98 : 91,
      availabilityPct: row.healthRag === "Green" ? 99.7 : 99.1,
      licenseExpiry: EXPIRY,
      licenseProduct: "SYSPRO 8",
      licenseDaysRemaining: licenseDays,
      openRiskCount: row.healthRag === "Amber" ? 2 : 1,
      openIssueCount: row.sysproDtrVarianceLines > 0 ? 1 : 0,
      lastFullBackup: NOW,
      backupStatus: "Succeeded",
      backupHealthy: true as boolean | null,
      sysproVersion: i % 2 === 0 ? "8.10.0000" : "8.11.0000",
      sysproBuild: i % 2 === 0 ? "8.0.0.0040a" : "8.0.0.0041",
      installedHotfixCount: 200 + i * 40,
      lastHotfixAt: NOW,
      sampleHotfixCode: i % 2 === 0 ? "KB8101329" : "KB8111156",
      missingHotfixCount: i % 3 === 0 ? 12 : 4,
      missingMandatoryHotfixes: i % 3 === 0 ? 2 : 0,
      attentionReasons,
    };
  });
  const hfTotal = boards.reduce((s, b) => s + b.installedHotfixCount, 0);
  return {
    summary: {
      totalCustomers: rows.length,
      red: rows.filter((r) => r.healthRag === "Red").length,
      amber: rows.filter((r) => r.healthRag === "Amber").length,
      green: rows.filter((r) => r.healthRag === "Green").length,
      totalActiveUsers: rows.reduce((s, r) => s + r.activeUserCount, 0),
      totalOperators: rows.reduce((s, r) => s + r.operatorCount, 0),
      dataMode: "demo",
      generatedAt: NOW,
    },
    rows,
    customers: rows,
    dataMode: "demo" as const,
    exco: {
      generatedAt: NOW,
      estateAssurancePct: Math.round(
        boards.reduce((s, b) => s + b.assuranceScorePct, 0) / Math.max(1, boards.length),
      ),
      customersNeedingAttention: boards.filter((b) => b.attentionReasons.length > 0).length,
      collectFreshCount: boards.filter((b) => b.collectFresh).length,
      collectStaleCount: 0,
      collectMissingCount: boards.filter((b) => !b.collectFresh).length,
      licensesExpiringSoon: boards.filter(
        (b) => b.licenseDaysRemaining != null && b.licenseDaysRemaining <= 90,
      ).length,
      openRisksTotal: boards.reduce((s, b) => s + b.openRiskCount, 0),
      openIssuesTotal: boards.reduce((s, b) => s + b.openIssueCount, 0),
      backupUnhealthyCount: 0,
      installedHotfixesTotal: hfTotal,
      customersWithHotfixes: boards.filter((b) => b.installedHotfixCount > 0).length,
      customersMissingHotfixes: boards.filter((b) => b.installedHotfixCount === 0).length,
      boards,
    },
  };
}


function sampleDtrDetailAhic(): import("@/lib/data/types").DtrDetailLine[] {
  const snap = "2026-08-06";
  return [
    { balanceTypeCode: "AP", informationLevel: 1, levelKey: "AP-L1", parentLevelKey: null, glCode: "2000", dimension1: null, description: "AP control total", subCloseBalance: 135538082, glCloseBalance: 106479683, variance: 29058399, snapshotDate: snap },
    { balanceTypeCode: "AP", informationLevel: 2, levelKey: "AP-L2-LOCAL", parentLevelKey: "AP-L1", glCode: "2000", dimension1: "LOCAL", description: "Local creditors", subCloseBalance: 80000000, glCloseBalance: 60000000, variance: 20000000, snapshotDate: snap },
    { balanceTypeCode: "AP", informationLevel: 2, levelKey: "AP-L2-IMPORT", parentLevelKey: "AP-L1", glCode: "2010", dimension1: "IMPORT", description: "Import creditors", subCloseBalance: 55538082, glCloseBalance: 46479683, variance: 9058399, snapshotDate: snap },
    { balanceTypeCode: "AP", informationLevel: 3, levelKey: "AP-L3-A", parentLevelKey: "AP-L2-LOCAL", glCode: "2000", dimension1: "A01", description: "Supplier group A", subCloseBalance: 45000000, glCloseBalance: 30000000, variance: 15000000, snapshotDate: snap },
    { balanceTypeCode: "AP", informationLevel: 3, levelKey: "AP-L3-B", parentLevelKey: "AP-L2-LOCAL", glCode: "2000", dimension1: "B01", description: "Supplier group B", subCloseBalance: 35000000, glCloseBalance: 30000000, variance: 5000000, snapshotDate: snap },
    { balanceTypeCode: "AP", informationLevel: 3, levelKey: "AP-L3-C", parentLevelKey: "AP-L2-IMPORT", glCode: "2010", dimension1: "IMP01", description: "Import freight & duty creditors", subCloseBalance: 32000000, glCloseBalance: 28000000, variance: 4000000, snapshotDate: snap },
    { balanceTypeCode: "AP", informationLevel: 3, levelKey: "AP-L3-D", parentLevelKey: "AP-L2-IMPORT", glCode: "2010", dimension1: "IMP02", description: "Overseas OEM suppliers", subCloseBalance: 23538082, glCloseBalance: 18479683, variance: 5058399, snapshotDate: snap },
    { balanceTypeCode: "INV", informationLevel: 1, levelKey: "INV-L1", parentLevelKey: null, glCode: "1400", dimension1: null, description: "Inventory control", subCloseBalance: 393437095, glCloseBalance: 393414387, variance: 22708, snapshotDate: snap },
    { balanceTypeCode: "INV", informationLevel: 2, levelKey: "INV-L2-WH1", parentLevelKey: "INV-L1", glCode: "1400", dimension1: "WH1", description: "Warehouse 1", subCloseBalance: 200000000, glCloseBalance: 199990000, variance: 10000, snapshotDate: snap },
    { balanceTypeCode: "INV", informationLevel: 2, levelKey: "INV-L2-WH2", parentLevelKey: "INV-L1", glCode: "1400", dimension1: "WH2", description: "Warehouse 2", subCloseBalance: 193437095, glCloseBalance: 193424387, variance: 12708, snapshotDate: snap },
    { balanceTypeCode: "INV", informationLevel: 3, levelKey: "INV-L3-FG", parentLevelKey: "INV-L2-WH1", glCode: "1400", dimension1: "FG", description: "Finished goods", subCloseBalance: 120000000, glCloseBalance: 119995000, variance: 5000, snapshotDate: snap },
    { balanceTypeCode: "INV", informationLevel: 3, levelKey: "INV-L3-RM", parentLevelKey: "INV-L2-WH1", glCode: "1400", dimension1: "RM", description: "Raw materials", subCloseBalance: 80000000, glCloseBalance: 79995000, variance: 5000, snapshotDate: snap },
    { balanceTypeCode: "INV", informationLevel: 3, levelKey: "INV-L3-SP", parentLevelKey: "INV-L2-WH2", glCode: "1400", dimension1: "SP", description: "Spares stock", subCloseBalance: 93437095, glCloseBalance: 93424387, variance: 12708, snapshotDate: snap },
    { balanceTypeCode: "CB", informationLevel: 1, levelKey: "CB-L1", parentLevelKey: null, glCode: "1100", dimension1: null, description: "Cashbook control", subCloseBalance: 242607296, glCloseBalance: 213383938, variance: 29223358, snapshotDate: snap },
    { balanceTypeCode: "CB", informationLevel: 2, levelKey: "CB-L2-MAIN", parentLevelKey: "CB-L1", glCode: "1100", dimension1: "MAIN", description: "Main bank", subCloseBalance: 180000000, glCloseBalance: 160000000, variance: 20000000, snapshotDate: snap },
    { balanceTypeCode: "CB", informationLevel: 2, levelKey: "CB-L2-CFC", parentLevelKey: "CB-L1", glCode: "1110", dimension1: "CFC", description: "CFC USD account", subCloseBalance: 62607296, glCloseBalance: 53383938, variance: 9223358, snapshotDate: snap },
    { balanceTypeCode: "CB", informationLevel: 3, levelKey: "CB-L3-MAIN-OP", parentLevelKey: "CB-L2-MAIN", glCode: "1100", dimension1: "OP", description: "Operating current account", subCloseBalance: 120000000, glCloseBalance: 105000000, variance: 15000000, snapshotDate: snap },
    { balanceTypeCode: "CB", informationLevel: 3, levelKey: "CB-L3-MAIN-CALL", parentLevelKey: "CB-L2-MAIN", glCode: "1100", dimension1: "CALL", description: "Call deposit", subCloseBalance: 60000000, glCloseBalance: 55000000, variance: 5000000, snapshotDate: snap },
    { balanceTypeCode: "CB", informationLevel: 3, levelKey: "CB-L3-CFC-USD", parentLevelKey: "CB-L2-CFC", glCode: "1110", dimension1: "USD", description: "USD CFC ledger", subCloseBalance: 62607296, glCloseBalance: 53383938, variance: 9223358, snapshotDate: snap },
    { balanceTypeCode: "AR", informationLevel: 1, levelKey: "AR-L1", parentLevelKey: null, glCode: "1600", dimension1: null, description: "AR control total", subCloseBalance: 48220000, glCloseBalance: 48150000, variance: 70000, snapshotDate: snap },
    { balanceTypeCode: "AR", informationLevel: 2, levelKey: "AR-L2-LOCAL", parentLevelKey: "AR-L1", glCode: "1600", dimension1: "LOCAL", description: "Local debtors", subCloseBalance: 35000000, glCloseBalance: 34950000, variance: 50000, snapshotDate: snap },
    { balanceTypeCode: "AR", informationLevel: 2, levelKey: "AR-L2-EXPORT", parentLevelKey: "AR-L1", glCode: "1610", dimension1: "EXPORT", description: "Export debtors", subCloseBalance: 13220000, glCloseBalance: 13200000, variance: 20000, snapshotDate: snap },
    { balanceTypeCode: "AR", informationLevel: 3, levelKey: "AR-L3-TOP", parentLevelKey: "AR-L2-LOCAL", glCode: "1600", dimension1: "TOP10", description: "Top 10 local customers", subCloseBalance: 21000000, glCloseBalance: 20970000, variance: 30000, snapshotDate: snap },
    { balanceTypeCode: "AR", informationLevel: 3, levelKey: "AR-L3-REST", parentLevelKey: "AR-L2-LOCAL", glCode: "1600", dimension1: "REST", description: "Other local customers", subCloseBalance: 14000000, glCloseBalance: 13980000, variance: 20000, snapshotDate: snap },
    { balanceTypeCode: "AR", informationLevel: 3, levelKey: "AR-L3-EXP", parentLevelKey: "AR-L2-EXPORT", glCode: "1610", dimension1: "EXP", description: "Export invoices open", subCloseBalance: 13220000, glCloseBalance: 13200000, variance: 20000, snapshotDate: snap },
    { balanceTypeCode: "WIP", informationLevel: 1, levelKey: "WIP-L1", parentLevelKey: null, glCode: "1500", dimension1: null, description: "WIP control", subCloseBalance: 18450000, glCloseBalance: 18410000, variance: 40000, snapshotDate: snap },
    { balanceTypeCode: "WIP", informationLevel: 2, levelKey: "WIP-L2-SVC", parentLevelKey: "WIP-L1", glCode: "1500", dimension1: "SVC", description: "Service jobs", subCloseBalance: 10200000, glCloseBalance: 10180000, variance: 20000, snapshotDate: snap },
    { balanceTypeCode: "WIP", informationLevel: 2, levelKey: "WIP-L2-PRJ", parentLevelKey: "WIP-L1", glCode: "1510", dimension1: "PRJ", description: "Project jobs", subCloseBalance: 8250000, glCloseBalance: 8230000, variance: 20000, snapshotDate: snap },
    { balanceTypeCode: "WIP", informationLevel: 3, levelKey: "WIP-L3-S1", parentLevelKey: "WIP-L2-SVC", glCode: "1500", dimension1: "S-1001", description: "Job S-1001 CMS repair", subCloseBalance: 5200000, glCloseBalance: 5190000, variance: 10000, snapshotDate: snap },
    { balanceTypeCode: "WIP", informationLevel: 3, levelKey: "WIP-L3-S2", parentLevelKey: "WIP-L2-SVC", glCode: "1500", dimension1: "S-1044", description: "Job S-1044 maintenance", subCloseBalance: 5000000, glCloseBalance: 4990000, variance: 10000, snapshotDate: snap },
    { balanceTypeCode: "WIP", informationLevel: 3, levelKey: "WIP-L3-P1", parentLevelKey: "WIP-L2-PRJ", glCode: "1510", dimension1: "P-220", description: "Project P-220 modernisation", subCloseBalance: 8250000, glCloseBalance: 8230000, variance: 20000, snapshotDate: snap },
  ];
}

function sampleReconAhic(): import("@/lib/data/types").FinSightReconCase[] {
  return [
    {
      reconCaseId: "demo-ap-1",
      customerCode: "AHIC",
      balanceTypeCode: "AP",
      snapshotDate: "2026-08-06",
      status: "Investigating",
      oobLines: 8,
      absVariance: 30701906,
      closeBalance: 135538082,
      ownerName: "RPM Assure Finance",
      title: "AP control recon — 8 Out of Balance lines",
      notes: "Auto-opened from FinSight L1. Drill L2 LOCAL first.",
      sourceLevel: 1,
      levelKey: null,
      createdAtUtc: new Date().toISOString(),
      updatedAtUtc: new Date().toISOString(),
    },
    {
      reconCaseId: "demo-cb-1",
      customerCode: "AHIC",
      balanceTypeCode: "CB",
      snapshotDate: "2026-08-06",
      status: "Open",
      oobLines: 20,
      absVariance: 29223358,
      closeBalance: 242607296,
      ownerName: null,
      title: "Cashbook control recon — all L1 lines out of balance",
      notes: null,
      sourceLevel: 1,
      levelKey: null,
      createdAtUtc: new Date().toISOString(),
      updatedAtUtc: new Date().toISOString(),
    },
  ];
}

export function getDemoCustomerDetail(code: string): CustomerDetailPayload | null {
  const customer = baseRows.find((r) => r.customerCode.toUpperCase() === code.toUpperCase());
  if (!customer) {
    // Unknown code still gets a full shell so tree never 404s in demo
    const synthetic: PortfolioRow = {
      customerCode: code.toUpperCase(),
      displayName: code.toUpperCase(),
      asOfDate: TODAY,
      healthRag: "Amber",
      healthSummary: "Demo customer shell.",
      activeUserCount: 5,
      operatorCount: 10,
      sysproJobErrorCount: 0,
      sysproDtrVarianceLines: 0,
      lastImportAt: NOW,
      reportingPeriod: formatSastDate(NOW),
    };
    return fillCustomerPanels({
      customer: synthetic,
      operators: [],
      recentLogins: [],
      jobErrors: [],
      dtrLevel1: [],
      dtrDetailLines: [],
      finsightReconCases: [],
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
        collectAgeHours: 2,
        collectFresh: true,
        jobErrorCount: 0,
        activeUserRatioPct: 50,
        dtrOutOfBalance: 0,
        scorePct: 75,
        summary: "Demo shell",
      },
      sqlBackups: [],
      sqlBackupFailures: [],
      sysproVersion: null,
      sysproHotfixes: [],
      hotfixGap: [],
      hotfixGapSummary: null,
      dayEnd: null,
      rmm: {
        enabled: false,
        pillarOn: false,
        pulsewayOrgName: null,
        summary: null,
        devices: [],
        alerts: [],
        mapping: [],
        agentIops: [],
        windowsEvents: [],
        message: "Demo shell — RMM leg inactive",
      },
      cove: {
        enabled: false,
        summary: null,
        devices: [],
        mapping: [],
        unmapped: [],
        message: null,
      },
      dataMode: "demo",
    });
  }

  const isAhic = customer.customerCode === "AHIC";
  const isUvss = customer.customerCode === "UVSS";

  const operators: OperatorRow[] =
    isAhic || isUvss
      ? [
          ...(isAhic ? sampleOperatorsAhic : sampleOperatorsAhic.slice(0, 4).map((o, i) => ({
            ...o,
            operatorCode: `U${o.operatorCode}`,
            operatorName: o.operatorName,
          }))),
          ...Array.from(
            { length: Math.max(0, customer.operatorCount - 6) },
            (_, i) => ({
              operatorCode: `OP${String(i + 1).padStart(3, "0")}`,
              operatorName: `Operator ${i + 1}`,
              lastLoginDate: i < customer.activeUserCount ? NOW : null,
              operatorStatus: "Active",
              snapshotDate: TODAY,
            }),
          ),
        ]
      : Array.from({ length: customer.operatorCount }, (_, i) => ({
          operatorCode: `OP${String(i + 1).padStart(3, "0")}`,
          operatorName: `Operator ${i + 1}`,
          lastLoginDate: i < customer.activeUserCount ? NOW : null,
          operatorStatus: "Active",
          snapshotDate: TODAY,
        }));

  const recentLogins = operators
    .filter((o) => o.lastLoginDate)
    .slice(0, 15);

  const raw: CustomerDetailPayload = {
    customer,
    operators,
    recentLogins,
    jobErrors: customer.sysproJobErrorCount > 0 ? sampleJobs : [],
    dtrLevel1: isAhic ? sampleDtrAhic : [],
    dtrDetailLines: isAhic ? sampleDtrDetailAhic() : [],
    finsightReconCases: isAhic ? sampleReconAhic() : [],
    license: {
      productName: "SYSPRO 8",
      productVersion: "8.0",
      licenseType: "Named",
      users: isAhic ? 80 : isUvss ? 35 : 16,
      companyCount: isUvss ? 5 : 3,
      licenseExpiry: EXPIRY,
      customerName: customer.displayName,
      importDate: NOW,
    },
    healthLogs: [],
    taskGroups: [],
    taskItems: [],
    problems: [],
    risks: [],
    issues: [],
    priorities: [],
    incidents: isAhic
      ? [
          {
            incidentId: "demo-i1",
            title: "IMP010 transaction abort — production posting",
            severity: "High",
            status: "InProgress",
            priority: "High",
            openedAt: new Date(Date.now() - 3 * 3600e3).toISOString(),
            firstResponseAt: new Date(Date.now() - 2 * 3600e3).toISOString(),
            isMajor: false,
            responseSlaMet: true,
            resolveSlaMet: null,
            respondMins: 240,
            resolveMins: 480,
            responseMinsElapsed: 60,
            ownerName: "RPM Assure Ops",
            sourceSystem: "RPM Assure",
          },
          {
            incidentId: "demo-i2",
            title: "FinSight AP control out of balance",
            severity: "Medium",
            status: "New",
            priority: "Medium",
            openedAt: new Date(Date.now() - 5 * 3600e3).toISOString(),
            isMajor: false,
            responseSlaMet: null,
            resolveSlaMet: null,
            respondMins: 480,
            resolveMins: 1440,
            responseMinsElapsed: 300,
            sourceSystem: "FinSight",
          },
        ]
      : [],
    amsSlaSummary: isAhic
      ? {
          incidentCount30d: 4,
          openCount: 2,
          majorOpenCount: 0,
          responsePct: 75,
          resolvePct: 50,
          responseBreach: 1,
          resolveBreach: 1,
        }
      : null,
    slaPolicies: [],
    availabilitySla: isAhic
      ? {
          periodFrom: null,
          periodTo: null,
          availabilityPct: 99.82,
          availabilitySlaPct: null,
          slaResponsePct: 75,
          slaResolvePct: 50,
          slaCompliancePct: 62.5,
          source: "live-incident",
          note: "Demo: computed from sample Fact_Incident clocks",
          incidentCount30d: 4,
          responseBreachCount: 1,
          resolveBreachCount: 1,
        }
      : null,
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
      collectAgeHours: 2,
      collectFresh: true,
      jobErrorCount: customer.sysproJobErrorCount,
      activeUserRatioPct:
        customer.operatorCount > 0
          ? Math.round((customer.activeUserCount / customer.operatorCount) * 100)
          : null,
      dtrOutOfBalance: customer.sysproDtrVarianceLines,
      scorePct: customer.healthRag === "Green" ? 92 : 68,
      summary: customer.healthSummary,
    },
    sqlBackups: [],
    sqlBackupFailures: [],
    sysproVersion: null,
    sysproHotfixes: [],
    hotfixGap: [],
    hotfixGapSummary: null,
    cover: {
        syspro: true,
        rmm: isAhic,
        cove: isAhic,
      },
      rmm: {
      enabled: isAhic,
      pillarOn: isAhic,
      pulsewayOrgName: isAhic ? "AHI Carriers" : null,
      summary: isAhic
        ? {
            asOfDate: TODAY,
            organizationName: "AHI Carriers",
            deviceCount: 12,
            onlineCount: 10,
            offlineCount: 2,
            maintenanceCount: 0,
            criticalAlerts: 1,
            elevatedAlerts: 2,
            diskHighCount: 1,
            serverCount: 4,
            workstationCount: 8,
            notificationCount: 3,
            healthRag: "Amber",
            healthSummary: "Offline=2 Critical=1 Devices=12",
            lastImportAt: NOW,
          }
        : null,
      devices: isAhic
        ? [
            {
              deviceId: "DEMO-AHIC-DC01",
              name: "AHI-DC01",
              isOnline: true,
              osName: "Windows Server 2022",
              deviceType: "Server",
              criticalNotifications: 0,
              elevatedNotifications: 0,
              lastSeenOnline: NOW,
              organizationName: "AHI Carriers",
              ipAddress: "10.10.1.10",
              cpuPct: 22,
              memoryPct: 61,
              onlinePct: 99.8,
              disks: [
                { driveLetter: "C:", totalGb: 120, freeGb: 48, usedPct: 60 },
                { driveLetter: "D:", totalGb: 500, freeGb: 210, usedPct: 58 },
              ],
            },
            {
              deviceId: "DEMO-AHIC-FS01",
              name: "AHI-FS01",
              isOnline: false,
              osName: "Windows Server 2019",
              deviceType: "Server",
              criticalNotifications: 1,
              elevatedNotifications: 0,
              lastSeenOnline: NOW,
              organizationName: "AHI Carriers",
              ipAddress: "10.10.1.20",
              cpuPct: 0,
              memoryPct: 0,
              onlinePct: 0,
              disks: [
                { driveLetter: "C:", totalGb: 200, freeGb: 16, usedPct: 92 },
                { driveLetter: "E:", totalGb: 2000, freeGb: 400, usedPct: 80 },
              ],
            },
            {
              deviceId: "DEMO-AHIC-WS01",
              name: "AHI-ACC01",
              isOnline: true,
              osName: "Windows 11",
              deviceType: "Workstation",
              criticalNotifications: 0,
              elevatedNotifications: 1,
              lastSeenOnline: NOW,
              organizationName: "AHI Carriers",
              ipAddress: "10.10.2.45",
              cpuPct: 38,
              memoryPct: 72,
              onlinePct: 97.2,
              disks: [
                { driveLetter: "C:", totalGb: 512, freeGb: 90, usedPct: 82.4 },
              ],
            },
          ]
        : [],
      alerts: isAhic
        ? [
            {
              notificationId: "DEMO-N1",
              deviceId: "DEMO-AHIC-FS01",
              deviceName: "AHI-FS01",
              severity: "Critical",
              title: "Agent offline",
              message: "Device not reporting",
              raisedAt: NOW,
              isActive: true,
            },
          ]
        : [],
      mapping: isAhic
        ? [
            {
              organizationName: "AHI Carriers",
              organizationId: 1001,
              active: true,
              notes: "Demo map",
            },
          ]
        : [],
      agentIops: [],
      windowsEvents: [],
      message: isAhic ? null : "RMM not enabled for this demo customer",
    },
    cove: {
      enabled: true,
      summary: {
        asOfDate: TODAY,
        deviceCount: 4,
        okCount: 3,
        staleCount: 1,
        failedCount: 0,
        unknownCount: 0,
        lastImportAt: NOW,
        lastSuccessAny: NOW,
        healthRag: "Amber" as const,
        healthSummary: "1 device(s) stale backup of 4.",
      },
      devices: [
        {
          accountId: 1,
          deviceName: "AHIC-SRV01",
          machineName: "AHIC-SRV01",
          partnerName: "AHI Carriers",
          partnerId: 2602886,
          usedBytes: 12000000000,
          lastSuccessTime: NOW,
          lastBackupStatus: "OK",
          snapshotDate: TODAY,
          importedAt: NOW,
        },
        {
          accountId: 2,
          deviceName: "AHIC-FS01",
          machineName: "AHIC-FS01",
          partnerName: "AHI Carriers",
          partnerId: 2602886,
          usedBytes: 8000000000,
          lastSuccessTime: NOW,
          lastBackupStatus: "Stale",
          snapshotDate: TODAY,
          importedAt: NOW,
        },
      ],
      mapping: [
        {
          partnerName: "AHI Carriers",
          partnerId: 2602886,
          customerCode: "AHIC",
          active: true,
          notes: "Demo seed",
        },
      ],
      unmapped: [],
      message: null,
    },
    dataMode: "demo",
  };

  return fillCustomerPanels(raw);
}
