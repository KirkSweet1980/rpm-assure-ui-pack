/*
  RSS AdmSqlHealthBal columns:
  RunDateTime, TestType, TableName, ObjectName, ColumnName, TestStatus,
  IndexName, ForeignKeyName, Message, Exp/Act*, TimeStamp (rowversion - ignore)
*/
SET NOCOUNT ON;
SET XACT_ABORT OFF;

DECLARE @CustomerCode nvarchar(50)  = N'RSS';
DECLARE @InstanceName nvarchar(100) = N'RSS-PROD';
DECLARE @SnapshotDate date = CAST(
    CAST(SYSUTCDATETIME() AT TIME ZONE N'UTC' AT TIME ZONE N'South Africa Standard Time' AS date) AS date);
DECLARE @total int = 0;

PRINT CONCAT(N'=== RSS SqlHealthBal ', CONVERT(char(10), @SnapshotDate, 23), N' ===');

IF NOT EXISTS (
  SELECT 1 FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Dim_Customer
  WHERE CustomerCode = @CustomerCode AND Active = 1)
BEGIN
  PRINT N'RSS not active'; RETURN;
END

BEGIN TRY
  DELETE FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_SqlHealthBal
  WHERE SnapshotDate = @SnapshotDate AND InstanceName = @InstanceName;
END TRY BEGIN CATCH
  PRINT CONCAT(N'DELETE FAIL: ', ERROR_MESSAGE()); RETURN;
END CATCH

DECLARE @db sysname, @sql nvarchar(max), @rc int;
DECLARE c CURSOR LOCAL FAST_FORWARD FOR
  SELECT name FROM sys.databases
  WHERE state_desc = N'ONLINE'
    AND name LIKE N'SysproCompany%'
    AND name NOT LIKE N'%_SRS';
OPEN c;
FETCH NEXT FROM c INTO @db;
WHILE @@FETCH_STATUS = 0
BEGIN
  IF OBJECT_ID(QUOTENAME(@db) + N'.dbo.AdmSqlHealthBal') IS NULL
  BEGIN
    PRINT CONCAT(N'  ', @db, N': no table');
    FETCH NEXT FROM c INTO @db;
    CONTINUE;
  END

  SET @sql = N'
  INSERT INTO [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_SqlHealthBal
  (
    SnapshotDate, InstanceName, CompanyDb, HealthKey, Description, BalValue, StatusText, RefreshDate, ImportedAt
  )
  SELECT
    @Snap, @Inst, @Db,
    LEFT(LTRIM(RTRIM(CONVERT(nvarchar(100), COALESCE(
      NULLIF(LTRIM(RTRIM(CONVERT(nvarchar(100), s.TableName))), N''''),
      NULLIF(LTRIM(RTRIM(CONVERT(nvarchar(100), s.ObjectName))), N''''),
      s.TestType
    )))), 100),
    LEFT(LTRIM(RTRIM(CONVERT(nvarchar(200), COALESCE(
      NULLIF(LTRIM(RTRIM(CONVERT(nvarchar(200), s.Message))), N''''),
      NULLIF(LTRIM(RTRIM(CONVERT(nvarchar(200), s.ColumnName))), N''''),
      s.TestType
    )))), 200),
    NULL,
    LEFT(LTRIM(RTRIM(CONVERT(nvarchar(100), s.TestStatus))), 100),
    TRY_CONVERT(datetime2(3), s.RunDateTime),
    SYSUTCDATETIME()
  FROM ' + QUOTENAME(@db) + N'.dbo.AdmSqlHealthBal AS s;
  SET @rcOut = @@ROWCOUNT;';

  BEGIN TRY
    SET @rc = 0;
    EXEC sp_executesql @sql,
      N'@Snap date, @Inst nvarchar(100), @Db nvarchar(100), @rcOut int OUTPUT',
      @SnapshotDate, @InstanceName, @db, @rc OUTPUT;
    SET @total += ISNULL(@rc, 0);
    PRINT CONCAT(N'  ', @db, N' rows=', ISNULL(@rc, 0));
  END TRY BEGIN CATCH
    PRINT CONCAT(N'  ', @db, N' FAIL: ', ERROR_MESSAGE());
  END CATCH

  FETCH NEXT FROM c INTO @db;
END
CLOSE c; DEALLOCATE c;

PRINT CONCAT(N'Total SqlHealthBal rows: ', @total);
PRINT N'=== Done RSS SqlHealthBal ===';
GO
