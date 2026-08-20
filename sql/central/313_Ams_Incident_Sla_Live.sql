/*
  RPMAssure_App — Live AMS incident + SLA tracking (idempotent)
  sqlcmd -S "102.222.21.220,14333" -d "RPMAssure_App" -E -C -b -i 313_Ams_Incident_Sla_Live.sql
*/
USE [RPMAssure_App];
GO
SET NOCOUNT ON;
GO

/* ---- Ensure Fact_Incident exists (minimal) ---- */
IF OBJECT_ID(N'dbo.Fact_Incident', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Fact_Incident
    (
        IncidentId uniqueidentifier NOT NULL CONSTRAINT DF_Fact_Incident_Id DEFAULT (NEWSEQUENTIALID()),
        CustomerCode nvarchar(50) NOT NULL,
        Title nvarchar(300) NOT NULL,
        Severity nvarchar(20) NOT NULL,
        Status nvarchar(30) NOT NULL,
        Priority nvarchar(20) NULL,
        OpenedAt datetime2(3) NOT NULL,
        FirstResponseAt datetime2(3) NULL,
        ResolvedAt datetime2(3) NULL,
        ClosedAt datetime2(3) NULL,
        BusinessImpact nvarchar(max) NULL,
        ModuleCode nvarchar(50) NULL,
        ExternalRef nvarchar(100) NULL,
        IsMajor bit NOT NULL CONSTRAINT DF_Fact_Incident_Major DEFAULT (0),
        ResponseSlaMet bit NULL,
        ResolveSlaMet bit NULL,
        OwnerName nvarchar(200) NULL,
        SourceSystem nvarchar(50) NULL,
        CreatedAt datetime2(3) NOT NULL CONSTRAINT DF_Fact_Incident_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt datetime2(3) NOT NULL CONSTRAINT DF_Fact_Incident_UpdatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_Fact_Incident PRIMARY KEY (IncidentId)
    );
    CREATE INDEX IX_Fact_Incident_Cust ON dbo.Fact_Incident (CustomerCode, OpenedAt DESC);
    PRINT 'Created Fact_Incident';
END
GO

/* ---- Add missing columns one by one (each batch sees prior ALTERs) ---- */
IF COL_LENGTH(N'dbo.Fact_Incident', N'FirstResponseAt') IS NULL
  ALTER TABLE dbo.Fact_Incident ADD FirstResponseAt datetime2(3) NULL;
GO
IF COL_LENGTH(N'dbo.Fact_Incident', N'ResolvedAt') IS NULL
  ALTER TABLE dbo.Fact_Incident ADD ResolvedAt datetime2(3) NULL;
GO
IF COL_LENGTH(N'dbo.Fact_Incident', N'ClosedAt') IS NULL
  ALTER TABLE dbo.Fact_Incident ADD ClosedAt datetime2(3) NULL;
GO
IF COL_LENGTH(N'dbo.Fact_Incident', N'ResponseSlaMet') IS NULL
  ALTER TABLE dbo.Fact_Incident ADD ResponseSlaMet bit NULL;
GO
IF COL_LENGTH(N'dbo.Fact_Incident', N'ResolveSlaMet') IS NULL
  ALTER TABLE dbo.Fact_Incident ADD ResolveSlaMet bit NULL;
GO
IF COL_LENGTH(N'dbo.Fact_Incident', N'Priority') IS NULL
  ALTER TABLE dbo.Fact_Incident ADD Priority nvarchar(20) NULL;
GO
IF COL_LENGTH(N'dbo.Fact_Incident', N'BusinessImpact') IS NULL
  ALTER TABLE dbo.Fact_Incident ADD BusinessImpact nvarchar(max) NULL;
GO
IF COL_LENGTH(N'dbo.Fact_Incident', N'ModuleCode') IS NULL
  ALTER TABLE dbo.Fact_Incident ADD ModuleCode nvarchar(50) NULL;
GO
IF COL_LENGTH(N'dbo.Fact_Incident', N'OwnerName') IS NULL
  ALTER TABLE dbo.Fact_Incident ADD OwnerName nvarchar(200) NULL;
GO
IF COL_LENGTH(N'dbo.Fact_Incident', N'SourceSystem') IS NULL
  ALTER TABLE dbo.Fact_Incident ADD SourceSystem nvarchar(50) NULL;
GO

PRINT 'Fact_Incident columns ensured (OwnerName, SourceSystem, SLA clocks).';
GO

/* ---- Dim_SlaPolicy ---- */
IF OBJECT_ID(N'dbo.Dim_SlaPolicy', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Dim_SlaPolicy
    (
        SlaPolicyId int NOT NULL IDENTITY(1,1),
        CustomerCode nvarchar(50) NULL,
        Priority nvarchar(20) NOT NULL,
        RespondMins int NOT NULL,
        ResolveMins int NOT NULL,
        AvailabilityPct decimal(6,3) NULL,
        Active bit NOT NULL CONSTRAINT DF_Sla_Active DEFAULT (1),
        CONSTRAINT PK_Dim_SlaPolicy PRIMARY KEY (SlaPolicyId)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Dim_SlaPolicy)
BEGIN
  INSERT dbo.Dim_SlaPolicy (CustomerCode, Priority, RespondMins, ResolveMins, AvailabilityPct) VALUES
  (NULL,N'Critical',60,240,99.500),
  (NULL,N'High',240,480,99.500),
  (NULL,N'Medium',480,1440,99.500),
  (NULL,N'Low',1440,4320,99.500);
  PRINT 'Seeded default Dim_SlaPolicy';
END
GO

/* ---- Fact_SlaPeriod ---- */
IF OBJECT_ID(N'dbo.Fact_SlaPeriod', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Fact_SlaPeriod
  (
    SlaPeriodId        uniqueidentifier NOT NULL CONSTRAINT DF_Fact_SlaPeriod_Id DEFAULT (NEWSEQUENTIALID()),
    CustomerCode       nvarchar(50)     NOT NULL,
    PeriodFrom         date             NOT NULL,
    PeriodTo           date             NOT NULL,
    AvailabilityPct    decimal(6,3)     NULL,
    AvailabilitySlaPct decimal(6,3)     NULL,
    SlaResponsePct     decimal(6,3)     NULL,
    SlaResolvePct      decimal(6,3)     NULL,
    SlaCompliancePct   decimal(6,3)     NULL,
    IncidentCount      int              NULL,
    BreachCount        int              NULL,
    Source             nvarchar(50)     NOT NULL CONSTRAINT DF_Fact_SlaPeriod_Src DEFAULT (N'manual'),
    Note               nvarchar(500)    NULL,
    CreatedAtUtc       datetime2(3)     NOT NULL CONSTRAINT DF_Fact_SlaPeriod_Created DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Fact_SlaPeriod PRIMARY KEY (SlaPeriodId)
  );
  CREATE INDEX IX_Fact_SlaPeriod_Cust ON dbo.Fact_SlaPeriod (CustomerCode, PeriodTo DESC);
  PRINT 'Created Fact_SlaPeriod';
END
GO

/* ---- Live incident view ---- */
CREATE OR ALTER VIEW dbo.vw_Ams_IncidentLive
AS
SELECT
  i.IncidentId,
  i.CustomerCode,
  i.Title,
  i.Severity,
  i.Status,
  COALESCE(i.Priority, i.Severity) AS Priority,
  i.OpenedAt,
  i.FirstResponseAt,
  i.ResolvedAt,
  i.ClosedAt,
  i.IsMajor,
  i.ExternalRef,
  i.OwnerName,
  i.SourceSystem,
  i.BusinessImpact,
  i.ModuleCode,
  i.ResponseSlaMet,
  i.ResolveSlaMet,
  p.RespondMins,
  p.ResolveMins,
  CASE
    WHEN i.FirstResponseAt IS NOT NULL AND p.RespondMins IS NOT NULL
      THEN DATEDIFF(MINUTE, i.OpenedAt, i.FirstResponseAt)
    WHEN i.FirstResponseAt IS NULL AND i.Status NOT IN (N'Resolved', N'Closed', N'Cancelled') AND p.RespondMins IS NOT NULL
      THEN DATEDIFF(MINUTE, i.OpenedAt, SYSUTCDATETIME())
    ELSE NULL
  END AS ResponseMinsElapsed,
  CASE
    WHEN i.ResolvedAt IS NOT NULL AND p.ResolveMins IS NOT NULL
      THEN DATEDIFF(MINUTE, i.OpenedAt, i.ResolvedAt)
    WHEN i.ResolvedAt IS NULL AND i.Status NOT IN (N'Resolved', N'Closed', N'Cancelled') AND p.ResolveMins IS NOT NULL
      THEN DATEDIFF(MINUTE, i.OpenedAt, SYSUTCDATETIME())
    ELSE NULL
  END AS ResolveMinsElapsed,
  CASE
    WHEN i.ResponseSlaMet IS NOT NULL THEN i.ResponseSlaMet
    WHEN i.FirstResponseAt IS NOT NULL AND p.RespondMins IS NOT NULL
      THEN CASE WHEN DATEDIFF(MINUTE, i.OpenedAt, i.FirstResponseAt) <= p.RespondMins THEN CAST(1 AS bit) ELSE CAST(0 AS bit) END
    ELSE NULL
  END AS ResponseSlaMetCalc,
  CASE
    WHEN i.ResolveSlaMet IS NOT NULL THEN i.ResolveSlaMet
    WHEN i.ResolvedAt IS NOT NULL AND p.ResolveMins IS NOT NULL
      THEN CASE WHEN DATEDIFF(MINUTE, i.OpenedAt, i.ResolvedAt) <= p.ResolveMins THEN CAST(1 AS bit) ELSE CAST(0 AS bit) END
    ELSE NULL
  END AS ResolveSlaMetCalc
FROM dbo.Fact_Incident AS i WITH (NOLOCK)
OUTER APPLY (
  SELECT TOP 1 RespondMins, ResolveMins
  FROM dbo.Dim_SlaPolicy WITH (NOLOCK)
  WHERE Active = 1
    AND Priority = COALESCE(i.Priority, i.Severity)
    AND (CustomerCode = i.CustomerCode OR CustomerCode IS NULL)
  ORDER BY CASE WHEN CustomerCode = i.CustomerCode THEN 0 ELSE 1 END
) AS p;
GO

CREATE OR ALTER VIEW dbo.vw_Ams_SlaCompliance_30d
AS
SELECT
  CustomerCode,
  COUNT(*) AS IncidentCount30d,
  SUM(CASE WHEN ResponseSlaMetCalc = 1 THEN 1 ELSE 0 END) AS ResponseMet,
  SUM(CASE WHEN ResponseSlaMetCalc = 0 THEN 1 ELSE 0 END) AS ResponseBreach,
  SUM(CASE WHEN ResolveSlaMetCalc = 1 THEN 1 ELSE 0 END) AS ResolveMet,
  SUM(CASE WHEN ResolveSlaMetCalc = 0 THEN 1 ELSE 0 END) AS ResolveBreach,
  SUM(CASE WHEN ResponseSlaMetCalc IS NOT NULL THEN 1 ELSE 0 END) AS ResponseScored,
  SUM(CASE WHEN ResolveSlaMetCalc IS NOT NULL THEN 1 ELSE 0 END) AS ResolveScored,
  CASE
    WHEN SUM(CASE WHEN ResponseSlaMetCalc IS NOT NULL THEN 1 ELSE 0 END) = 0 THEN NULL
    ELSE CAST(100.0 * SUM(CASE WHEN ResponseSlaMetCalc = 1 THEN 1 ELSE 0 END)
         / NULLIF(SUM(CASE WHEN ResponseSlaMetCalc IS NOT NULL THEN 1 ELSE 0 END), 0) AS decimal(6,2))
  END AS SlaResponsePct,
  CASE
    WHEN SUM(CASE WHEN ResolveSlaMetCalc IS NOT NULL THEN 1 ELSE 0 END) = 0 THEN NULL
    ELSE CAST(100.0 * SUM(CASE WHEN ResolveSlaMetCalc = 1 THEN 1 ELSE 0 END)
         / NULLIF(SUM(CASE WHEN ResolveSlaMetCalc IS NOT NULL THEN 1 ELSE 0 END), 0) AS decimal(6,2))
  END AS SlaResolvePct
FROM dbo.vw_Ams_IncidentLive
WHERE OpenedAt >= DATEADD(DAY, -30, SYSUTCDATETIME())
  AND Status <> N'Cancelled'
GROUP BY CustomerCode;
GO

/* Prove columns */
SELECT
  COL_LENGTH(N'dbo.Fact_Incident', N'OwnerName') AS OwnerName_ok,
  COL_LENGTH(N'dbo.Fact_Incident', N'SourceSystem') AS SourceSystem_ok;
PRINT '313 AMS incident + SLA live ready.';
GO
