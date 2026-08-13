/*
  458b - Widen Pulseway_Disks.DriveLetter to nvarchar(128)
  Fixed: no dynamic REPLACE in EXEC (failed on some SQL builds)
*/
USE [RPMAssure_App];
GO
SET NOCOUNT ON;
SET XACT_ABORT ON;

PRINT N'--- before ---';
SELECT c.name AS Col, t.name AS TypeName, c.max_length AS MaxBytes
FROM sys.columns c
JOIN sys.types t ON t.user_type_id = c.user_type_id
WHERE c.object_id = OBJECT_ID(N'dbo.Pulseway_Disks') AND c.name = N'DriveLetter';
GO

IF OBJECT_ID(N'dbo.Pulseway_Disks', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Pulseway_Disks (
    SnapshotDate date NOT NULL,
    DeviceId nvarchar(100) NOT NULL,
    DriveLetter nvarchar(128) NOT NULL,
    CustomerCode nvarchar(50) NULL,
    DeviceName nvarchar(200) NULL,
    TotalGb decimal(18,2) NULL,
    FreeGb decimal(18,2) NULL,
    UsedPct decimal(6,2) NULL,
    MediaType nvarchar(40) NULL,
    ImportedAt datetime2(3) NOT NULL CONSTRAINT DF_PwDisk_Imp458b DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Pulseway_Disks PRIMARY KEY (SnapshotDate, DeviceId, DriveLetter)
  );
  PRINT N'Created Pulseway_Disks (DriveLetter nvarchar(128))';
END
GO

-- Drop dependent view
IF OBJECT_ID(N'dbo.vw_Kpi_Rmm_Disks_Latest', N'V') IS NOT NULL
BEGIN
  DROP VIEW dbo.vw_Kpi_Rmm_Disks_Latest;
  PRINT N'Dropped vw_Kpi_Rmm_Disks_Latest';
END
GO

-- Drop PK (known name first, then any PK on table)
IF OBJECT_ID(N'dbo.Pulseway_Disks', N'U') IS NOT NULL
  AND EXISTS (SELECT 1 FROM sys.key_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.Pulseway_Disks') AND type = N'PK' AND name = N'PK_Pulseway_Disks')
BEGIN
  ALTER TABLE dbo.Pulseway_Disks DROP CONSTRAINT PK_Pulseway_Disks;
  PRINT N'Dropped PK_Pulseway_Disks';
END
GO

-- Drop any other PK name via cursor-free dynamic SQL (no REPLACE)
IF OBJECT_ID(N'dbo.Pulseway_Disks', N'U') IS NOT NULL
BEGIN
  DECLARE @pkname sysname;
  SELECT TOP 1 @pkname = name
  FROM sys.key_constraints
  WHERE parent_object_id = OBJECT_ID(N'dbo.Pulseway_Disks')
    AND type = N'PK';

  IF @pkname IS NOT NULL
  BEGIN
    DECLARE @dropsql nvarchar(400) = N'ALTER TABLE dbo.Pulseway_Disks DROP CONSTRAINT ' + QUOTENAME(@pkname) + N';';
    EXEC sp_executesql @dropsql;
    PRINT N'Dropped PK ' + @pkname;
  END
END
GO

-- Widen column when still short (nvarchar(10) => max_length 20)
IF OBJECT_ID(N'dbo.Pulseway_Disks', N'U') IS NOT NULL
  AND COL_LENGTH(N'dbo.Pulseway_Disks', N'DriveLetter') IS NOT NULL
  AND COL_LENGTH(N'dbo.Pulseway_Disks', N'DriveLetter') < 256
BEGIN
  ALTER TABLE dbo.Pulseway_Disks ALTER COLUMN DriveLetter nvarchar(128) NOT NULL;
  PRINT N'Altered DriveLetter to nvarchar(128)';
END
ELSE
  PRINT N'DriveLetter already wide or table missing';
GO

-- Ensure MediaType
IF OBJECT_ID(N'dbo.Pulseway_Disks', N'U') IS NOT NULL
  AND COL_LENGTH(N'dbo.Pulseway_Disks', N'MediaType') IS NULL
BEGIN
  ALTER TABLE dbo.Pulseway_Disks ADD MediaType nvarchar(40) NULL;
  PRINT N'Added MediaType';
END
GO

-- Re-create PK
IF OBJECT_ID(N'dbo.Pulseway_Disks', N'U') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM sys.key_constraints
    WHERE parent_object_id = OBJECT_ID(N'dbo.Pulseway_Disks') AND type = N'PK'
  )
BEGIN
  ALTER TABLE dbo.Pulseway_Disks
    ADD CONSTRAINT PK_Pulseway_Disks PRIMARY KEY (SnapshotDate, DeviceId, DriveLetter);
  PRINT N'Created PK_Pulseway_Disks';
END
GO

-- Recreate view
IF OBJECT_ID(N'dbo.vw_Kpi_Rmm_Disks_Latest', N'V') IS NOT NULL
  DROP VIEW dbo.vw_Kpi_Rmm_Disks_Latest;
GO
CREATE VIEW dbo.vw_Kpi_Rmm_Disks_Latest
AS
SELECT
  d.DeviceId,
  d.DriveLetter,
  d.TotalGb,
  d.FreeGb,
  d.UsedPct,
  d.CustomerCode,
  d.DeviceName,
  d.MediaType,
  d.SnapshotDate,
  d.ImportedAt
FROM dbo.Pulseway_Disks AS d WITH (NOLOCK)
INNER JOIN (
  SELECT DeviceId, DriveLetter, MAX(SnapshotDate) AS mx
  FROM dbo.Pulseway_Disks WITH (NOLOCK)
  GROUP BY DeviceId, DriveLetter
) m
  ON m.DeviceId = d.DeviceId
 AND m.DriveLetter = d.DriveLetter
 AND m.mx = d.SnapshotDate;
GO
PRINT N'vw_Kpi_Rmm_Disks_Latest ready';
GO

BEGIN TRY
  GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.Pulseway_Disks TO [Rpm_collect];
  GRANT SELECT ON dbo.vw_Kpi_Rmm_Disks_Latest TO [Rpm_collect];
END TRY
BEGIN CATCH
  PRINT N'Grant soft-fail: ' + ERROR_MESSAGE();
END CATCH
GO

PRINT N'--- after ---';
SELECT c.name AS Col, t.name AS TypeName, c.max_length AS MaxBytes, c.max_length / 2 AS MaxChars
FROM sys.columns c
JOIN sys.types t ON t.user_type_id = c.user_type_id
WHERE c.object_id = OBJECT_ID(N'dbo.Pulseway_Disks') AND c.name = N'DriveLetter';
GO
