# Called by the customer wizard. Uses the operator's EXISTING SQL access
# to create local rpmassure (read SYSPRO) and prove write-back to central.
# ASCII only.
param(
  [Parameter(Mandatory = $true)][string]$LocalServer,
  [ValidateSet("windows", "sql")][string]$AdminMode = "windows",
  [string]$AdminUser = "",
  [string]$AdminPassword = "",
  [string]$CollectUser = "rpmassure",
  [string]$CollectPassword = "@ssuR3me!",
  [string]$CustomerCode = "",
  [string]$DisplayName = "",
  [string]$InstanceName = "",
  [string]$CentralHost = "102.222.21.220,14333",
  [string]$CentralDatabase = "RPMAssure_App",
  [string]$CentralUser = "rpmassure",
  [string]$CentralPassword = "@ssuR3me!",
  [switch]$SkipLinkedServer
)

$ErrorActionPreference = "Stop"

function Find-Sqlcmd {
  $cmd = Get-Command sqlcmd.exe -EA SilentlyContinue
  if ($cmd) { return $cmd.Source }
  foreach ($c in @(
      "C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE",
      "C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\180\Tools\Binn\SQLCMD.EXE",
      "C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\130\Tools\Binn\SQLCMD.EXE"
    )) {
    if (Test-Path $c) { return $c }
  }
  throw "sqlcmd.exe not found."
}

function Escape-Sql([string]$s) {
  if ($null -eq $s) { return "" }
  return ($s -replace "'", "''")
}

function Invoke-Sql([string]$Sqlcmd, [string]$Server, [string]$AuthMode, [string]$User, [string]$Password, [string]$Query, [string]$Database = "master", [int]$TimeoutSec = 90) {
  $tmp = Join-Path $env:TEMP ("rpma_ens_" + [guid]::NewGuid().ToString("N").Substring(0, 8) + ".sql")
  $out = Join-Path $env:TEMP ("rpma_ens_" + [guid]::NewGuid().ToString("N").Substring(0, 8) + ".out")
  $err = Join-Path $env:TEMP ("rpma_ens_" + [guid]::NewGuid().ToString("N").Substring(0, 8) + ".err")
  [IO.File]::WriteAllText($tmp, $Query, (New-Object System.Text.UTF8Encoding $false))
  $args = @("-S", $Server, "-d", $Database, "-C", "-b", "-I", "-t", [string]$TimeoutSec, "-W", "-s", "|", "-i", $tmp)
  if ($AuthMode -eq "windows") { $args = @("-E") + $args }
  else { $args = @("-U", $User, "-P", $Password) + $args }
  $p = Start-Process -FilePath $Sqlcmd -ArgumentList $args -Wait -PassThru -NoNewWindow -RedirectStandardOutput $out -RedirectStandardError $err
  $stdout = ""; $stderr = ""
  if (Test-Path $out) { $stdout = Get-Content $out -Raw -EA SilentlyContinue }
  if (Test-Path $err) { $stderr = Get-Content $err -Raw -EA SilentlyContinue }
  Remove-Item $tmp, $out, $err -Force -EA SilentlyContinue
  return [pscustomobject]@{ ExitCode = $p.ExitCode; StdOut = $stdout; StdErr = $stderr; Ok = ($p.ExitCode -eq 0) }
}

