SET NOCOUNT ON;
SET XACT_ABORT OFF;
PRINT '212 start';
PRINT CONCAT('Who=', SUSER_SNAME());

DECLARE @CustomerCode nvarchar(50) = N'RSR';
DECLARE @InstanceName nvarchar(100) = N'RSR-SQLSRV-DB';
DECLARE @SnapshotDate date = CAST(GETDATE() AS date);
DECLARE @rc int = 0;
DECLARE @sql nvarchar(max);

PRINT CONCAT('Snap=', CONVERT(char(10), @SnapshotDate, 23));

/* prove customer active via dynamic linked */
SET @sql = N'SELECT @n = COUNT(*) FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Dim_Customer
 WHERE CustomerCode = @c AND Active = 1';
DECLARE @n int = 0;
BEGIN TRY
  EXEC sp_executesql @sql, N'@c nvarchar(50), @n int OUTPUT', @c=@CustomerCode, @n=@n OUTPUT;
END TRY BEGIN CATCH
  PRINT CONCAT('Dim check FAIL ', ERROR_NUMBER(), ': ', ERROR_MESSAGE());
  RAISERROR('Dim check failed - fix linked server Encrypt (run 303d)', 16, 1);
  RETURN;
END CATCH
IF @n = 0
BEGIN
  PRINT 'RSR not active on central';
  RAISERROR('RSR not active', 16, 1);
  RETURN;
END
PRINT 'Dim_Customer OK';

/* clear day snapshot */
SET @sql = N'DELETE FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_Operators
 WHERE SnapshotDate = @sd AND InstanceName = @inst';
BEGIN TRY
  EXEC sp_executesql @sql, N'@sd date, @inst nvarchar(100)', @sd=@SnapshotDate, @inst=@InstanceName;
  PRINT 'DELETE old OK';
END TRY BEGIN CATCH
  PRINT CONCAT('DELETE FAIL ', ERROR_NUMBER(), ': ', ERROR_MESSAGE());
  RAISERROR('212 delete failed', 16, 1);
  RETURN;
END CATCH

/* local operators -> #tmp then insert linked from #tmp via dynamic */
IF OBJECT_ID('tempdb..#ops') IS NOT NULL DROP TABLE #ops;
CREATE TABLE #ops (
  OperatorCode nvarchar(50) NOT NULL,
  OperatorName nvarchar(200) NULL,
  LastLoginDate datetime2(3) NULL
);

IF OBJECT_ID(N'SysproDB.dbo.AdmOperator', N'U') IS NOT NULL
BEGIN
  INSERT INTO #ops (OperatorCode, OperatorName)
  SELECT LTRIM(RTRIM(CONVERT(nvarchar(50), Operator))),
         MAX(LTRIM(RTRIM(CONVERT(nvarchar(200), Name))))
  FROM SysproDB.dbo.AdmOperator
  WHERE Operator IS NOT NULL AND LTRIM(RTRIM(CONVERT(nvarchar(50), Operator))) <> N''
  GROUP BY LTRIM(RTRIM(CONVERT(nvarchar(50), Operator)));
  PRINT CONCAT('Loaded from SysproDB: ', @@ROWCOUNT);
END
ELSE IF OBJECT_ID(N'Sysprodb.dbo.AdmOperator', N'U') IS NOT NULL
BEGIN
  INSERT INTO #ops (OperatorCode, OperatorName)
  SELECT LTRIM(RTRIM(CONVERT(nvarchar(50), Operator))),
         MAX(LTRIM(RTRIM(CONVERT(nvarchar(200), Name))))
  FROM Sysprodb.dbo.AdmOperator
  WHERE Operator IS NOT NULL AND LTRIM(RTRIM(CONVERT(nvarchar(50), Operator))) <> N''
  GROUP BY LTRIM(RTRIM(CONVERT(nvarchar(50), Operator)));
  PRINT CONCAT('Loaded from Sysprodb: ', @@ROWCOUNT);
