/*
  CENTRAL 380 - Purge test waivers + demo/sample/seed data
  Safe: no live SYSPRO collect deleted.
  Dynamic SQL for optional columns (compile-safe).
*/
USE RPMAssure_App;
GO
SET NOCOUNT ON;
SET XACT_ABORT OFF;
GO

PRINT N'=== 380 Purge demo / sample / test data ===';
PRINT CONVERT(nvarchar(30), SYSUTCDATETIME(), 126);
GO

IF OBJECT_ID(N'dbo.Dim_Syspro_HotfixWaiver', N'U') IS NOT NULL
BEGIN
  BEGIN TRY
    DELETE FROM dbo.Dim_Syspro_HotfixWaiver
    WHERE CustomerCode = N'UVSS' AND HotfixCode = N'KB8100070';
    PRINT CONCAT(N'  Test waiver UVSS/KB8100070 deleted: ', @@ROWCOUNT);

    DELETE FROM dbo.Dim_Syspro_HotfixWaiver
    WHERE LTRIM(RTRIM(ISNULL(Reason, N''))) IN (N'reason here', N'test', N'Test', N'demo', N'Demo')
       OR Reason LIKE N'test %'
       OR Reason LIKE N'TEST%';
    PRINT CONCAT(N'  Junk-reason waivers deleted: ', @@ROWCOUNT);
  END TRY
  BEGIN CATCH
    PRINT CONCAT(N'  Waiver purge WARN: ', ERROR_MESSAGE());
  END CATCH
END
ELSE
  PRINT N'  Dim_Syspro_HotfixWaiver missing - skip';
GO

IF OBJECT_ID(N'dbo.Fact_Incident', N'U') IS NOT NULL
BEGIN TRY
  DELETE FROM dbo.Fact_Incident WHERE ExternalRef LIKE N'AUTO-%';
  PRINT CONCAT(N'  Fact_Incident AUTO-seed: ', @@ROWCOUNT);
END TRY BEGIN CATCH PRINT CONCAT(N'  Fact_Incident WARN: ', ERROR_MESSAGE()); END CATCH
GO

IF OBJECT_ID(N'dbo.Fact_Problem', N'U') IS NOT NULL
BEGIN TRY
  DELETE FROM dbo.Fact_Problem WHERE Title LIKE N'%[AMS seed]%';
  PRINT CONCAT(N'  Fact_Problem AMS seed: ', @@ROWCOUNT);
END TRY BEGIN CATCH PRINT CONCAT(N'  Fact_Problem WARN: ', ERROR_MESSAGE()); END CATCH
GO

IF OBJECT_ID(N'dbo.Fact_Risk', N'U') IS NOT NULL
BEGIN TRY
  DELETE FROM dbo.Fact_Risk WHERE Title LIKE N'%[AMS seed]%';
  PRINT CONCAT(N'  Fact_Risk AMS seed: ', @@ROWCOUNT);
END TRY BEGIN CATCH PRINT CONCAT(N'  Fact_Risk WARN: ', ERROR_MESSAGE()); END CATCH
GO

IF OBJECT_ID(N'dbo.Fact_Issue', N'U') IS NOT NULL
BEGIN TRY
  DELETE FROM dbo.Fact_Issue WHERE Title LIKE N'%[AMS seed]%';
  PRINT CONCAT(N'  Fact_Issue AMS seed: ', @@ROWCOUNT);
END TRY BEGIN CATCH PRINT CONCAT(N'  Fact_Issue WARN: ', ERROR_MESSAGE()); END CATCH
GO

IF OBJECT_ID(N'dbo.Fact_Priority', N'U') IS NOT NULL
BEGIN TRY
  IF COL_LENGTH(N'dbo.Fact_Priority', N'Detail') IS NOT NULL
    EXEC(N'DELETE FROM dbo.Fact_Priority WHERE Detail LIKE N''%[AMS seed]%'' OR Title LIKE N''%[AMS seed]%''');
  ELSE
    EXEC(N'DELETE FROM dbo.Fact_Priority WHERE Title LIKE N''%[AMS seed]%''');
  PRINT CONCAT(N'  Fact_Priority AMS seed: ', @@ROWCOUNT);
