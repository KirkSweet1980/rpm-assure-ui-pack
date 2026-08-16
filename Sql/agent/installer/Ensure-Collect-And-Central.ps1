# Create/verify local rpmassure using operator's existing SQL access.
# Passwords MUST come from -ConfigFile (never CLI) so @ssuR3me! is not splatted.
# ASCII only.
param(
  [string]$ConfigFile = "",
  [string]$LocalServer = "",
  [ValidateSet("windows", "sql")][string]$AdminMode = "windows",
  [string]$AdminUser = "",
  [string]$AdminPassword = "",
  [string]$CollectUser = "rpmassure",
  [string]$CollectPassword = "",
  [string]$CustomerCode = "",
  [string]$DisplayName = "",
  [string]$InstanceName = "",
  [string]$CentralHost = "102.222.21.220,14333",
  [string]$CentralDatabase = "RPMAssure_App",
  [string]$CentralUser = "rpmassure",
  [string]$CentralPassword = "",
  [switch]$SkipLinkedServer
)

$ErrorActionPreference = "Stop"
$Here = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $Here "Sql-Connect.ps1")

if ($ConfigFile -and (Test-Path -LiteralPath $ConfigFile)) {
  $j = Get-Content -LiteralPath $ConfigFile -Raw | ConvertFrom-Json
  if ($j.LocalServer) { $LocalServer = [string]$j.LocalServer }
  if ($j.AdminMode) { $AdminMode = [string]$j.AdminMode }
  if ($j.AdminUser) { $AdminUser = [string]$j.AdminUser }
  if ($j.AdminPassword) { $AdminPassword = [string]$j.AdminPassword }
  if ($j.CollectUser) { $CollectUser = [string]$j.CollectUser }
  if ($j.CollectPassword) { $CollectPassword = [string]$j.CollectPassword }
  if ($j.CustomerCode) { $CustomerCode = [string]$j.CustomerCode }
  if ($j.DisplayName) { $DisplayName = [string]$j.DisplayName }
  if ($j.InstanceName) { $InstanceName = [string]$j.InstanceName }
  if ($j.CentralHost) { $CentralHost = [string]$j.CentralHost }
  if ($j.CentralDatabase) { $CentralDatabase = [string]$j.CentralDatabase }
  if ($j.CentralUser) { $CentralUser = [string]$j.CentralUser }
  if ($j.CentralPassword) { $CentralPassword = [string]$j.CentralPassword }
}

if (-not $CollectPassword) { $CollectPassword = "@ssuR3me!" }
if (-not $CentralPassword) { $CentralPassword = $CollectPassword }
if (-not $LocalServer) { $LocalServer = $env:COMPUTERNAME }

function Escape-Sql([string]$s) {
  if ($null -eq $s) { return "" }
  return ($s -replace "'", "''")
}

Write-Host ("local=" + $LocalServer + " adminMode=" + $AdminMode)

# 1) If rpmassure already works, do not touch the password
$already = Test-RpmaSql -Server $LocalServer -Mode sql -User $CollectUser -Password $CollectPassword
if ($already.Ok) {
  Write-Host ("COLLECT_ALREADY_OK who=" + $already.Who + " server=" + $already.ServerUsed)
} else {
  Write-Host ("collect not yet usable: " + $already.Error)
  $admin = Test-RpmaSql -Server $LocalServer -Mode $AdminMode -User $AdminUser -Password $AdminPassword
  if (-not $admin.Ok) { throw ("Existing SQL login failed: " + $admin.Error) }
  Write-Host ("EXISTING_LOGIN_OK who=" + $admin.Who + " server=" + $admin.ServerUsed)

  $scan = Invoke-RpmaSql -Server $admin.ServerUsed -Mode $AdminMode -User $AdminUser -Password $AdminPassword -Query @"
SET NOCOUNT ON;
SELECT name FROM sys.databases
WHERE state_desc = N'ONLINE'
  AND name NOT IN (N'master', N'model', N'msdb', N'tempdb');
"@
  $dbs = @()
  foreach ($line in ($scan.Text -split "`r?`n")) {
    $n = $line.Trim()
    if (-not $n -or $n -eq "name" -or $n -eq "OK") { continue }
    $dbs += $n
  }
  if ($dbs.Count -eq 0) { $dbs = @("master") }
  Write-Host ("DBS=" + ($dbs -join ","))

  $escL = Escape-Sql $CollectUser
  $escP = Escape-Sql $CollectPassword
  $ins = ($dbs | ForEach-Object { "  (N'" + (Escape-Sql $_) + "')" }) -join ",`r`n"
  $create = @"
SET NOCOUNT ON;
DECLARE @LoginName sysname = N'$escL';
DECLARE @Password nvarchar(128) = N'$escP';
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = @LoginName)
BEGIN
  DECLARE @sql nvarchar(max) = N'CREATE LOGIN ' + QUOTENAME(@LoginName) +
    N' WITH PASSWORD = ' + QUOTENAME(@Password, '''') +
    N', CHECK_POLICY = OFF, CHECK_EXPIRATION = OFF;';
  EXEC sys.sp_executesql @sql;
  PRINT CONCAT(N'Login created: ', @LoginName);
END
ELSE
BEGIN
  DECLARE @sql2 nvarchar(max) = N'ALTER LOGIN ' + QUOTENAME(@LoginName) +
    N' WITH PASSWORD = ' + QUOTENAME(@Password, '''') + N' UNLOCK, CHECK_POLICY = OFF, CHECK_EXPIRATION = OFF;';
  EXEC sys.sp_executesql @sql2;
  ALTER LOGIN [$escL] ENABLE;
  PRINT CONCAT(N'Login updated and unlocked: ', @LoginName);
END
BEGIN TRY GRANT VIEW SERVER STATE TO [$escL]; END TRY BEGIN CATCH END CATCH
BEGIN TRY GRANT VIEW ANY DEFINITION TO [$escL]; END TRY BEGIN CATCH END CATCH
DECLARE @Dbs TABLE (DbName sysname);
INSERT @Dbs (DbName) VALUES
$ins;
DECLARE @db sysname;
DECLARE c CURSOR LOCAL FAST_FORWARD FOR SELECT DbName FROM @Dbs;
OPEN c; FETCH NEXT FROM c INTO @db;
WHILE @@FETCH_STATUS = 0
BEGIN
  IF DB_ID(@db) IS NOT NULL
  BEGIN
    DECLARE @g nvarchar(max) = N'
USE ' + QUOTENAME(@db) + N';
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N''$escL'')
  CREATE USER ' + QUOTENAME(@LoginName) + N' FOR LOGIN ' + QUOTENAME(@LoginName) + N';
