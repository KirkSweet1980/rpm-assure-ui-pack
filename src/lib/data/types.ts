export type HealthRag = "Red" | "Amber" | "Green" | "Off";

/** Which managed services are in scope for this customer */
export type CustomerCover = {
  syspro: boolean;
  rmm: boolean;
  cove: boolean;
  /** RPM EPP — live warehouse endpoints only */
  epp?: boolean;
  /** Microsoft CSP / 365 licensing — future collect */
  csp?: boolean;
  /** Freshdesk customer tickets */
  tickets?: boolean;
  /** Freshdesk-only / no agent — visible, not scored */
  dormant?: boolean;
};


export type PortfolioRow = {
  customerCode: string;
  displayName: string;
  active?: boolean;
  sqlInstanceName?: string | null;
  asOfDate: string | null;
  healthRag: HealthRag;
  healthSummary: string;
  operatorCount: number;
  activeUserCount: number;
  lastImportAt: string | null;
  sysproJobErrorCount: number;
  sysproDtrVarianceLines: number;
  reportingPeriod?: string | null;
  coveDeviceCount?: number;
  coveFailedDeviceCount?: number;
  coveStaleDeviceCount?: number;
  coveOkDeviceCount?: number;
  coveLastImportAt?: string | null;
  pulsewayOfflineCount?: number;
  pulsewayDeviceCount?: number;
  pulsewayOnlineCount?: number;
  pulsewayCriticalAlerts?: number;
  pulsewayElevatedAlerts?: number;
  pulsewayLastImportAt?: string | null;
  pulsewayOrgName?: string | null;
  pulsewayHealthRag?: HealthRag | null;
  pulsewayHealthSummary?: string | null;
  /** Server agents online (latest Pulseway snap) */
  pulsewayServerOnline?: number;
  pulsewayServerOffline?: number;
  /** Workstation agents online / offline */
  pulsewayWorkstationOnline?: number;
  pulsewayWorkstationOffline?: number;
  pulsewayPatchMissing?: number;
  pulsewayPatchDevices?: number;
  pulsewayPatchCompliant?: number;
  pulsewayDiskHighCount?: number;
  bdInfectedCount?: number;
  eppDeviceCount?: number;
  eppManagedCount?: number;
  eppLastImportAt?: string | null;
  /** Microsoft 365 licensed users (latest snap) */
  cspUserCount?: number;
  cspLicenseSkuCount?: number;
  cspAssignedSeats?: number;
  cspTotalSeats?: number;
  cspLastImportAt?: string | null;
  cspPrimaryDomain?: string | null;
  /** EXCO posture (Secure Score / MFA / admins) — latest snapshot */
  cspSecureScorePct?: number | null;
  cspMfaRegisteredPct?: number | null;
  cspGlobalAdminCount?: number | null;
  cspGuestUserCount?: number | null;
  cspFailedSignIn7d?: number | null;
  /** Explicit service cover — false = show "No cover", do not score health */

  cover?: CustomerCover;
  pillarSyspro?: boolean | null;
  pillarPulseway?: boolean | null;
  pillarCove?: boolean | null;
  /** Maps from Dim_Customer_AmsConfig.PillarBitdefender */
  pillarEpp?: boolean | null;
  pillarCsp?: boolean | null;
  pulsewayMapped?: boolean | null;
  coveMapped?: boolean | null;
  eppMapped?: boolean | null;
  cspMapped?: boolean | null;
  ticketCount?: number | null;
  ticketsMapped?: boolean | null;
  ticketResponsePct?: number | null;
  ticketResolvePct?: number | null;
};

export type OperatorRow = {
  operatorCode: string;
  operatorName: string | null;
  networkUser?: string | null;
  email?: string | null;
  active?: boolean | null;
  lastLoginDate: string | null;
  groupCode?: string | null;
  operatorStatus?: string | null;
  snapshotDate?: string | null;
};

export type JobErrorRow = {
  programName: string | null;
  operator: string | null;
  message: string | null;
  errorStatusCode: string | null;
  progErrorCode: number | null;
  progRunDate: string | null;
  companyDb?: string | null;
};

