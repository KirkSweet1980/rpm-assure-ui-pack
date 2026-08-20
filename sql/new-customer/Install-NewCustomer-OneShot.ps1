# Install-NewCustomer-OneShot.ps1
# One-shot onboarding for a new RPM Assure customer (SYSPRO site).
#
# Run ON the customer SQL box (elevated PowerShell), e.g. SIRZAAPSQL01.
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\Install-NewCustomer-OneShot.ps1
#
# What it does:
#   1) Asks for THIS server's current SQL auth (Windows or existing SQL login)
#   2) Proves access, discovers SYSPRO / company databases
#   3) Creates the Assure collect login (read-only) on this instance
#   4) Registers the customer on central Assure SQL and creates linked server
#   5) Writes Customer.Config.ps1 + proof log
#
# Pure ASCII. Interactive. No secrets baked into the repo copy.
param(
  [string]$PreCustomerCode = '',
  [string]$PreDisplayName = '',
  [string]$PreInstanceName = '',
  [string]$PreAuthMode = '',
  [string]$PreAdminUser = '',
  [string]$PreAdminPwd = ''
)

$ErrorActionPreference = 'Stop'

# ---- standard Assure collect account (all new customers) ----
$DefaultCollectUser = 'rpmassure'
$DefaultCollectPwd  = ''
$DefaultCentralHost = '102.222.21.220,14333'
$DefaultCentralDb   = 'RPMAssure_App'
$DefaultLinkedName  = 'RPM_CENTRAL'
$OutRoot            = 'C:\RPM-Assure\Sql\customers'

function Write-Step([string]$m) { Write-Host ''; Write-Host $m -ForegroundColor Cyan }
function Write-Ok([string]$m)   { Write-Host $m -ForegroundColor Green }
function Write-Warn2([string]$m){ Write-Host $m -ForegroundColor Yellow }

function Read-Default([string]$prompt, [string]$default) {
  $suffix = if ($default) { " [$default]" } else { '' }
  $v = Read-Host ($prompt + $suffix)
  if ([string]::IsNullOrWhiteSpace($v)) { return $default }
  return $v.Trim()
}

function Read-Secret([string]$prompt) {
  $sec = Read-Host $prompt -AsSecureString
  $b = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b) }
}

function Escape-Sql([string]$s) {
  if ($null -eq $s) { return '' }
  return ($s -replace "'", "''")
}

function Find-Sqlcmd {
  $cmd = Get-Command sqlcmd.exe -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  foreach ($c in @(
      'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\sqlcmd.exe',
      'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\180\Tools\Binn\sqlcmd.exe',
      'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\130\Tools\Binn\sqlcmd.exe'
    )) {
    if (Test-Path $c) { return $c }
  }
  throw 'sqlcmd.exe not found. Install SQL Server Command Line Utilities.'
}