function Build-CreateLoginSql([string]$loginName, [string]$password, [string[]]$dbs) {
  $escL = Escape-Sql $loginName
  $escP = Escape-Sql $password
  $ins = ($dbs | ForEach-Object { "  (N'" + (Escape-Sql $_) + "')" }) -join ",`r`n"
  if (-not $ins) { $ins = "  (N'master')" }
  return @"
SET NOCOUNT ON;
DECLARE @LoginName sysname = N'$escL';
DECLARE @Password  nvarchar(128) = N'$escP';
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = @LoginName)
BEGIN
  DECLARE @sql nvarchar(max) = N'CREATE LOGIN ' + QUOTENAME(@LoginName) +
    N' WITH PASSWORD = ' + QUOTENAME(@Password, '''') +
    N', CHECK_POLICY = ON, CHECK_EXPIRATION = OFF;';
  EXEC sys.sp_executesql @sql;
  PRINT CONCAT(N'Login created: ', @LoginName);
END
ELSE
BEGIN
  DECLARE @sql2 nvarchar(max) = N'ALTER LOGIN ' + QUOTENAME(@LoginName) +
    N' WITH PASSWORD = ' + QUOTENAME(@Password, '''') + N';';
  EXEC sys.sp_executesql @sql2;
  PRINT CONCAT(N'Login password updated: ', @LoginName);
END
BEGIN TRY GRANT VIEW SERVER STATE TO [$escL]; PRINT N'Granted VIEW SERVER STATE'; END TRY BEGIN CATCH PRINT ERROR_MESSAGE(); END CATCH
BEGIN TRY GRANT VIEW ANY DEFINITION TO [$escL]; PRINT N'Granted VIEW ANY DEFINITION'; END TRY BEGIN CATCH PRINT ERROR_MESSAGE(); END CATCH
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
ALTER ROLE db_datareader ADD MEMBER ' + QUOTENAME(@LoginName) + N';
';
    BEGIN TRY EXEC sys.sp_executesql @g; PRINT CONCAT(N'Granted db_datareader on ', @db); END TRY
    BEGIN CATCH PRINT CONCAT(N'Grant FAIL ', @db, N': ', ERROR_MESSAGE()); END CATCH
  END
  FETCH NEXT FROM c INTO @db;
END
CLOSE c; DEALLOCATE c;
BEGIN TRY
  EXEC(N'
USE msdb;
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N''$escL'')
  CREATE USER [$escL] FOR LOGIN [$escL];
GRANT SELECT ON dbo.backupset TO [$escL];
GRANT SELECT ON dbo.sysjobs TO [$escL];
GRANT SELECT ON dbo.sysjobhistory TO [$escL];
');
  PRINT N'msdb grants done';
END TRY BEGIN CATCH PRINT CONCAT(N'msdb grants: ', ERROR_MESSAGE()); END CATCH
PRINT N'Local collect login ready.';
"@
}

$sqlcmd = Find-Sqlcmd
Write-Host ("sqlcmd=" + $sqlcmd)
Write-Host ("local=" + $LocalServer + " adminMode=" + $AdminMode)

$probe = Invoke-Sql $sqlcmd $LocalServer $AdminMode $AdminUser $AdminPassword "SET NOCOUNT ON; SELECT @@SERVERNAME AS ServerName, SUSER_SNAME() AS LoginName, IS_SRVROLEMEMBER('sysadmin') AS IsSysadmin;"
Write-Host $probe.StdOut
if ($probe.StdErr) { Write-Host $probe.StdErr }
if (-not $probe.Ok) { throw "Existing SQL login failed. Check Windows vs SQL auth and password." }
Write-Host "EXISTING_LOGIN_OK"

$scan = Invoke-Sql $sqlcmd $LocalServer $AdminMode $AdminUser $AdminPassword @"
SET NOCOUNT ON;
SELECT name FROM sys.databases
WHERE state_desc = N'ONLINE'
  AND name NOT IN (N'master', N'model', N'msdb', N'tempdb')
  AND (
    name LIKE N'Syspro%' OR name LIKE N'%SysCompany%' OR name LIKE N'%Company%'
    OR name LIKE N'SIR[_]%' OR name LIKE N'AHI%' OR name LIKE N'RSR%'
    OR name IN (N'Sysprodb', N'Sysprodb1', N'SYSPRODeployment', N'SysproReportingService')
  )
