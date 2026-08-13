/*
  438 - Cove retention policy columns on Cove_DeviceStatistics
  PN = Retention Policy name; OP = Profile; *R = per-source retention
*/
USE [RPMAssure_App];
GO
SET NOCOUNT ON;

IF OBJECT_ID(N'dbo.Cove_DeviceStatistics', N'U') IS NULL
BEGIN
  RAISERROR(N'Cove_DeviceStatistics missing — run Cove ensure first', 16, 1);
  RETURN;
END
GO

IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'RetentionPolicy') IS NULL
  ALTER TABLE dbo.Cove_DeviceStatistics ADD RetentionPolicy nvarchar(200) NULL;
IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'ProfileName') IS NULL
  ALTER TABLE dbo.Cove_DeviceStatistics ADD ProfileName nvarchar(200) NULL;
IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'RetentionFiles') IS NULL
  ALTER TABLE dbo.Cove_DeviceStatistics ADD RetentionFiles nvarchar(80) NULL;   -- FR
IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'RetentionSystemState') IS NULL
  ALTER TABLE dbo.Cove_DeviceStatistics ADD RetentionSystemState nvarchar(80) NULL; -- SR
IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'RetentionHyperV') IS NULL
  ALTER TABLE dbo.Cove_DeviceStatistics ADD RetentionHyperV nvarchar(80) NULL; -- HR
IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'RetentionSql') IS NULL
  ALTER TABLE dbo.Cove_DeviceStatistics ADD RetentionSql nvarchar(80) NULL; -- ZR
IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'RetentionVmware') IS NULL
  ALTER TABLE dbo.Cove_DeviceStatistics ADD RetentionVmware nvarchar(80) NULL; -- WR
IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'RetentionNetwork') IS NULL
  ALTER TABLE dbo.Cove_DeviceStatistics ADD RetentionNetwork nvarchar(80) NULL; -- NR
IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'SelectedBytes') IS NULL
  ALTER TABLE dbo.Cove_DeviceStatistics ADD SelectedBytes bigint NULL;
PRINT N'Cove retention columns ready';
GO

-- Grants
DECLARE @p sysname, @sql nvarchar(max);
DECLARE c CURSOR LOCAL FAST_FORWARD FOR
  SELECT name FROM (VALUES (N'Rpm_collect'),(N'Rpm_app'),(N'rpm_app'),(N'rpmassure')) v(name);
OPEN c; FETCH NEXT FROM c INTO @p;
WHILE @@FETCH_STATUS = 0
BEGIN
  IF EXISTS (SELECT 1 FROM sys.database_principals WHERE name = @p)
  BEGIN
    BEGIN TRY
      SET @sql = N'GRANT SELECT ON OBJECT::dbo.Cove_DeviceStatistics TO ' + QUOTENAME(@p);
      EXEC sp_executesql @sql;
    END TRY BEGIN CATCH END CATCH
  END
  FETCH NEXT FROM c INTO @p;
END
CLOSE c; DEALLOCATE c;
GO
