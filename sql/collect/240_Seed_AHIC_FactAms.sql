/*
  CENTRAL — sample Fact AMS rows for AHIC (safe to re-run: deletes previous seed tags)
  sqlcmd -S "102.222.21.220,14333" -d "RPMAssure_App" -E -C -i 240_Seed_AHIC_FactAms.sql
*/
USE RPMAssure_App;
GO
SET NOCOUNT ON;

IF NOT EXISTS (SELECT 1 FROM dbo.Dim_Customer WHERE CustomerCode = N'AHIC' AND Active = 1)
BEGIN
  RAISERROR(N'AHIC missing from Dim_Customer', 16, 1);
  RETURN;
END

/* Clear prior seed rows (external refs / titles we own) */
DELETE FROM dbo.Fact_Incident WHERE CustomerCode = N'AHIC' AND ExternalRef LIKE N'SEED-%';
DELETE FROM dbo.Fact_Problem WHERE CustomerCode = N'AHIC' AND Title LIKE N'[SEED]%';
DELETE FROM dbo.Fact_Risk WHERE CustomerCode = N'AHIC' AND Title LIKE N'[SEED]%';
DELETE FROM dbo.Fact_Issue WHERE CustomerCode = N'AHIC' AND Title LIKE N'[SEED]%';
DELETE FROM dbo.Fact_Priority WHERE CustomerCode = N'AHIC' AND Title LIKE N'[SEED]%';

INSERT INTO dbo.Fact_Incident
  (CustomerCode, Title, Severity, Status, Priority, OpenedAt, IsMajor, ExternalRef, BusinessImpact, ModuleCode)
VALUES
  (N'AHIC', N'IMP010 SQL transaction conflicts during import', N'Medium', N'InProgress', N'Medium',
   DATEADD(DAY, -2, SYSUTCDATETIME()), 0, N'SEED-INC-001',
   N'Repeat job errors on stock/import programmes; operators re-run batch.', N'INV'),
  (N'AHIC', N'Datarapt CB out-of-balance elevated pre month-end', N'High', N'New', N'High',
   DATEADD(DAY, -1, SYSUTCDATETIME()), 0, N'SEED-INC-002',
   N'Cashbook variance lines all out of balance on L1 snapshot.', N'CB');

INSERT INTO dbo.Fact_Problem
  (CustomerCode, Title, Severity, Status, OwnerName, OpenedAt, Summary)
VALUES
  (N'AHIC', N'[SEED] Recurring IMP010 transaction nesting', N'Medium', N'Investigating',
   N'AMS Technical', DATEADD(DAY, -14, SYSUTCDATETIME()),
   N'Pattern of ProgErrorCode 99 on IMP010 for operator CHANTAL.');

INSERT INTO dbo.Fact_Risk
  (CustomerCode, Title, Category, Rag, Status, OwnerName, TargetDate, Summary)
VALUES
  (N'AHIC', N'[SEED] Month-end blocked by CB/DN DTR variances', N'Application', N'Amber', N'Open',
   N'AMS Lead', CAST(DATEADD(DAY, 10, SYSUTCDATETIME()) AS date),
   N'Cashbook and Dispatch Notes show high out-of-balance counts.'),
  (N'AHIC', N'[SEED] License expiry tracking', N'Commercial', N'Green', N'Mitigating',
   N'Account Manager', CAST(DATEADD(DAY, 90, SYSUTCDATETIME()) AS date),
   N'Monitor SYSPRO license import and user seat usage.');

INSERT INTO dbo.Fact_Issue
  (CustomerCode, Title, Source, Severity, Status, OwnerName, TargetDate, Summary)
VALUES
  (N'AHIC', N'[SEED] ASS DTR collect column map incomplete', N'Internal', N'Low', N'InProgress',
   N'AMS Technical', CAST(DATEADD(DAY, 7, SYSUTCDATETIME()) AS date),
   N'Assets tile empty until ASS GL-only path confirmed on schedule pack.');

INSERT INTO dbo.Fact_Priority
  (CustomerCode, Title, Detail, SortOrder, Status, PeriodLabel)
VALUES
  (N'AHIC', N'[SEED] Clear CB and DN out-of-balance lines', N'Work with finance on Datarapt refresh and open journals.', 1, N'Active', N'Aug 2026'),
  (N'AHIC', N'[SEED] Reduce IMP010 job error recurrence', N'Root-cause with vendor/internal on transaction nesting.', 2, N'Active', N'Aug 2026'),
  (N'AHIC', N'[SEED] Confirm SYSPRO health check 14 OOB items', N'Align AdmSysHealthLog message with DTR action list.', 3, N'Active', N'Aug 2026');

SELECT 'Incidents' t, COUNT(*) c FROM dbo.Fact_Incident WHERE CustomerCode=N'AHIC'
UNION ALL SELECT 'Problems', COUNT(*) FROM dbo.Fact_Problem WHERE CustomerCode=N'AHIC'
UNION ALL SELECT 'Risks', COUNT(*) FROM dbo.Fact_Risk WHERE CustomerCode=N'AHIC'
UNION ALL SELECT 'Issues', COUNT(*) FROM dbo.Fact_Issue WHERE CustomerCode=N'AHIC'
UNION ALL SELECT 'Priorities', COUNT(*) FROM dbo.Fact_Priority WHERE CustomerCode=N'AHIC';
GO
PRINT N'Seed Fact AMS for AHIC complete.';
GO
