/*
  RSR ? TRUE installed hotfixes from SYSPRODeployment
  Maps:
    HotfixCode  <- KB from HotfixFileName (e.g. KB8111156) or file name
    HotfixName  <- HotfixSynopsis (short)
    Description  <- HotfixSynopsis
  sqlcmd -S "." -U "rpmassure" -P "..." -C -b -i 227_Collect_UVSS_DeploymentHotfixes.sql
*/
SET NOCOUNT ON;
SET XACT_ABORT OFF;
SET ANSI_NULLS ON;
SET ANSI_WARNINGS ON;

DECLARE @CustomerCode nvarchar(50)  = N'RSR';
DECLARE @InstanceName nvarchar(100) = N'RSR-SQLSRV-DB';
DECLARE @SnapshotDate date = CAST(
    CAST(SYSUTCDATETIME() AT TIME ZONE N'UTC' AT TIME ZONE N'South Africa Standard Time' AS date) AS date);

PRINT CONCAT(N'=== RSR Deployment Hotfixes ', CONVERT(char(10), @SnapshotDate, 23), N' ===');

IF NOT EXISTS (
  SELECT 1 FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Dim_Customer
  WHERE CustomerCode = @CustomerCode AND Active = 1)
BEGIN
  PRINT N'RSR not active on central.';
  RETURN;
END

IF DB_ID(N'SYSPRODeployment') IS NULL OR OBJECT_ID(N'SYSPRODeployment.dbo.CustomerHotfixes') IS NULL
BEGIN
  PRINT N'SYSPRODeployment / CustomerHotfixes missing.';
  RETURN;
END

IF OBJECT_ID(N'tempdb..#Hf') IS NOT NULL DROP TABLE #Hf;
CREATE TABLE #Hf (
  HotfixCode         nvarchar(50)  COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
  HotfixName         nvarchar(200) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
  Description         nvarchar(max) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
  HotfixGuid         uniqueidentifier NULL,
  ReleaseId           uniqueidentifier NULL,
  Severity            nvarchar(40)  COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
  SysproCustomerCode  nvarchar(50)  COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
  StatusCode          int NULL,
  InstalledAt         datetime2(3) NULL
);

