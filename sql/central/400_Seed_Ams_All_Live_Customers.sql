/*
  Seed ExCo / AMS panels for all live customers: AHIC, UVSS, RSR, RSS.
  Safe re-run: deletes AUTO-SEED / [AMS seed] rows then re-inserts.

  sqlcmd -S "102.222.21.220,14333" -d "RPMAssure_App" -U "rpmassure" -P "..." -C -i 400_Seed_Ams_All_Live_Customers.sql
*/
SET NOCOUNT ON;
USE RPMAssure_App;
GO

-- Ensure Dim rows (instance names from collect packs)
MERGE dbo.Dim_Customer AS t
USING (VALUES
  (N'AHIC', N'AHI Carrier', N'AHIC-SSQL-SRV'),
  (N'UVSS', N'Unique Ventilation Systems', N'UVSS-SYSPRO'),
  (N'RSR',  N'Redsun Raisins', N'RSR-SQLSRV-DB'),
  (N'RSS',  N'Remote Site Solutions', N'RSS-PROD')
) AS s(CustomerCode, DisplayName, SqlInstanceName)
ON t.CustomerCode = s.CustomerCode
WHEN MATCHED THEN UPDATE SET
  DisplayName = s.DisplayName,
  SqlInstanceName = COALESCE(NULLIF(t.SqlInstanceName, N''), s.SqlInstanceName),
  Active = 1,
  UpdatedAt = SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT (CustomerCode, DisplayName, Active, SqlInstanceName)
  VALUES (s.CustomerCode, s.DisplayName, 1, s.SqlInstanceName);
GO

DECLARE @now datetime2(3) = SYSUTCDATETIME();
DECLARE @today date = CAST(@now AS date);
DECLARE @in30 date = DATEADD(day, 30, @today);
DECLARE @from date = DATEFROMPARTS(YEAR(@now), MONTH(@now), 1);
DECLARE @to date = EOMONTH(@now);
DECLARE @label nvarchar(40) = FORMAT(@from, 'MMM yyyy');

DECLARE @c TABLE (Code nvarchar(50) PRIMARY KEY, Name nvarchar(200));
INSERT INTO @c VALUES
  (N'AHIC', N'AHI Carrier'),
  (N'UVSS', N'Unique Ventilation Systems'),
  (N'RSR',  N'Redsun Raisins'),
  (N'RSS',  N'Remote Site Solutions');

/* Clean prior multi-customer auto seeds */
DELETE FROM dbo.Fact_Incident WHERE ExternalRef LIKE N'AUTO-SEED-%';
DELETE FROM dbo.Fact_Problem WHERE Title LIKE N'%[AMS seed]%';
DELETE FROM dbo.Fact_Risk WHERE Title LIKE N'%[AMS seed]%';
DELETE FROM dbo.Fact_Issue WHERE Title LIKE N'%[AMS seed]%';
DELETE FROM dbo.Fact_Priority WHERE Detail LIKE N'%[AMS seed]%';
DELETE FROM dbo.Fact_Change WHERE Title LIKE N'%[AMS seed]%';
DELETE FROM dbo.Fact_Csat WHERE Source = N'AMS seed';
DELETE FROM dbo.Fact_ExecSummary WHERE PeriodLabel LIKE N'AMS seed%';
DELETE FROM dbo.Fact_ExecNarrative WHERE Body LIKE N'%[AMS seed]%';
DELETE FROM dbo.Fact_DashboardSnapshot
WHERE HealthSummary LIKE N'%[AMS seed]%' OR HealthSummary LIKE N'%Measured sample%';

-- Risks
INSERT INTO dbo.Fact_Risk (CustomerCode, Title, Category, Rag, Status, OwnerName, TargetDate, Summary)
SELECT Code, N'Datarapt / finance variance watch [AMS seed]', N'Application', N'Amber', N'Open',
  N'AMS Lead', @in30, N'Review L1 out-of-balance lines before month-end.' FROM @c