END
ELSE
BEGIN
  PRINT 'No AdmOperator';
  RAISERROR('No AdmOperator', 16, 1);
  RETURN;
END

/* optional last login */
IF OBJECT_ID(N'SysproDB.dbo.AdmOperatorLogin', N'U') IS NOT NULL
   OR OBJECT_ID(N'Sysprodb.dbo.AdmOperatorLogin', N'U') IS NOT NULL
BEGIN
  BEGIN TRY
    DECLARE @loginDb sysname = CASE WHEN OBJECT_ID(N'SysproDB.dbo.AdmOperatorLogin', N'U') IS NOT NULL THEN N'SysproDB' ELSE N'Sysprodb' END;
    DECLARE @opCol sysname, @dtCol sysname;
    SELECT TOP 1 @opCol = c.name
    FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(@loginDb + N'.dbo.AdmOperatorLogin')
      AND c.name IN (N'Operator', N'OperatorCode')
    ORDER BY CASE c.name WHEN N'Operator' THEN 1 ELSE 2 END;
    SELECT TOP 1 @dtCol = c.name
    FROM sys.columns c
    JOIN sys.types t ON t.user_type_id = c.user_type_id
    WHERE c.object_id = OBJECT_ID(@loginDb + N'.dbo.AdmOperatorLogin')
      AND t.name IN (N'datetime', N'datetime2', N'smalldatetime', N'date');
    IF @opCol IS NOT NULL AND @dtCol IS NOT NULL
    BEGIN
      SET @sql = N'
      UPDATE o SET LastLoginDate = lg.mx
      FROM #ops o
      OUTER APPLY (
        SELECT MAX(l.' + QUOTENAME(@dtCol) + N') AS mx
        FROM ' + QUOTENAME(@loginDb) + N'.dbo.AdmOperatorLogin l
        WHERE LTRIM(RTRIM(CONVERT(nvarchar(50), l.' + QUOTENAME(@opCol) + N'))) = o.OperatorCode
      ) lg';
      EXEC sp_executesql @sql;
      PRINT 'LastLogin updated';
    END
  END TRY BEGIN CATCH
    PRINT CONCAT('Login enrich skipped: ', ERROR_MESSAGE());
  END CATCH
END

/* insert to central one row at a time via dynamic SQL (avoids bulk linked issues) */
DECLARE @oc nvarchar(50), @on nvarchar(200), @ll datetime2(3);
DECLARE c CURSOR LOCAL FAST_FORWARD FOR SELECT OperatorCode, OperatorName, LastLoginDate FROM #ops;
OPEN c;
FETCH NEXT FROM c INTO @oc, @on, @ll;
WHILE @@FETCH_STATUS = 0
BEGIN
  SET @sql = N'INSERT INTO [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_Operators
    (SnapshotDate, InstanceName, OperatorCode, OperatorName, GroupCode, Email, LastLoginDate, OperatorStatus, ImportedAt)
    VALUES (@sd, @inst, @oc, @on, NULL, NULL, @ll, N''Active'', SYSUTCDATETIME())';
  BEGIN TRY
    EXEC sp_executesql @sql,
      N'@sd date, @inst nvarchar(100), @oc nvarchar(50), @on nvarchar(200), @ll datetime2(3)',
      @sd=@SnapshotDate, @inst=@InstanceName, @oc=@oc, @on=@on, @ll=@ll;
    SET @rc += 1;
  END TRY BEGIN CATCH
    PRINT CONCAT('row fail ', @oc, ': ', ERROR_MESSAGE());
  END CATCH
  FETCH NEXT FROM c INTO @oc, @on, @ll;
END
CLOSE c; DEALLOCATE c;

PRINT CONCAT('Operators rows written: ', @rc);
IF @rc = 0
BEGIN
  RAISERROR('No operators written', 16, 1);
  RETURN;
END
PRINT '=== Done RSR (operators) ===';
