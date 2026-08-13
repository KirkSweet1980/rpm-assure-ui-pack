/*
================================================================================
  RPM Assure — KPI views on EXISTING spine (RPMAssure)
  Server   : RPMWINRM\RPMREPORTS
  Database : RPMAssure
  KPI Set  : v1 (frozen) + G3 dates DD-MM-YYYY (display only)
================================================================================
  Tenant key : CustomerCode
  Does NOT replace Dim_Customer or source snapshots.
  Latest snapshot helpers use MAX(SnapshotDate) per relevant grain.
================================================================================
*/
USE [RPMAssure];
GO

SET NOCOUNT ON;
GO

/* -------------------------------------------------------------------------- */
/*  Helper: active customers                                                  */
/* -------------------------------------------------------------------------- */
CREATE OR ALTER VIEW dbo.vw_Dim_Customer_Active
AS
SELECT
    c.CustomerCode,
    c.DisplayName,
    c.Active,
    c.SqlInstanceName,
    c.CovePartnerId,
    c.CovePartnerName,
    c.PulsewayOrgName,
    c.PulsewayOrgId,
    c.BitdefenderCompany,
    c.BitdefenderCompanyId,
    a.AmsEnabled,
    a.PillarSyspro,
    a.PillarSql,
    a.PillarCove,
    a.PillarPulseway,
    a.PillarBitdefender,
    a.PillarMicrosoftCsp
FROM dbo.Dim_Customer AS c
LEFT JOIN dbo.Dim_Customer_AmsConfig AS a
    ON a.CustomerCode = c.CustomerCode
WHERE c.Active = 1;
GO

/* -------------------------------------------------------------------------- */
/*  Latest SnapshotDate per source table (scalar patterns via APPLY in views) */
/* -------------------------------------------------------------------------- */

/* ===== KPI: ACTIVE_USERS (trailing 30 days, SYSPRO operators) =====
   AsOf = latest Syspro_Operators.SnapshotDate for that instance set;
   Active = LastLoginDate >= AsOf - 30 days, OperatorStatus not disabled-like.
*/
CREATE OR ALTER VIEW dbo.vw_Kpi_ActiveUsers
AS
SELECT
    o.CustomerCode,
    o.AsOfDate,
    o.ActiveUserCount,
    o.EnabledOperatorCount,
    o.TotalOperatorCount
FROM (
    SELECT
        COALESCE(map.CustomerCode, x.CustomerCodeFromInstance) AS CustomerCode,
        x.AsOfDate,
        SUM(CASE
                WHEN x.LastLoginDate IS NOT NULL
                 AND x.LastLoginDate >= DATEADD(DAY, -30, CAST(x.AsOfDate AS datetime2))
                 AND (x.OperatorStatus IS NULL
                      OR x.OperatorStatus NOT IN (N'D', N'Disabled', N'I', N'Inactive', N'N'))
                THEN 1 ELSE 0
            END) AS ActiveUserCount,
        SUM(CASE
                WHEN x.OperatorStatus IS NULL
                  OR x.OperatorStatus NOT IN (N'D', N'Disabled', N'I', N'Inactive', N'N')
                THEN 1 ELSE 0
            END) AS EnabledOperatorCount,
        COUNT(*) AS TotalOperatorCount
    FROM (
        SELECT
            s.InstanceName,
            s.OperatorCode,
            s.OperatorName,
            s.OperatorStatus,
            s.LastLoginDate,
            s.SnapshotDate AS AsOfDate,
            /* Instance → customer: Dim_Customer.SqlInstanceName */
            c.CustomerCode AS CustomerCodeFromInstance
        FROM dbo.Syspro_Operators AS s
        INNER JOIN (
            SELECT InstanceName, MAX(SnapshotDate) AS MaxSnap
            FROM dbo.Syspro_Operators
            GROUP BY InstanceName
        ) AS m
            ON m.InstanceName = s.InstanceName
           AND m.MaxSnap = s.SnapshotDate
        LEFT JOIN dbo.Dim_Customer AS c
            ON c.SqlInstanceName = s.InstanceName
           AND c.Active = 1
    ) AS x
    LEFT JOIN dbo.Dim_Customer AS map
        ON map.SqlInstanceName = x.InstanceName
       AND map.Active = 1
    GROUP BY COALESCE(map.CustomerCode, x.CustomerCodeFromInstance), x.AsOfDate
) AS o
WHERE o.CustomerCode IS NOT NULL;
GO

