/*
  456 - Pulseway_Disks.MediaType + disks latest view
*/
USE [RPMAssure_App];
GO
SET NOCOUNT ON;

IF OBJECT_ID(N'dbo.Pulseway_Disks', N'U') IS NOT NULL
  AND COL_LENGTH(N'dbo.Pulseway_Disks', N'MediaType') IS NULL
BEGIN
  ALTER TABLE dbo.Pulseway_Disks ADD MediaType nvarchar(40) NULL;
  PRINT N'Added Pulseway_Disks.MediaType';
END
GO

IF OBJECT_ID(N'dbo.vw_Kpi_Rmm_Disks_Latest', N'V') IS NOT NULL
  DROP VIEW dbo.vw_Kpi_Rmm_Disks_Latest;
GO

DECLARE @sql nvarchar(max);
IF COL_LENGTH(N'dbo.Pulseway_Disks', N'MediaType') IS NOT NULL
  SET @sql = N'
CREATE VIEW dbo.vw_Kpi_Rmm_Disks_Latest
AS
SELECT d.DeviceId, d.DriveLetter, d.TotalGb, d.FreeGb, d.UsedPct, d.CustomerCode, d.DeviceName,
  d.MediaType, d.SnapshotDate, d.ImportedAt
FROM dbo.Pulseway_Disks AS d WITH (NOLOCK)
INNER JOIN (
  SELECT DeviceId, DriveLetter, MAX(SnapshotDate) AS mx
  FROM dbo.Pulseway_Disks WITH (NOLOCK)
  GROUP BY DeviceId, DriveLetter
) m ON m.DeviceId = d.DeviceId AND m.DriveLetter = d.DriveLetter AND m.mx = d.SnapshotDate;';
ELSE
  SET @sql = N'
CREATE VIEW dbo.vw_Kpi_Rmm_Disks_Latest
AS
SELECT d.DeviceId, d.DriveLetter, d.TotalGb, d.FreeGb, d.UsedPct, d.CustomerCode, d.DeviceName,
  CAST(NULL AS nvarchar(40)) AS MediaType, d.SnapshotDate, d.ImportedAt
FROM dbo.Pulseway_Disks AS d WITH (NOLOCK)
INNER JOIN (
  SELECT DeviceId, DriveLetter, MAX(SnapshotDate) AS mx
  FROM dbo.Pulseway_Disks WITH (NOLOCK)
  GROUP BY DeviceId, DriveLetter
) m ON m.DeviceId = d.DeviceId AND m.DriveLetter = d.DriveLetter AND m.mx = d.SnapshotDate;';
EXEC sp_executesql @sql;
PRINT N'vw_Kpi_Rmm_Disks_Latest ready';
GO