IF IS_ROLEMEMBER(N''db_datareader'', N''$escL'') <> 1
  ALTER ROLE db_datareader ADD MEMBER ' + QUOTENAME(@LoginName) + N';
';
    BEGIN TRY EXEC sys.sp_executesql @g; PRINT CONCAT(N'reader ', @db); END TRY
    BEGIN CATCH PRINT CONCAT(N'Grant FAIL ', @db, N': ', ERROR_MESSAGE()); END CATCH
  END
  FETCH NEXT FROM c INTO @db;
END
CLOSE c; DEALLOCATE c;
PRINT N'Local collect login ready.';
"@
  $r1 = Invoke-RpmaSql -Server $admin.ServerUsed -Mode $AdminMode -User $AdminUser -Password $AdminPassword -Query $create -TimeoutSec 120
  Write-Host $r1.Text
  if (-not $r1.Ok) { throw ("Failed creating collect login: " + $r1.Text) }

  $prove = Test-RpmaSql -Server $admin.ServerUsed -Mode sql -User $CollectUser -Password $CollectPassword
  if (-not $prove.Ok) { throw ("rpmassure still cannot log in: " + $prove.Error) }
  Write-Host ("COLLECT_LOGIN_WORKS who=" + $prove.Who)
}

Write-Host "COLLECT_LOGIN_WORKS"
Write-Host "COLLECT_LOGIN_READY"

$cen = Test-RpmaSql -Server $CentralHost -Database $CentralDatabase -Mode sql -User $CentralUser -Password $CentralPassword -TimeoutSec 12 -StrictHost
if (-not $cen.Ok) { throw ("Central Assure login failed: " + $cen.Error) }
Write-Host ("CENTRAL_OK who=" + $cen.Who)

if ($CustomerCode -and $DisplayName) {
  if (-not $InstanceName) { $InstanceName = $LocalServer }
  $reg = @"
SET NOCOUNT ON;
DECLARE @CustomerCode nvarchar(50) = N'$(Escape-Sql $CustomerCode)';
DECLARE @DisplayName nvarchar(200) = N'$(Escape-Sql $DisplayName)';
DECLARE @SqlInstanceName nvarchar(100) = N'$(Escape-Sql $InstanceName)';
IF NOT EXISTS (SELECT 1 FROM dbo.Dim_Customer WHERE CustomerCode = @CustomerCode)
  INSERT dbo.Dim_Customer (CustomerCode, DisplayName, Active, SqlInstanceName, CreatedAt, UpdatedAt)
  VALUES (@CustomerCode, @DisplayName, 1, @SqlInstanceName, SYSUTCDATETIME(), SYSUTCDATETIME());
ELSE
  UPDATE dbo.Dim_Customer SET DisplayName=@DisplayName, Active=1, SqlInstanceName=@SqlInstanceName, UpdatedAt=SYSUTCDATETIME()
  WHERE CustomerCode=@CustomerCode;
SELECT CustomerCode, DisplayName, SqlInstanceName FROM dbo.Dim_Customer WHERE CustomerCode=@CustomerCode;
"@
  $rr = Invoke-RpmaSql -Server $CentralHost -Database $CentralDatabase -Mode sql -User $CentralUser -Password $CentralPassword -Query $reg
  Write-Host $rr.Text
  if ($rr.Ok) { Write-Host "CUSTOMER_REGISTERED" }
}

Write-Host "ENSURE_DONE"