/* ===== Supporting: Pulseway org summary (latest per customer) ===== */
CREATE OR ALTER VIEW dbo.vw_Kpi_Pulseway_OrgSummary_Latest
AS
SELECT
    p.CustomerCode,
    p.SnapshotDate AS AsOfDate,
    p.OrganizationName,
    p.DeviceCount,
    p.OnlineCount,
    p.OfflineCount,
    p.MaintenanceCount,
    p.CriticalAlerts,
    p.ElevatedAlerts,
    p.NormalAlerts,
    p.LowAlerts,
    p.DiskHighCount,
    p.ServerCount,
    p.WorkstationCount,
    p.NotificationCount,
    CASE
        WHEN ISNULL(p.DeviceCount, 0) = 0 THEN NULL
        ELSE CAST(100.0 * ISNULL(p.OnlineCount, 0) / NULLIF(p.DeviceCount, 0) AS decimal(6, 1))
    END AS OnlinePct
FROM dbo.Pulseway_OrgSummary AS p
INNER JOIN (
    SELECT CustomerCode, MAX(SnapshotDate) AS MaxSnap
    FROM dbo.Pulseway_OrgSummary
    WHERE CustomerCode IS NOT NULL
    GROUP BY CustomerCode
) AS m
    ON m.CustomerCode = p.CustomerCode
   AND m.MaxSnap = p.SnapshotDate;
GO

/* ===== Cove backup: devices with last status (latest snap per customer) ===== */
CREATE OR ALTER VIEW dbo.vw_Kpi_Cove_DeviceLatest
AS
SELECT
    d.CustomerCode,
    d.SnapshotDate AS AsOfDate,
    d.AccountId,
    d.DeviceName,
    d.MachineName,
    d.LastSuccessTime,
    d.LastBackupStatus,
    d.UsedBytes,
    d.SelectedBytes,
    d.Product,
    CASE
        WHEN d.LastSuccessTime IS NULL THEN 1
        WHEN d.LastSuccessTime < DATEADD(HOUR, -24, CAST(d.SnapshotDate AS datetime2)) THEN 1
        ELSE 0
    END AS IsRpoBreach24h,
    CASE
        WHEN d.LastBackupStatus IS NULL THEN 1
        WHEN d.LastBackupStatus LIKE N'%Fail%' THEN 1
        WHEN d.LastBackupStatus LIKE N'%Error%' THEN 1
        WHEN UPPER(d.LastBackupStatus) IN (N'FAILED', N'ERROR', N'MISSED') THEN 1
        ELSE 0
    END AS IsBackupFailed
FROM dbo.Cove_DeviceStatistics AS d
INNER JOIN (
    SELECT CustomerCode, MAX(SnapshotDate) AS MaxSnap
    FROM dbo.Cove_DeviceStatistics
    WHERE CustomerCode IS NOT NULL
    GROUP BY CustomerCode
) AS m
    ON m.CustomerCode = d.CustomerCode
   AND m.MaxSnap = d.SnapshotDate;
GO

CREATE OR ALTER VIEW dbo.vw_Kpi_Cove_Summary
AS
SELECT
    CustomerCode,
    AsOfDate,
    COUNT(*) AS DeviceCount,
    SUM(IsBackupFailed) AS FailedDeviceCount,
    SUM(IsRpoBreach24h) AS RpoBreach24hCount,
    SUM(CASE WHEN IsBackupFailed = 0 AND IsRpoBreach24h = 0 THEN 1 ELSE 0 END) AS HealthyDeviceCount
FROM dbo.vw_Kpi_Cove_DeviceLatest
GROUP BY CustomerCode, AsOfDate;
GO