function Invoke-Sql(
  [string]$Sqlcmd,
  [string]$Server,
  [string]$AuthMode,   # windows | sql
  [string]$User,
  [string]$Password,
  [string]$Query,
  [string]$Database = 'master',
  [int]$TimeoutSec = 60
) {
  $tmp = Join-Path $env:TEMP ('rpma_onboard_' + [guid]::NewGuid().ToString('N').Substring(0,8) + '.sql')
  $out = Join-Path $env:TEMP ('rpma_onboard_' + [guid]::NewGuid().ToString('N').Substring(0,8) + '.out')
  $err = Join-Path $env:TEMP ('rpma_onboard_' + [guid]::NewGuid().ToString('N').Substring(0,8) + '.err')
  [IO.File]::WriteAllText($tmp, $Query, (New-Object System.Text.UTF8Encoding $false))
  $args = @('-S', $Server, '-d', $Database, '-C', '-b', '-I', '-t', [string]$TimeoutSec, '-W', '-s', '|', '-i', $tmp)
  if ($AuthMode -eq 'windows') {
    $args = @('-E') + $args
  } else {
    $args = @('-U', $User, '-P', $Password) + $args
  }
  $p = Start-Process -FilePath $Sqlcmd -ArgumentList $args -Wait -PassThru -NoNewWindow `
    -RedirectStandardOutput $out -RedirectStandardError $err
  $stdout = ''
  $stderr = ''
  if (Test-Path $out) { $stdout = Get-Content $out -Raw -ErrorAction SilentlyContinue }
  if (Test-Path $err) { $stderr = Get-Content $err -Raw -ErrorAction SilentlyContinue }
  Remove-Item $tmp, $out, $err -Force -ErrorAction SilentlyContinue
  return [pscustomobject]@{
    ExitCode = $p.ExitCode
    StdOut   = $stdout
    StdErr   = $stderr
    Ok       = ($p.ExitCode -eq 0)
  }
}

Write-Host '========================================' -ForegroundColor Cyan
Write-Host ' RPM Assure - New customer one-shot'
Write-Host '========================================' -ForegroundColor Cyan
Write-Host 'Run this on the customer SQL server (example: SIRZAAPSQL01).'
Write-Host 'You will enter the CURRENT admin login first (Windows or SQL).'
Write-Host 'Then the script creates the Assure read account and registers central.'
Write-Host ''

$sqlcmd = Find-Sqlcmd
Write-Ok ('sqlcmd = ' + $sqlcmd)

# ---------- identity ----------
Write-Step '--- Customer identity ---'
$defCode = if ($PreCustomerCode) { $PreCustomerCode.ToUpperInvariant() } else { 'SIRF' }
$defName = if ($PreDisplayName) { $PreDisplayName } else { 'Sir Fruit' }
$CustomerCode = (Read-Default 'Customer code (2-20 A-Z0-9)' $defCode).ToUpperInvariant()
if ($CustomerCode -notmatch '^[A-Z0-9]{2,20}$') { throw 'CustomerCode must be 2-20 chars A-Z / 0-9.' }
$DisplayName  = Read-Default 'Display name' $defName
$LocalServer  = Read-Default 'This SQL server (host or host,port)' $env:COMPUTERNAME
$instDef = if ($PreInstanceName) { $PreInstanceName } else { $LocalServer }
$InstanceName = Read-Default 'SYSPRO instance name (stored in Assure)' $instDef

# ---------- current admin creds ----------
Write-Step '--- Current SQL access (how YOU connect today) ---'
$AdminMode = 'windows'
$AdminUser = ''
$AdminPwd  = ''
if ($PreAuthMode -eq 'sql' -and $PreAdminUser -and $PreAdminPwd) {
  $AdminMode = 'sql'
  $AdminUser = $PreAdminUser
  $AdminPwd  = $PreAdminPwd
  Write-Host ('Using SQL login ' + $AdminUser + ' (from onboard pack)')
} else {
  Write-Host '  1) Windows authentication (current Windows user)'
  Write-Host '  2) SQL login (sa or other sysadmin you already have)'
  $authPick = Read-Default 'Choose 1 or 2' '1'
  if ($authPick -eq '2') {
    $AdminMode = 'sql'
    $AdminUser = Read-Default 'SQL login' 'sa'
    $AdminPwd  = Read-Secret 'SQL password'
    if (-not $AdminPwd) { throw 'SQL password is required for option 2.' }
  } else {
    Write-Host ('Using Windows auth as ' + $env:USERDOMAIN + '\' + $env:USERNAME)
  }
}

Write-Step 'Testing current access...'
$probe = Invoke-Sql -Sqlcmd $sqlcmd -Server $LocalServer -AuthMode $AdminMode `
  -User $AdminUser -Password $AdminPwd `
  -Query "SET NOCOUNT ON; SELECT @@SERVERNAME AS ServerName, SUSER_SNAME() AS LoginName, IS_SRVROLEMEMBER('sysadmin') AS IsSysadmin;"
if (-not $probe.Ok) {
  Write-Host $probe.StdOut
  Write-Host $probe.StdErr
  throw 'Could not connect with the credentials you entered. Check server name and auth.'
}
Write-Host $probe.StdOut
if ($probe.StdOut -notmatch '\|1\s*$' -and $probe.StdOut -notmatch '\s1\s*$' -and $probe.StdOut -notmatch 'IsSysadmin') {
  Write-Warn2 'Could not confirm sysadmin. Grants may fail if this login is not sysadmin.'
} else {
  Write-Ok 'Access OK'
}

# ---------- discover DBs ----------
Write-Step '--- Discover SYSPRO / company databases ---'
$scan = Invoke-Sql -Sqlcmd $sqlcmd -Server $LocalServer -AuthMode $AdminMode `
  -User $AdminUser -Password $AdminPwd -Query @"
SET NOCOUNT ON;
SELECT name
FROM sys.databases
WHERE state_desc = N'ONLINE'
  AND name NOT IN (N'master', N'model', N'msdb', N'tempdb')
  AND (
    name LIKE N'Syspro%'
    OR name LIKE N'%SysCompany%'
    OR name LIKE N'%Company%'
    OR name LIKE N'SIR[_]%'
    OR name IN (N'Sysprodb', N'SYSPRODeployment', N'SysproReportingService')
  )
ORDER BY name;
"@
if (-not $scan.Ok) {
  Write-Host $scan.StdOut
  Write-Host $scan.StdErr
  throw 'Database discovery failed.'
}
$found = @()
foreach ($line in ($scan.StdOut -split "`r?`n")) {
  $n = $line.Trim()
  if (-not $n) { continue }
  if ($n -eq 'name' -or $n -match '^-+$' -or $n -match 'rows affected') { continue }
  $found += $n
}
$found = $found | Select-Object -Unique
if ($found.Count -eq 0) {
  Write-Warn2 'No SYSPRO-looking databases found. You can type names manually.'
} else {
  Write-Host 'Found:'
  $i = 1
  foreach ($d in $found) { Write-Host ('  {0,2}) {1}' -f $i, $d); $i++ }
}
$pick = Read-Default 'Grant read on these DBs? ALL, or comma list of numbers/names' 'ALL'
$CompanyDatabases = @()
if ($pick -eq 'ALL' -or $pick -eq '*') {
  $CompanyDatabases = @($found)
} else {
  foreach ($tok in ($pick -split ',')) {
    $t = $tok.Trim()
    if (-not $t) { continue }
    if ($t -match '^\d+$') {
      $idx = [int]$t
      if ($idx -ge 1 -and $idx -le $found.Count) { $CompanyDatabases += $found[$idx - 1] }
    } else {
      $CompanyDatabases += $t
    }
  }
}
# Always include Sysprodb / SYSPRODeployment if they exist and were not listed
foreach ($must in @('Sysprodb', 'SYSPRODeployment')) {
  if ($found -contains $must -and $CompanyDatabases -notcontains $must) {
    $CompanyDatabases += $must
  }
}
if ($CompanyDatabases.Count -eq 0) {
  $manual = Read-Default 'Type company DB names comma-separated' 'Sysprodb'
  $CompanyDatabases = @($manual -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ })
}
Write-Ok ('Will grant reader on: ' + ($CompanyDatabases -join ', '))

