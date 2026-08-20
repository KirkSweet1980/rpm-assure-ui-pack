/*
  Gold aliases for Pulseway. UI reads these; CustomerCode already stamped.
*/
USE RPMAssure_App;
GO
SET NOCOUNT ON;

IF OBJECT_ID(N'dbo.vw_Kpi_Rmm_Devices_Latest', N'V') IS NOT NULL
  EXEC(N'
CREATE OR ALTER VIEW dbo.vw_Rmm_Devices_Latest
AS
SELECT *
FROM dbo.vw_Kpi_Rmm_Devices_Latest
WHERE CustomerCode IS NOT NULL AND LTRIM(RTRIM(CustomerCode)) <> N'''';
');
GO

IF OBJECT_ID(N'dbo.vw_Kpi_Rmm_Disks_Latest', N'V') IS NOT NULL
  EXEC(N'
CREATE OR ALTER VIEW dbo.vw_Rmm_Disks_Latest
AS
SELECT *
FROM dbo.vw_Kpi_Rmm_Disks_Latest
WHERE CustomerCode IS NOT NULL AND LTRIM(RTRIM(CustomerCode)) <> N'''';
');
GO

IF OBJECT_ID(N'dbo.vw_Kpi_Rmm_OrgSummary_Latest', N'V') IS NOT NULL
  EXEC(N'
CREATE OR ALTER VIEW dbo.vw_Rmm_OrgSummary_Latest
AS
SELECT *
FROM dbo.vw_Kpi_Rmm_OrgSummary_Latest
WHERE CustomerCode IS NOT NULL AND LTRIM(RTRIM(CustomerCode)) <> N'''';
');
GO

IF EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'Rpm_collect')
BEGIN
  IF OBJECT_ID(N'dbo.vw_Rmm_Devices_Latest', N'V') IS NOT NULL
    GRANT SELECT ON dbo.vw_Rmm_Devices_Latest TO [Rpm_collect];
  IF OBJECT_ID(N'dbo.vw_Rmm_Disks_Latest', N'V') IS NOT NULL
    GRANT SELECT ON dbo.vw_Rmm_Disks_Latest TO [Rpm_collect];
  IF OBJECT_ID(N'dbo.vw_Rmm_OrgSummary_Latest', N'V') IS NOT NULL
    GRANT SELECT ON dbo.vw_Rmm_OrgSummary_Latest TO [Rpm_collect];
END
IF EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'rpmassure')
BEGIN
  IF OBJECT_ID(N'dbo.vw_Rmm_Devices_Latest', N'V') IS NOT NULL
    GRANT SELECT ON dbo.vw_Rmm_Devices_Latest TO [rpmassure];
  IF OBJECT_ID(N'dbo.vw_Rmm_Disks_Latest', N'V') IS NOT NULL
    GRANT SELECT ON dbo.vw_Rmm_Disks_Latest TO [rpmassure];
  IF OBJECT_ID(N'dbo.vw_Rmm_OrgSummary_Latest', N'V') IS NOT NULL
    GRANT SELECT ON dbo.vw_Rmm_OrgSummary_Latest TO [rpmassure];
END
GO
PRINT N'468 RMM gold views ready';
GO
