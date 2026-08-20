/*
  UVSS full SYSPRO scan - find AMS-useful objects
  Run ON UVSS-SYSPRO as Rpm_collect (or sa for full coverage):

  sqlcmd -S "." -U "Rpm_collect" -P "RpmCollect#AHIC2026" -C -W -s"|" -i 400_Scan_UVSS_Syspro.sql -o C:\RPM-Assure\Sql\customers\UVSS\logs\uvss_scan.txt

  Or: .\Run-UVSS-Scan.ps1
*/
SET NOCOUNT ON;
SET XACT_ABORT OFF;

PRINT N'============================================================';
PRINT N'UVSS SYSPRO SCAN';
PRINT CONCAT(N'Host=', @@SERVERNAME, N'  Utc=', CONVERT(varchar(30), SYSUTCDATETIME(), 126));
PRINT N'============================================================';

/* ---------- 1) Databases we can open ---------- */
PRINT N'';
PRINT N'=== 1) Online databases (access check) ===';
DECLARE @db sysname, @sql nvarchar(max);
DECLARE @OkDbs TABLE (DbName sysname PRIMARY KEY, CanAccess bit, Note nvarchar(200) NULL);

DECLARE d1 CURSOR LOCAL FAST_FORWARD FOR
  SELECT name FROM sys.databases WHERE state_desc = N'ONLINE' ORDER BY name;
OPEN d1;
FETCH NEXT FROM d1 INTO @db;
WHILE @@FETCH_STATUS = 0
BEGIN
  BEGIN TRY
    SET @sql = N'USE ' + QUOTENAME(@db) + N'; SELECT 1;';
    EXEC sp_executesql @sql;
    INSERT @OkDbs (DbName, CanAccess, Note) VALUES (@db, 1, N'OK');
  END TRY BEGIN CATCH
    INSERT @OkDbs (DbName, CanAccess, Note) VALUES (@db, 0, LEFT(ERROR_MESSAGE(), 200));
  END CATCH
  FETCH NEXT FROM d1 INTO @db;
END
CLOSE d1; DEALLOCATE d1;

SELECT DbName, CanAccess, Note FROM @OkDbs ORDER BY CanAccess DESC, DbName;

/* Company DBs only for deep scan */
DECLARE @Companies TABLE (DbName sysname PRIMARY KEY);
INSERT @Companies (DbName)
SELECT DbName FROM @OkDbs
WHERE CanAccess = 1
  AND (
       DbName LIKE N'SysproCompany%'
    OR DbName = N'Sysprodb'
    OR DbName LIKE N'Syspro%'
  )
  AND DbName NOT LIKE N'%_SRS'
  AND DbName NOT LIKE N'%Deployment%';

PRINT N'';
PRINT N'=== 2) Company / Syspro DBs in scope ===';
SELECT DbName FROM @Companies ORDER BY 1;

/* ---------- 2) Pattern hits ---------- */
PRINT N'';
PRINT N'=== 3) Tables matching AMS patterns (per DB) ===';
PRINT N'(Dtr, Health, License, Job, Oper, Balance, Ledger, Trial, Audit, Diag, Task, Login)';

DECLARE c CURSOR LOCAL FAST_FORWARD FOR SELECT DbName FROM @Companies ORDER BY 1;
OPEN c;
FETCH NEXT FROM c INTO @db;
WHILE @@FETCH_STATUS = 0
BEGIN
  PRINT CONCAT(N'-- ', @db);
  SET @sql = N'
  SELECT N''' + REPLACE(@db,'''','''''') + N''' AS DbName,
         t.name AS TableName,
         SUM(p.rows) AS ApproxRows
  FROM ' + QUOTENAME(@db) + N'.sys.tables t
  INNER JOIN ' + QUOTENAME(@db) + N'.sys.partitions p
    ON p.object_id = t.object_id AND p.index_id IN (0,1)
  WHERE t.is_ms_shipped = 0
    AND (
         t.name LIKE N''Dtr%''
      OR t.name LIKE N''%Balance%''
      OR t.name LIKE N''%Health%''
      OR t.name LIKE N''%License%''
      OR t.name LIKE N''%JobLog%''
      OR t.name LIKE N''AdmJob%''
      OR t.name LIKE N''AdmOper%''
      OR t.name LIKE N''AdmOperator%''
      OR t.name LIKE N''%Login%''
      OR t.name LIKE N''%Audit%''
      OR t.name LIKE N''%Diag%''
      OR t.name LIKE N''%Task%''
      OR t.name LIKE N''%Trial%''
      OR t.name LIKE N''%Ledger%''
      OR t.name LIKE N''Gtr%''
      OR t.name LIKE N''Gen%Bal%''
      OR t.name LIKE N''%Variance%''
      OR t.name LIKE N''AdmSys%''
      OR t.name LIKE N''AdmRtp%''
      OR t.name LIKE N''%Monitor%''
      OR t.name LIKE N''%Alert%''
    )
  GROUP BY t.name
  ORDER BY t.name;';
  BEGIN TRY EXEC sp_executesql @sql; END TRY
  BEGIN CATCH PRINT CONCAT(N'  FAIL: ', ERROR_MESSAGE()); END CATCH
  FETCH NEXT FROM c INTO @db;
END
CLOSE c; DEALLOCATE c;

/* ---------- 3) Explicit Datarapt / health objects ---------- */
PRINT N'';
PRINT N'=== 4) Explicit object presence (0/1) ===';

