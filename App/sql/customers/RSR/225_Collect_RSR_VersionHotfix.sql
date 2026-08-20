/*
  RSR ? SYSPRO version + modules/hotfixes
  Dynamic columns only (AdmSystemLicense varies by release).
  Run ON customer SQL as rpmassure (linked server RPM_CENTRAL).
*/
SET NOCOUNT ON;
SET XACT_ABORT OFF;
SET ANSI_NULLS ON;
SET ANSI_WARNINGS ON;

DECLARE @CustomerCode nvarchar(50)  = N'RSR';
DECLARE @InstanceName nvarchar(100) = N'RSR-SQLSRV-DB';
DECLARE @SnapshotDate date = CAST(
    CAST(SYSUTCDATETIME() AT TIME ZONE N'UTC' AT TIME ZONE N'South Africa Standard Time' AS date) AS date);

PRINT CONCAT(N'=== RSR Version/Hotfix ', CONVERT(char(10), @SnapshotDate, 23), N' ===');

IF NOT EXISTS (
  SELECT 1 FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Dim_Customer
  WHERE CustomerCode = @CustomerCode AND Active = 1)
BEGIN
  PRINT N'Customer not active on central'; RETURN;
END

BEGIN TRY
  DELETE FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_VersionInfo
  WHERE SnapshotDate = @SnapshotDate AND InstanceName = @InstanceName;
  DELETE FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_Hotfix
  WHERE SnapshotDate = @SnapshotDate AND InstanceName = @InstanceName;
END TRY BEGIN CATCH
  PRINT CONCAT(N'DELETE FAIL: ', ERROR_MESSAGE());
  PRINT N'Run central 310_Ensure_Backups_Version_Tables.sql first.';
  RETURN;
END CATCH