export type DtrLevel1Row = {
  balanceTypeCode: string;
  balanceTypeName: string;
  varianceLineCount: number;
  sumVariance?: number | null;
  absVariance?: number | null;
  closeBalance?: number | null;
  lineCount?: number | null;
  totalLineCount?: number | null;
  totalCloseBalance?: number | null;
  totalVariance?: number | null;
  snapshotDate?: string | null;
  asOfDate?: string | null;
};

/** FinSight L1/L2/L3 line (control drill-down) */
export type DtrDetailLine = {
  balanceTypeCode: string;
  informationLevel: 1 | 2 | 3 | number;
  levelKey: string | null;
  parentLevelKey: string | null;
  glCode: string | null;
  dimension1: string | null;
  description: string | null;
  subCloseBalance: number | null;
  glCloseBalance: number | null;
  variance: number | null;
  snapshotDate: string | null;
  companyDb?: string | null;
  glYear?: number | null;
  glPeriod?: number | null;
  instanceName?: string | null;
};

export type FinSightReconStatus =
  | "Open"
  | "Investigating"
  | "WaitingFinance"
  | "Cleared"
  | "Accepted"
  | "Closed";

export type FinSightReconCase = {
  reconCaseId: string;
  customerCode: string;
  balanceTypeCode: string;
  snapshotDate: string | null;
  status: FinSightReconStatus;
  oobLines: number;
  absVariance: number | null;
  closeBalance: number | null;
  ownerName: string | null;
  title: string;
  notes: string | null;
  sourceLevel: number | null;
  levelKey: string | null;
  createdAtUtc: string | null;
  updatedAtUtc: string | null;
};

export type FinSightReconStep = {
  reconStepId: string;
  reconCaseId: string;
  stepAtUtc: string | null;
  actorName: string | null;
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
};

export type PortfolioSummary = {
  totalCustomers: number;
  red: number;
  amber: number;
  green: number;
  dormant?: number;
  totalActiveUsers: number;
  totalOperators: number;
  generatedAt: string;
  dataMode?: "demo" | "live" | "mixed";
};

export type CoveUnmappedPartner = {
  partnerName: string;
  partnerId: number | null;
  deviceCount: number;
  lastSnapshotDate: string | null;
  lastImportAt: string | null;
};

export type PortfolioPayload = {
  summary: PortfolioSummary;
  customers: PortfolioRow[];
  rows: PortfolioRow[];
  dataMode?: "demo" | "live" | "mixed";
  sqlError?: string | null;
  exco?: ExcoInsightPayload;
  pillarAudit?: PillarAuditSummary;
  coveUnmapped?: CoveUnmappedPartner[];
};

export type LicenseRow = {
  productName: string | null;
  productVersion: string | null;
  licenseType: string | null;
  users: number | null;
  companyCount?: number | null;
  licenseExpiry: string | null;
  customerName: string | null;
  importDate: string | null;
};

export type HealthLogRow = {
  logDate?: string | null;
  severity?: string | null;
  message?: string | null;
  source?: string | null;
  healthFunction?: string | null;
  description?: string | null;
  runDateTime?: string | null;
  statusFlag?: string | null;
  operator?: string | null;
};

export type TaskGroupRow = {
  operatorCode: string | null;
  taskGroup: string | null;
  description?: string | null;
  autoRun?: number | null;
  stopIfError?: number | null;
};

export type TaskItemRow = {
  operatorCode: string | null;
  taskGroup: string | null;
  description: string | null;
  programName: string | null;
  taskType: string | null;
  sequenceNumber: number | null;
};

export type FactIncidentRow = {
  incidentId?: string | null;
  title: string;
  severity: string;
  status: string;
  priority?: string | null;
  openedAt?: string | null;
  firstResponseAt?: string | null;
  resolvedAt?: string | null;
  isMajor?: boolean;
  externalRef?: string | null;
  ownerName?: string | null;
  sourceSystem?: string | null;
  businessImpact?: string | null;
  respondMins?: number | null;
  resolveMins?: number | null;
  responseMinsElapsed?: number | null;
  resolveMinsElapsed?: number | null;
  responseSlaMet?: boolean | null;
  resolveSlaMet?: boolean | null;
};

export type FactProblemRow = {
  title: string;
  status: string;
  severity: string | null;
  ownerName: string | null;
  openedAt?: string | null;
};

