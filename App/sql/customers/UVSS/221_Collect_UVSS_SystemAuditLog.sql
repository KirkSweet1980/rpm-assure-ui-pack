/*
  UVSS AdmSystemAuditLog -> central
  Real map: OperatorCode, ProgramName, Notes; TimeStamp is rowversion (NOT a date)
*/
SET NOCOUNT ON;
SET XACT_ABORT OFF;

DECLARE @CustomerCode nvarchar(50)  = N'UVSS';
DECLARE @InstanceName nvarchar(100) = N'UVSS-SYSPRO';
DECLARE @SnapshotDate date = CAST(
    CAST(SYSUTCDATETIME() AT TIME ZONE N'UTC' AT TIME ZONE N'South Africa Standard Time' AS date) AS date);
DECLARE @MaxRows int = 5000;

PRINT CONCAT(N'=== UVSS SystemAuditLog ', CONVERT(char(10), @SnapshotDate, 23), N' ===');

IF NOT EXISTS (
  SELECT 1 FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Dim_Customer
  WHERE CustomerCode = @CustomerCode AND Active = 1)
BEGIN
  PRINT N'UVSS not active on central.'; RETURN;
END

IF OBJECT_ID(N'Sysprodb.dbo.AdmSystemAuditLog') IS NULL
BEGIN
  PRINT N'Missing AdmSystemAuditLog'; RETURN;
END

DECLARE @srcCnt int;
SELECT @srcCnt = COUNT(*) FROM Sysprodb.dbo.AdmSystemAuditLog;
PRINT CONCAT(N'Source rows: ', @srcCnt);

/* Prefer real datetime columns; never use TimeStamp (rowversion) */
DECLARE @dt sysname = (
  SELECT TOP 1 c.name
  FROM Sysprodb.sys.columns c
  JOIN Sysprodb.sys.types t ON t.user_type_id = c.user_type_id
  WHERE c.object_id = OBJECT_ID(N'Sysprodb.dbo.AdmSystemAuditLog')
    AND t.name IN (N'datetime', N'datetime2', N'smalldatetime', N'date')
  ORDER BY CASE c.name
    WHEN N'AuditDateTime' THEN 1 WHEN N'AuditDate' THEN 2 WHEN N'LogDate' THEN 3
    WHEN N'EventDate' THEN 4 WHEN N'SystemDate' THEN 5 ELSE 9 END);

PRINT CONCAT(N'Date column: ', ISNULL(@dt, N'(none - EventAt null)'));

BEGIN TRY
  DELETE FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_SystemAuditLog
  WHERE SnapshotDate = @SnapshotDate AND InstanceName = @InstanceName;
END TRY BEGIN CATCH
  PRINT CONCAT(N'DELETE FAIL: ', ERROR_MESSAGE()); RETURN;
END CATCH

DECLARE @sql nvarchar(max) = N'
INSERT INTO [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_SystemAuditLog
(SnapshotDate, InstanceName, CompanyDb, EventAt, OperatorCode, ProgramName, ActionCode, Detail, SourceTable, ImportedAt)
SELECT TOP (@MaxRows)
  @Snap, @Inst, N''Sysprodb'',
  ' + CASE WHEN @dt IS NULL THEN N'NULL' ELSE N'TRY_CONVERT(datetime2(3), a.' + QUOTENAME(@dt) + N')' END + N',
  LEFT(LTRIM(RTRIM(CONVERT(nvarchar(50), a.OperatorCode))), 50),
  LEFT(LTRIM(RTRIM(CONVERT(nvarchar(100), a.ProgramName))), 100),
  NULL,
  CONVERT(nvarchar(max), a.Notes),
  N''AdmSystemAuditLog'',
  SYSUTCDATETIME()
FROM Sysprodb.dbo.AdmSystemAuditLog AS a
ORDER BY a.OperatorCode, a.ProgramName;
';

BEGIN TRY
  EXEC sp_executesql @sql,
    N'@Snap date, @Inst nvarchar(100), @MaxRows int',
    @SnapshotDate, @InstanceName, @MaxRows;
  PRINT CONCAT(N'Audit rows written: ', @@ROWCOUNT);
END TRY BEGIN CATCH
  PRINT CONCAT(N'INSERT FAIL: ', ERROR_MESSAGE());
END CATCH

PRINT N'=== Done UVSS SystemAuditLog ===';
GO
