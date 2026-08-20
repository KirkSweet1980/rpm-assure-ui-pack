/* Last successful scan name + collect grants */
USE RPMAssure_App;
GO
SET NOCOUNT ON;

IF OBJECT_ID(N'dbo.Bitdefender_Endpoints', N'U') IS NULL
BEGIN
  RAISERROR('Bitdefender_Endpoints missing - run 450 first.', 16, 1);
  RETURN;
END
GO

IF COL_LENGTH(N'dbo.Bitdefender_Endpoints', N'LastSuccessfulScanAt') IS NULL
  ALTER TABLE dbo.Bitdefender_Endpoints ADD LastSuccessfulScanAt datetime2(3) NULL;
IF COL_LENGTH(N'dbo.Bitdefender_Endpoints', N'LastSuccessfulScanName') IS NULL
  ALTER TABLE dbo.Bitdefender_Endpoints ADD LastSuccessfulScanName nvarchar(200) NULL;
IF COL_LENGTH(N'dbo.Bitdefender_Endpoints', N'LastSeenAt') IS NULL
  ALTER TABLE dbo.Bitdefender_Endpoints ADD LastSeenAt datetime2(3) NULL;
GO

IF EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'Rpm_collect')
BEGIN
  GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.Bitdefender_Endpoints TO [Rpm_collect];
END
GO
IF EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'Rpm_app')
BEGIN
  GRANT SELECT ON dbo.Bitdefender_Endpoints TO [Rpm_app];
END
GO