# ---------- collect account ----------
Write-Step '--- Assure collect login (created on THIS server) ---'
Write-Host 'Standard going forward: rpmassure  (read SYSPRO, write central via linked server)'
$CollectUser = Read-Default 'Collect SQL login to create' $DefaultCollectUser
$useStd = Read-Default 'Use standard collect password? (Y/n)' 'Y'
if ($useStd -match '^[Nn]') {
  $CollectPwd = Read-Secret 'Collect password'
  $CollectPwd2 = Read-Secret 'Confirm collect password'
  if ($CollectPwd -ne $CollectPwd2) { throw 'Passwords do not match.' }
} else {
  $CollectPwd = $DefaultCollectPwd
  Write-Host 'Using standard collect password.'
}
$alsoLegacy = Read-Default 'Also create legacy login Rpm_collect with the same password? (Y/n)' 'Y'

# ---------- central ----------
Write-Step '--- Central Assure SQL (write-back) ---'
$CentralHost = Read-Default 'Central host,port' $DefaultCentralHost
$CentralDb   = Read-Default 'Central database' $DefaultCentralDb
$CentralUser = Read-Default 'Central SQL user' $DefaultCollectUser
$useStdC = Read-Default 'Use same password as collect login for central? (Y/n)' 'Y'
if ($useStdC -match '^[Nn]') {
  $CentralPwd = Read-Secret 'Central SQL password'
} else {
  $CentralPwd = $CollectPwd
}