/* ===== Bitdefender company summary latest ===== */
CREATE OR ALTER VIEW dbo.vw_Kpi_Bitdefender_CompanyLatest
AS
SELECT
    b.CustomerCode,
    b.SnapshotDate AS AsOfDate,
    b.CompanyName,
    b.EndpointCount,
    b.ManagedCount,
    b.OnlineCount,
    b.OfflineCount,
    b.UnmanagedCount,
    b.QuarantineCount,
    b.IncidentCount24h,
    b.IncidentCount7d,
    b.InfectedCount,
    b.SignatureOutdatedCnt,
    b.AvgRiskScorePct,
    b.MalwareUnresolvedCnt,
    b.PolicyNonCompliantCnt,
    b.ModulesDisabledCnt
FROM dbo.Bitdefender_CompanySummary AS b
INNER JOIN (
    SELECT CustomerCode, MAX(SnapshotDate) AS MaxSnap
    FROM dbo.Bitdefender_CompanySummary
    WHERE CustomerCode IS NOT NULL
    GROUP BY CustomerCode
) AS m
    ON m.CustomerCode = b.CustomerCode
   AND m.MaxSnap = b.SnapshotDate;
GO

/* ===== Bitdefender open-ish incidents (latest snap; status not closed) ===== */
CREATE OR ALTER VIEW dbo.vw_Kpi_Bitdefender_Incidents_Latest
AS
SELECT
    i.CustomerCode,
    i.SnapshotDate AS AsOfDate,
    i.IncidentId,
    i.Severity,
    i.Status,
    i.ThreatName,
    i.DetectionName,
    i.EndpointName,
    i.CreatedOn,
    i.CreatedAt,
    i.LastUpdate
FROM dbo.Bitdefender_Incidents AS i
INNER JOIN (
    SELECT CustomerCode, MAX(SnapshotDate) AS MaxSnap
    FROM dbo.Bitdefender_Incidents
    WHERE CustomerCode IS NOT NULL
    GROUP BY CustomerCode
) AS m
    ON m.CustomerCode = i.CustomerCode
   AND m.MaxSnap = i.SnapshotDate;
GO

CREATE OR ALTER VIEW dbo.vw_Kpi_Bitdefender_IncidentCounts
AS
SELECT
    CustomerCode,
    AsOfDate,
    COUNT(*) AS SecurityIncidentCountTotal,
    SUM(CASE WHEN Severity IN (N'Critical', N'critical', N'High', N'high') THEN 1 ELSE 0 END) AS SecurityIncidentCountHighPlus,
    SUM(CASE
            WHEN Status IS NULL THEN 1
            WHEN Status NOT IN (N'Closed', N'Resolved', N'Dismissed', N'closed', N'resolved') THEN 1
            ELSE 0
        END) AS SecurityIncidentCountOpen
FROM dbo.vw_Kpi_Bitdefender_Incidents_Latest
GROUP BY CustomerCode, AsOfDate;
GO

/* ===== SQL backup age (latest snap) ===== */
CREATE OR ALTER VIEW dbo.vw_Kpi_Sql_BackupLatest
AS
SELECT
    c.CustomerCode,
    b.SnapshotDate AS AsOfDate,
    b.InstanceName,
    b.DatabaseName,
    b.LastFullBackup,
    b.LastDiffBackup,
    b.LastLogBackup,
    CASE
        WHEN b.LastFullBackup IS NULL THEN 1
        WHEN b.LastFullBackup < DATEADD(HOUR, -24, CAST(b.SnapshotDate AS datetime2)) THEN 1
        ELSE 0
    END AS IsFullBackupRpoBreach24h
FROM dbo.Sql_Backups AS b
INNER JOIN (
    SELECT InstanceName, MAX(SnapshotDate) AS MaxSnap
    FROM dbo.Sql_Backups
    GROUP BY InstanceName
) AS m
    ON m.InstanceName = b.InstanceName
   AND m.MaxSnap = b.SnapshotDate
INNER JOIN dbo.Dim_Customer AS c
    ON c.SqlInstanceName = b.InstanceName
   AND c.Active = 1;
GO