export type FactRiskRow = {
  title: string;
  rag: HealthRag | string;
  status: string;
  ownerName: string | null;
  targetDate?: string | null;
  mitigation?: string | null;
  category?: string | null;
};

export type FactIssueRow = {
  title: string;
  status: string;
  severity: string | null;
  ownerName: string | null;
  openedAt?: string | null;
  targetDate?: string | null;
};

export type FactPriorityRow = {
  title: string;
  detail: string | null;
  status: string;
  sortOrder: number;
  periodLabel: string | null;
  programCode: string | null;
};

export type SlaPolicyRow = {
  priority: string;
  respondMins: number | null;
  resolveMins: number | null;
  availabilityPct: number | null;
};

export type AvailabilitySlaSnapshot = {
  periodFrom: string | null;
  periodTo: string | null;
  availabilityPct: number | null;
  availabilitySlaPct: number | null;
  slaResponsePct: number | null;
  slaResolvePct: number | null;
  slaCompliancePct: number | null;
  source: "snapshot" | "stub" | "derived" | "live-incident" | "sla-period";
  /** Counts when source is live-incident */
  incidentCount30d?: number | null;
  responseBreachCount?: number | null;
  resolveBreachCount?: number | null;
  note?: string | null;
};

export type FactChangeRow = {
  title: string;
  status: string;
  outcome: string | null;
  completedAt: string | null;
};

export type FactCsatRow = {
  periodFrom: string | null;
  periodTo: string | null;
  score: number;
  responseCount: number | null;
  source: string | null;
};

export type OperGroupRow = {
  operatorCode: string | null;
  groupCode: string | null;
  groupName: string | null;
};

export type OperAmendRow = {
  operatorCode: string | null;
  amendDate: string | null;
  amendType: string | null;
  detail: string | null;
  changedBy: string | null;
};

export type AuditEventRow = {
  eventAt: string | null;
  operatorCode: string | null;
  programName: string | null;
  actionCode: string | null;
  detail: string | null;
};

export type DiagSummaryRow = {
  diagCode: string | null;
  diagName: string | null;
  severity: string | null;
  statusText: string | null;
  messageText: string | null;
  checkedAt: string | null;
};

export type SqlHealthRow = {
  companyDb: string | null;
  healthKey: string | null;
  description: string | null;
  statusText: string | null;
  refreshDate: string | null;
};

export type OperationalAssurance = {
  collectAgeHours: number | null;
  collectFresh: boolean;
  jobErrorCount: number;
  activeUserRatioPct: number | null;
  dtrOutOfBalance: number;
  scorePct: number | null;
  summary: string;
};

export type ExecSummaryRow = {
  periodFrom: string | null;
  periodTo: string | null;
  periodLabel: string | null;
  healthRag: string;
  healthSummary: string | null;
  businessImpactSummary: string | null;
  openRiskCount: number | null;
  openIssueCount: number | null;
  majorIncidentCount: number | null;
  status: string;
};

export type ExecNarrativeRow = {
  narrativeType: string;
  body: string;
  sortOrder: number;
};

export type SqlBackupRow = {
  databaseName: string;
  lastFullBackup: string | null;
  lastDiffBackup: string | null;
  lastLogBackup: string | null;
  lastBackupStatus: string | null;
  fullAgeHours: number | null;
};

export type SqlBackupFailureRow = {
  failureAt: string | null;
  jobName: string | null;
  databaseName: string | null;
  stepName: string | null;
  message: string | null;
};

export type SysproVersionInfo = {
  productName: string | null;
  productVersion: string | null;
  buildNumber: string | null;
  licenseType: string | null;
  users: number | null;
  companyCount?: number | null;
  licenseExpiry: string | null;
  customerName: string | null;
  serverName?: string | null;
  importDate: string | null;
};

export type SysproHotfixRow = {
  hotfixCode: string;
  hotfixName: string | null;
  description: string | null;
  installed: boolean;
  installedAt: string | null;
  sourceTable: string | null;
};

export type HotfixGapRow = {
  hotfixCode: string;
  title: string | null;
  severity: string | null;
  releaseLabel: string | null;
  isMissing: boolean;
  isWaived?: boolean;
  waiverReason?: string | null;
  installedAt: string | null;
  kbUrl: string | null;
};