IF OBJECT_ID(N'SysproDB.dbo.AdmSystemLicense') IS NOT NULL
BEGIN
  PRINT N'AdmSystemLicense columns:';
  SELECT c.name
  FROM Sysprodb.sys.columns c
  WHERE c.object_id = OBJECT_ID(N'SysproDB.dbo.AdmSystemLicense')
  ORDER BY c.column_id;

  DECLARE @oid int = OBJECT_ID(N'SysproDB.dbo.AdmSystemLicense');
  DECLARE @col_pn sysname = (
    SELECT TOP 1 name FROM Sysprodb.sys.columns WHERE object_id=@oid
      AND name IN (N'ProductName', N'Product', N'SystemName', N'ProductDescription', N'CompanyName')
    ORDER BY CASE name WHEN N'ProductName' THEN 1 WHEN N'Product' THEN 2 WHEN N'SystemName' THEN 3 ELSE 9 END);
  DECLARE @col_pv sysname = (
    SELECT TOP 1 name FROM Sysprodb.sys.columns WHERE object_id=@oid
      AND name IN (N'ProductVersion', N'Version', N'SystemVersion', N'Build', N'BuildNumber', N'Release')
    ORDER BY CASE name WHEN N'ProductVersion' THEN 1 WHEN N'Version' THEN 2 WHEN N'Build' THEN 3 ELSE 9 END);
  DECLARE @col_bd sysname = (
    SELECT TOP 1 name FROM Sysprodb.sys.columns WHERE object_id=@oid
      AND name IN (N'BuildNumber', N'Build', N'ProductVersion', N'Version')
    ORDER BY CASE name WHEN N'BuildNumber' THEN 1 WHEN N'Build' THEN 2 ELSE 9 END);
  DECLARE @col_lt sysname = (
    SELECT TOP 1 name FROM Sysprodb.sys.columns WHERE object_id=@oid
      AND name IN (N'LicenseType', N'UserType', N'Type')
    ORDER BY CASE name WHEN N'LicenseType' THEN 1 ELSE 9 END);
  DECLARE @col_us sysname = (
    SELECT TOP 1 name FROM Sysprodb.sys.columns WHERE object_id=@oid AND name IN (N'Users', N'UserCount', N'LicensedUsers'));
  DECLARE @col_cc sysname = (
    SELECT TOP 1 name FROM Sysprodb.sys.columns WHERE object_id=@oid AND name IN (N'CompanyCount', N'Companies', N'CompanyNo'));
  DECLARE @col_ex sysname = (
    SELECT TOP 1 name FROM Sysprodb.sys.columns WHERE object_id=@oid AND name IN (N'LicenseExpiry', N'ExpiryDate', N'Expiry'));
  DECLARE @col_cn sysname = (
    SELECT TOP 1 name FROM Sysprodb.sys.columns WHERE object_id=@oid AND name IN (N'CustomerName', N'CompanyName', N'Name'));
  DECLARE @col_im sysname = (
    SELECT TOP 1 name FROM Sysprodb.sys.columns WHERE object_id=@oid AND name IN (N'ImportDate', N'LicenseStart', N'LastUpdate'));

  PRINT CONCAT(N'map pn=', ISNULL(@col_pn,N'-'), N' pv=', ISNULL(@col_pv,N'-'),
    N' bd=', ISNULL(@col_bd,N'-'), N' lt=', ISNULL(@col_lt,N'-'),
    N' us=', ISNULL(@col_us,N'-'), N' cc=', ISNULL(@col_cc,N'-'),
    N' ex=', ISNULL(@col_ex,N'-'), N' cn=', ISNULL(@col_cn,N'-'), N' im=', ISNULL(@col_im,N'-'));

  DECLARE @ord nvarchar(200) = CASE
    WHEN @col_im IS NOT NULL THEN QUOTENAME(@col_im) + N' DESC'
    ELSE N'(SELECT NULL)'
  END;

  DECLARE @sql nvarchar(max) = N'
  INSERT INTO [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_VersionInfo
  (
    SnapshotDate, InstanceName, ProductName, ProductVersion, BuildNumber,
    LicenseType, Users, CompanyCount, LicenseExpiry, CustomerName, ImportDate,
    ServerName, ImportedAt
  )
  SELECT TOP (1)
    @Snap, @Inst,
    ' + CASE WHEN @col_pn IS NULL THEN N'NULL' ELSE N'LTRIM(RTRIM(CONVERT(nvarchar(100), l.' + QUOTENAME(@col_pn) + N')))' END + N',
    ' + CASE WHEN @col_pv IS NULL THEN N'NULL' ELSE N'LTRIM(RTRIM(CONVERT(nvarchar(50), l.' + QUOTENAME(@col_pv) + N')))' END + N',
    ' + CASE WHEN @col_bd IS NULL THEN N'NULL' ELSE N'LTRIM(RTRIM(CONVERT(nvarchar(50), l.' + QUOTENAME(@col_bd) + N')))' END + N',
    ' + CASE WHEN @col_lt IS NULL THEN N'NULL' ELSE N'LTRIM(RTRIM(CONVERT(nvarchar(20), l.' + QUOTENAME(@col_lt) + N')))' END + N',
    ' + CASE WHEN @col_us IS NULL THEN N'NULL' ELSE N'TRY_CONVERT(int, l.' + QUOTENAME(@col_us) + N')' END + N',
    ' + CASE WHEN @col_cc IS NULL THEN N'NULL' ELSE N'TRY_CONVERT(int, l.' + QUOTENAME(@col_cc) + N')' END + N',
    ' + CASE WHEN @col_ex IS NULL THEN N'NULL' ELSE N'TRY_CONVERT(datetime2(3), l.' + QUOTENAME(@col_ex) + N')' END + N',
    ' + CASE WHEN @col_cn IS NULL THEN N'NULL' ELSE N'LTRIM(RTRIM(CONVERT(nvarchar(200), l.' + QUOTENAME(@col_cn) + N')))' END + N',
    ' + CASE WHEN @col_im IS NULL THEN N'NULL' ELSE N'TRY_CONVERT(datetime2(3), l.' + QUOTENAME(@col_im) + N')' END + N',
    @@SERVERNAME,
    SYSUTCDATETIME()
  FROM SysproDB.dbo.AdmSystemLicense AS l WITH (NOLOCK)
  ORDER BY ' + @ord + N';';

  BEGIN TRY
    EXEC sp_executesql @sql,
      N'@Snap date, @Inst nvarchar(100)',
      @SnapshotDate, @InstanceName;
    PRINT CONCAT(N'Version rows: ', @@ROWCOUNT);
  END TRY BEGIN CATCH
    PRINT CONCAT(N'Version FAIL: ', ERROR_MESSAGE());
  END CATCH
END
ELSE
  PRINT N'No SysproDB.dbo.AdmSystemLicense';

IF OBJECT_ID(N'tempdb..#Hf') IS NOT NULL DROP TABLE #Hf;
CREATE TABLE #Hf (
  HotfixCode nvarchar(50) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
  HotfixName nvarchar(200) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
  Description nvarchar(500) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
  SourceTable nvarchar(100) COLLATE SQL_Latin1_General_CP1_CI_AS NULL
);

DECLARE @tbl sysname, @hsql nvarchar(max), @codeCol sysname, @nameCol sysname;

DECLARE c CURSOR LOCAL FAST_FORWARD FOR
  SELECT t.name
  FROM Sysprodb.sys.tables t
  WHERE t.name IN (
    N'AdmLicenseDetail', N'AdmLicenseMaster', N'AdmUserProduct',
    N'AdmRtpProduct', N'AdmLicenseImport'
  )
  ORDER BY CASE t.name
    WHEN N'AdmUserProduct' THEN 1
    WHEN N'AdmLicenseDetail' THEN 2
    WHEN N'AdmLicenseMaster' THEN 3
    WHEN N'AdmRtpProduct' THEN 4
    ELSE 9 END;