$OutDir = Join-Path $OutRoot $CustomerCode
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $OutDir 'logs') | Out-Null
$Log = Join-Path $OutDir ('logs\onboard_' + (Get-Date -Format 'yyyyMMdd_HHmmss') + '.log')
function Log([string]$m) {
  $line = '{0:u} {1}' -f (Get-Date).ToUniversalTime(), $m
  Add-Content -LiteralPath $Log -Value $line -Encoding ASCII
  Write-Host $line
}
Log ('START onboard ' + $CustomerCode + ' server=' + $LocalServer + ' instance=' + $InstanceName)

# ---------- 1) create collect login locally ----------
Write-Step '--- Create local collect login + grants ---'
function Build-CreateLoginSql([string]$loginName, [string]$password, [string[]]$dbs) {
  $escL = Escape-Sql $loginName
  $escP = Escape-Sql $password
  $ins = ($dbs | ForEach-Object { "  (N'" + (Escape-Sql $_) + "')" }) -join ",`r`n"
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

-- server-level reads used by SQL health / backup collect
BEGIN TRY
  GRANT VIEW SERVER STATE TO [$escL];
  PRINT N'Granted VIEW SERVER STATE';
END TRY BEGIN CATCH
  PRINT CONCAT(N'VIEW SERVER STATE: ', ERROR_MESSAGE());
END CATCH
BEGIN TRY
  GRANT VIEW ANY DEFINITION TO [$escL];
  PRINT N'Granted VIEW ANY DEFINITION';
END TRY BEGIN CATCH
  PRINT CONCAT(N'VIEW ANY DEFINITION: ', ERROR_MESSAGE());
END CATCH

DECLARE @Dbs TABLE (DbName sysname);
INSERT @Dbs (DbName) VALUES
$ins;

DECLARE @db sysname;
DECLARE c CURSOR LOCAL FAST_FORWARD FOR SELECT DbName FROM @Dbs;
OPEN c;
FETCH NEXT FROM c INTO @db;
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
    BEGIN TRY
      EXEC sys.sp_executesql @g;
      PRINT CONCAT(N'Granted db_datareader on ', @db);
    END TRY
    BEGIN CATCH
      PRINT CONCAT(N'Grant FAIL ', @db, N': ', ERROR_MESSAGE());
    END CATCH
  END
  ELSE
    PRINT CONCAT(N'Skip missing DB: ', @db);
  FETCH NEXT FROM c INTO @db;
END
CLOSE c; DEALLOCATE c;

-- msdb backup / agent reads
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
END TRY BEGIN CATCH
  PRINT CONCAT(N'msdb grants: ', ERROR_MESSAGE());
END CATCH

PRINT N'Local collect login ready.';
"@
}

$createSql = Build-CreateLoginSql -loginName $CollectUser -password $CollectPwd -dbs $CompanyDatabases
$r1 = Invoke-Sql -Sqlcmd $sqlcmd -Server $LocalServer -AuthMode $AdminMode `
  -User $AdminUser -Password $AdminPwd -Query $createSql -TimeoutSec 120
Log $r1.StdOut
if ($r1.StdErr) { Log $r1.StdErr }
if ($r1.StdOut -notmatch 'Local collect login ready') {
  throw 'Failed creating collect login. See log.'
}
if (-not $r1.Ok) {
  Write-Warn2 'sqlcmd reported errors (some DB grants skipped). Login is ready - continuing.'
}
Write-Ok ('Created/updated login ' + $CollectUser)

if ($alsoLegacy -notmatch '^[Nn]' -and $CollectUser -ne 'Rpm_collect') {
  $rL = Invoke-Sql -Sqlcmd $sqlcmd -Server $LocalServer -AuthMode $AdminMode `
    -User $AdminUser -Password $AdminPwd `
    -Query (Build-CreateLoginSql -loginName 'Rpm_collect' -password $CollectPwd -dbs $CompanyDatabases) `
    -TimeoutSec 120
  Log $rL.StdOut
  if ($rL.Ok) { Write-Ok 'Also created/updated legacy Rpm_collect' }
  else { Write-Warn2 'Legacy Rpm_collect failed (non-fatal).' }
}