END TRY BEGIN CATCH PRINT CONCAT(N'  Fact_Priority WARN: ', ERROR_MESSAGE()); END CATCH
GO

IF OBJECT_ID(N'dbo.Fact_Change', N'U') IS NOT NULL
BEGIN TRY
  DELETE FROM dbo.Fact_Change WHERE Title LIKE N'%[AMS seed]%';
  PRINT CONCAT(N'  Fact_Change AMS seed: ', @@ROWCOUNT);
END TRY BEGIN CATCH PRINT CONCAT(N'  Fact_Change WARN: ', ERROR_MESSAGE()); END CATCH
GO

IF OBJECT_ID(N'dbo.Fact_Csat', N'U') IS NOT NULL
BEGIN TRY
  IF COL_LENGTH(N'dbo.Fact_Csat', N'Source') IS NOT NULL
    EXEC(N'DELETE FROM dbo.Fact_Csat WHERE Source = N''AMS seed'' OR Source LIKE N''%seed%''');
  PRINT CONCAT(N'  Fact_Csat seed: ', @@ROWCOUNT);
END TRY BEGIN CATCH PRINT CONCAT(N'  Fact_Csat WARN: ', ERROR_MESSAGE()); END CATCH
GO

IF OBJECT_ID(N'dbo.Fact_ExecSummary', N'U') IS NOT NULL
BEGIN TRY
  IF COL_LENGTH(N'dbo.Fact_ExecSummary', N'PeriodLabel') IS NOT NULL
    EXEC(N'DELETE FROM dbo.Fact_ExecSummary WHERE PeriodLabel = N''AMS seed'' OR PeriodLabel LIKE N''%seed%''');
  PRINT CONCAT(N'  Fact_ExecSummary seed: ', @@ROWCOUNT);
END TRY BEGIN CATCH PRINT CONCAT(N'  Fact_ExecSummary WARN: ', ERROR_MESSAGE()); END CATCH
GO

IF OBJECT_ID(N'dbo.Fact_ExecNarrative', N'U') IS NOT NULL
BEGIN TRY
  IF COL_LENGTH(N'dbo.Fact_ExecNarrative', N'Body') IS NOT NULL
    EXEC(N'DELETE FROM dbo.Fact_ExecNarrative WHERE Body LIKE N''%[AMS seed]%'' OR Body LIKE N''%AMS seed%''');
  PRINT CONCAT(N'  Fact_ExecNarrative seed: ', @@ROWCOUNT);
END TRY BEGIN CATCH PRINT CONCAT(N'  Fact_ExecNarrative WARN: ', ERROR_MESSAGE()); END CATCH
GO

/* No static reference to Source - only dynamic */
IF OBJECT_ID(N'dbo.Fact_DashboardSnapshot', N'U') IS NOT NULL
BEGIN TRY
  IF COL_LENGTH(N'dbo.Fact_DashboardSnapshot', N'Source') IS NOT NULL
  BEGIN
    EXEC(N'DELETE FROM dbo.Fact_DashboardSnapshot WHERE Source = N''AMS seed'' OR Source LIKE N''%seed%'' OR Source LIKE N''%demo%''');
    PRINT CONCAT(N'  Fact_DashboardSnapshot seed: ', @@ROWCOUNT);
  END
  ELSE
    PRINT N'  Fact_DashboardSnapshot: no Source column - skip';
END TRY BEGIN CATCH PRINT CONCAT(N'  Fact_DashboardSnapshot WARN: ', ERROR_MESSAGE()); END CATCH
GO

IF OBJECT_ID(N'dbo.Fact_ExecDecision', N'U') IS NOT NULL
BEGIN TRY
  IF COL_LENGTH(N'dbo.Fact_ExecDecision', N'Title') IS NOT NULL
    EXEC(N'DELETE FROM dbo.Fact_ExecDecision WHERE Title LIKE N''%[AMS seed]%''');
  PRINT CONCAT(N'  Fact_ExecDecision seed: ', @@ROWCOUNT);
END TRY BEGIN CATCH PRINT CONCAT(N'  Fact_ExecDecision WARN: ', ERROR_MESSAGE()); END CATCH
GO