DECLARE @Checks TABLE (DbName sysname, ObjectName sysname, ExistsBit bit);
DECLARE @objs TABLE (ObjectName sysname PRIMARY KEY);
INSERT @objs (ObjectName) VALUES
  (N'DtrInvBalances'),(N'DtrApBalances'),(N'DtrArBalances'),(N'DtrCbBalances'),
  (N'DtrWipBalances'),(N'DtrAssBalances'),(N'DtrDnBalances'),(N'DtrGitBalances'),
  (N'DtrGrnBalances'),(N'DtrWpiBalances'),
  (N'AdmJobLogging'),(N'AdmOperator'),(N'AdmOperatorLogin'),(N'AdmSystemLicense'),
  (N'AdmSysHealthLog'),(N'AdmHealthLog'),(N'AdmSqlHealthBal'),
  (N'AdmOperGroup'),(N'AdmOperGroupMult'),(N'AdmOperAmendJnl'),
  (N'AdmTaskGroup'),(N'AdmTaskItem'),(N'AdmDiagSummary'),(N'AdmSystemAuditLog'),
  (N'GenLedgerSummary'),(N'GenJournalDet'),(N'InvWarehouse'),(N'ApSupplier'),(N'ArCustomer');

DECLARE c2 CURSOR LOCAL FAST_FORWARD FOR SELECT DbName FROM @Companies;
OPEN c2;
FETCH NEXT FROM c2 INTO @db;
WHILE @@FETCH_STATUS = 0
BEGIN
  DECLARE @on sysname;
  DECLARE o CURSOR LOCAL FAST_FORWARD FOR SELECT ObjectName FROM @objs;
  OPEN o;
  FETCH NEXT FROM o INTO @on;
  WHILE @@FETCH_STATUS = 0
  BEGIN
    IF OBJECT_ID(QUOTENAME(@db) + N'.dbo.' + @on) IS NOT NULL
      INSERT @Checks VALUES (@db, @on, 1);
    ELSE
      INSERT @Checks VALUES (@db, @on, 0);
    FETCH NEXT FROM o INTO @on;
  END
  CLOSE o; DEALLOCATE o;
  FETCH NEXT FROM c2 INTO @db;
END
CLOSE c2; DEALLOCATE c2;

SELECT DbName, ObjectName, ExistsBit
FROM @Checks
WHERE ExistsBit = 1
ORDER BY ObjectName, DbName;

PRINT N'';
PRINT N'=== 5) Summary: objects found in at least one DB ===';
SELECT ObjectName, COUNT(*) AS DbCount
FROM @Checks
WHERE ExistsBit = 1
GROUP BY ObjectName
ORDER BY ObjectName;

PRINT N'';
PRINT N'=== 6) Missing DTR targets (expect all 0 on UVSS) ===';
SELECT ObjectName, SUM(CAST(ExistsBit AS int)) AS PresentInDbs
FROM @Checks
WHERE ObjectName LIKE N'Dtr%'
GROUP BY ObjectName
ORDER BY 1;

/* ---------- 4) Row counts for high-value tables that DO exist ---------- */
PRINT N'';
PRINT N'=== 7) Row counts for present high-value tables ===';
DECLARE c3 CURSOR LOCAL FAST_FORWARD FOR
  SELECT DbName, ObjectName FROM @Checks WHERE ExistsBit = 1
    AND ObjectName IN (
      N'AdmJobLogging',N'AdmOperator',N'AdmOperatorLogin',N'AdmSystemLicense',
      N'AdmSysHealthLog',N'AdmHealthLog',N'AdmOperGroup',N'AdmOperGroupMult',
      N'AdmOperAmendJnl',N'AdmTaskGroup',N'AdmTaskItem',N'AdmDiagSummary',
      N'AdmSystemAuditLog',N'AdmSqlHealthBal'
    );
OPEN c3;
DECLARE @on2 sysname;
FETCH NEXT FROM c3 INTO @db, @on2;
WHILE @@FETCH_STATUS = 0
BEGIN
  SET @sql = N'
  SELECT N''' + REPLACE(@db,'''','''''') + N''' AS DbName,
         N''' + REPLACE(@on2,'''','''''') + N''' AS TableName,
         COUNT_BIG(*) AS RowCnt
  FROM ' + QUOTENAME(@db) + N'.dbo.' + QUOTENAME(@on2) + N';';
  BEGIN TRY EXEC sp_executesql @sql; END TRY
  BEGIN CATCH PRINT CONCAT(N'  count fail ', @db, N'.', @on2, N': ', ERROR_MESSAGE()); END CATCH
  FETCH NEXT FROM c3 INTO @db, @on2;
END
CLOSE c3; DEALLOCATE c3;

/* ---------- 5) Suggest next collect targets ---------- */
PRINT N'';
PRINT N'=== 8) Collect coverage hints ===';
PRINT N'Already collected by UVSS pack when present: Operators, Login, Jobs, License, Tasks, HealthLog, OperSecurity';
PRINT N'DTR: only if Dtr*Balances exist (UVSS: not present)';
PRINT N'If AdmSystemAuditLog / AdmDiag* / AdmSqlHealthBal exist with rows, we can add collectors.';
PRINT N'============================================================';
PRINT N'SCAN COMPLETE - save output / uvss_scan.txt';
PRINT N'============================================================';
GO
