/*
  Gold tickets for SLA clocks. UI reads vw_Tickets_Latest (CustomerCode stamped).
*/
USE RPMAssure_App;
GO
SET NOCOUNT ON;

IF OBJECT_ID(N'dbo.vw_Ams_IncidentLive', N'V') IS NOT NULL
  EXEC(N'
CREATE OR ALTER VIEW dbo.vw_Tickets_Latest
AS
SELECT *
FROM dbo.vw_Ams_IncidentLive
WHERE CustomerCode IS NOT NULL AND LTRIM(RTRIM(CustomerCode)) <> N'''';
');
ELSE IF OBJECT_ID(N'dbo.Fact_Incident', N'U') IS NOT NULL
  EXEC(N'
CREATE OR ALTER VIEW dbo.vw_Tickets_Latest
AS
SELECT *
FROM dbo.Fact_Incident
WHERE CustomerCode IS NOT NULL AND LTRIM(RTRIM(CustomerCode)) <> N'''';
');
GO

IF EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'Rpm_collect')
  AND OBJECT_ID(N'dbo.vw_Tickets_Latest', N'V') IS NOT NULL
  GRANT SELECT ON dbo.vw_Tickets_Latest TO [Rpm_collect];
IF EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'rpmassure')
  AND OBJECT_ID(N'dbo.vw_Tickets_Latest', N'V') IS NOT NULL
  GRANT SELECT ON dbo.vw_Tickets_Latest TO [rpmassure];
GO
PRINT N'470 Tickets gold view ready';
GO