export type HotfixGapSummary = {
  baselineCount: number;
  missingCount: number;
  installedMatchCount: number;
  missingMandatory: number;
  waivedMissingCount?: number;
  missingOptional?: number;
};

/** RMM leg — RPM RMM Management Agents (technical: Pulseway). Parallel to SYSPRO. */
export type RmmOrgSummary = {
  asOfDate: string | null;
  organizationName: string | null;
  deviceCount: number;
  onlineCount: number;
  offlineCount: number;
  maintenanceCount: number;
  criticalAlerts: number;
  elevatedAlerts: number;
  diskHighCount: number;
  serverCount: number;
  workstationCount: number;
  notificationCount: number;
  /** Online / offline split by class (from Pulseway_Devices) */
  serverOnline?: number;
  serverOffline?: number;
  workstationOnline?: number;
  workstationOffline?: number;
  healthRag: HealthRag;
  healthSummary: string;
  lastImportAt: string | null;
  /** Customer fleet disk totals (GB) from Pulseway_Disks */
  diskTotalGb?: number | null;
  diskFreeGb?: number | null;
  diskUsedGb?: number | null;
  /** Devices with at least one critical/elevated alert */
  devicesWithAlerts?: number | null;
  /** Max / avg days since reboot across devices with uptime */
  maxDaysSinceReboot?: number | null;
  avgDaysSinceReboot?: number | null;
  /** OS patch posture (agent) */
  patchInstalled?: number | null;
  patchMissing?: number | null;
  patchPending?: number | null;
  patchDevicesReporting?: number | null;
  patchInstalledRecent?: number | null;
};

export type RmmPatchItem = {
  deviceId: string;
  deviceName: string | null;
  title: string;
  kb: string | null;
  status: "installed" | "missing" | "pending" | "unknown";
  installedAt: string | null;
  classification: string | null;
};

export type RmmDeviceRow = {
  deviceId: string;
  name: string | null;
  isOnline: boolean | null;
  osName: string | null;
  deviceType: string | null;
  criticalNotifications: number;
  elevatedNotifications: number;
  lastSeenOnline: string | null;
  organizationName: string | null;
  ipAddress?: string | null;
  cpuPct?: number | null;
  memoryPct?: number | null;
  onlinePct?: number | null;
  /** Days since last reboot (from Pulseway uptime text) */
  daysSinceReboot?: number | null;
  lastBootAt?: string | null;
  patchInstalled?: number | null;
  patchMissing?: number | null;
  patchPending?: number | null;
  patches?: RmmPatchItem[];
  /** Hours offline in current stretch (0 if online) */
  offlineHoursCurrent?: number | null;
  /** Estimated offline hours last 7 days (from OnlinePct or daily history) */
  offlineHours7d?: number | null;
  /** Estimated offline hours last 30 days */
  offlineHours30d?: number | null;
  disks?: {
    driveLetter: string;
    totalGb: number | null;
    freeGb: number | null;
    usedGb?: number | null;
    usedPct: number | null;
    /** SSD / NVMe / SAS / HDD when reported by agent */
    mediaType?: string | null;
    readIops?: number | null;
    writeIops?: number | null;
    totalIops?: number | null;
  }[];
  /** Sum of disk used/free for this device */
  diskUsedGb?: number | null;
  diskFreeGb?: number | null;
  diskTotalGb?: number | null;
  /** Peak TotalIops across volumes (servers) */
  diskIopsMax?: number | null;
};

export type RmmAlertRow = {
  notificationId: string;
  deviceId: string | null;
  deviceName: string | null;
  severity: string | null;
  title: string | null;
  message: string | null;
  raisedAt: string | null;
  isActive: boolean | null;
  source?: "pulseway" | "agent";
};

export type RmmWindowsEventRow = {
  hostName: string;
  timeCreatedUtc: string | null;
  logName: string;
  eventId: number;
  levelName: string;
  providerName: string;
  message: string;
};

export type RmmAgentIopsRow = {
  hostName: string;
  driveLetter: string;
  usedPct: number | null;
  readIops: number | null;
  writeIops: number | null;
  totalIops: number | null;
  totalGb: number | null;
  freeGb: number | null;
  mediaType: string | null;
  queueLen: number | null;
  readLatencyMs: number | null;
  writeLatencyMs: number | null;
  snapshotUtc: string | null;
};