/* RSR schema (confirmed probe):
   CustomerHotfixes: CustomerCode, InstalledDate, Status, ReleaseID, ProductCode, HotfixID, ...
   ReleaseHotfixes:  HotfixID, HotfixFileName, HotfixSynopsis, HotfixMandatory, HotfixWithdrawn, ...
*/
DECLARE @sql nvarchar(max) = N'
INSERT INTO #Hf (
  HotfixCode, HotfixName, Description, HotfixGuid, ReleaseId,
  Severity, SysproCustomerCode, StatusCode, InstalledAt
)
SELECT
  LEFT(
    COALESCE(
      /* Prefer KB number inside file name: SYSPRO.8.2024.KB8111156.msp */
      NULLIF(
        CASE
          WHEN CHARINDEX(N''KB'', UPPER(ISNULL(rh.HotfixFileName, N''''))) > 0
          THEN
            SUBSTRING(
              UPPER(rh.HotfixFileName),
              CHARINDEX(N''KB'', UPPER(rh.HotfixFileName)),
              CASE
                WHEN CHARINDEX(N''.'', rh.HotfixFileName, CHARINDEX(N''KB'', UPPER(rh.HotfixFileName))) > 0
                THEN CHARINDEX(N''.'', rh.HotfixFileName, CHARINDEX(N''KB'', UPPER(rh.HotfixFileName)))
                     - CHARINDEX(N''KB'', UPPER(rh.HotfixFileName))
                ELSE 20
              END
            )
          ELSE NULL
        END,
        N''''
      ),
      /* else bare file name without extension */
      NULLIF(
        CASE
          WHEN rh.HotfixFileName IS NOT NULL AND CHARINDEX(N''.'', rh.HotfixFileName) > 0
          THEN LEFT(rh.HotfixFileName, LEN(rh.HotfixFileName) - CHARINDEX(N''.'', REVERSE(rh.HotfixFileName)))
          ELSE rh.HotfixFileName
        END,
        N''''
      ),
      CONVERT(nvarchar(50), ch.HotfixID)
    ),
    50
  ) COLLATE SQL_Latin1_General_CP1_CI_AS,
  LEFT(
    COALESCE(
      NULLIF(LTRIM(RTRIM(rh.HotfixSynopsis)), N''''),
      NULLIF(LTRIM(RTRIM(rh.HotfixFileName)), N''''),
      CONVERT(nvarchar(200), ch.HotfixID)
    ),
    200
  ) COLLATE SQL_Latin1_General_CP1_CI_AS,
  LTRIM(RTRIM(rh.HotfixSynopsis)) COLLATE SQL_Latin1_General_CP1_CI_AS,
  ch.HotfixID,
  ch.ReleaseID,
  CASE
    WHEN UPPER(LTRIM(RTRIM(CONVERT(nvarchar(10), rh.HotfixMandatory)))) IN (N''Y'', N''1'', N''T'')
      THEN N''Mandatory''
    WHEN CONVERT(int, ISNULL(rh.HotfixWithdrawn, 0)) <> 0
      THEN N''Withdrawn''
    ELSE N''Optional''
  END COLLATE SQL_Latin1_General_CP1_CI_AS,
  LEFT(LTRIM(RTRIM(CONVERT(nvarchar(50), ch.CustomerCode))), 50) COLLATE SQL_Latin1_General_CP1_CI_AS,
  ch.Status,
  TRY_CONVERT(datetime2(3), ch.InstalledDate)
FROM SYSPRODeployment.dbo.CustomerHotfixes AS ch WITH (NOLOCK)
LEFT JOIN SYSPRODeployment.dbo.ReleaseHotfixes AS rh WITH (NOLOCK)
  ON rh.HotfixID = ch.HotfixID;
';

BEGIN TRY
  EXEC sp_executesql @sql;
END TRY
BEGIN CATCH
  PRINT CONCAT(N'Stage FAIL: ', ERROR_MESSAGE());
  RETURN;
END CATCH

/* Deduplicate codes (PK is SnapshotDate+Instance+HotfixCode) ? keep latest install */
;WITH d AS (
  SELECT *,
    ROW_NUMBER() OVER (
      PARTITION BY HotfixCode
      ORDER BY InstalledAt DESC, HotfixGuid
    ) AS rn
  FROM #Hf
)
DELETE FROM d WHERE rn > 1;

DECLARE @Staged int;
SELECT @Staged = COUNT(*) FROM #Hf;
PRINT CONCAT(N'Staged installed HF rows: ', @Staged);
PRINT N'Sample codes:';
SELECT TOP 5 HotfixCode, LEFT(ISNULL(HotfixName, N''), 60) AS Name FROM #Hf ORDER BY HotfixCode;

DECLARE @SysproCust nvarchar(50);
SELECT TOP 1 @SysproCust = SysproCustomerCode FROM #Hf WHERE SysproCustomerCode IS NOT NULL;

DECLARE @InstallVer nvarchar(50) = NULL;
DECLARE @DbVer nvarchar(50) = NULL;
DECLARE @FullVer nvarchar(50) = NULL;
DECLARE @Sp nvarchar(50) = NULL;
DECLARE @Desc nvarchar(200) = NULL;
DECLARE @HfCnt int;
SELECT @HfCnt = COUNT(*) FROM #Hf;

IF OBJECT_ID(N'SYSPRODeployment.dbo.CustomerInstalls') IS NOT NULL
  SELECT TOP 1 @InstallVer = LTRIM(RTRIM(ProductVersion))
  FROM SYSPRODeployment.dbo.CustomerInstalls WITH (NOLOCK)
  WHERE Status = 1 AND NULLIF(LTRIM(RTRIM(ProductVersion)), N'') IS NOT NULL
  ORDER BY InstalledDate DESC;

IF OBJECT_ID(N'SysproDB.dbo.AdmSysVersion') IS NOT NULL
  SELECT TOP 1
    @DbVer = LTRIM(RTRIM(CONVERT(nvarchar(50), DatabaseVersion))),
    @FullVer = LTRIM(RTRIM(CONVERT(nvarchar(50), SysproFullVersion))),
    @Sp = LTRIM(RTRIM(CONVERT(nvarchar(50), SysproSp))),
    @Desc = LTRIM(RTRIM(CONVERT(nvarchar(200), Description)))
  FROM SysproDB.dbo.AdmSysVersion WITH (NOLOCK);

BEGIN TRY
  DELETE FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_VersionInfo
  WHERE SnapshotDate = @SnapshotDate AND InstanceName = @InstanceName;
END TRY BEGIN CATCH PRINT CONCAT(N'Version DELETE: ', ERROR_MESSAGE()); END CATCH

BEGIN TRY
  INSERT INTO [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_VersionInfo
  (
    SnapshotDate, InstanceName, ProductName, ProductVersion, BuildNumber,
    CustomerName, ServerName, ImportedAt
  )
  VALUES
  (
    @SnapshotDate, @InstanceName, N'SYSPRO 8',
    COALESCE(@InstallVer, @FullVer, @DbVer),
    @DbVer,
    @Desc,
    @@SERVERNAME,
    SYSUTCDATETIME()
  );
  PRINT N'VersionInfo written (basic).';
END TRY
BEGIN CATCH
  PRINT CONCAT(N'VersionInfo FAIL: ', ERROR_MESSAGE());
END CATCH

BEGIN TRY
  DELETE FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_Hotfix
  WHERE SnapshotDate = @SnapshotDate AND InstanceName = @InstanceName;
END TRY BEGIN CATCH PRINT CONCAT(N'Hotfix DELETE: ', ERROR_MESSAGE()); END CATCH

BEGIN TRY
  INSERT INTO [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_Hotfix
  (
    SnapshotDate, InstanceName, HotfixCode, HotfixName, Description,
    Installed, InstalledAt, SourceTable, ImportedAt
  )
  SELECT
    @SnapshotDate, @InstanceName, HotfixCode, HotfixName, Description,
    1, InstalledAt, N'SYSPRODeployment.CustomerHotfixes', SYSUTCDATETIME()
  FROM #Hf;
  PRINT CONCAT(N'Syspro_Hotfix rows: ', @@ROWCOUNT);
END TRY
BEGIN CATCH
  PRINT CONCAT(N'Hotfix INSERT FAIL: ', ERROR_MESSAGE());
END CATCH

BEGIN TRY
  DELETE FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_HotfixInstalled
  WHERE SnapshotDate = @SnapshotDate AND InstanceName = @InstanceName;

  INSERT INTO [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_HotfixInstalled
  (SnapshotDate, InstanceName, HotfixCode, Title, InstalledAt, Source, ImportedAt)
  SELECT
    @SnapshotDate, @InstanceName, HotfixCode,
    COALESCE(HotfixName, HotfixCode), InstalledAt, N'DeploymentDb', SYSUTCDATETIME()
  FROM #Hf;
  PRINT CONCAT(N'Syspro_HotfixInstalled rows: ', @@ROWCOUNT);
END TRY
BEGIN CATCH
  PRINT CONCAT(N'Syspro_HotfixInstalled (optional): ', ERROR_MESSAGE());
END CATCH

PRINT CONCAT(N'InstallProductVersion=', ISNULL(@InstallVer, N'-'),
  N' DbVer=', ISNULL(@DbVer, N'-'),
  N' SysproCustomer=', ISNULL(@SysproCust, N'-'),
  N' HfCount=', ISNULL(@HfCnt, 0));
PRINT N'=== Done RSR Deployment Hotfixes ===';
GO
