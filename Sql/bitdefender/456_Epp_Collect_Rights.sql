/* Rpm_collect load rights for GravityZone / EPP. DDL is sysadmin-only. */
USE RPMAssure_App;
GO
SET NOCOUNT ON;

IF OBJECT_ID(N'dbo.Bitdefender_Endpoints', N'U') IS NULL
BEGIN
  RAISERROR('Bitdefender_Endpoints missing - run 450_Ensure_Bitdefender_Epp.sql as sysadmin', 16, 1);
  RETURN;
END
GO

IF COL_LENGTH(N'dbo.Bitdefender_Endpoints', N'CompanyId') IS NULL
  ALTER TABLE dbo.Bitdefender_Endpoints ADD CompanyId nvarchar(40) NULL;
IF COL_LENGTH(N'dbo.Bitdefender_Endpoints', N'CompanyName') IS NULL
  ALTER TABLE dbo.Bitdefender_Endpoints ADD CompanyName nvarchar(200) NULL;
IF COL_LENGTH(N'dbo.Bitdefender_Endpoints', N'LastSeenAt') IS NULL
  ALTER TABLE dbo.Bitdefender_Endpoints ADD LastSeenAt datetime2(3) NULL;
IF COL_LENGTH(N'dbo.Bitdefender_Endpoints', N'LastSuccessfulScanAt') IS NULL
  ALTER TABLE dbo.Bitdefender_Endpoints ADD LastSuccessfulScanAt datetime2(3) NULL;
IF COL_LENGTH(N'dbo.Bitdefender_Endpoints', N'MalwareDetected') IS NULL
  ALTER TABLE dbo.Bitdefender_Endpoints ADD MalwareDetected bit NULL;
IF COL_LENGTH(N'dbo.Bitdefender_Endpoints', N'Infected') IS NULL
  ALTER TABLE dbo.Bitdefender_Endpoints ADD Infected bit NULL;
IF COL_LENGTH(N'dbo.Bitdefender_Endpoints', N'ProductOutdated') IS NULL
  ALTER TABLE dbo.Bitdefender_Endpoints ADD ProductOutdated bit NULL;
IF COL_LENGTH(N'dbo.Bitdefender_Endpoints', N'SignatureOutdated') IS NULL
  ALTER TABLE dbo.Bitdefender_Endpoints ADD SignatureOutdated bit NULL;
GO

IF EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'Rpm_collect')
BEGIN
  GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.Bitdefender_Endpoints TO [Rpm_collect];
  IF OBJECT_ID(N'dbo.Bitdefender_LicenseSnapshot', N'U') IS NOT NULL
    GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.Bitdefender_LicenseSnapshot TO [Rpm_collect];
  IF OBJECT_ID(N'dbo.Bitdefender_Incidents', N'U') IS NOT NULL
    GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.Bitdefender_Incidents TO [Rpm_collect];
  IF OBJECT_ID(N'dbo.Bitdefender_Quarantine', N'U') IS NOT NULL
    GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.Bitdefender_Quarantine TO [Rpm_collect];
  IF OBJECT_ID(N'dbo.Bitdefender_CollectStatus', N'U') IS NOT NULL
    GRANT SELECT, INSERT, UPDATE ON dbo.Bitdefender_CollectStatus TO [Rpm_collect];
  IF OBJECT_ID(N'dbo.Dim_Bitdefender_NameMap', N'U') IS NOT NULL
    GRANT SELECT ON dbo.Dim_Bitdefender_NameMap TO [Rpm_collect];
  PRINT 'Granted Rpm_collect load rights on Bitdefender tables';
END
ELSE
  PRINT 'Rpm_collect login missing in this database';
GO