export type RmmOrgMapRow = {
  organizationName: string;
  organizationId: number | null;
  active: boolean;
  notes: string | null;
};


export type CoveDeviceRow = {
  accountId?: string | number | null;
  deviceName?: string | null;
  machineName?: string | null;
  partnerName?: string | null;
  partnerId?: number | null;
  lastBackupStatus?: string | null;
  lastSuccessTime?: string | null;
  usedBytes?: number | null;
  /** Last backup session duration in seconds (Cove T07) */
  backupDurationSec?: number | null;
  /** Selected backup size when UsedBytes empty */
  selectedBytes?: number | null;
  /** Cove PN — Retention Policy name */
  retentionPolicy?: string | null;
  /** Cove OP — backup profile */
  profileName?: string | null;
  retentionFiles?: string | null;
  retentionSystemState?: string | null;
  retentionHyperV?: string | null;
  retentionSql?: string | null;
  retentionVmware?: string | null;
  retentionNetwork?: string | null;
  snapshotDate?: string | null;
  importedAt?: string | null;
  /** I80: 0 none, 1 Recovery Testing, 2 Standby Image */
  recoveryPlanType?: number | null;
  recoveryPlanLabel?: string | null;
  /** F19 raw / short verification text */
  recoveryVerification?: string | null;
  /** Success | Failed | Unknown | NotInPlan | InProgress | NotStarted */
  recoveryTestStatus?: string | null;
  physicality?: string | null;
  /** Last VDR restore / recovery test completion (RVO/RVL) */
  lastRecoveryTestAt?: string | null;
};

export type CovePartnerMapRow = {
  partnerName: string;
  partnerId: number | null;
  active: boolean;
  notes: string | null;
  customerCode?: string | null;
};

export type CoveRecoverySummary = {
  deviceCount: number;
  recoveryTestingCount: number;
  standbyImageCount: number;
  noPlanCount: number;
  testSuccessCount: number;
  testFailedCount: number;
  testUnknownCount: number;
  lastImportAt?: string | null;
  asOfDate?: string | null;
  lastRecoveryTestAt?: string | null;
};

export type CoveSummary = {
  deviceCount: number;
  failedCount: number;
  staleCount: number;
  okCount: number;
  unknownCount?: number;
  lastImportAt?: string | null;
  lastSuccessAny?: string | null;
  asOfDate?: string | null;
  healthRag?: HealthRag | null;
  healthSummary?: string | null;
  recovery?: CoveRecoverySummary | null;
};

/** One collect day of Cove backup / recovery KPIs (last 7 days) */
export type CoveRecentDay = {
  snapshotDate: string;
  deviceCount: number;
  okCount: number;
  staleCount: number;
  failedCount: number;
  recoveryTestingCount: number;
  standbyImageCount: number;
  testSuccessCount: number;
  testFailedCount: number;
  lastSuccessAny?: string | null;
  lastRecoveryTestAt?: string | null;
};

export type CovePayload = {
  enabled: boolean;
  summary: CoveSummary | null;
  devices: CoveDeviceRow[];
  mapping: CovePartnerMapRow[];
  unmapped: CoveUnmappedPartner[];
  message: string | null;
  recovery?: CoveRecoverySummary | null;
  /** Last ~7 collect days of backup + recovery rollups (newest first) */
  recentDays?: CoveRecentDay[];
  /** Recovery-relevant device rows across last ~7 days */
  recoveryHistory?: CoveDeviceRow[];
  /** Stale / fail / recovery test banners */
  alerts?: Array<{ severity: "red" | "amber"; title: string; detail: string }>;
};

export type RmmPayload = {
  enabled: boolean;
  pillarOn: boolean;
  pulsewayOrgName: string | null;
  summary: RmmOrgSummary | null;
  devices: RmmDeviceRow[];
  patches?: RmmPatchItem[];
  alerts: RmmAlertRow[];
  windowsEvents?: RmmWindowsEventRow[];
  agentIops?: RmmAgentIopsRow[];
  mapping: RmmOrgMapRow[];
  message: string | null;
};

/** Per-pillar SLA (M365 excluded; null when No Cover) */
export type ExcoPillarSlaKey = "syspro" | "rmm" | "cove" | "epp" | "tickets";