# prove collect login
Write-Step 'Proving collect login can connect...'
$rProve = Invoke-Sql -Sqlcmd $sqlcmd -Server $LocalServer -AuthMode 'sql' `
  -User $CollectUser -Password $CollectPwd `
  -Query "SET NOCOUNT ON; SELECT SUSER_SNAME() AS Who, DB_NAME() AS Db;"
if ($rProve.Ok) {
  Write-Ok ('Collect login works: ' + $rProve.StdOut.Trim())
  Log ('PROVE collect ' + $rProve.StdOut)
} else {
  Write-Warn2 'Collect login created but connect-test failed. Check password policy / SQL auth enabled.'
  Write-Host $rProve.StdOut
  Write-Host $rProve.StdErr
}

# ---------- 2) linked server ----------
Write-Step '--- Linked server RPM_CENTRAL -> central Assure ---'
$lsSql = @"
SET NOCOUNT ON;
DECLARE @LsName sysname = N'$(Escape-Sql $DefaultLinkedName)';
DECLARE @Ds     nvarchar(128) = N'$(Escape-Sql $CentralHost)';
DECLARE @Usr    sysname = N'$(Escape-Sql $CentralUser)';
DECLARE @Pwd    nvarchar(128) = N'$(Escape-Sql $CentralPwd)';

IF EXISTS (SELECT 1 FROM sys.servers WHERE name = @LsName)
BEGIN
  EXEC sp_dropserver @server = @LsName, @droplogins = 'droplogins';
  PRINT N'Dropped existing linked server';
END;

DECLARE @ok bit = 0;
BEGIN TRY
  EXEC sp_addlinkedserver @server = @LsName, @srvproduct = N'', @provider = N'MSOLEDBSQL', @datasrc = @Ds;
  SET @ok = 1;
  PRINT N'Provider MSOLEDBSQL';
END TRY BEGIN CATCH
  PRINT CONCAT(N'MSOLEDBSQL failed: ', ERROR_MESSAGE());
END CATCH
IF @ok = 0
BEGIN
  BEGIN TRY
    EXEC sp_addlinkedserver @server = @LsName, @srvproduct = N'', @provider = N'SQLNCLI11', @datasrc = @Ds;
    SET @ok = 1;
    PRINT N'Provider SQLNCLI11';
  END TRY BEGIN CATCH
    PRINT CONCAT(N'SQLNCLI11 failed: ', ERROR_MESSAGE());
  END CATCH
END
IF @ok = 0
BEGIN
  RAISERROR(N'Could not create linked server (need MSOLEDBSQL or SQLNCLI11).', 16, 1);
  RETURN;
END

EXEC sp_addlinkedsrvlogin
  @rmtsrvname = @LsName, @useself = N'False', @locallogin = NULL,
  @rmtuser = @Usr, @rmtpassword = @Pwd;