UNION ALL
SELECT Code, N'Collect freshness & job reliability [AMS seed]', N'Application', N'Amber', N'Mitigating',
  N'Technical', @in30, N'15-min collect + nightly jobs must stay green.' FROM @c;

-- Issues
INSERT INTO dbo.Fact_Issue (CustomerCode, Title, Source, Severity, Status, OwnerName, TargetDate, Summary)
SELECT Code, N'Quarterly access review [AMS seed]', N'Process', N'Medium', N'Open',
  N'AMS Lead', @in30, N'Operator groups and amend journal review.' FROM @c;

-- Incidents
INSERT INTO dbo.Fact_Incident
  (CustomerCode, Title, Severity, Status, Priority, OpenedAt, IsMajor, ExternalRef, BusinessImpact, ModuleCode)
SELECT Code,
  N'Batch / import job review window [AMS seed]',
  N'Medium', N'Open', N'Medium', @now, 0,
  N'AUTO-SEED-' + Code + N'-INC1',
  N'Review recent SYSPRO job errors from collect.', N'JOB'
FROM @c;

-- Problems
INSERT INTO dbo.Fact_Problem (CustomerCode, Title, Severity, Status, OwnerName, OpenedAt, Summary)
SELECT Code, N'Recurring import / job exceptions [AMS seed]', N'Medium', N'Open', N'AMS',
  DATEADD(day, -7, @now), N'Track patterns from Syspro_JobLogging.' FROM @c;

-- Priorities
-- Priorities (ProgramCode optional — added by 245 if present)
IF COL_LENGTH(N'dbo.Fact_Priority', N'ProgramCode') IS NOT NULL
BEGIN
  INSERT INTO dbo.Fact_Priority (CustomerCode, Title, Detail, SortOrder, Status, PeriodLabel, ProgramCode)
  SELECT Code, N'Keep collect green', N'Fresh collect under 24h [AMS seed]', 1, N'Active', @label, NULL FROM @c
  UNION ALL
  SELECT Code, N'Review job error programs', N'Program-friendly review [AMS seed]', 2, N'Active', @label, N'IMP010' FROM @c
  UNION ALL
  SELECT Code, N'ExCo board pack ready', N'Weekly AMS digest + monthly pack [AMS seed]', 3, N'Active', @label, NULL FROM @c;
END
ELSE
BEGIN
  INSERT INTO dbo.Fact_Priority (CustomerCode, Title, Detail, SortOrder, Status, PeriodLabel)
  SELECT Code, N'Keep collect green', N'Fresh collect under 24h [AMS seed]', 1, N'Active', @label FROM @c
  UNION ALL
  SELECT Code, N'Review job error programs', N'Program-friendly review [AMS seed]', 2, N'Active', @label FROM @c
  UNION ALL
  SELECT Code, N'ExCo board pack ready', N'Weekly AMS digest + monthly pack [AMS seed]', 3, N'Active', @label FROM @c;
END


-- Change + CSAT
INSERT INTO dbo.Fact_Change (CustomerCode, Title, Status, Outcome, CompletedAt, Summary)
SELECT Code, N'Scheduled collect validation [AMS seed]', N'Completed', N'Succeeded', @now,
  N'15-min schedule confirmed' FROM @c
UNION ALL
SELECT Code, N'AMS panel seed publish [AMS seed]', N'Completed', N'Succeeded', @now,
  N'ExCo facts seeded' FROM @c;

INSERT INTO dbo.Fact_Csat (CustomerCode, PeriodFrom, PeriodTo, Score, ResponseCount, Source, Notes)
SELECT Code, DATEADD(day, -30, @today), @today, 4.2, 3, N'AMS seed', N'Sample — replace with survey feed'
FROM @c;

