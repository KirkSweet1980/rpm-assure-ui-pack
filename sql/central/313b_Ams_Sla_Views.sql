USE [RPMAssure_App];
GO

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
END
GO

IF OBJECT_ID(N'dbo.Fact_SlaPeriod', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Fact_SlaPeriod
  (
    SlaPeriodId uniqueidentifier NOT NULL CONSTRAINT DF_Fact_SlaPeriod_Id DEFAULT (NEWSEQUENTIALID()),
    CustomerCode nvarchar(50) NOT NULL,
    PeriodFrom date NOT NULL,
    PeriodTo date NOT NULL,
    AvailabilityPct decimal(6,3) NULL,
    AvailabilitySlaPct decimal(6,3) NULL,
    SlaResponsePct decimal(6,3) NULL,
    SlaResolvePct decimal(6,3) NULL,
    SlaCompliancePct decimal(6,3) NULL,
    IncidentCount int NULL,
    BreachCount int NULL,
    Source nvarchar(50) NOT NULL CONSTRAINT DF_Fact_SlaPeriod_Src DEFAULT (N'manual'),
    Note nvarchar(500) NULL,
    CreatedAtUtc datetime2(3) NOT NULL CONSTRAINT DF_Fact_SlaPeriod_Created DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Fact_SlaPeriod PRIMARY KEY (SlaPeriodId)
  );
  CREATE INDEX IX_Fact_SlaPeriod_Cust ON dbo.Fact_SlaPeriod (CustomerCode, PeriodTo DESC);
END
GO

IF OBJECT_ID(N'dbo.vw_Ams_IncidentLive', N'V') IS NOT NULL
  DROP VIEW dbo.vw_Ams_IncidentLive;
GO

CREATE VIEW dbo.vw_Ams_IncidentLive
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

IF OBJECT_ID(N'dbo.vw_Ams_SlaCompliance_30d', N'V') IS NOT NULL
  DROP VIEW dbo.vw_Ams_SlaCompliance_30d;
GO

CREATE VIEW dbo.vw_Ams_SlaCompliance_30d
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

PRINT '313 views OK';
GO
