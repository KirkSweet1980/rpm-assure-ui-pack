/*
  Run ON customer SYSPRO server (UVSS-SYSPRO or AHIC) as sa / SYSPROAdmin
  Discovers columns + exports available hotfix catalogue from SYSPRODeployment
*/
SET NOCOUNT ON;
SET XACT_ABORT OFF;

PRINT N'=== SYSPRODeployment hotfix catalogue scan ===';
PRINT CONCAT(N'Server=', @@SERVERNAME, N'  Utc=', CONVERT(varchar(30), SYSUTCDATETIME(), 126));

IF DB_ID(N'SYSPRODeployment') IS NULL
BEGIN
  RAISERROR(N'SYSPRODeployment database not found on this instance.', 16, 1);
  RETURN;
END

USE SYSPRODeployment;

PRINT N'';
PRINT N'--- 1) Tables present ---';
SELECT name AS TableName
FROM sys.tables
WHERE name IN (
  N'ReleaseHotfixes', N'ReleaseMaster', N'ReleaseHotfixLink',
  N'HotfixTarget', N'CustomerHotfixes', N'DeletedCustomerHotfixes',
  N'ReleaseProducts', N'ReleaseProductCodeXRef', N'ReleaseAdditionalPackages'
)
ORDER BY name;

PRINT N'';
PRINT N'--- 2) Columns: ReleaseHotfixes ---';
IF OBJECT_ID(N'dbo.ReleaseHotfixes', N'U') IS NOT NULL
  SELECT c.column_id, c.name AS ColName, ty.name AS DataType, c.max_length, c.is_nullable
  FROM sys.columns c
  JOIN sys.types ty ON ty.user_type_id = c.user_type_id
  WHERE c.object_id = OBJECT_ID(N'dbo.ReleaseHotfixes')
  ORDER BY c.column_id;
ELSE PRINT N'ReleaseHotfixes missing';

PRINT N'';
PRINT N'--- 3) Columns: ReleaseMaster ---';
IF OBJECT_ID(N'dbo.ReleaseMaster', N'U') IS NOT NULL
  SELECT c.column_id, c.name AS ColName, ty.name AS DataType
  FROM sys.columns c
  JOIN sys.types ty ON ty.user_type_id = c.user_type_id
  WHERE c.object_id = OBJECT_ID(N'dbo.ReleaseMaster')
  ORDER BY c.column_id;

PRINT N'';
PRINT N'--- 4) Columns: HotfixTarget ---';
IF OBJECT_ID(N'dbo.HotfixTarget', N'U') IS NOT NULL
  SELECT c.column_id, c.name AS ColName, ty.name AS DataType
  FROM sys.columns c
  JOIN sys.types ty ON ty.user_type_id = c.user_type_id
  WHERE c.object_id = OBJECT_ID(N'dbo.HotfixTarget')
  ORDER BY c.column_id;

PRINT N'';
PRINT N'--- 5) Columns: CustomerHotfixes ---';
IF OBJECT_ID(N'dbo.CustomerHotfixes', N'U') IS NOT NULL
  SELECT c.column_id, c.name AS ColName, ty.name AS DataType
  FROM sys.columns c
  JOIN sys.types ty ON ty.user_type_id = c.user_type_id
  WHERE c.object_id = OBJECT_ID(N'dbo.CustomerHotfixes')
  ORDER BY c.column_id;

PRINT N'';
PRINT N'--- 6) Row counts ---';
SELECT N'ReleaseHotfixes' AS T, COUNT(*) AS Cnt FROM dbo.ReleaseHotfixes WITH (NOLOCK)
UNION ALL SELECT N'ReleaseMaster', COUNT(*) FROM dbo.ReleaseMaster WITH (NOLOCK)
UNION ALL SELECT N'ReleaseHotfixLink', COUNT(*) FROM dbo.ReleaseHotfixLink WITH (NOLOCK)
UNION ALL SELECT N'HotfixTarget', COUNT(*) FROM dbo.HotfixTarget WITH (NOLOCK)
UNION ALL SELECT N'CustomerHotfixes', COUNT(*) FROM dbo.CustomerHotfixes WITH (NOLOCK)
UNION ALL SELECT N'DeletedCustomerHotfixes', COUNT(*) FROM dbo.DeletedCustomerHotfixes WITH (NOLOCK);

PRINT N'';
PRINT N'--- 7) Sample ReleaseHotfixes (TOP 15) ---';
SELECT TOP (15) *
FROM dbo.ReleaseHotfixes WITH (NOLOCK);

PRINT N'';
PRINT N'--- 8) Sample ReleaseMaster (TOP 20) ---';
SELECT TOP (20) *
FROM dbo.ReleaseMaster WITH (NOLOCK);

PRINT N'';
PRINT N'--- 9) Sample HotfixTarget (TOP 15) ---';
IF OBJECT_ID(N'dbo.HotfixTarget', N'U') IS NOT NULL
  SELECT TOP (15) * FROM dbo.HotfixTarget WITH (NOLOCK);

PRINT N'';
PRINT N'--- 10) Sample CustomerHotfixes (TOP 15) ---';
IF OBJECT_ID(N'dbo.CustomerHotfixes', N'U') IS NOT NULL
  SELECT TOP (15) * FROM dbo.CustomerHotfixes WITH (NOLOCK);

PRINT N'=== Done ? paste sections 2,6,7,8 back to build baseline import ===';
