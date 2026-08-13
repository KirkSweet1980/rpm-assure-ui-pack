/*
  Seed AMS fact panels for AHIC + UVSS so ExCo / AMS tree is never empty.
  Safe to re-run (deletes prior AUTO- seed rows for those customers).
  sqlcmd -S "102.222.21.220,14333" -d "RPMAssure_App" -E -C -i 320_...
*/
SET NOCOUNT ON;
USE RPMAssure_App;
GO

DECLARE @today date = CAST(SYSUTCDATETIME() AT TIME ZONE 'UTC' AT TIME ZONE 'South Africa Standard Time' AS date);
DECLARE @now datetime2 = SYSUTCDATETIME();

-- ensure customers exist
IF NOT EXISTS (SELECT 1 FROM dbo.Dim_Customer WHERE CustomerCode = N'AHIC')
  INSERT INTO dbo.Dim_Customer (CustomerCode, DisplayName, Active, SqlInstanceName)
  VALUES (N'AHIC', N'AHI Carrier', 1, N'AHIC-SSQL-SRV');
IF NOT EXISTS (SELECT 1 FROM dbo.Dim_Customer WHERE CustomerCode = N'UVSS')
  INSERT INTO dbo.Dim_Customer (CustomerCode, DisplayName, Active, SqlInstanceName)
  VALUES (N'UVSS', N'Unique Ventilation Systems', 1, N'UVSS-SYSPRO');

-- clean prior auto seeds
DELETE FROM dbo.Fact_Incident WHERE ExternalRef LIKE N'AUTO-%';
DELETE FROM dbo.Fact_Problem WHERE Title LIKE N'%[AMS seed]%';
DELETE FROM dbo.Fact_Risk WHERE Title LIKE N'%[AMS seed]%';
DELETE FROM dbo.Fact_Issue WHERE Title LIKE N'%[AMS seed]%';
DELETE FROM dbo.Fact_Priority WHERE Detail LIKE N'%[AMS seed]%';
DELETE FROM dbo.Fact_Change WHERE Title LIKE N'%[AMS seed]%';
DELETE FROM dbo.Fact_Csat WHERE Source = N'AMS seed';
DELETE FROM dbo.Fact_ExecSummary WHERE PeriodLabel = N'AMS seed';
DELETE FROM dbo.Fact_ExecNarrative WHERE Body LIKE N'%[AMS seed]%';
DELETE FROM dbo.Fact_DashboardSnapshot WHERE Source = N'AMS seed';
GO

-- helper inserts via script body continued
DECLARE @now datetime2 = SYSUTCDATETIME();
DECLARE @today date = CAST(@now AS date);
DECLARE @in30 date = DATEADD(day, 30, @today);

DECLARE @c table (Code nvarchar(20), Name nvarchar(200));
INSERT INTO @c VALUES (N'AHIC', N'AHI Carrier'), (N'UVSS', N'Unique Ventilation Systems');

-- Risks
INSERT INTO dbo.Fact_Risk (CustomerCode, Title, Rag, Status, OwnerName, TargetDate, Category)
SELECT Code, N'Datarapt / finance variance watch [AMS seed]', N'Amber', N'Open', N'AMS Lead', @in30, N'Application' FROM @c
UNION ALL
SELECT Code, N'Job logging reliability [AMS seed]', N'Amber', N'Open', N'Technical', @in30, N'Application' FROM @c;

INSERT INTO dbo.Fact_Issue (CustomerCode, Title, Status, Severity, OwnerName, TargetDate)
SELECT Code, N'Access review this quarter [AMS seed]', N'Open', N'Medium', N'AMS Lead', @in30 FROM @c;

INSERT INTO dbo.Fact_Incident (CustomerCode, Title, Severity, Status, OpenedAt, IsMajor, ExternalRef)
SELECT Code, N'Batch job review window [AMS seed]', N'Medium', N'Open', @now, 0, N'AUTO-' + Code + N'-1' FROM @c;

INSERT INTO dbo.Fact_Problem (CustomerCode, Title, Status, Severity, OwnerName, OpenedAt)
SELECT Code, N'Recurring import exceptions [AMS seed]', N'Open', N'Medium', N'AMS', @now FROM @c;

INSERT INTO dbo.Fact_Priority (CustomerCode, Title, Detail, Status, SortOrder, PeriodLabel, ProgramCode)
SELECT Code, N'Keep collect green', N'Fresh collect under 24h [AMS seed]', N'Active', 1, N'Current', NULL FROM @c
UNION ALL
SELECT Code, N'Review IMP010 / job errors', N'Program-friendly review [AMS seed]', N'Active', 2, N'Current', N'IMP010' FROM @c;

INSERT INTO dbo.Fact_Change (CustomerCode, Title, Status, Outcome, CompletedAt)
SELECT Code, N'Scheduled collect validation [AMS seed]', N'Completed', N'Success', @now FROM @c
UNION ALL
SELECT Code, N'AMS pack publish [AMS seed]', N'Completed', N'Success', @now FROM @c;

-- CSAT if table exists
IF OBJECT_ID(N'dbo.Fact_Csat', N'U') IS NOT NULL
BEGIN
  INSERT INTO dbo.Fact_Csat (CustomerCode, PeriodFrom, PeriodTo, Score, ResponseCount, Source)
  SELECT Code, DATEADD(day, -30, @today), @today, 4.2, 5, N'AMS seed' FROM @c;
END

IF OBJECT_ID(N'dbo.Fact_DashboardSnapshot', N'U') IS NOT NULL
BEGIN
  INSERT INTO dbo.Fact_DashboardSnapshot (
    CustomerCode, SnapshotDate, SlaCompliancePct, AvailabilityPct, Source
  )
  SELECT Code, @today, 96.5, 99.4, N'AMS seed' FROM @c;
END

PRINT 'AMS seed panels loaded for AHIC + UVSS';
GO