IF OBJECT_ID(N'dbo.Fact_ExecIncidentHighlight', N'U') IS NOT NULL
BEGIN TRY
  IF COL_LENGTH(N'dbo.Fact_ExecIncidentHighlight', N'Title') IS NOT NULL
    EXEC(N'DELETE FROM dbo.Fact_ExecIncidentHighlight WHERE Title LIKE N''%[AMS seed]%''');
  PRINT CONCAT(N'  Fact_ExecIncidentHighlight seed: ', @@ROWCOUNT);
END TRY BEGIN CATCH PRINT CONCAT(N'  Fact_ExecIncidentHighlight WARN: ', ERROR_MESSAGE()); END CATCH
GO

IF OBJECT_ID(N'dbo.Fact_VendorCase', N'U') IS NOT NULL
BEGIN TRY
  IF COL_LENGTH(N'dbo.Fact_VendorCase', N'Title') IS NOT NULL
    EXEC(N'DELETE FROM dbo.Fact_VendorCase WHERE Title LIKE N''%[AMS seed]%''');
  IF COL_LENGTH(N'dbo.Fact_VendorCase', N'ExternalRef') IS NOT NULL
    EXEC(N'DELETE FROM dbo.Fact_VendorCase WHERE ExternalRef LIKE N''AUTO-%''');
  PRINT N'  Fact_VendorCase seed purged (if columns present)';
END TRY BEGIN CATCH PRINT CONCAT(N'  Fact_VendorCase WARN: ', ERROR_MESSAGE()); END CATCH
GO

IF OBJECT_ID(N'dbo.Dim_Syspro_HotfixBaseline', N'U') IS NOT NULL
BEGIN TRY
  UPDATE dbo.Dim_Syspro_HotfixBaseline
  SET Active = 0
  WHERE Active = 1
    AND (
      HotfixCode NOT LIKE N'KB%'
      OR HotfixCode LIKE N'SAMPLE%'
      OR HotfixCode LIKE N'DEMO%'
    );
  PRINT CONCAT(N'  Baseline sample/non-KB deactivated: ', @@ROWCOUNT);
END TRY BEGIN CATCH PRINT CONCAT(N'  Baseline WARN: ', ERROR_MESSAGE()); END CATCH
GO

