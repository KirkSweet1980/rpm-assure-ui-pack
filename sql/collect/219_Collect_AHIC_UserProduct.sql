/*
  AHIC — AdmUserProduct → Syspro_UserProduct (license seat footprint)
*/
SET NOCOUNT ON;
SET XACT_ABORT OFF;

DECLARE @CustomerCode nvarchar(50)  = N'AHIC';
DECLARE @InstanceName nvarchar(100) = N'AHIC-SSQL-SRV';
DECLARE @SnapshotDate date = CAST(
    CAST(SYSUTCDATETIME() AT TIME ZONE N'UTC' AT TIME ZONE N'South Africa Standard Time' AS date) AS date);

PRINT CONCAT(N'=== AHIC UserProduct ', CONVERT(char(10), @SnapshotDate, 23), N' ===');

IF NOT EXISTS (
    SELECT 1 FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Dim_Customer
    WHERE CustomerCode = @CustomerCode AND Active = 1)
BEGIN
    RAISERROR(N'AHIC not active.', 16, 1);
    RETURN;
END;

DELETE FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_UserProduct
WHERE SnapshotDate = @SnapshotDate AND InstanceName = @InstanceName;

IF OBJECT_ID(N'Sysprodb.dbo.AdmUserProduct', N'U') IS NULL
BEGIN
  PRINT N'No AdmUserProduct';
  RETURN;
END;

/* Discover column names */
DECLARE @cols TABLE (name sysname);
INSERT @cols SELECT name FROM Sysprodb.sys.columns WHERE object_id = OBJECT_ID(N'Sysprodb.dbo.AdmUserProduct');

PRINT N'AdmUserProduct columns:';
SELECT name FROM @cols ORDER BY name;

DECLARE @pc sysname = (SELECT TOP 1 name FROM @cols WHERE name IN (N'Product',N'ProductCode',N'ProductId',N'Module') ORDER BY 1);
DECLARE @pn sysname = (SELECT TOP 1 name FROM @cols WHERE name IN (N'ProductName',N'Description',N'ProductDesc') ORDER BY 1);
DECLARE @lu sysname = (SELECT TOP 1 name FROM @cols WHERE name IN (N'Users',N'LicensedUsers',N'UserCount',N'NoOfUsers') ORDER BY 1);

IF @pc IS NULL
BEGIN
  /* insert all as JSON-ish dump of first 200 rows via dynamic SELECT * into Raw - skip, list cols only */
  PRINT N'Could not map product code column — paste column list and we fix.';
  RETURN;
END;

DECLARE @sql nvarchar(max) = N'
INSERT INTO [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_UserProduct
  (SnapshotDate, InstanceName, ProductCode, ProductName, LicensedUsers, ExtraJson, ImportedAt)
SELECT
  @snap, @inst,
  LTRIM(RTRIM(CONVERT(nvarchar(50), p.' + QUOTENAME(@pc) + N'))),
  ' + CASE WHEN @pn IS NULL THEN N'NULL' ELSE N'LTRIM(RTRIM(CONVERT(nvarchar(200), p.' + QUOTENAME(@pn) + N')))' END + N',
  ' + CASE WHEN @lu IS NULL THEN N'NULL' ELSE N'TRY_CONVERT(int, p.' + QUOTENAME(@lu) + N')' END + N',
  NULL,
  SYSUTCDATETIME()
FROM Sysprodb.dbo.AdmUserProduct AS p;';

EXEC sys.sp_executesql @sql, N'@snap date, @inst nvarchar(100)', @snap=@SnapshotDate, @inst=@InstanceName;
PRINT CONCAT(N'UserProduct rows: ', @@ROWCOUNT);
PRINT N'=== Done AHIC UserProduct ===';
GO
