/*
  RSR ? msdb backup history -> central
  Linked server requires ANSI_NULLS ON + ANSI_WARNINGS ON
*/
SET NOCOUNT ON;
SET XACT_ABORT OFF;
SET ANSI_NULLS ON;
SET ANSI_WARNINGS ON;

DECLARE @CustomerCode nvarchar(50)  = N'RSR';
DECLARE @InstanceName nvarchar(100) = N'RSR-SQLSRV-DB';
DECLARE @SnapshotDate date = CAST(
    CAST(SYSUTCDATETIME() AT TIME ZONE N'UTC' AT TIME ZONE N'South Africa Standard Time' AS date) AS date);
DECLARE @StaleHours int = 36;

PRINT CONCAT(N'=== RSR SQL Backups ', CONVERT(char(10), @SnapshotDate, 23), N' ===');

IF NOT EXISTS (
  SELECT 1 FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Dim_Customer
  WHERE CustomerCode = @CustomerCode AND Active = 1)
BEGIN
  PRINT N'RSR not active'; RETURN;
END

BEGIN TRY
  DELETE FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Sql_Backups
  WHERE SnapshotDate = @SnapshotDate AND InstanceName = @InstanceName;
  DELETE FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Sql_BackupFailures
  WHERE SnapshotDate = @SnapshotDate AND InstanceName = @InstanceName;
END TRY BEGIN CATCH
  PRINT CONCAT(N'DELETE FAIL: ', ERROR_MESSAGE());
  PRINT N'Run 310 on central first.';
  RETURN;
END CATCH

/* Stage locally first, then push to central (cleaner for linked server) */
IF OBJECT_ID(N'tempdb..#Bak') IS NOT NULL DROP TABLE #Bak;
CREATE TABLE #Bak (
  DatabaseName nvarchar(128) NOT NULL,
  LastFullBackup datetime2(3) NULL,
  LastDiffBackup datetime2(3) NULL,
  LastLogBackup datetime2(3) NULL,
  LastBackupStatus nvarchar(30) NULL,
  FullAgeHours int NULL
);

BEGIN TRY
  ;WITH lastB AS (
    SELECT
      bs.database_name AS DatabaseName,
      MAX(CASE WHEN bs.type = N'D' THEN bs.backup_finish_date END) AS LastFullBackup,
      MAX(CASE WHEN bs.type = N'I' THEN bs.backup_finish_date END) AS LastDiffBackup,
      MAX(CASE WHEN bs.type = N'L' THEN bs.backup_finish_date END) AS LastLogBackup
    FROM msdb.dbo.backupset AS bs WITH (NOLOCK)
    GROUP BY bs.database_name
  )
  INSERT INTO #Bak (DatabaseName, LastFullBackup, LastDiffBackup, LastLogBackup, LastBackupStatus, FullAgeHours)
  SELECT
    d.name,
    lb.LastFullBackup,
    lb.LastDiffBackup,
    lb.LastLogBackup,
    CASE
      WHEN lb.LastFullBackup IS NULL THEN N'Missing'
      WHEN DATEDIFF(HOUR, lb.LastFullBackup, SYSUTCDATETIME()) > @StaleHours THEN N'Stale'
      ELSE N'OK'
    END,
    CASE WHEN lb.LastFullBackup IS NULL THEN NULL
         ELSE DATEDIFF(HOUR, lb.LastFullBackup, SYSUTCDATETIME()) END
  FROM sys.databases AS d WITH (NOLOCK)
  LEFT JOIN lastB AS lb ON lb.DatabaseName = d.name
  WHERE d.state = 0
    AND d.name NOT IN (N'tempdb');

  INSERT INTO [RPM_CENTRAL].[RPMAssure_App].dbo.Sql_Backups
  (
    SnapshotDate, InstanceName, DatabaseName,
    LastFullBackup, LastDiffBackup, LastLogBackup,
    LastBackupStatus, FullAgeHours, ImportedAt
  )
  SELECT
    @SnapshotDate, @InstanceName, DatabaseName,
    LastFullBackup, LastDiffBackup, LastLogBackup,
    LastBackupStatus, FullAgeHours, SYSUTCDATETIME()
  FROM #Bak;

  PRINT CONCAT(N'Backup status rows: ', @@ROWCOUNT);
END TRY BEGIN CATCH
  PRINT CONCAT(N'Backupset FAIL: ', ERROR_MESSAGE());
END CATCH

IF OBJECT_ID(N'tempdb..#Fail') IS NOT NULL DROP TABLE #Fail;
CREATE TABLE #Fail (
  FailureAt datetime2(3) NULL,
  JobName nvarchar(200) NULL,
  StepName nvarchar(200) NULL,
  Message nvarchar(max) NULL,
  RunStatus int NULL
);

BEGIN TRY
  INSERT INTO #Fail (FailureAt, JobName, StepName, Message, RunStatus)
  SELECT TOP (100)
    CASE
      WHEN h.run_date > 0 THEN
        TRY_CONVERT(datetime2(3),
          STUFF(STUFF(CONVERT(char(8), h.run_date), 5, 0, N'-'), 8, 0, N'-') + N' ' +
          STUFF(STUFF(RIGHT(N'000000' + CONVERT(varchar(6), h.run_time), 6), 5, 0, N':'), 3, 0, N':'))
      ELSE NULL
    END,
    j.name,
    CASE WHEN h.step_id = 0 THEN N'(job outcome)' ELSE CONCAT(N'step ', h.step_id) END,
    CONVERT(nvarchar(max), h.message),
    h.run_status
  FROM msdb.dbo.sysjobhistory AS h WITH (NOLOCK)
  INNER JOIN msdb.dbo.sysjobs AS j WITH (NOLOCK) ON j.job_id = h.job_id
  WHERE h.run_status = 0
    AND (
      j.name LIKE N'%backup%'
      OR j.name LIKE N'%Backup%'
      OR ISNULL(h.message, N'') LIKE N'%BACKUP%'
      OR ISNULL(h.message, N'') LIKE N'%backup%'
    )
    AND h.run_date >= CONVERT(int, CONVERT(char(8), DATEADD(DAY, -7, GETDATE()), 112))
  ORDER BY h.run_date DESC, h.run_time DESC;

  INSERT INTO [RPM_CENTRAL].[RPMAssure_App].dbo.Sql_BackupFailures
  (
    SnapshotDate, InstanceName, FailureAt, JobName, DatabaseName, StepName, Message, RunStatus, ImportedAt
  )
  SELECT
    @SnapshotDate, @InstanceName, FailureAt, JobName, NULL, StepName, Message, RunStatus, SYSUTCDATETIME()
  FROM #Fail;

  PRINT CONCAT(N'Backup failure rows: ', @@ROWCOUNT);
END TRY BEGIN CATCH
  PRINT CONCAT(N'Job history FAIL: ', ERROR_MESSAGE());
END CATCH

PRINT N'=== Done RSR SQL Backups ===';
GO