OPEN c;
FETCH NEXT FROM c INTO @tbl;
WHILE @@FETCH_STATUS = 0
BEGIN
  SET @codeCol = (
    SELECT TOP 1 c2.name
    FROM Sysprodb.sys.columns c2
    WHERE c2.object_id = OBJECT_ID(N'SysproDB.dbo.' + @tbl)
      AND c2.name IN (
        N'ProductId', N'ProductCode', N'ModuleCode', N'LicenseCode',
        N'ProgramName', N'Program', N'FunctionalArea', N'Code', N'Product'
      )
    ORDER BY CASE c2.name
      WHEN N'ProductId' THEN 1 WHEN N'ProductCode' THEN 2 WHEN N'ProgramName' THEN 3
      WHEN N'LicenseCode' THEN 4 WHEN N'Product' THEN 5 ELSE 9 END
  );

  SET @nameCol = (
    SELECT TOP 1 c2.name
    FROM Sysprodb.sys.columns c2
    WHERE c2.object_id = OBJECT_ID(N'SysproDB.dbo.' + @tbl)
      AND c2.name IN (
        N'ProductDescription', N'Description', N'ProductName', N'ModuleName',
        N'Name', N'ProductMessage', N'ProgramName', N'FunctionalArea'
      )
    ORDER BY CASE c2.name
      WHEN N'ProductDescription' THEN 1 WHEN N'Description' THEN 2
      WHEN N'ProductName' THEN 3 ELSE 9 END
  );

  IF @codeCol IS NULL AND @nameCol IS NULL
  BEGIN
    PRINT CONCAT(N'  skip ', @tbl, N' (no map)');
    FETCH NEXT FROM c INTO @tbl;
    CONTINUE;
  END
  IF @codeCol IS NULL SET @codeCol = @nameCol;
  IF @nameCol IS NULL SET @nameCol = @codeCol;

  PRINT CONCAT(N'  ', @tbl, N' map code=', @codeCol, N' name=', @nameCol);

  SET @hsql = N'
  INSERT INTO #Hf (HotfixCode, HotfixName, Description, SourceTable)
  SELECT DISTINCT TOP (200)
    LEFT(LTRIM(RTRIM(CONVERT(nvarchar(50), x.' + QUOTENAME(@codeCol) + N'))), 50)
      COLLATE SQL_Latin1_General_CP1_CI_AS,
    LEFT(LTRIM(RTRIM(CONVERT(nvarchar(200), x.' + QUOTENAME(@nameCol) + N'))), 200)
      COLLATE SQL_Latin1_General_CP1_CI_AS,
    LEFT(LTRIM(RTRIM(CONVERT(nvarchar(500), x.' + QUOTENAME(@nameCol) + N'))), 500)
      COLLATE SQL_Latin1_General_CP1_CI_AS,
    @Src COLLATE SQL_Latin1_General_CP1_CI_AS
  FROM SysproDB.dbo.' + QUOTENAME(@tbl) + N' AS x WITH (NOLOCK)
  WHERE NULLIF(LTRIM(RTRIM(CONVERT(nvarchar(50), x.' + QUOTENAME(@codeCol) + N'))), N'''') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM #Hf h
      WHERE h.HotfixCode = LEFT(LTRIM(RTRIM(CONVERT(nvarchar(50), x.' + QUOTENAME(@codeCol) + N'))), 50)
        COLLATE SQL_Latin1_General_CP1_CI_AS
    );';

  BEGIN TRY
    EXEC sp_executesql @hsql, N'@Src nvarchar(100)', @tbl;
    PRINT CONCAT(N'  staged: ', @@ROWCOUNT);
  END TRY BEGIN CATCH
    PRINT CONCAT(N'  FAIL ', @tbl, N': ', ERROR_MESSAGE());
  END CATCH

  FETCH NEXT FROM c INTO @tbl;
END
CLOSE c; DEALLOCATE c;

BEGIN TRY
  INSERT INTO [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_Hotfix
  (
    SnapshotDate, InstanceName, HotfixCode, HotfixName, Description,
    Installed, SourceTable, ImportedAt
  )
  SELECT
    @SnapshotDate, @InstanceName, HotfixCode, HotfixName, Description,
    1, SourceTable, SYSUTCDATETIME()
  FROM #Hf;

  PRINT CONCAT(N'Total hotfix/module rows: ', @@ROWCOUNT);
END TRY BEGIN CATCH
  PRINT CONCAT(N'Push hotfixes FAIL: ', ERROR_MESSAGE());
END CATCH

PRINT N'=== Done RSR Version/Hotfix ===';
GO
