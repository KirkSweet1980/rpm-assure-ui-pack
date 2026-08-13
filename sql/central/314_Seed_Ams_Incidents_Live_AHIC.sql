USE [RPMAssure_App];
GO
SET NOCOUNT ON;
GO

IF COL_LENGTH(N'dbo.Fact_Incident', N'OwnerName') IS NULL
   OR COL_LENGTH(N'dbo.Fact_Incident', N'SourceSystem') IS NULL
BEGIN
  RAISERROR(N'Columns missing - run 313a first.', 16, 1);
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Dim_Customer WHERE CustomerCode = N'AHIC' AND Active = 1)
BEGIN
  RAISERROR(N'AHIC not active', 16, 1);
END
GO

DELETE FROM dbo.Fact_Incident WHERE CustomerCode = N'AHIC' AND ExternalRef LIKE N'LIVE-%';
GO

DECLARE @now datetime2(3) = SYSUTCDATETIME();

INSERT INTO dbo.Fact_Incident
(
  CustomerCode, Title, Severity, Status, Priority,
  OpenedAt, FirstResponseAt, ResolvedAt, IsMajor,
  ExternalRef, ResponseSlaMet, ResolveSlaMet,
  SourceSystem, OwnerName, BusinessImpact
)
VALUES
(N'AHIC', N'IMP010 transaction abort - production posting', N'High', N'InProgress', N'High',
 DATEADD(HOUR, -3, @now), DATEADD(HOUR, -2, @now), NULL, 0,
 N'LIVE-AHIC-001', 1, NULL, N'AMS', N'AMS Ops', N'Users blocked on order posting'),
(N'AHIC', N'FinSight AP control out of balance after month-end', N'Medium', N'New', N'Medium',
 DATEADD(HOUR, -5, @now), NULL, NULL, 0,
 N'LIVE-AHIC-002', NULL, NULL, N'FinSight', N'AMS Finance', N'Control recon incomplete'),
(N'AHIC', N'SYSPRO company I unavailable during peak', N'Critical', N'Resolved', N'Critical',
 DATEADD(DAY, -2, @now), DATEADD(MINUTE, 25, DATEADD(DAY, -2, @now)), DATEADD(HOUR, 3, DATEADD(DAY, -2, @now)), 1,
 N'LIVE-AHIC-003', 1, 1, N'AMS', N'AMS Ops', N'Availability impact - resolved'),
(N'AHIC', N'Overnight job errors elevated (IMP010)', N'High', N'Closed', N'High',
 DATEADD(DAY, -10, @now), DATEADD(HOUR, 5, DATEADD(DAY, -10, @now)), DATEADD(DAY, -8, @now), 0,
 N'LIVE-AHIC-004', 0, 0, N'SYSPRO-Jobs', N'AMS Ops', N'Response late vs High SLA');
GO

IF OBJECT_ID(N'dbo.Fact_SlaPeriod', N'U') IS NOT NULL
BEGIN
  DELETE FROM dbo.Fact_SlaPeriod WHERE CustomerCode = N'AHIC' AND Source = N'seed-live';
  DECLARE @now2 datetime2(3) = SYSUTCDATETIME();
  INSERT INTO dbo.Fact_SlaPeriod
    (CustomerCode, PeriodFrom, PeriodTo, AvailabilityPct, AvailabilitySlaPct,
     SlaResponsePct, SlaResolvePct, SlaCompliancePct, IncidentCount, BreachCount, Source, Note)
  VALUES
  (N'AHIC', CAST(DATEADD(DAY, -30, @now2) AS date), CAST(@now2 AS date),
   99.820, 99.500, 75.00, 50.00, 62.50, 4, 2, N'seed-live',
   N'Sample period from live seed');
END
GO

SELECT COUNT(*) AS LiveIncidents FROM dbo.Fact_Incident WHERE CustomerCode = N'AHIC' AND ExternalRef LIKE N'LIVE-%';
PRINT '314 seed OK';
GO