IF OBJECT_ID(N'dbo.Dim_Customer', N'U') IS NOT NULL
BEGIN TRY
  IF OBJECT_ID(N'tempdb..#drop_cus') IS NOT NULL DROP TABLE #drop_cus;
  SELECT c.CustomerCode
  INTO #drop_cus
  FROM dbo.Dim_Customer c
  WHERE c.CustomerCode IN (N'NEWCODE', N'INTERBRAND', N'DEMO', N'SAMPLE', N'TEST')
     OR c.DisplayName IN (N'Display Name', N'NEWCODE', N'Sample Customer')
     OR c.DisplayName LIKE N'%placeholder%';

  IF OBJECT_ID(N'dbo.Syspro_Operators', N'U') IS NOT NULL
  BEGIN
    DELETE d
    FROM #drop_cus d
    WHERE EXISTS (
      SELECT 1
      FROM dbo.Dim_Customer c
      INNER JOIN dbo.Syspro_Operators o WITH (NOLOCK)
        ON o.InstanceName = c.SqlInstanceName
      WHERE c.CustomerCode = d.CustomerCode
    );
  END

  DECLARE @cc nvarchar(50);
  DECLARE @q nvarchar(400);
  DECLARE cur CURSOR LOCAL FAST_FORWARD FOR SELECT CustomerCode FROM #drop_cus;
  OPEN cur;
  FETCH NEXT FROM cur INTO @cc;
  WHILE @@FETCH_STATUS = 0
  BEGIN
    BEGIN TRY
      SET @q = N'DELETE FROM dbo.Fact_Incident WHERE CustomerCode = N''' + REPLACE(@cc, '''', '''''') + N'''';
      IF OBJECT_ID(N'dbo.Fact_Incident', N'U') IS NOT NULL EXEC(@q);
      SET @q = N'DELETE FROM dbo.Fact_Problem WHERE CustomerCode = N''' + REPLACE(@cc, '''', '''''') + N'''';
      IF OBJECT_ID(N'dbo.Fact_Problem', N'U') IS NOT NULL EXEC(@q);
      SET @q = N'DELETE FROM dbo.Fact_Risk WHERE CustomerCode = N''' + REPLACE(@cc, '''', '''''') + N'''';
      IF OBJECT_ID(N'dbo.Fact_Risk', N'U') IS NOT NULL EXEC(@q);
      SET @q = N'DELETE FROM dbo.Fact_Issue WHERE CustomerCode = N''' + REPLACE(@cc, '''', '''''') + N'''';
      IF OBJECT_ID(N'dbo.Fact_Issue', N'U') IS NOT NULL EXEC(@q);
      SET @q = N'DELETE FROM dbo.Fact_Priority WHERE CustomerCode = N''' + REPLACE(@cc, '''', '''''') + N'''';
      IF OBJECT_ID(N'dbo.Fact_Priority', N'U') IS NOT NULL EXEC(@q);
      SET @q = N'DELETE FROM dbo.Fact_Change WHERE CustomerCode = N''' + REPLACE(@cc, '''', '''''') + N'''';
      IF OBJECT_ID(N'dbo.Fact_Change', N'U') IS NOT NULL EXEC(@q);
      SET @q = N'DELETE FROM dbo.Fact_Csat WHERE CustomerCode = N''' + REPLACE(@cc, '''', '''''') + N'''';
      IF OBJECT_ID(N'dbo.Fact_Csat', N'U') IS NOT NULL EXEC(@q);
      SET @q = N'DELETE FROM dbo.Fact_DashboardSnapshot WHERE CustomerCode = N''' + REPLACE(@cc, '''', '''''') + N'''';
      IF OBJECT_ID(N'dbo.Fact_DashboardSnapshot', N'U') IS NOT NULL EXEC(@q);
      SET @q = N'DELETE FROM dbo.Dim_Syspro_HotfixWaiver WHERE CustomerCode = N''' + REPLACE(@cc, '''', '''''') + N'''';
      IF OBJECT_ID(N'dbo.Dim_Syspro_HotfixWaiver', N'U') IS NOT NULL EXEC(@q);
      DELETE FROM dbo.Dim_Customer WHERE CustomerCode = @cc;
      PRINT CONCAT(N'  Removed placeholder customer: ', @cc);
    END TRY
    BEGIN CATCH
      PRINT CONCAT(N'  Customer ', @cc, N' WARN: ', ERROR_MESSAGE());
    END CATCH
    FETCH NEXT FROM cur INTO @cc;
  END
  CLOSE cur; DEALLOCATE cur;
  DROP TABLE #drop_cus;
END TRY BEGIN CATCH PRINT CONCAT(N'  Placeholder customers WARN: ', ERROR_MESSAGE()); END CATCH
GO

IF OBJECT_ID(N'dbo.Exception', N'U') IS NOT NULL
BEGIN TRY
  DELETE FROM dbo.Exception WHERE Fingerprint LIKE N'demo-%' OR Fingerprint LIKE N'sample-%';
  PRINT CONCAT(N'  Exception demo fingerprints: ', @@ROWCOUNT);
END TRY BEGIN CATCH PRINT CONCAT(N'  Exception WARN: ', ERROR_MESSAGE()); END CATCH
GO

PRINT N'=== Waivers remaining ===';
IF OBJECT_ID(N'dbo.Dim_Syspro_HotfixWaiver', N'U') IS NOT NULL
  SELECT CustomerCode, HotfixCode, Active, LEFT(Reason, 80) AS Reason
  FROM dbo.Dim_Syspro_HotfixWaiver WITH (NOLOCK)
  ORDER BY 1, 2;
ELSE
  PRINT N'(no waiver table)';
GO

PRINT N'=== Customers remaining ===';
SELECT CustomerCode, DisplayName, Active
FROM dbo.Dim_Customer WITH (NOLOCK)
ORDER BY 1;
GO

PRINT N'=== 380 done. Live collect kept. ===';
GO
