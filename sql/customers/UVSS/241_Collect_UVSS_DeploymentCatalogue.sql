/*
  UVSS Deployment HF catalogue v241e
  Linked-server safe, collation-safe, PK-safe installed
  Excludes Sample* titles and non-KB codes at stage time
*/
SET NOCOUNT ON;
SET XACT_ABORT OFF;

PRINT N'=== SCRIPT v241e UVSS Deployment HF ===';

DECLARE @CustomerCode nvarchar(50)  = N'UVSS';
DECLARE @InstanceName nvarchar(100) = N'UVSS-SYSPRO';
DECLARE @SnapshotDate date = CAST(
  CAST(SYSUTCDATETIME() AT TIME ZONE N'UTC' AT TIME ZONE N'South Africa Standard Time' AS date) AS date);
DECLARE @SourceFile nvarchar(260) = N'SYSPRODeployment@' + CAST(@@SERVERNAME AS nvarchar(128));
DECLARE @bcnt int;
DECLARE @icnt int;
DECLARE @left int;
DECLARE @b int;
DECLARE @m int;
DECLARE @i int;
DECLARE @rc int;

PRINT N'SnapshotDate=' + CONVERT(char(10), @SnapshotDate, 23) + N' Instance=' + @InstanceName;

IF DB_ID(N'SYSPRODeployment') IS NULL
BEGIN
  RAISERROR(N'SYSPRODeployment missing', 16, 1);
  RETURN;
END

IF NOT EXISTS (
  SELECT 1 FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Dim_Customer
  WHERE CustomerCode = @CustomerCode AND Active = 1)
BEGIN
  PRINT N'Customer not active on central';
  RETURN;
END

IF OBJECT_ID(N'tempdb..#Baseline') IS NOT NULL DROP TABLE #Baseline;
CREATE TABLE #Baseline
(
  ProductFamily nvarchar(50)  COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
  ReleaseLabel  nvarchar(50)  COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
  HotfixCode   nvarchar(50)  COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
  Title         nvarchar(300) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
  Synopsis      nvarchar(max) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
  Severity      nvarchar(30)  COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
  KbUrl         nvarchar(500) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
  SourceFile    nvarchar(260) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
  HotfixGuid   uniqueidentifier NULL,
  ReleaseId     uniqueidentifier NULL,
  Active        bit NOT NULL
);

INSERT INTO #Baseline
(
  ProductFamily, ReleaseLabel, HotfixCode, Title, Synopsis, Severity,
  KbUrl, SourceFile, HotfixGuid, ReleaseId, Active
)
SELECT DISTINCT
  N'SYSPRO8',
  CONVERT(nvarchar(50), rm.ReleaseMajorVersion),
  UPPER(
    SUBSTRING(
      hf.HotfixFileName,
      PATINDEX(N'%KB[0-9]%', UPPER(hf.HotfixFileName COLLATE SQL_Latin1_General_CP1_CI_AS)),
      CASE
        WHEN PATINDEX(N'%KB[0-9]%', UPPER(hf.HotfixFileName COLLATE SQL_Latin1_General_CP1_CI_AS)) = 0 THEN 0
        WHEN CHARINDEX(N'.msp', LOWER(hf.HotfixFileName COLLATE SQL_Latin1_General_CP1_CI_AS)) >
             PATINDEX(N'%KB[0-9]%', UPPER(hf.HotfixFileName COLLATE SQL_Latin1_General_CP1_CI_AS))
          THEN CHARINDEX(N'.msp', LOWER(hf.HotfixFileName COLLATE SQL_Latin1_General_CP1_CI_AS))
               - PATINDEX(N'%KB[0-9]%', UPPER(hf.HotfixFileName COLLATE SQL_Latin1_General_CP1_CI_AS))
        ELSE 20
      END
    )
  ),
  LEFT(LTRIM(RTRIM(hf.HotfixSynopsis)), 300),
  CAST(hf.HotfixSynopsis AS nvarchar(max)),
  CASE WHEN UPPER(LTRIM(RTRIM(CAST(hf.HotfixMandatory AS nvarchar(10)))))
            COLLATE SQL_Latin1_General_CP1_CI_AS IN (N'Y', N'1', N'T', N'TRUE')
       THEN N'Mandatory' ELSE N'Optional' END,
  LEFT(hf.HotfixPath, 500),
  @SourceFile,
  hf.HotfixID,
  hf.ReleaseID,
  CASE WHEN ISNULL(hf.HotfixWithdrawn, 0) = 0 THEN 1 ELSE 0 END