export type ExcoPillarSla = {
  pillar: ExcoPillarSlaKey;
  label: string;
  covered: boolean;
  /** null = No Cover (do not score) */
  pct: number | null;
  note: string | null;
  /** Industry / AMS target this score is judged against. Null for SYSPRO contract clocks. */
  industryTargetPct?: number | null;
  industryMetric?: string | null;
};

export type ExcoCustomerBoard = {
  customerCode: string;
  displayName: string;
  healthRag: HealthRag;
  healthSummary: string;
  healthScorePct: number;
  assuranceScorePct: number;
  collectAgeHours: number | null;
  collectFresh: boolean;
  lastImportAt: string | null;
  activeUserCount: number;
  operatorCount: number;
  jobErrorCount: number;
  dtrVarianceLines: number;
  slaCompliancePct: number | null;
  /** Average of covered non-M365 pillars only; null if no SLA pillars on cover */
  slaOverallPct?: number | null;
  /** Pillar SLA breakdown (SYSPRO/RMM/Backup/EPP — never M365) */
  pillarSla?: ExcoPillarSla[];
  slaKpis?: Partial<Record<"syspro" | "rmm" | "cove" | "epp" | "csp" | "tickets", number>>;
  availabilityPct: number | null;
  licenseExpiry: string | null;
  licenseProduct: string | null;
  licenseDaysRemaining: number | null;
  openRiskCount: number;
  openIssueCount: number;
  lastFullBackup: string | null;
  backupStatus: string | null;
  backupHealthy: boolean | null;
  /** SYSPRO product version e.g. 8.10.0000 */
  sysproVersion: string | null;
  /** Build / DB version string */
  sysproBuild: string | null;
  /** Count of installed hotfixes on latest snapshot */
  installedHotfixCount: number;
  /** Latest InstalledAt among collected HFs */
  lastHotfixAt: string | null;
  /** Latest KB code for ExCo glance (not a "sample" product) */
  sampleHotfixCode: string | null;
  /** Real baseline missing total (gap view) */
  missingHotfixCount: number | null;
  /** Missing mandatory baseline KBs */
  missingMandatoryHotfixes: number | null;
  /** True when SYSPRO is Covered — ExCo hotfixes/licenses only for these */
  sysproCovered?: boolean;
  attentionReasons: string[];
  pulsewayDeviceCount?: number;
  pulsewayOnlineCount?: number;
  pulsewayOfflineCount?: number;
  pulsewayCriticalAlerts?: number;
  pulsewayElevatedAlerts?: number;
  pulsewayLastImportAt?: string | null;
  pulsewayOrgName?: string | null;
  pulsewayHealthRag?: HealthRag | null;
  pulsewayHealthSummary?: string | null;
  pulsewayServerOnline?: number;
  pulsewayServerOffline?: number;
  pulsewayWorkstationOnline?: number;
  pulsewayWorkstationOffline?: number;
  pulsewayPatchMissing?: number;
  pulsewayPatchDevices?: number;
  pulsewayPatchCompliant?: number;
  pulsewayDiskHighCount?: number;
};


export type PillarAuditCell = {
  covered: boolean;
  evidence: boolean;
  mismatch: boolean;
  note: string;
};

export type PillarAuditRow = {
  customerCode: string;
  displayName: string;
  syspro: PillarAuditCell;
  rmm: PillarAuditCell;
  cove: PillarAuditCell;
  epp: PillarAuditCell;
  csp: PillarAuditCell;
  mismatchCount: number;
};

export type PillarAuditSummary = {
  generatedAt: string;
  customerCount: number;
  mismatchCustomerCount: number;
  mismatchCellCount: number;
  byPillar: Record<
    "syspro" | "rmm" | "cove" | "epp" | "csp",
    { covered: number; evidence: number; mismatch: number }
  >;
  rows: PillarAuditRow[];
};