-- SLA / availability measured snapshot (current month) for every live customer
MERGE dbo.Fact_DashboardSnapshot AS t
USING (
  SELECT
    Code AS CustomerCode,
    @from AS PeriodFrom,
    @to AS PeriodTo,
    @label AS PeriodLabel,
    @now AS AsOfAt,
    N'Amber' AS HealthRag,
    CAST(NULL AS decimal(5,2)) AS HealthScore,
    N'Measured sample for AMS UI — replace with monitoring/ITSM feed. [AMS seed]' AS HealthSummary,
    CAST(99.700 AS decimal(6,3)) AS AvailabilityPct,
    CAST(99.500 AS decimal(6,3)) AS AvailabilitySlaPct,
    CAST(96.000 AS decimal(6,3)) AS SlaResponsePct,
    CAST(94.000 AS decimal(6,3)) AS SlaResolvePct,
    CAST(95.000 AS decimal(6,3)) AS SlaCompliancePct
  FROM @c
) AS s
ON t.CustomerCode = s.CustomerCode AND t.PeriodFrom = s.PeriodFrom AND t.PeriodTo = s.PeriodTo
WHEN MATCHED THEN UPDATE SET
  AsOfAt = s.AsOfAt,
  PeriodLabel = s.PeriodLabel,
  HealthRag = s.HealthRag,
  HealthSummary = s.HealthSummary,
  AvailabilityPct = s.AvailabilityPct,
  AvailabilitySlaPct = s.AvailabilitySlaPct,
  SlaResponsePct = s.SlaResponsePct,
  SlaResolvePct = s.SlaResolvePct,
  SlaCompliancePct = s.SlaCompliancePct
WHEN NOT MATCHED THEN INSERT (
  CustomerCode, PeriodFrom, PeriodTo, PeriodLabel, AsOfAt,
  HealthRag, HealthScore, HealthSummary,
  AvailabilityPct, AvailabilitySlaPct, SlaResponsePct, SlaResolvePct, SlaCompliancePct
) VALUES (
  s.CustomerCode, s.PeriodFrom, s.PeriodTo, s.PeriodLabel, s.AsOfAt,
  s.HealthRag, s.HealthScore, s.HealthSummary,
  s.AvailabilityPct, s.AvailabilitySlaPct, s.SlaResponsePct, s.SlaResolvePct, s.SlaCompliancePct
);

-- Exec summary shell
IF OBJECT_ID(N'dbo.Fact_ExecSummary', N'U') IS NOT NULL
BEGIN
  DELETE FROM dbo.Fact_ExecSummary WHERE PeriodLabel LIKE N'AMS seed%';
  INSERT INTO dbo.Fact_ExecSummary (
    CustomerCode, PeriodFrom, PeriodTo, PeriodLabel, HealthRag, HealthSummary,
    BusinessImpactSummary, OpenRiskCount, OpenIssueCount
  )
  SELECT Code, @from, @to, N'AMS seed ' + @label, N'Amber',
    N'Portfolio under RPM Assure — SYSPRO collect live; replace narrative monthly.',
    N'Operations continue; track job errors and DTR where present.',
    2, 1
  FROM @c;
END

SELECT 'Risks' t, COUNT(*) c FROM dbo.Fact_Risk WHERE Title LIKE N'%[AMS seed]%'
UNION ALL SELECT 'Incidents', COUNT(*) FROM dbo.Fact_Incident WHERE ExternalRef LIKE N'AUTO-SEED-%'
UNION ALL SELECT 'Priorities', COUNT(*) FROM dbo.Fact_Priority WHERE Detail LIKE N'%[AMS seed]%'
UNION ALL SELECT 'CSAT', COUNT(*) FROM dbo.Fact_Csat WHERE Source = N'AMS seed'
UNION ALL SELECT 'SLA snaps', COUNT(*) FROM dbo.Fact_DashboardSnapshot WHERE HealthSummary LIKE N'%[AMS seed]%';

PRINT N'400 AMS seed complete for AHIC, UVSS, RSR, RSS.';
GO