FROM SYSPRODeployment.dbo.ReleaseHotfixes AS hf WITH (NOLOCK)
INNER JOIN SYSPRODeployment.dbo.ReleaseMaster AS rm WITH (NOLOCK)
  ON rm.ReleaseID = hf.ReleaseID
WHERE ISNULL(hf.HotfixWithdrawn, 0) = 0
  AND PATINDEX(N'%KB[0-9]%', UPPER(ISNULL(hf.HotfixFileName, N'') COLLATE SQL_Latin1_General_CP1_CI_AS)) > 0
  AND rm.ReleaseMajorVersion IN (8.10, 8.11, 8.12);

/* Drop junk + samples */
DELETE FROM #Baseline
WHERE HotfixCode IS NULL
   OR LTRIM(RTRIM(HotfixCode)) = N''
   OR LEN(HotfixCode) < 5 OR LEN(HotfixCode) > 30
   OR HotfixCode NOT LIKE N'KB%'
   OR Title LIKE N'Sample%'
   OR Title LIKE N'Sample %'
   OR Title LIKE N'%Sample mandatory%'
   OR Title LIKE N'%Sample optional%'
   OR Title LIKE N'%Sample ledger%';

SELECT @bcnt = COUNT(*) FROM #Baseline;
PRINT N'v241e baseline staged (real): ' + CAST(@bcnt AS nvarchar(20));

UPDATE t
SET
  Title = s.Title,
  Synopsis = s.Synopsis,
  Severity = s.Severity,
  KbUrl = s.KbUrl,
  SourceFile = s.SourceFile,
  HotfixGuid = s.HotfixGuid,
  ReleaseId = s.ReleaseId,
  Active = s.Active,
  ImportedAtUtc = SYSUTCDATETIME()
FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Dim_Syspro_HotfixBaseline AS t
INNER JOIN #Baseline AS s
  ON t.ProductFamily COLLATE SQL_Latin1_General_CP1_CI_AS = s.ProductFamily
 AND t.HotfixCode COLLATE SQL_Latin1_General_CP1_CI_AS = s.HotfixCode
 AND ISNULL(t.ReleaseLabel, N'') COLLATE SQL_Latin1_General_CP1_CI_AS
     = ISNULL(s.ReleaseLabel, N'') COLLATE SQL_Latin1_General_CP1_CI_AS;
SET @rc = @@ROWCOUNT;
PRINT N'v241e baseline UPDATE: ' + CAST(@rc AS nvarchar(20));

INSERT INTO [RPM_CENTRAL].[RPMAssure_App].dbo.Dim_Syspro_HotfixBaseline
(
  ProductFamily, ReleaseLabel, HotfixCode, Title, Synopsis, Severity,
  KbUrl, SourceFile, HotfixGuid, ReleaseId, Active
)
SELECT
  s.ProductFamily, s.ReleaseLabel, s.HotfixCode, s.Title, s.Synopsis, s.Severity,
  s.KbUrl, s.SourceFile, s.HotfixGuid, s.ReleaseId, s.Active
FROM #Baseline AS s
WHERE NOT EXISTS (
  SELECT 1
  FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Dim_Syspro_HotfixBaseline AS t WITH (NOLOCK)
  WHERE t.ProductFamily COLLATE SQL_Latin1_General_CP1_CI_AS = s.ProductFamily
    AND t.HotfixCode COLLATE SQL_Latin1_General_CP1_CI_AS = s.HotfixCode
    AND ISNULL(t.ReleaseLabel, N'') COLLATE SQL_Latin1_General_CP1_CI_AS
        = ISNULL(s.ReleaseLabel, N'') COLLATE SQL_Latin1_General_CP1_CI_AS
);
SET @rc = @@ROWCOUNT;
PRINT N'v241e baseline INSERT: ' + CAST(@rc AS nvarchar(20));