EXEC sp_serveroption @server = @LsName, @optname = N'rpc out', @optvalue = N'true';
EXEC sp_serveroption @server = @LsName, @optname = N'data access', @optvalue = N'true';
PRINT N'Linked server created';
"@
$rLs = Invoke-Sql -Sqlcmd $sqlcmd -Server $LocalServer -AuthMode $AdminMode `
  -User $AdminUser -Password $AdminPwd -Query $lsSql -TimeoutSec 90
Log $rLs.StdOut
if ($rLs.Ok) { Write-Ok 'Linked server created' }
else { Write-Warn2 'Linked server failed (will still try direct write to central).'; Log $rLs.StdErr }

# ---------- 3) write-back Dim_Customer ----------
Write-Step '--- Register customer on central Assure ---'
$regSql = @"
SET NOCOUNT ON;
DECLARE @CustomerCode    nvarchar(50)  = N'$(Escape-Sql $CustomerCode)';
DECLARE @DisplayName     nvarchar(200) = N'$(Escape-Sql $DisplayName)';
DECLARE @SqlInstanceName nvarchar(100) = N'$(Escape-Sql $InstanceName)';

IF NOT EXISTS (SELECT 1 FROM dbo.Dim_Customer WHERE CustomerCode = @CustomerCode)
BEGIN
  INSERT dbo.Dim_Customer (CustomerCode, DisplayName, Active, SqlInstanceName, CreatedAt, UpdatedAt)
  VALUES (@CustomerCode, @DisplayName, 1, @SqlInstanceName, SYSUTCDATETIME(), SYSUTCDATETIME());
  PRINT CONCAT(N'Inserted ', @CustomerCode);
END
ELSE
BEGIN
  UPDATE dbo.Dim_Customer
  SET DisplayName = @DisplayName, Active = 1, SqlInstanceName = @SqlInstanceName, UpdatedAt = SYSUTCDATETIME()
  WHERE CustomerCode = @CustomerCode;
  PRINT CONCAT(N'Updated ', @CustomerCode);
END;

IF OBJECT_ID(N'dbo.Dim_Customer_AmsConfig', N'U') IS NOT NULL
BEGIN
  IF NOT EXISTS (SELECT 1 FROM dbo.Dim_Customer_AmsConfig WHERE CustomerCode = @CustomerCode)
    INSERT dbo.Dim_Customer_AmsConfig (CustomerCode, AmsEnabled, PillarSyspro)
    VALUES (@CustomerCode, 1, 1);
  ELSE
    UPDATE dbo.Dim_Customer_AmsConfig
    SET AmsEnabled = 1, PillarSyspro = 1
    WHERE CustomerCode = @CustomerCode;
END;

IF OBJECT_ID(N'dbo.Dim_Customer_SyncLog', N'U') IS NOT NULL
  INSERT INTO dbo.Dim_Customer_SyncLog (ActionType, CustomerCode, Detail, DryRun)
  VALUES (N'RegisterCustomer', @CustomerCode,
    CONCAT(N'DisplayName=', @DisplayName, N' Instance=', @SqlInstanceName), 0);

SELECT CustomerCode, DisplayName, Active, SqlInstanceName, UpdatedAt
FROM dbo.Dim_Customer WHERE CustomerCode = @CustomerCode;
"@

$registered = $false
# Prefer direct to central (this workstation can often reach 14333)
$rReg = Invoke-Sql -Sqlcmd $sqlcmd -Server $CentralHost -AuthMode 'sql' `
  -User $CentralUser -Password $CentralPwd -Database $CentralDb -Query $regSql -TimeoutSec 60
