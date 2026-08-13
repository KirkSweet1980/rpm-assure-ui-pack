/*
  RPMAssure_App — performance indexes for portfolio / customer loaders.
  Safe to re-run. Run on central: RPMAssure_App
*/
SET NOCOUNT ON;
USE RPMAssure_App;
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'IX_Syspro_Operators_Inst_Snap' AND object_id = OBJECT_ID(N'dbo.Syspro_Operators')
)
BEGIN
  CREATE NONCLUSTERED INDEX IX_Syspro_Operators_Inst_Snap
    ON dbo.Syspro_Operators (InstanceName, SnapshotDate DESC)
    INCLUDE (LastLoginDate, OperatorStatus, ImportedAt, OperatorCode);
  PRINT 'Created IX_Syspro_Operators_Inst_Snap';
END
ELSE PRINT 'IX_Syspro_Operators_Inst_Snap exists';
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'IX_Syspro_JobLogging_Inst_Snap' AND object_id = OBJECT_ID(N'dbo.Syspro_JobLogging')
)
BEGIN
  CREATE NONCLUSTERED INDEX IX_Syspro_JobLogging_Inst_Snap
    ON dbo.Syspro_JobLogging (InstanceName, SnapshotDate)
    INCLUDE (ErrorStatusCode, ProgErrorCode, TransactionStatus, ProgRunDate, ProgramName, Operator);
  PRINT 'Created IX_Syspro_JobLogging_Inst_Snap';
END
ELSE PRINT 'IX_Syspro_JobLogging_Inst_Snap exists';
GO

IF OBJECT_ID(N'dbo.Syspro_SystemAuditLog', N'U') IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'IX_Syspro_SystemAuditLog_Inst_Snap' AND object_id = OBJECT_ID(N'dbo.Syspro_SystemAuditLog')
)
BEGIN
  CREATE NONCLUSTERED INDEX IX_Syspro_SystemAuditLog_Inst_Snap
    ON dbo.Syspro_SystemAuditLog (InstanceName, SnapshotDate DESC);
  PRINT 'Created IX_Syspro_SystemAuditLog_Inst_Snap';
END
GO

IF OBJECT_ID(N'dbo.Sql_Backups', N'U') IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'IX_Sql_Backups_Inst_Snap' AND object_id = OBJECT_ID(N'dbo.Sql_Backups')
)
BEGIN
  CREATE NONCLUSTERED INDEX IX_Sql_Backups_Inst_Snap
    ON dbo.Sql_Backups (InstanceName, SnapshotDate DESC);
  PRINT 'Created IX_Sql_Backups_Inst_Snap';
END
GO

PRINT 'Performance indexes done.';
GO