/* Deactivate leftover samples still Active on central */
UPDATE [RPM_CENTRAL].[RPMAssure_App].dbo.Dim_Syspro_HotfixBaseline
SET Active = 0, ImportedAtUtc = SYSUTCDATETIME()
WHERE Active = 1
  AND (
    HotfixCode NOT LIKE N'KB%'
    OR Title LIKE N'Sample%'
    OR Title LIKE N'%Sample mandatory%'
    OR Title LIKE N'%Sample optional%'
    OR Title LIKE N'%Sample ledger%'
  );
SET @rc = @@ROWCOUNT;
PRINT N'v241e deactivated samples on central: ' + CAST(@rc AS nvarchar(20));

IF OBJECT_ID(N'tempdb..#Inst') IS NOT NULL DROP TABLE #Inst;
CREATE TABLE #Inst
(
  HotfixCode nvarchar(50)  COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL PRIMARY KEY,
  Title       nvarchar(300) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
  InstalledAt datetime2(3) NULL,
  HotfixGuid uniqueidentifier NULL
);

;WITH raw AS (
  SELECT
    UPPER(
      SUBSTRING(
        hf.HotfixFileName,
        PATINDEX(N'%KB[0-9]%', UPPER(hf.HotfixFileName COLLATE SQL_Latin1_General_CP1_CI_AS)),
        CASE
          WHEN PATINDEX(N'%KB[0-9]%', UPPER(hf.HotfixFileName COLLATE SQL_Latin1_General_CP1_CI_AS)) = 0 THEN 0
          WHEN CHARINDEX(N'.msp', LOWER(hf.HotfixFileName COLLATE SQL_Latin1_General_CP1_CI_AS)) >
               PATINDEX(N'%KB[0-9]%', UPPER(hf.HotfixFileName COLLATE SQL_Latin1_General_CP1_CI_AS))
            THEN CHARINDEX(N'.msp', LOWER(hf.HotfixFileName COLLATE SQL_Latin1_General_CP1_CI_AS))
                 - PATINDEX(N'%KB[0-9]%', UPPER(hf.HotfixFileName COLLATE SQL_Latin1_General_CP1_CI_AS))
          ELSE 20
        END
      )
    ) COLLATE SQL_Latin1_General_CP1_CI_AS AS HotfixCode,
    CAST(LEFT(LTRIM(RTRIM(hf.HotfixSynopsis)), 300) AS nvarchar(300))
      COLLATE SQL_Latin1_General_CP1_CI_AS AS Title,
    CAST(ch.InstalledDate AS datetime2(3)) AS InstalledAt,
    ch.HotfixID AS HotfixGuid,
    ROW_NUMBER() OVER (
      PARTITION BY
        UPPER(
          SUBSTRING(
            hf.HotfixFileName,
            PATINDEX(N'%KB[0-9]%', UPPER(hf.HotfixFileName COLLATE SQL_Latin1_General_CP1_CI_AS)),
            CASE
              WHEN PATINDEX(N'%KB[0-9]%', UPPER(hf.HotfixFileName COLLATE SQL_Latin1_General_CP1_CI_AS)) = 0 THEN 0
              WHEN CHARINDEX(N'.msp', LOWER(hf.HotfixFileName COLLATE SQL_Latin1_General_CP1_CI_AS)) >
                   PATINDEX(N'%KB[0-9]%', UPPER(hf.HotfixFileName COLLATE SQL_Latin1_General_CP1_CI_AS))
                THEN CHARINDEX(N'.msp', LOWER(hf.HotfixFileName COLLATE SQL_Latin1_General_CP1_CI_AS))
                     - PATINDEX(N'%KB[0-9]%', UPPER(hf.HotfixFileName COLLATE SQL_Latin1_General_CP1_CI_AS))
              ELSE 20
            END
          )
        ) COLLATE SQL_Latin1_General_CP1_CI_AS
      ORDER BY ch.InstalledDate DESC, ch.HotfixID DESC
    ) AS rn
  FROM SYSPRODeployment.dbo.CustomerHotfixes AS ch WITH (NOLOCK)
  INNER JOIN SYSPRODeployment.dbo.ReleaseHotfixes AS hf WITH (NOLOCK)
    ON hf.HotfixID = ch.HotfixID
   AND hf.ReleaseID = ch.ReleaseID
  WHERE ISNULL(hf.HotfixWithdrawn, 0) = 0
    AND PATINDEX(N'%KB[0-9]%', UPPER(ISNULL(hf.HotfixFileName, N'') COLLATE SQL_Latin1_General_CP1_CI_AS)) > 0
)
INSERT INTO #Inst (HotfixCode, Title, InstalledAt, HotfixGuid)
SELECT HotfixCode, Title, InstalledAt, HotfixGuid
FROM raw
WHERE rn = 1
  AND HotfixCode LIKE N'KB%'
  AND LEN(HotfixCode) BETWEEN 5 AND 30
  AND (Title IS NULL OR Title NOT LIKE N'Sample%');