CREATE OR ALTER VIEW dbo.vw_Kpi_Sql_BackupSummary
AS
SELECT
    CustomerCode,
    AsOfDate,
    COUNT(*) AS DatabaseCount,
    SUM(IsFullBackupRpoBreach24h) AS FullBackupRpoBreachCount
FROM dbo.vw_Kpi_Sql_BackupLatest
GROUP BY CustomerCode, AsOfDate;
GO

/* ===== SYSPRO job errors (latest snap day) ===== */
CREATE OR ALTER VIEW dbo.vw_Kpi_Syspro_JobErrors_Latest
AS
SELECT
    c.CustomerCode,
    j.SnapshotDate AS AsOfDate,
    j.InstanceName,
    j.CompanyDb,
    j.ProgramName,
    j.Operator,
    j.Message,
    j.ProgErrorCode,
    j.ErrorStatusCode,
    j.TransactionStatus,
    j.ProgRunDate,
    j.ImpactDate
FROM dbo.Syspro_JobLogging AS j
INNER JOIN (
    SELECT InstanceName, MAX(SnapshotDate) AS MaxSnap
    FROM dbo.Syspro_JobLogging
    GROUP BY InstanceName
) AS m
    ON m.InstanceName = j.InstanceName
   AND m.MaxSnap = j.SnapshotDate
INNER JOIN dbo.Dim_Customer AS c
    ON c.SqlInstanceName = j.InstanceName
   AND c.Active = 1
WHERE
    (j.ProgErrorCode IS NOT NULL AND j.ProgErrorCode <> 0)
    OR (j.ErrorStatusCode IS NOT NULL AND LTRIM(RTRIM(j.ErrorStatusCode)) NOT IN (N'', N'0', N'OK'))
    OR (j.TransactionStatus IS NOT NULL AND j.TransactionStatus LIKE N'%Fail%')
    OR (j.Message IS NOT NULL AND j.Message LIKE N'%error%');
GO

CREATE OR ALTER VIEW dbo.vw_Kpi_Syspro_JobErrorCounts
AS
SELECT
    CustomerCode,
    AsOfDate,
    COUNT(*) AS JobErrorCount
FROM dbo.vw_Kpi_Syspro_JobErrors_Latest
GROUP BY CustomerCode, AsOfDate;
GO

/* ===== SYSPRO health log (latest) ===== */
CREATE OR ALTER VIEW dbo.vw_Kpi_Syspro_HealthLog_Latest
AS
SELECT
    c.CustomerCode,
    h.SnapshotDate AS AsOfDate,
    h.InstanceName,
    h.CompanyDb,
    h.HealthFunction,
    h.Description,
    h.StatusFlag,
    h.Message,
    h.RunDateTime,
    h.Operator
FROM dbo.Syspro_HealthLog AS h
INNER JOIN (
    SELECT InstanceName, MAX(SnapshotDate) AS MaxSnap
    FROM dbo.Syspro_HealthLog
    GROUP BY InstanceName
) AS m
    ON m.InstanceName = h.InstanceName
   AND m.MaxSnap = h.SnapshotDate
INNER JOIN dbo.Dim_Customer AS c
    ON c.SqlInstanceName = h.InstanceName
   AND c.Active = 1;
GO

/* ===== DTR variance signals (latest) non-zero variance ===== */
CREATE OR ALTER VIEW dbo.vw_Kpi_Syspro_DtrVariance_Latest
AS
SELECT
    c.CustomerCode,
    x.AsOfDate,
    x.SourceArea,
    x.InstanceName,
    x.CompanyDb,
    x.Variance