export type ExcoInsightPayload = {
  generatedAt: string;
  estateAssurancePct: number;
  customersNeedingAttention: number;
  collectFreshCount: number;
  collectStaleCount: number;
  collectMissingCount: number;
  licensesExpiringSoon: number;
  openRisksTotal: number;
  openIssuesTotal: number;
  backupUnhealthyCount: number;
  /** Estate total installed hotfixes (sum of boards) */
  installedHotfixesTotal: number;
  /** Customers with at least one HF row */
  customersWithHotfixes: number;
  /** Customers missing HF collect (0 rows) */
  customersMissingHotfixes: number;
  rmmDevicesTotal?: number;
  rmmOfflineTotal?: number;
  rmmCriticalTotal?: number;
  rmmCustomersWithDevices?: number;
  rmmCustomersUnhealthy?: number;
  rmmServerOnlineTotal?: number;
  rmmServerOfflineTotal?: number;
  rmmWorkstationOnlineTotal?: number;
  rmmWorkstationOfflineTotal?: number;
  rmmServerAvailabilityPct?: number | null;
  rmmPatchCompliancePct?: number | null;
  rmmDiskHighTotal?: number;
  coveFailedTotal?: number;
  coveStaleTotal?: number;
  eppUnmanagedTotal?: number;
  eppEndpointTotal?: number;
  boards: ExcoCustomerBoard[];
  /** P1 cover vs data consistency */
  pillarAudit?: PillarAuditSummary;
};


export type EppDeviceRow = {
  endpointId: string;
  deviceName: string | null;
  fqdn: string | null;
  ipAddress: string | null;
  isManaged: boolean | null;
  machineType: number | null;
  operatingSystem: string | null;
  policyName: string | null;
  snapshotDate: string | null;
  lastSeenAt?: string | null;
  lastSuccessfulScanAt?: string | null;
  malwareDetected?: boolean | null;
  infected?: boolean | null;
  productOutdated?: boolean | null;
  signatureOutdated?: boolean | null;
};

export type EppSummary = {
  deviceCount: number;
  managedCount: number;
  unmanagedCount: number;
  workstationCount: number;
  serverCount: number;
  lastImportAt: string | null;
  asOfDate: string | null;
};

export type EppIncidentRow = {
  incidentId: string;
  endpointId: string | null;
  deviceName: string | null;
  severity: string | null;
  status: string | null;
  incidentType: string | null;
  summary: string | null;
  detectedAt: string | null;
};

export type EppQuarantineRow = {
  itemId: string;
  endpointId: string | null;
  deviceName: string | null;
  threatName: string | null;
  filePath: string | null;
  status: string | null;
  quarantinedAt: string | null;
};

export type EppPayload = {
  enabled: boolean;
  summary: EppSummary | null;
  devices: EppDeviceRow[];
  message: string | null;
  license?: {
    usedSlots: number | null;
    totalSlots: number | null;
    endSubscription: string | null;
    /** Tenant-wide MSP licence — not this customer's seats */
    scope?: "msp";
  } | null;
  incidents?: EppIncidentRow[];
  quarantine?: EppQuarantineRow[];
  feedStatus?: {
    incidentsOk: boolean | null;
    incidentsMessage: string | null;
    quarantineOk: boolean | null;
    quarantineMessage: string | null;
    incidentsCount?: number | null;
    quarantineCount?: number | null;
  } | null;
  policies?: EppPolicyRow[];
};

export type EppPolicyModule = {
  id: string;
  label: string;
  enabled: boolean;
};

export type EppPolicyRow = {
  policyId: string;
  policyName: string | null;
  deviceCount: number;
  modules: EppPolicyModule[];
};


/** Microsoft 365 Tenant (CSP / partner-center / Graph pilot) */
export type CspLicenseRow = {
  skuId: string;
  skuPartNumber: string | null;
  productName: string | null;
  prepaidUnits: number | null;
  consumedUnits: number | null;
  availableUnits: number | null;
  snapshotDate: string | null;
};

export type CspUserRow = {
  userPrincipalName: string;
  displayName: string | null;
  accountEnabled: boolean | null;
  assignedSkus: string | null;
  department: string | null;
  jobTitle: string | null;
  snapshotDate: string | null;
};

export type CspTenantInfo = {
  tenantId: string | null;
  primaryDomain: string | null;
  displayName: string | null;
  country: string | null;
  /** 0–100 service health score when available */
  healthScore: number | null;
  openIncidents: number | null;
  lastSyncAt: string | null;
};