SELECT @icnt = COUNT(*) FROM #Inst;
PRINT N'v241e installed staged (PK-safe): ' + CAST(@icnt AS nvarchar(20));

DELETE FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_HotfixInstalled
WHERE SnapshotDate = @SnapshotDate
  AND LTRIM(RTRIM(InstanceName)) COLLATE SQL_Latin1_General_CP1_CI_AS
      = LTRIM(RTRIM(@InstanceName)) COLLATE SQL_Latin1_General_CP1_CI_AS;
SET @rc = @@ROWCOUNT;
PRINT N'v241e installed DELETE day: ' + CAST(@rc AS nvarchar(20));

SELECT @left = COUNT(*)
FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_HotfixInstalled WITH (NOLOCK)
WHERE SnapshotDate = @SnapshotDate
  AND LTRIM(RTRIM(InstanceName)) COLLATE SQL_Latin1_General_CP1_CI_AS
      = LTRIM(RTRIM(@InstanceName)) COLLATE SQL_Latin1_General_CP1_CI_AS;
PRINT N'v241e installed remaining after DELETE: ' + CAST(@left AS nvarchar(20));

INSERT INTO [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_HotfixInstalled
(
  SnapshotDate, InstanceName, HotfixCode, Title, InstalledAt, Source, HotfixGuid
)
SELECT
  @SnapshotDate,
  @InstanceName,
  HotfixCode,
  Title,
  InstalledAt,
  N'CustomerHotfixes',
  HotfixGuid
FROM #Inst;
SET @rc = @@ROWCOUNT;
PRINT N'v241e installed INSERT: ' + CAST(@rc AS nvarchar(20));

SELECT @b = COUNT(*) FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Dim_Syspro_HotfixBaseline WITH (NOLOCK)
  WHERE Active = 1 AND HotfixCode LIKE N'KB%' AND (Title IS NULL OR Title NOT LIKE N'Sample%');
SELECT @m = COUNT(*) FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Dim_Syspro_HotfixBaseline WITH (NOLOCK)
  WHERE Active = 1 AND HotfixCode LIKE N'KB%' AND (Title IS NULL OR Title NOT LIKE N'Sample%')
    AND Severity COLLATE SQL_Latin1_General_CP1_CI_AS = N'Mandatory';
SELECT @i = COUNT(*) FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_HotfixInstalled WITH (NOLOCK)
  WHERE LTRIM(RTRIM(InstanceName)) COLLATE SQL_Latin1_General_CP1_CI_AS
        = LTRIM(RTRIM(@InstanceName)) COLLATE SQL_Latin1_General_CP1_CI_AS
    AND SnapshotDate = @SnapshotDate;

PRINT N'v241e central real baseline=' + CAST(@b AS nvarchar(20))
    + N' mandatory=' + CAST(@m AS nvarchar(20))
    + N' installed=' + CAST(@i AS nvarchar(20));
PRINT N'=== Done v241e UVSS Deployment HF ===';
