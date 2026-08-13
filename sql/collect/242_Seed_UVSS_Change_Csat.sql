/*
  CENTRAL — sample Fact_Change + Fact_Csat for UVSS
  sqlcmd -S "102.222.21.220,14333" -d "RPMAssure_App" -E -C -i 242_Seed_UVSS_Change_Csat.sql
*/
USE RPMAssure_App;
GO
SET NOCOUNT ON;

IF NOT EXISTS (SELECT 1 FROM dbo.Dim_Customer WHERE CustomerCode = N'UVSS' AND Active = 1)
BEGIN
  RAISERROR(N'UVSS missing', 16, 1);
  RETURN;
END

DELETE FROM dbo.Fact_Change WHERE CustomerCode = N'UVSS' AND ExternalRef LIKE N'SEED-%';
DELETE FROM dbo.Fact_Csat WHERE CustomerCode = N'UVSS' AND Source = N'SEED';

INSERT INTO dbo.Fact_Change
  (CustomerCode, Title, Status, Outcome, CompletedAt, ExternalRef, Summary)
VALUES
  (N'UVSS', N'SYSPRO month-end batch window adjustment', N'Closed', N'Succeeded',
   DATEADD(DAY, -12, SYSUTCDATETIME()), N'SEED-CHG-001',
   N'Adjusted day-end task schedule; no rollback.'),
  (N'UVSS', N'Datarapt refresh procedure update', N'Closed', N'Succeeded',
   DATEADD(DAY, -5, SYSUTCDATETIME()), N'SEED-CHG-002',
   N'Improved L1 balance extract timing.'),
  (N'UVSS', N'IMP010 import parameter trial', N'InProgress', NULL,
   NULL, N'SEED-CHG-003',
   N'Investigating transaction nesting with vendor guidance.');

DECLARE @from date = DATEFROMPARTS(YEAR(DATEADD(MONTH, -1, SYSUTCDATETIME())), MONTH(DATEADD(MONTH, -1, SYSUTCDATETIME())), 1);
DECLARE @to date = EOMONTH(DATEADD(MONTH, -1, SYSUTCDATETIME()));

INSERT INTO dbo.Fact_Csat
  (CustomerCode, PeriodFrom, PeriodTo, Score, ResponseCount, Source, Notes)
VALUES
  (N'UVSS', @from, @to, 4.20, 6, N'SEED', N'Sample AMS satisfaction pulse (replace with real survey).');

SELECT 'Changes' t, COUNT(*) c FROM dbo.Fact_Change WHERE CustomerCode = N'UVSS'
UNION ALL
SELECT 'Csat', COUNT(*) FROM dbo.Fact_Csat WHERE CustomerCode = N'UVSS';

SELECT TOP 5 Title, Status, Outcome, ExternalRef FROM dbo.Fact_Change WHERE CustomerCode = N'UVSS' ORDER BY CreatedAt DESC;
SELECT TOP 1 PeriodFrom, PeriodTo, Score, ResponseCount, Source FROM dbo.Fact_Csat WHERE CustomerCode = N'UVSS' ORDER BY PeriodTo DESC;
GO
PRINT N'Seed Change + CSAT for UVSS complete.';
GO