ORDER BY name;
"@
$dbs = @()
foreach ($line in ($scan.StdOut -split "`r?`n")) {
  $n = $line.Trim()
  if (-not $n) { continue }
  if ($n -eq "name" -or $n -match "^-+$" -or $n -match "rows affected") { continue }
  $dbs += $n
}
$dbs = @($dbs | Select-Object -Unique)
if ($dbs.Count -eq 0) { $dbs = @("master") }
Write-Host ("DBS=" + ($dbs -join ","))

$create = Build-CreateLoginSql $CollectUser $CollectPassword $dbs
$r1 = Invoke-Sql $sqlcmd $LocalServer $AdminMode $AdminUser $AdminPassword $create -TimeoutSec 120
Write-Host $r1.StdOut
if ($r1.StdErr) { Write-Host $r1.StdErr }
if ($r1.StdOut -notmatch "Local collect login ready") { throw "Failed creating collect login rpmassure." }
Write-Host "COLLECT_LOGIN_READY"

$prove = Invoke-Sql $sqlcmd $LocalServer "sql" $CollectUser $CollectPassword "SET NOCOUNT ON; SELECT SUSER_SNAME() AS Who, DB_NAME() AS Db;"
Write-Host $prove.StdOut
if (-not $prove.Ok) { throw "rpmassure created but cannot log in locally. Enable SQL authentication on this instance." }
Write-Host "COLLECT_LOGIN_WORKS"

$cen = Invoke-Sql $sqlcmd $CentralHost "sql" $CentralUser $CentralPassword "SET NOCOUNT ON; SELECT DB_NAME() AS Db, SUSER_SNAME() AS Who;" $CentralDatabase 20
Write-Host $cen.StdOut
if ($cen.StdErr) { Write-Host $cen.StdErr }
if (-not $cen.Ok) { throw "Central Assure login failed for rpmassure. Check network to $CentralHost" }
Write-Host "CENTRAL_OK"

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
PRINT CONCAT(N'Registered ', @CustomerCode);
"@
  $rr = Invoke-Sql $sqlcmd $CentralHost "sql" $CentralUser $CentralPassword $reg $CentralDatabase 30
  Write-Host $rr.StdOut
  if ($rr.Ok) { Write-Host "CUSTOMER_REGISTERED" }
}

if (-not $SkipLinkedServer) {
  $ls = @"
SET NOCOUNT ON;
DECLARE @LsName sysname = N'RPM_CENTRAL';
DECLARE @Ds nvarchar(128) = N'$(Escape-Sql $CentralHost)';
DECLARE @Usr sysname = N'$(Escape-Sql $CentralUser)';
DECLARE @Pwd nvarchar(128) = N'$(Escape-Sql $CentralPassword)';
IF EXISTS (SELECT 1 FROM sys.servers WHERE name = @LsName)
  EXEC sp_dropserver @server = @LsName, @droplogins = 'droplogins';
DECLARE @ok bit = 0;
BEGIN TRY
  EXEC sp_addlinkedserver @server=@LsName, @srvproduct=N'', @provider=N'MSOLEDBSQL', @datasrc=@Ds;
  SET @ok = 1;
END TRY BEGIN CATCH PRINT ERROR_MESSAGE(); END CATCH
IF @ok = 0
BEGIN TRY
  EXEC sp_addlinkedserver @server=@LsName, @srvproduct=N'', @provider=N'SQLNCLI11', @datasrc=@Ds;
  SET @ok = 1;
END TRY BEGIN CATCH PRINT ERROR_MESSAGE(); END CATCH
IF @ok = 1
BEGIN
  EXEC sp_addlinkedsrvlogin @rmtsrvname=@LsName, @useself=N'False', @locallogin=NULL, @rmtuser=@Usr, @rmtpassword=@Pwd;
  EXEC sp_serveroption @server=@LsName, @optname=N'rpc out', @optvalue=N'true';
  PRINT N'Linked server created';
END
"@
  $rls = Invoke-Sql $sqlcmd $LocalServer $AdminMode $AdminUser $AdminPassword $ls 60
  Write-Host $rls.StdOut
}

Write-Host "ENSURE_DONE"
