/*
  UVSS — probe ReleaseHotfixes / ReleaseProducts / ReleaseMaster for column names
  Run ON UVSS-SYSPRO (sa or SYSPROAdmin):

  sqlcmd -S "." -U "SYSPROAdmin" -P "..." -C -i 402_Probe_ReleaseHotfixes.sql
*/
SET NOCOUNT ON;

PRINT N'=== ReleaseHotfixes columns ===';
SELECT c.column_id, c.name AS ColName, ty.name AS Typ, c.max_length
FROM SYSPRODeployment.sys.columns c
JOIN SYSPRODeployment.sys.types ty ON ty.user_type_id = c.user_type_id
WHERE c.object_id = OBJECT_ID(N'SYSPRODeployment.dbo.ReleaseHotfixes')
ORDER BY c.column_id;

PRINT N'=== ReleaseProducts columns ===';
SELECT c.column_id, c.name AS ColName, ty.name AS Typ
FROM SYSPRODeployment.sys.columns c
JOIN SYSPRODeployment.sys.types ty ON ty.user_type_id = c.user_type_id
WHERE c.object_id = OBJECT_ID(N'SYSPRODeployment.dbo.ReleaseProducts')
ORDER BY c.column_id;

PRINT N'=== ReleaseMaster columns ===';
SELECT c.column_id, c.name AS ColName, ty.name AS Typ
FROM SYSPRODeployment.sys.columns c
JOIN SYSPRODeployment.sys.types ty ON ty.user_type_id = c.user_type_id
WHERE c.object_id = OBJECT_ID(N'SYSPRODeployment.dbo.ReleaseMaster')
ORDER BY c.column_id;

PRINT N'=== Sample joined installed HF (TOP 8) ===';
DECLARE @sql nvarchar(max) = N'
SELECT TOP 8
  ch.CustomerCode,
  ch.InstalledDate,
  ch.Status,
  rh.*
FROM SYSPRODeployment.dbo.CustomerHotfixes ch WITH (NOLOCK)
LEFT JOIN SYSPRODeployment.dbo.ReleaseHotfixes rh WITH (NOLOCK)
  ON rh.HotfixID = ch.HotfixID
ORDER BY ch.InstalledDate DESC;';
BEGIN TRY
  EXEC sp_executesql @sql;
END TRY
BEGIN CATCH
  PRINT CONCAT(N'Join FAIL: ', ERROR_MESSAGE());
  PRINT N'Trying alternate HotfixId casing...';
  SET @sql = N'
  SELECT TOP 8 ch.*, rh.*
  FROM SYSPRODeployment.dbo.CustomerHotfixes ch WITH (NOLOCK)
  LEFT JOIN SYSPRODeployment.dbo.ReleaseHotfixes rh WITH (NOLOCK)
    ON rh.HotfixId = ch.HotfixID
  ORDER BY ch.InstalledDate DESC;';
  BEGIN TRY EXEC sp_executesql @sql; END TRY
  BEGIN CATCH PRINT ERROR_MESSAGE(); END CATCH
END CATCH

PRINT N'=== Counts ===';
SELECT
  (SELECT COUNT(*) FROM SYSPRODeployment.dbo.CustomerHotfixes) AS InstalledHf,
  (SELECT COUNT(*) FROM SYSPRODeployment.dbo.ReleaseHotfixes) AS CatalogHf,
  (SELECT COUNT(*) FROM SYSPRODeployment.dbo.CustomerInstalls) AS Installs;

PRINT N'=== Done probe ===';
GO