FROM (
    SELECT SnapshotDate AS AsOfDate, InstanceName, CompanyDb, Variance, N'AP' AS SourceArea
    FROM dbo.Syspro_DtrApBalances
    WHERE Variance IS NOT NULL AND Variance <> 0
    UNION ALL
    SELECT SnapshotDate, InstanceName, CompanyDb, Variance, N'AR'
    FROM dbo.Syspro_DtrArBalances
    WHERE Variance IS NOT NULL AND Variance <> 0
    UNION ALL
    SELECT SnapshotDate, InstanceName, CompanyDb, Variance, N'INV'
    FROM dbo.Syspro_DtrInvBalances
    WHERE Variance IS NOT NULL AND Variance <> 0
) AS x
INNER JOIN (
    SELECT InstanceName, MAX(SnapshotDate) AS MaxSnap
    FROM (
        SELECT InstanceName, SnapshotDate FROM dbo.Syspro_DtrApBalances
        UNION
        SELECT InstanceName, SnapshotDate FROM dbo.Syspro_DtrArBalances
        UNION
        SELECT InstanceName, SnapshotDate FROM dbo.Syspro_DtrInvBalances
    ) AS u
    GROUP BY InstanceName
) AS m
    ON m.InstanceName = x.InstanceName
   AND m.MaxSnap = x.AsOfDate
INNER JOIN dbo.Dim_Customer AS c
    ON c.SqlInstanceName = x.InstanceName
   AND c.Active = 1;
GO

CREATE OR ALTER VIEW dbo.vw_Kpi_Syspro_DtrVarianceCounts
AS
SELECT
    CustomerCode,
    AsOfDate,
    COUNT(*) AS VarianceLineCount,
    SUM(CASE WHEN SourceArea = N'AP' THEN 1 ELSE 0 END) AS ApVarianceLines,
    SUM(CASE WHEN SourceArea = N'AR' THEN 1 ELSE 0 END) AS ArVarianceLines,
    SUM(CASE WHEN SourceArea = N'INV' THEN 1 ELSE 0 END) AS InvVarianceLines
FROM dbo.vw_Kpi_Syspro_DtrVariance_Latest
GROUP BY CustomerCode, AsOfDate;
GO

/* -------------------------------------------------------------------------- */
/*  HEALTH_RAG proposal (telemetry-only drivers) — AMS may override in Fact_  */
/*  Rules aligned to KPI Set v1 spirit using available signals                */
/* -------------------------------------------------------------------------- */
CREATE OR ALTER VIEW dbo.vw_Kpi_HealthRag_Proposed
AS
SELECT
    c.CustomerCode,
    c.DisplayName,
    /* AsOf = greatest of available pillar as-of dates */
    (SELECT MAX(v) FROM (VALUES
        (pw.AsOfDate), (cv.AsOfDate), (bd.AsOfDate), (sq.AsOfDate), (je.AsOfDate), (dt.AsOfDate)
    ) AS value(v)) AS AsOfDate,
    CAST(ISNULL(pw.OfflineCount, 0) AS int) AS PulsewayOfflineCount,
    CAST(ISNULL(pw.CriticalAlerts, 0) AS int) AS PulsewayCriticalAlerts,
    CAST(ISNULL(cv.FailedDeviceCount, 0) AS int) AS CoveFailedDeviceCount,
    CAST(ISNULL(cv.RpoBreach24hCount, 0) AS int) AS CoveRpoBreach24hCount,
    CAST(ISNULL(bd.IncidentCount24h, 0) AS int) AS BdIncidentCount24h,
    CAST(ISNULL(bd.InfectedCount, 0) AS int) AS BdInfectedCount,
    CAST(ISNULL(bd.MalwareUnresolvedCnt, 0) AS int) AS BdMalwareUnresolvedCnt,
    CAST(ISNULL(sq.FullBackupRpoBreachCount, 0) AS int) AS SqlFullBackupRpoBreachCount,
    CAST(ISNULL(je.JobErrorCount, 0) AS int) AS SysproJobErrorCount,
    CAST(ISNULL(dt.VarianceLineCount, 0) AS int) AS SysproDtrVarianceLines,
    CAST(ISNULL(au.ActiveUserCount, 0) AS int) AS ActiveUserCount,
    CASE
        WHEN ISNULL(cv.FailedDeviceCount, 0) >= 1
          OR ISNULL(bd.InfectedCount, 0) >= 1
          OR ISNULL(bd.MalwareUnresolvedCnt, 0) >= 1
          OR ISNULL(pw.CriticalAlerts, 0) >= 5
          OR ISNULL(sq.FullBackupRpoBreachCount, 0) >= 3
          OR ISNULL(dt.VarianceLineCount, 0) >= 5
            THEN N'Red'
        WHEN ISNULL(cv.RpoBreach24hCount, 0) >= 1
          OR ISNULL(pw.OfflineCount, 0) >= 1
          OR ISNULL(bd.IncidentCount24h, 0) >= 1
          OR ISNULL(je.JobErrorCount, 0) >= 1
          OR ISNULL(sq.FullBackupRpoBreachCount, 0) >= 1
          OR ISNULL(dt.VarianceLineCount, 0) >= 1
          OR ISNULL(pw.CriticalAlerts, 0) >= 1
            THEN N'Amber'
        ELSE N'Green'
    END AS HealthRagProposed,
    CONCAT(
        N'Pulseway offline=', ISNULL(pw.OfflineCount, 0),
        N'; criticalAlerts=', ISNULL(pw.CriticalAlerts, 0),
        N'; Cove fail=', ISNULL(cv.FailedDeviceCount, 0),
        N'/RPO24h=', ISNULL(cv.RpoBreach24hCount, 0),
        N'; BD infected=', ISNULL(bd.InfectedCount, 0),
        N'; SQL backup breach=', ISNULL(sq.FullBackupRpoBreachCount, 0),
        N'; SYSPRO jobErr=', ISNULL(je.JobErrorCount, 0),
        N'; DTR var lines=', ISNULL(dt.VarianceLineCount, 0)
    ) AS HealthSummaryProposed