export type CspPosture = {
  secureScore: number | null;
  secureScoreMax: number | null;
  secureScorePct: number | null;
  mfaRegisteredCount: number | null;
  mfaCapableCount: number | null;
  mfaRegisteredPct: number | null;
  globalAdminCount: number | null;
  /** Semicolon-joined UPNs/names from collect (lean) */
  globalAdminNames: string | null;
  guestUserCount: number | null;
  disabledLicensedCount: number | null;
  failedSignInCount7d: number | null;
  notes: string | null;
  asOfDate: string | null;
};

export type CspGlobalAdminRow = {
  objectId: string;
  displayName: string | null;
  userPrincipalName: string | null;
  mail: string | null;
  principalType: string | null;
};

export type CspPayload = {
  enabled: boolean;
  tenant: CspTenantInfo | null;
  summary: {
    licensedUserCount: number;
    totalSeats: number;
    assignedSeats: number;
    unusedSeats: number;
    skuCount: number;
    lastImportAt: string | null;
    asOfDate: string | null;
  } | null;
  /** Lean EXCO posture aggregates (one row per day) */
  posture: CspPosture | null;
  /** Named Global Administrators (latest snapshot) */
  globalAdmins?: CspGlobalAdminRow[];
  licenses: CspLicenseRow[];
  users: CspUserRow[];
  message: string | null;
};


/** Which warehouse legs to load for a customer detail request (lazy pillars). */
export type DetailLeg =
  | "shell"
  | "syspro"
  | "ams"
  | "rmm"
  | "cove"
  | "epp"
  | "csp"
  | "all";

export type CustomerDetailPayload = {
  customer: PortfolioRow;
  /** Service cover for SYSPRO / RMM / Cove */
  cover?: CustomerCover;
  operators: OperatorRow[];
  recentLogins: OperatorRow[];
  jobErrors: JobErrorRow[];
  dtrLevel1: DtrLevel1Row[];
  /** L1–L3 detail lines for drill-down */
  dtrDetailLines?: DtrDetailLine[];
  /** Open / recent FinSight recon workflow cases */
  finsightReconCases?: FinSightReconCase[];
  license: LicenseRow | null;
  healthLogs: HealthLogRow[];
  taskGroups: TaskGroupRow[];
  taskItems: TaskItemRow[];
  incidents: FactIncidentRow[];
  problems: FactProblemRow[];
  risks: FactRiskRow[];
  issues: FactIssueRow[];
  priorities: FactPriorityRow[];
  slaPolicies: SlaPolicyRow[];
  availabilitySla: AvailabilitySlaSnapshot | null;
  /** Rolling 30d from Fact_Incident clocks */
  amsSlaSummary?: {
    incidentCount30d: number;
    openCount: number;
    majorOpenCount: number;
    responsePct: number | null;
    resolvePct: number | null;
    responseBreach: number;
    resolveBreach: number;
  } | null;
  changes: FactChangeRow[];
  csat: FactCsatRow | null;
  operGroups: OperGroupRow[];
  operAmends: OperAmendRow[];
  securitySummary: {
    groupMemberships: number;
    distinctOperatorsInGroups: number;
    distinctGroups: number;
    amendCount90d: number;
  };
  execSummary: ExecSummaryRow | null;
  execNarratives: ExecNarrativeRow[];
  auditEvents: AuditEventRow[];
  diagSummaries: DiagSummaryRow[];
  sqlHealthRows: SqlHealthRow[];
  extraSummary: {
    auditCount: number;
    diagCount: number;
    sqlHealthCount: number;
    sqlHealthFailCount: number;
    lastAuditImport: string | null;
  };
  operationalAssurance: OperationalAssurance;
  sqlBackups: SqlBackupRow[];
  sqlBackupFailures: SqlBackupFailureRow[];
  sysproVersion: SysproVersionInfo | null;
  sysproHotfixes: SysproHotfixRow[];
  hotfixGap: HotfixGapRow[];
  hotfixGapSummary: HotfixGapSummary | null;
  /** AMS 4.5 automated day-end (Mon–Fri) */
  dayEnd?: import("./day-end").DayEndSnapshot | null;
  /** RMM leg (Pulseway) — same customer, different source */
  rmm: RmmPayload;
  /** Cyber Backup (Cove) */
  cove: CovePayload;
  /** RPM EPP */
  epp?: EppPayload | null;
  /** Microsoft 365 Tenant (CSP pilot) */
  csp?: CspPayload | null;
  dataMode: "demo" | "live";
};
