SET NOCOUNT ON;
PRINT '214 SystemLicense start';
DECLARE @CustomerCode nvarchar(50) = N'RSR';
DECLARE @InstanceName nvarchar(100) = N'RSR-SQLSRV-DB';
DECLARE @SnapshotDate date = CAST(GETDATE() AS date);
DECLARE @n int = 0;
DECLARE @sql nvarchar(max) = N'SELECT @n = COUNT(*) FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Dim_Customer WHERE CustomerCode=@c AND Active=1';
BEGIN TRY
  EXEC sp_executesql @sql, N'@c nvarchar(50), @n int OUTPUT', @c=@CustomerCode, @n=@n OUTPUT;
END TRY BEGIN CATCH
  PRINT CONCAT('Dim FAIL ', ERROR_NUMBER(), ': ', ERROR_MESSAGE());
  RAISERROR('dim fail',16,1); RETURN;
END CATCH
IF @n=0 BEGIN PRINT 'RSR not active'; RAISERROR('inactive',16,1); RETURN; END

IF OBJECT_ID(N'SysproDB.dbo.AdmSystemLicense', N'U') IS NULL AND OBJECT_ID(N'Sysprodb.dbo.AdmSystemLicense', N'U') IS NULL
BEGIN PRINT 'No AdmSystemLicense - skip'; END
ELSE
BEGIN
  SET @sql = N'DELETE FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_SystemLicense WHERE SnapshotDate=@sd AND InstanceName=@inst';
  EXEC sp_executesql @sql, N'@sd date,@inst nvarchar(100)', @sd=@SnapshotDate, @inst=@InstanceName;

  DECLARE @src nvarchar(200) = CASE WHEN OBJECT_ID(N'SysproDB.dbo.AdmSystemLicense',N'U') IS NOT NULL THEN N'SysproDB.dbo.AdmSystemLicense' ELSE N'Sysprodb.dbo.AdmSystemLicense' END;
  /* stage local then insert */
  IF OBJECT_ID('tempdb..#lic') IS NOT NULL DROP TABLE #lic;
  CREATE TABLE #lic (ImportDate datetime NULL, LicenseType nvarchar(10) NULL, Users int NULL, CustomerName nvarchar(200) NULL, LicenseXml nvarchar(max) NULL);
  SET @sql = N'INSERT INTO #lic SELECT TOP 1
    ' + CASE WHEN COL_LENGTH(CASE WHEN OBJECT_ID(N'SysproDB.dbo.AdmSystemLicense') IS NOT NULL THEN N'SysproDB.dbo.AdmSystemLicense' ELSE N'Sysprodb.dbo.AdmSystemLicense' END, N'ImportDate') IS NOT NULL THEN N'ImportDate' ELSE N'NULL' END + N',
    ' + CASE WHEN COL_LENGTH(CASE WHEN OBJECT_ID(N'SysproDB.dbo.AdmSystemLicense') IS NOT NULL THEN N'SysproDB.dbo.AdmSystemLicense' ELSE N'Sysprodb.dbo.AdmSystemLicense' END, N'LicenseType') IS NOT NULL THEN N'LTRIM(RTRIM(CONVERT(nvarchar(10),LicenseType)))' ELSE N'NULL' END + N',
    ' + CASE WHEN COL_LENGTH(CASE WHEN OBJECT_ID(N'SysproDB.dbo.AdmSystemLicense') IS NOT NULL THEN N'SysproDB.dbo.AdmSystemLicense' ELSE N'Sysprodb.dbo.AdmSystemLicense' END, N'Users') IS NOT NULL THEN N'TRY_CONVERT(int,Users)' ELSE N'NULL' END + N',
    ' + CASE WHEN COL_LENGTH(CASE WHEN OBJECT_ID(N'SysproDB.dbo.AdmSystemLicense') IS NOT NULL THEN N'SysproDB.dbo.AdmSystemLicense' ELSE N'Sysprodb.dbo.AdmSystemLicense' END, N'CustomerName') IS NOT NULL THEN N'LTRIM(RTRIM(CONVERT(nvarchar(200),CustomerName)))' ELSE N'NULL' END + N',
    ' + CASE WHEN COL_LENGTH(CASE WHEN OBJECT_ID(N'SysproDB.dbo.AdmSystemLicense') IS NOT NULL THEN N'SysproDB.dbo.AdmSystemLicense' ELSE N'Sysprodb.dbo.AdmSystemLicense' END, N'LicenseXml') IS NOT NULL THEN N'CONVERT(nvarchar(max),LicenseXml)' ELSE N'NULL' END + N'
    FROM ' + @src;
  EXEC sp_executesql @sql;
  PRINT CONCAT('Staged license rows: ', @@ROWCOUNT);

  DECLARE @id datetime, @lt nvarchar(10), @us int, @cn nvarchar(200), @xml nvarchar(max);
  SELECT TOP 1 @id=ImportDate, @lt=LicenseType, @us=Users, @cn=CustomerName, @xml=LicenseXml FROM #lic;
  SET @sql = N'INSERT INTO [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_SystemLicense
    (SnapshotDate, InstanceName, ImportDate, LicenseType, Users, CustomerCode, CustomerName, RawXml, ImportedAt)
    VALUES (@sd,@inst,@id,@lt,@us,@code,@cn,@xml,SYSUTCDATETIME())';
  BEGIN TRY
    EXEC sp_executesql @sql, N'@sd date,@inst nvarchar(100),@id datetime,@lt nvarchar(10),@us int,@code nvarchar(50),@cn nvarchar(200),@xml nvarchar(max)',
      @sd=@SnapshotDate,@inst=@InstanceName,@id=@id,@lt=@lt,@us=@us,@code=@CustomerCode,@cn=@cn,@xml=@xml;
    PRINT 'License row written';
  END TRY BEGIN CATCH
    PRINT CONCAT('License insert FAIL ', ERROR_NUMBER(), ': ', ERROR_MESSAGE());
  END CATCH
END

PRINT '=== Done 214 SystemLicense ===';
