/*
  AHIC — AdmSystemLicense → RPMAssure_App.Syspro_SystemLicense
  ON UVSS-SYSPRO:

  sqlcmd -S "." -U Rpm_collect -P "RpmCollect#AHIC2026" -C -b -i thisfile.sql

  Takes latest row per ImportDate (all history optional: remove TOP filter).
*/
SET NOCOUNT ON;
SET XACT_ABORT OFF;

DECLARE @CustomerCode nvarchar(50)  = N'UVSS';
DECLARE @InstanceName nvarchar(100) = N'UVSS-SYSPRO';
DECLARE @SnapshotDate date = CAST(
    CAST(SYSUTCDATETIME() AT TIME ZONE N'UTC' AT TIME ZONE N'South Africa Standard Time' AS date) AS date);

PRINT CONCAT(N'=== UVSS SystemLicense ', CONVERT(char(10), @SnapshotDate, 23), N' ===');

IF NOT EXISTS (
    SELECT 1 FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Dim_Customer
    WHERE CustomerCode = @CustomerCode AND Active = 1)
BEGIN
    RAISERROR(N'UVSS not active on central.', 16, 1);
    RETURN;
END;

DELETE FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_SystemLicense
WHERE SnapshotDate = @SnapshotDate AND InstanceName = @InstanceName;

/* Latest license import only (most useful for exec view) */
INSERT INTO [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_SystemLicense
(
    SnapshotDate, InstanceName, ImportDate, LicenseType, Users, UserType, CompanyCount,
    LicenseStart, LicenseExpiry, ProductName, ProductVersion, LicenseRegion,
    CustomerCode, CustomerName, LicenseSite, CustomerId, SaaS, ExcessUserFlag, ExcessUserExpiry,
    RawXml, ImportedAt
)
SELECT TOP (1)
    @SnapshotDate,
    @InstanceName,
    l.ImportDate,
    LTRIM(RTRIM(CONVERT(nvarchar(10), l.LicenseType))),
    TRY_CONVERT(int, l.Users),
    LTRIM(RTRIM(CONVERT(nvarchar(10), l.UserType))),
    TRY_CONVERT(int, l.CompanyCount),
    l.LicenseStart,
    l.LicenseExpiry,
    LTRIM(RTRIM(CONVERT(nvarchar(100), l.ProductName))),
    LTRIM(RTRIM(CONVERT(nvarchar(50), l.ProductVersion))),
    LTRIM(RTRIM(CONVERT(nvarchar(20), l.LicenseRegion))),
    @CustomerCode,
    LTRIM(RTRIM(CONVERT(nvarchar(200), l.CustomerName))),
    LTRIM(RTRIM(CONVERT(nvarchar(50), l.LicenseSite))),
    LTRIM(RTRIM(CONVERT(nvarchar(50), l.CustomerId))),
    LTRIM(RTRIM(CONVERT(nvarchar(5), l.SaaS))),
    LTRIM(RTRIM(CONVERT(nvarchar(5), l.ExcessUserFlag))),
    l.ExcessUserExpiry,
    CONVERT(nvarchar(max), l.LicenseXml),
    SYSUTCDATETIME()
FROM Sysprodb.dbo.AdmSystemLicense AS l
ORDER BY l.ImportDate DESC;

PRINT CONCAT(N'License rows written: ', @@ROWCOUNT);

INSERT INTO [RPM_CENTRAL].[RPMAssure_App].dbo.Dim_Customer_SyncLog
    (ActionType, CustomerCode, Detail, DryRun)
VALUES (N'SysproLicenseCollect', @CustomerCode,
    CONCAT(N'snap=', CONVERT(char(10), @SnapshotDate, 23)), 0);

PRINT N'=== Done UVSS SystemLicense ===';
GO
