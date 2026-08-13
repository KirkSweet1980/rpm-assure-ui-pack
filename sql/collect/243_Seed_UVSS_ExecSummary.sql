/*
  CENTRAL - Executive summary + optional measured SLA snapshot for UVSS
  sqlcmd -S "102.222.21.220,14333" -d "RPMAssure_App" -E -C -i 243_Seed_UVSS_ExecSummary.sql
*/
USE RPMAssure_App;
GO
SET NOCOUNT ON;

IF NOT EXISTS (SELECT 1 FROM dbo.Dim_Customer WHERE CustomerCode = N'UVSS' AND Active = 1)
BEGIN RAISERROR(N'UVSS missing',16,1); RETURN; END

DECLARE @from date = DATEFROMPARTS(YEAR(SYSUTCDATETIME()), MONTH(SYSUTCDATETIME()), 1);
DECLARE @to date = EOMONTH(SYSUTCDATETIME());
DECLARE @label nvarchar(40) = FORMAT(@from, 'MMM yyyy');

/* Remove prior seed for same period */
DELETE n FROM dbo.Fact_ExecNarrative n
INNER JOIN dbo.Fact_ExecSummary s ON s.ExecSummaryId = n.ExecSummaryId
WHERE s.CustomerCode = N'UVSS' AND s.PeriodFrom = @from AND s.PeriodTo = @to
  AND s.HealthSummary LIKE N'%[SEED]%';
DELETE FROM dbo.Fact_ExecSummary
WHERE CustomerCode = N'UVSS' AND PeriodFrom = @from AND PeriodTo = @to
  AND HealthSummary LIKE N'%[SEED]%';

DECLARE @id uniqueidentifier = NEWID();

INSERT INTO dbo.Fact_ExecSummary
(
  ExecSummaryId, CustomerCode, PeriodFrom, PeriodTo, PeriodLabel,
  HealthRag, HealthSummary, BusinessImpactSummary,
  OpenRiskCount, OpenIssueCount, MajorIncidentCount, Status, PublishedAt
)
VALUES
(
  @id, N'UVSS', @from, @to, @label,
  N'Amber',
  N'[SEED] AMS period health: SYSPRO operators and DTR monitored; elevated out-of-balance on CB/DN; job errors on IMP010 under review.',
  N'[SEED] Finance month-end risk if CB/DN variances not cleared; import operators impacted by IMP010 retries.',
  2, 1, 0, N'Draft', NULL
);

INSERT INTO dbo.Fact_ExecNarrative (ExecSummaryId, CustomerCode, NarrativeType, SortOrder, Title, Body)
VALUES
(@id, N'UVSS', N'Achievement', 1, N'Live AMS telemetry',
 N'Operators, logins, jobs, license, tasks, health log and Datarapt L1 now feed Daily Drumbeat and customer AMS.'),
(@id, N'UVSS', N'Achievement', 2, N'Scheduled collect',
 N'15-minute collect for core SYSPRO extracts; daily job log window established.'),
(@id, N'UVSS', N'PriorityNextPeriod', 1, N'Clear DTR hotspots',
 N'Prioritise Cashbook and Dispatch Notes out-of-balance lines before month-end close.'),
(@id, N'UVSS', N'PriorityNextPeriod', 2, N'IMP010 recurrence',
 N'Root-cause ProgErrorCode 99 with functional owner; reduce re-runs.'),
(@id, N'UVSS', N'Other', 1, N'Decisions required',
 N'Confirm whether elevated CB variances need finance sign-off or Datarapt refresh only.');

/* Measured SLA example (optional) - clearly seed-like notes via Health on snapshot if updating */
IF OBJECT_ID(N'dbo.Fact_DashboardSnapshot', N'U') IS NOT NULL
BEGIN
  IF EXISTS (SELECT 1 FROM dbo.Fact_DashboardSnapshot WHERE CustomerCode=N'UVSS' AND PeriodFrom=@from AND PeriodTo=@to)
    UPDATE dbo.Fact_DashboardSnapshot
    SET AvailabilityPct = 99.82,
        AvailabilitySlaPct = 99.500,
        SlaResponsePct = 96.0,
        SlaResolvePct = 94.0,
        SlaCompliancePct = 95.0,
        HealthRag = N'Amber',
        HealthSummary = N'[SEED] Sample measured availability/SLA - replace with monitoring feed.'
    WHERE CustomerCode=N'UVSS' AND PeriodFrom=@from AND PeriodTo=@to;
  ELSE
    INSERT INTO dbo.Fact_DashboardSnapshot
    (CustomerCode, PeriodFrom, PeriodTo, PeriodLabel, AsOfAt, HealthRag, HealthSummary,
     AvailabilityPct, AvailabilitySlaPct, SlaResponsePct, SlaResolvePct, SlaCompliancePct)
    VALUES
    (N'UVSS', @from, @to, @label, SYSUTCDATETIME(), N'Amber',
     N'[SEED] Sample measured availability/SLA - replace with monitoring feed.',
     99.82, 99.500, 96.0, 94.0, 95.0);
END

SELECT 'ExecSummary' t, COUNT(*) c FROM dbo.Fact_ExecSummary WHERE CustomerCode=N'UVSS'
UNION ALL SELECT 'Narratives', COUNT(*) FROM dbo.Fact_ExecNarrative n
  INNER JOIN dbo.Fact_ExecSummary s ON s.ExecSummaryId=n.ExecSummaryId WHERE s.CustomerCode=N'UVSS';

SELECT PeriodLabel, HealthRag, Status FROM dbo.Fact_ExecSummary WHERE CustomerCode=N'UVSS' ORDER BY PeriodTo DESC;
SELECT AvailabilityPct, SlaCompliancePct FROM dbo.Fact_DashboardSnapshot WHERE CustomerCode=N'UVSS' AND PeriodFrom=@from;
GO
PRINT N'Exec summary + measured SLA seed complete.';
GO
