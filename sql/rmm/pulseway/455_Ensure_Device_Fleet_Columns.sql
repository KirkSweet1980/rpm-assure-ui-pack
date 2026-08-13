/*
  Pulseway device fleet columns: uptime days, patches.
  Safe re-run. Grants Rpm_collect.
*/
SET NOCOUNT ON;
USE RPMAssure_App;

IF OBJECT_ID(N'dbo.Pulseway_Devices', N'U') IS NULL
BEGIN
  RAISERROR(N'Pulseway_Devices missing - run 440/442 first', 16, 1);
  RETURN;
END

IF COL_LENGTH(N'dbo.Pulseway_Devices', N'UptimeDays') IS NULL
  ALTER TABLE dbo.Pulseway_Devices ADD UptimeDays decimal(10,2) NULL;
IF COL_LENGTH(N'dbo.Pulseway_Devices', N'LastBootAt') IS NULL
  ALTER TABLE dbo.Pulseway_Devices ADD LastBootAt datetime2(3) NULL;
IF COL_LENGTH(N'dbo.Pulseway_Devices', N'PatchInstalledCount') IS NULL
  ALTER TABLE dbo.Pulseway_Devices ADD PatchInstalledCount int NULL;
IF COL_LENGTH(N'dbo.Pulseway_Devices', N'PatchMissingCount') IS NULL
  ALTER TABLE dbo.Pulseway_Devices ADD PatchMissingCount int NULL;
IF COL_LENGTH(N'dbo.Pulseway_Devices', N'PatchPendingCount') IS NULL
  ALTER TABLE dbo.Pulseway_Devices ADD PatchPendingCount int NULL;

-- Used space helper not stored; UI derives used = total - free

IF EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'Rpm_collect')
BEGIN
  GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.Pulseway_Devices TO [Rpm_collect];
  IF OBJECT_ID(N'dbo.Pulseway_Disks', N'U') IS NOT NULL
    GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.Pulseway_Disks TO [Rpm_collect];
END

PRINT N'455 fleet columns ready (UptimeDays, LastBootAt, Patch*).';
