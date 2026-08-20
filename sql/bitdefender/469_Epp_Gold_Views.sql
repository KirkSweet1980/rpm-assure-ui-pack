/*
  Gold EPP endpoints. UI reads vw_Epp_Endpoints_Latest (CustomerCode already stamped).
*/
USE RPMAssure_App;
GO
SET NOCOUNT ON;

IF OBJECT_ID(N'dbo.Bitdefender_Endpoints', N'U') IS NOT NULL
BEGIN
  IF COL_LENGTH(N'dbo.Bitdefender_Endpoints', N'CompanyName') IS NULL
    ALTER TABLE dbo.Bitdefender_Endpoints ADD CompanyName nvarchar(200) NULL;
  IF COL_LENGTH(N'dbo.Bitdefender_Endpoints', N'LastSeenAt') IS NULL
    ALTER TABLE dbo.Bitdefender_Endpoints ADD LastSeenAt datetime2(3) NULL;
  IF COL_LENGTH(N'dbo.Bitdefender_Endpoints', N'LastSuccessfulScanAt') IS NULL
    ALTER TABLE dbo.Bitdefender_Endpoints ADD LastSuccessfulScanAt datetime2(3) NULL;
  IF COL_LENGTH(N'dbo.Bitdefender_Endpoints', N'LastSuccessfulScanName') IS NULL
    ALTER TABLE dbo.Bitdefender_Endpoints ADD LastSuccessfulScanName nvarchar(200) NULL;
  IF COL_LENGTH(N'dbo.Bitdefender_Endpoints', N'MalwareDetected') IS NULL
    ALTER TABLE dbo.Bitdefender_Endpoints ADD MalwareDetected bit NULL;
  IF COL_LENGTH(N'dbo.Bitdefender_Endpoints', N'Infected') IS NULL
    ALTER TABLE dbo.Bitdefender_Endpoints ADD Infected bit NULL;
  IF COL_LENGTH(N'dbo.Bitdefender_Endpoints', N'ProductOutdated') IS NULL
    ALTER TABLE dbo.Bitdefender_Endpoints ADD ProductOutdated bit NULL;
  IF COL_LENGTH(N'dbo.Bitdefender_Endpoints', N'SignatureOutdated') IS NULL
    ALTER TABLE dbo.Bitdefender_Endpoints ADD SignatureOutdated bit NULL;
END
GO

CREATE OR ALTER VIEW dbo.vw_Epp_Endpoints_Latest
AS
SELECT e.*
FROM dbo.Bitdefender_Endpoints AS e WITH (NOLOCK)
INNER JOIN (
  SELECT EndpointId, MAX(SnapshotDate) AS mx
  FROM dbo.Bitdefender_Endpoints WITH (NOLOCK)
  GROUP BY EndpointId
) AS m ON m.EndpointId = e.EndpointId AND m.mx = e.SnapshotDate
WHERE e.CustomerCode IS NOT NULL
  AND LTRIM(RTRIM(e.CustomerCode)) <> N'';
GO

IF EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'Rpm_collect')
  GRANT SELECT ON dbo.vw_Epp_Endpoints_Latest TO [Rpm_collect];
IF EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'rpmassure')
  GRANT SELECT ON dbo.vw_Epp_Endpoints_Latest TO [rpmassure];
GO
PRINT N'469 EPP gold views ready';
GO