FROM dbo.vw_Dim_Customer_Active AS c
LEFT JOIN dbo.vw_Kpi_Pulseway_OrgSummary_Latest AS pw ON pw.CustomerCode = c.CustomerCode
LEFT JOIN dbo.vw_Kpi_Cove_Summary AS cv ON cv.CustomerCode = c.CustomerCode
LEFT JOIN dbo.vw_Kpi_Bitdefender_CompanyLatest AS bd ON bd.CustomerCode = c.CustomerCode
LEFT JOIN dbo.vw_Kpi_Sql_BackupSummary AS sq ON sq.CustomerCode = c.CustomerCode
LEFT JOIN dbo.vw_Kpi_Syspro_JobErrorCounts AS je ON je.CustomerCode = c.CustomerCode
LEFT JOIN dbo.vw_Kpi_Syspro_DtrVarianceCounts AS dt ON dt.CustomerCode = c.CustomerCode
LEFT JOIN dbo.vw_Kpi_ActiveUsers AS au ON au.CustomerCode = c.CustomerCode
WHERE c.AmsEnabled = 1 OR c.AmsEnabled IS NULL;
GO

/* -------------------------------------------------------------------------- */
/*  Portfolio dashboard strip (one row per customer)                           */
/* -------------------------------------------------------------------------- */
CREATE OR ALTER VIEW dbo.vw_Kpi_PortfolioDashboard
AS
SELECT
    h.CustomerCode,
    h.DisplayName,
    h.AsOfDate,
    h.HealthRagProposed,
    h.HealthSummaryProposed,
    h.ActiveUserCount,
    h.PulsewayOfflineCount,
    h.PulsewayCriticalAlerts,
    h.CoveFailedDeviceCount,
    h.CoveRpoBreach24hCount,
    h.BdIncidentCount24h,
    h.BdInfectedCount,
    h.SqlFullBackupRpoBreachCount,
    h.SysproJobErrorCount,
    h.SysproDtrVarianceLines,
    /* Placeholders until Fact_* populated — NULL not 0 */
    CAST(NULL AS decimal(6, 1)) AS AvailabilityPct,
    CAST(NULL AS decimal(6, 1)) AS SlaCompliancePct,
    CAST(NULL AS int) AS IncidentCountTotal,
    CAST(NULL AS int) AS IncidentCountCritical,
    CAST(NULL AS int) AS OpenProblemCount,
    CAST(NULL AS decimal(6, 1)) AS ChangeSuccessPct,
    CAST(NULL AS decimal(5, 2)) AS CsatScore,
    CAST(NULL AS int) AS OpenVendorCaseCount
FROM dbo.vw_Kpi_HealthRag_Proposed AS h;
GO

PRINT N'KPI views created/altered successfully.';
GO