if ($rReg.Ok) {
  $registered = $true
  Write-Ok 'Registered on central (direct)'
  Log $rReg.StdOut
} else {
  Write-Warn2 'Direct central write failed - trying linked server...'
  Log ('direct fail ' + $rReg.StdErr + $rReg.StdOut)
  $viaLs = @"
SET NOCOUNT ON;
EXEC(N'$($regSql -replace "'", "''")') AT [$DefaultLinkedName];
"@
  # four-part insert is more reliable than EXEC AT for some providers
  $viaLs = @"
SET NOCOUNT ON;
IF NOT EXISTS (
  SELECT 1 FROM [$DefaultLinkedName].[$CentralDb].dbo.Dim_Customer
  WHERE CustomerCode = N'$(Escape-Sql $CustomerCode)')
  INSERT [$DefaultLinkedName].[$CentralDb].dbo.Dim_Customer
    (CustomerCode, DisplayName, Active, SqlInstanceName, CreatedAt, UpdatedAt)
  VALUES (N'$(Escape-Sql $CustomerCode)', N'$(Escape-Sql $DisplayName)', 1,
          N'$(Escape-Sql $InstanceName)', SYSUTCDATETIME(), SYSUTCDATETIME());
ELSE
  UPDATE [$DefaultLinkedName].[$CentralDb].dbo.Dim_Customer
  SET DisplayName = N'$(Escape-Sql $DisplayName)', Active = 1,
      SqlInstanceName = N'$(Escape-Sql $InstanceName)', UpdatedAt = SYSUTCDATETIME()
  WHERE CustomerCode = N'$(Escape-Sql $CustomerCode)';
SELECT CustomerCode, DisplayName, SqlInstanceName
FROM [$DefaultLinkedName].[$CentralDb].dbo.Dim_Customer
WHERE CustomerCode = N'$(Escape-Sql $CustomerCode)';
"@
  $rVia = Invoke-Sql -Sqlcmd $sqlcmd -Server $LocalServer -AuthMode $AdminMode `
    -User $AdminUser -Password $AdminPwd -Query $viaLs -TimeoutSec 60
  Log $rVia.StdOut
  if ($rVia.Ok) { $registered = $true; Write-Ok 'Registered on central (via linked server)' }
  else { Write-Warn2 'Could not write Dim_Customer yet. 301 SQL saved for later.'; Log $rVia.StdErr }
}

# save 301 for retry
[IO.File]::WriteAllText((Join-Path $OutDir ("301_Central_Register_$CustomerCode.sql")), $regSql, (New-Object System.Text.UTF8Encoding $false))

# ---------- config ----------
$config = @"
# Auto-generated by Install-NewCustomer-OneShot.ps1 - protect this file
`$CustomerCode = '$CustomerCode'
`$DisplayName = '$(Escape-Sql $DisplayName)'
`$InstanceName = '$InstanceName'
`$LocalSqlUser = '$CollectUser'
`$LocalSqlPassword = '$(Escape-Sql $CollectPwd)'
`$CentralSqlUser = '$CentralUser'
`$CentralSqlPassword = '$(Escape-Sql $CentralPwd)'
`$CentralDataSource = '$CentralHost'
`$CentralDatabase = '$CentralDb'
`$CollectDir = '$OutDir'
`$LogDir = '$OutDir\logs'
`$CompanyDatabases = @(
$(($CompanyDatabases | ForEach-Object { "  '$_'" }) -join "`r`n")
)
"@
[IO.File]::WriteAllText((Join-Path $OutDir 'Customer.Config.ps1'), $config, (New-Object System.Text.UTF8Encoding $false))
Write-Ok ('Wrote ' + (Join-Path $OutDir 'Customer.Config.ps1'))

# proof file
$proof = @"
RPM Assure onboard proof
CustomerCode  = $CustomerCode
DisplayName   = $DisplayName
LocalServer   = $LocalServer
InstanceName  = $InstanceName
CollectUser   = $CollectUser
CompanyDBs    = $($CompanyDatabases -join ', ')
Central       = $CentralHost / $CentralDb
Registered    = $registered
When          = $((Get-Date).ToString('o'))
Log           = $Log
"@
[IO.File]::WriteAllText((Join-Path $OutDir 'ONBOARD_PROOF.txt'), $proof, (New-Object System.Text.UTF8Encoding $false))

Write-Host ''
Write-Host '========================================' -ForegroundColor Green
Write-Host ' ONBOARD COMPLETE'
Write-Host ("  Customer : {0} ({1})" -f $DisplayName, $CustomerCode)
Write-Host ("  Instance : {0}" -f $InstanceName)
Write-Host ("  Collect  : {0} (read-only on company DBs)" -f $CollectUser)
Write-Host ("  Central  : {0}  registered={1}" -f $CentralHost, $registered)
Write-Host ("  Files    : {0}" -f $OutDir)
Write-Host '  Next: generate collect pack (optional)'
Write-Host '    powershell -File C:\RPM-Assure\Sql\new-customer\New-CustomerOnboardPack.ps1 -ConfigFile Customer.Config.ps1'
Write-Host '  Then hard-refresh Assure Exco - new customer should appear after collect.'
Write-Host '========================================' -ForegroundColor Green
Write-Host '=== Done ==='
Log 'DONE'
