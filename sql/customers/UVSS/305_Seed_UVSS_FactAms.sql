/*
  CENTRAL — light AMS fact seed for UVSS (safe re-run)
  sqlcmd -S "102.222.21.220,14333" -d "RPMAssure_App" -E -C -i 305_Seed_UVSS_FactAms.sql
*/
USE RPMAssure_App;
GO
SET NOCOUNT ON;

IF NOT EXISTS (SELECT 1 FROM dbo.Dim_Customer WHERE CustomerCode = N'UVSS' AND Active = 1)
BEGIN
  RAISERROR(N'UVSS not in Dim_Customer', 16, 1);
  RETURN;
END

DELETE FROM dbo.Fact_Incident WHERE CustomerCode = N'UVSS' AND ExternalRef LIKE N'SEED-%';
DELETE FROM dbo.Fact_Problem WHERE CustomerCode = N'UVSS' AND Title LIKE N'[SEED]%';
DELETE FROM dbo.Fact_Risk WHERE CustomerCode = N'UVSS' AND Title LIKE N'[SEED]%';
DELETE FROM dbo.Fact_Issue WHERE CustomerCode = N'UVSS' AND Title LIKE N'[SEED]%';
DELETE FROM dbo.Fact_Priority WHERE CustomerCode = N'UVSS' AND Title LIKE N'[SEED]%';

IF OBJECT_ID(N'dbo.Fact_Incident', N'U') IS NOT NULL
INSERT INTO dbo.Fact_Incident
  (CustomerCode, Title, Severity, Status, Priority, OpenedAt, IsMajor, ExternalRef, BusinessImpact, ModuleCode)
VALUES
  (N'UVSS', N'SYSPRO AMS onboard - baseline monitoring', N'Low', N'Closed', N'Low',
   DATEADD(DAY, -1, SYSUTCDATETIME()), 0, N'SEED-UVSS-INC-001',
   N'UVSS collect active: operators, jobs, DTR, license.', N'AMS');

IF OBJECT_ID(N'dbo.Fact_Priority', N'U') IS NOT NULL
INSERT INTO dbo.Fact_Priority
  (CustomerCode, Title, Status, OwnerName, TargetDate, SortOrder, Summary)
VALUES
  (N'UVSS', N'[SEED] Confirm Datarapt L1 refresh on all companies', N'Open', N'AMS Technical',
   DATEADD(DAY, 14, CAST(SYSUTCDATETIME() AS date)), 1,
   N'Validate multi-company DTR after schedule runs.'),
  (N'UVSS', N'[SEED] Review job errors weekly', N'Open', N'Customer IT',
   DATEADD(DAY, 7, CAST(SYSUTCDATETIME() AS date)), 2,
   N'Use Jobs panel on UVSS customer dashboard.');

IF OBJECT_ID(N'dbo.Fact_Risk', N'U') IS NOT NULL
INSERT INTO dbo.Fact_Risk
  (CustomerCode, Title, Category, Rag, Status, OwnerName, TargetDate, Summary)
VALUES
  (N'UVSS', N'[SEED] Single-site collect dependency', N'Operational', N'Green', N'Open',
   N'RPM AMS', DATEADD(DAY, 30, CAST(SYSUTCDATETIME() AS date)),
   N'Collect runs on UVSS-SYSPRO only; monitor schedule health.');

PRINT N'Seed Fact AMS for UVSS complete.';
GO
