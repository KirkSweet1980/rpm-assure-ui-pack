# New-CustomerOnboardPack.ps1
# Build a full SYSPRO collect pack for one managed customer.
# You choose local + central SQL usernames and passwords.
#
# Example (inline):
#   .\New-CustomerOnboardPack.ps1 `
#     -CustomerCode 'SFRUIT' `
#     -DisplayName 'Sir Fruit' `
#     -InstanceName 'SFRUIT-SQL' `
#     -LocalSqlUser 'Rpm_collect' `
#     -LocalSqlPassword 'YourLocalPwd' `
#     -CentralSqlUser 'Rpm_collect' `
#     -CentralSqlPassword 'YourCentralPwd' `
#     -CompanyDatabases @('Sysprodb','SysproCompanyA') `
#     -SourceCollectDir 'C:\RPM-Assure\Sql\collect' `
#     -SourceUvssDir 'C:\RPM-Assure\Sql\customers\UVSS'
#
# Or:  .\New-CustomerOnboardPack.ps1 -ConfigFile .\CustomerOnboard.Config.ps1
#
param(
  [string]$ConfigFile = '',
  [string]$CustomerCode = '',
  [string]$DisplayName = '',
  [string]$InstanceName = '',
  [string]$LocalSqlUser = 'rpmassure',
  [string]$LocalSqlPassword = '',
  [string]$CentralSqlUser = 'rpmassure',
  [string]$CentralSqlPassword = '',
  [string]$CentralDataSource = '102.222.21.220,14333',
  [string]$CentralDatabase = 'RPMAssure_App',
  [string[]]$CompanyDatabases = @('Sysprodb'),
  [string]$LinkedServerName = 'RPM_CENTRAL',
  [string]$LinkedProvider = 'MSOLEDBSQL',
  [string]$OutRoot = 'C:\RPM-Assure\Sql\customers',
  [string]$SourceCollectDir = 'C:\RPM-Assure\Sql\collect',
  [string]$SourceUvssDir = 'C:\RPM-Assure\Sql\customers\UVSS',
  [string]$SourceAhicExtraDir = 'C:\RPM-Assure\Sql\customers\AHIC',
  [switch]$SkipJobsInCore,
  [int]$CoreIntervalMinutes = 15,
  [string]$JobsDailyTime = '02:45'
)

$ErrorActionPreference = 'Stop'

if ($ConfigFile -and (Test-Path -LiteralPath $ConfigFile)) {
  . $ConfigFile
}

if (-not $CustomerCode) { throw 'CustomerCode is required (param or ConfigFile).' }
if (-not $DisplayName) { throw 'DisplayName is required.' }
if (-not $InstanceName) { throw 'InstanceName (customer SQL host name) is required.' }
if (-not $LocalSqlPassword) { throw 'LocalSqlPassword is required (customer DB login password).' }
if (-not $CentralSqlPassword) {
  Write-Warning 'CentralSqlPassword empty — using LocalSqlPassword for linked server remote login.'
  $CentralSqlPassword = $LocalSqlPassword
}
if (-not $CentralSqlUser) { $CentralSqlUser = $LocalSqlUser }

$CustomerCode = $CustomerCode.Trim().ToUpperInvariant()
if ($CustomerCode -notmatch '^[A-Z0-9]{2,20}$') {
  throw 'CustomerCode must be 2-20 chars A-Z / 0-9 (no spaces).'
}

$out = Join-Path $OutRoot $CustomerCode
New-Item -ItemType Directory -Force -Path $out | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $out 'logs') | Out-Null

function Escape-SqlString([string]$s) {
  if ($null -eq $s) { return '' }
  return ($s -replace "'", "''")
}

function Convert-CollectText([string]$text) {
  $t = $text
  # Order: longer / specific first
  $t = $t -replace "N'AHIC-SSQL-SRV'", "N'$InstanceName'"
  $t = $t -replace "N'UVSS-SYSPRO'", "N'$InstanceName'"
  $t = $t -replace 'AHIC-SSQL-SRV', $InstanceName
  $t = $t -replace 'UVSS-SYSPRO', $InstanceName
  $t = $t -replace "N'AHIC'", "N'$CustomerCode'"
  $t = $t -replace "N'UVSS'", "N'$CustomerCode'"
  $t = $t -replace 'AHIC collect', ($CustomerCode + ' collect')
  $t = $t -replace 'UVSS collect', ($CustomerCode + ' collect')
  $t = $t -replace '=== AHIC', ('=== ' + $CustomerCode)
  $t = $t -replace '=== UVSS', ('=== ' + $CustomerCode)
  $t = $t -replace 'Done AHIC', ('Done ' + $CustomerCode)
  $t = $t -replace 'Done UVSS', ('Done ' + $CustomerCode)
  $t = $t -replace 'AHIC not', ($CustomerCode + ' not')
  $t = $t -replace 'UVSS not', ($CustomerCode + ' not')
  $t = $t -replace 'UVSS found', ($CustomerCode + ' found')
  $t = $t -replace 'AHIC found', ($CustomerCode + ' found')
  # leave bare AHIC/UVSS in comments if still present as word boundaries carefully
  $t = $t -replace '\bAHIC\b', $CustomerCode
  $t = $t -replace '\bUVSS\b', $CustomerCode
  return $t
}

# Map: source path relative resolution
$coreSources = @(
  @{ Src = '212_Collect_AHIC_Operators_LastLogin.sql'; Prefer = $SourceCollectDir; Alt = $SourceUvssDir; AltName = '212_Collect_UVSS_Operators_LastLogin.sql' },
  @{ Src = '213_Collect_AHIC_JobLogging.sql'; Prefer = $SourceCollectDir; Alt = $SourceUvssDir; AltName = '213_Collect_UVSS_JobLogging.sql' },
  @{ Src = '213b_Collect_AHIC_JobErrorsOnly.sql'; Prefer = $SourceCollectDir; Alt = $SourceUvssDir; AltName = '213b_Collect_UVSS_JobErrorsOnly.sql' },
  @{ Src = '214_Collect_AHIC_SystemLicense.sql'; Prefer = $SourceCollectDir; Alt = $SourceUvssDir; AltName = '214_Collect_UVSS_SystemLicense.sql' },
  @{ Src = '215_Collect_AHIC_Tasks.sql'; Prefer = $SourceCollectDir; Alt = $SourceUvssDir; AltName = '215_Collect_UVSS_Tasks.sql' },
  @{ Src = '216_Collect_AHIC_HealthLog.sql'; Prefer = $SourceCollectDir; Alt = $SourceUvssDir; AltName = '216_Collect_UVSS_HealthLog.sql' },
  @{ Src = '217_Collect_AHIC_DtrLevel1.sql'; Prefer = $SourceCollectDir; Alt = $SourceUvssDir; AltName = '217_Collect_UVSS_DtrLevel1.sql' },
  @{ Src = '218_Collect_AHIC_OperatorSecurity.sql'; Prefer = $SourceCollectDir; Alt = $SourceUvssDir; AltName = '218_Collect_UVSS_OperatorSecurity.sql' },
  @{ Src = '221_Collect_AHIC_SystemAuditLog.sql'; Prefer = $SourceAhicExtraDir; Alt = $SourceUvssDir; AltName = '221_Collect_UVSS_SystemAuditLog.sql' },
  @{ Src = '222_Collect_AHIC_DiagSummary.sql'; Prefer = $SourceAhicExtraDir; Alt = $SourceUvssDir; AltName = '222_Collect_UVSS_DiagSummary.sql' },
  @{ Src = '223_Collect_AHIC_SqlHealthBal.sql'; Prefer = $SourceAhicExtraDir; Alt = $SourceUvssDir; AltName = '223_Collect_UVSS_SqlHealthBal.sql' },
  @{ Src = '224_Collect_AHIC_SqlBackups.sql'; Prefer = $SourceAhicExtraDir; Alt = $SourceUvssDir; AltName = '224_Collect_UVSS_SqlBackups.sql' },
  @{ Src = '225_Collect_AHIC_VersionHotfix.sql'; Prefer = $SourceAhicExtraDir; Alt = $SourceUvssDir; AltName = '225_Collect_UVSS_VersionHotfix.sql' },
  @{ Src = '226_Grant_msdb_Rpm_collect.sql'; Prefer = $SourceAhicExtraDir; Alt = $SourceUvssDir; AltName = '226_Grant_msdb_Rpm_collect.sql' },
  @{ Src = '227_Collect_AHIC_DeploymentHotfixes.sql'; Prefer = $SourceAhicExtraDir; Alt = $SourceUvssDir; AltName = '227_Collect_UVSS_DeploymentHotfixes.sql' }
)

$generated = New-Object System.Collections.Generic.List[string]

foreach ($item in $coreSources) {
  $srcPath = Join-Path $item.Prefer $item.Src
  if (-not (Test-Path -LiteralPath $srcPath)) {
    $alt = Join-Path $item.Alt $item.AltName
    if (Test-Path -LiteralPath $alt) { $srcPath = $alt }
    else {
      # try UVSS naming from Prefer if AHIC missing
      $try2 = Join-Path $item.Prefer ($item.Src -replace '_AHIC_', '_UVSS_')
      if (Test-Path -LiteralPath $try2) { $srcPath = $try2 }
      else {
        Write-Warning ('Skip missing template: ' + $item.Src)
        continue
      }
    }
  }
  $newName = ($item.Src -replace '_AHIC_', ('_' + $CustomerCode + '_')) -replace '_UVSS_', ('_' + $CustomerCode + '_')
  if ($newName -match '226_Grant') {
    $newName = '226_Grant_msdb_' + $CustomerCode + '.sql'
  }
  $dest = Join-Path $out $newName
  $raw = [IO.File]::ReadAllText($srcPath)
  $conv = Convert-CollectText $raw
  # inject login name if scripts hardcode Rpm_collect in grants only — leave as-is for SQL linked user
  [IO.File]::WriteAllText($dest, $conv)
  [void]$generated.Add($newName)
  Write-Host ('OK ' + $newName)
}

# --- 301 Central register ---
$lp = Escape-SqlString $LocalSqlPassword
$cp = Escape-SqlString $CentralSqlPassword
$dn = Escape-SqlString $DisplayName
$inst = Escape-SqlString $InstanceName
$cc = Escape-SqlString $CustomerCode

$sql301 = @"
/*
  CENTRAL — register $CustomerCode
  sqlcmd -S "$CentralDataSource" -d "$CentralDatabase" -E -C -i 301_Central_Register_$CustomerCode.sql
  (or -U $CentralSqlUser -P *** )
*/
USE [$CentralDatabase];
GO
SET NOCOUNT ON;

DECLARE @CustomerCode    nvarchar(50)  = N'$cc';
DECLARE @DisplayName     nvarchar(200) = N'$dn';
DECLARE @SqlInstanceName nvarchar(100) = N'$inst';
DECLARE @Active          bit           = 1;

IF NOT EXISTS (SELECT 1 FROM dbo.Dim_Customer WHERE CustomerCode = @CustomerCode)
BEGIN
  INSERT dbo.Dim_Customer (CustomerCode, DisplayName, Active, SqlInstanceName, CreatedAt, UpdatedAt)
  VALUES (@CustomerCode, @DisplayName, @Active, @SqlInstanceName, SYSUTCDATETIME(), SYSUTCDATETIME());
  PRINT CONCAT(N'Inserted ', @CustomerCode);
END
ELSE
BEGIN
  UPDATE dbo.Dim_Customer
  SET DisplayName = @DisplayName,
      Active = @Active,
      SqlInstanceName = @SqlInstanceName,
      UpdatedAt = SYSUTCDATETIME()
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
FROM dbo.Dim_Customer
WHERE CustomerCode = @CustomerCode;
GO
"@
[IO.File]::WriteAllText((Join-Path $out "301_Central_Register_$CustomerCode.sql"), $sql301)
Write-Host ('OK 301_Central_Register_' + $CustomerCode + '.sql')

# --- 302 local login ---
$dbInserts = ($CompanyDatabases | ForEach-Object { "  (N'" + (Escape-SqlString $_) + "')," }) -join "`r`n"
if ($dbInserts.EndsWith(',')) { $dbInserts = $dbInserts.TrimEnd(',') }

$sql302 = @"
/*
  CUSTOMER SQL — create local collect login
  sqlcmd -S "." -U sa -P "***" -C -b -i 302_${CustomerCode}_Create_Collect_Login.sql
*/
USE master;
GO
SET NOCOUNT ON;

DECLARE @LoginName sysname = N'$(Escape-SqlString $LocalSqlUser)';
DECLARE @Password  nvarchar(128) = N'$lp';

DECLARE @Dbs TABLE (DbName sysname);
INSERT @Dbs (DbName) VALUES
$dbInserts;

IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = @LoginName)
BEGIN
  DECLARE @sql nvarchar(max) = N'CREATE LOGIN ' + QUOTENAME(@LoginName) +
    N' WITH PASSWORD = ' + QUOTENAME(@Password, '''') + N', CHECK_POLICY = ON;';
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
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = ' + QUOTENAME(@LoginName, '''') + N')
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

PRINT N'Local collect login ready.';
GO
"@
[IO.File]::WriteAllText((Join-Path $out "302_${CustomerCode}_Create_Collect_Login.sql"), $sql302)
Write-Host ('OK 302_' + $CustomerCode + '_Create_Collect_Login.sql')

# --- 303 linked server ---
$sql303 = @"
/*
  CUSTOMER SQL — linked server $LinkedServerName -> $CentralDataSource / $CentralDatabase
  sqlcmd -S "." -U sa -P "***" -C -b -i 303_${CustomerCode}_LinkedServer_Central.sql
*/
USE master;
GO
SET NOCOUNT ON;

DECLARE @CentralHost nvarchar(128) = N'$(Escape-SqlString $CentralDataSource)';
DECLARE @RemoteUser  sysname       = N'$(Escape-SqlString $CentralSqlUser)';
DECLARE @RemotePwd   nvarchar(128) = N'$cp';
DECLARE @LsName      sysname       = N'$(Escape-SqlString $LinkedServerName)';

IF EXISTS (SELECT 1 FROM sys.servers WHERE name = @LsName)
BEGIN
  EXEC sp_dropserver @server = @LsName, @droplogins = 'droplogins';
  PRINT N'Dropped existing linked server';
END;

EXEC sp_addlinkedserver
  @server     = @LsName,
  @srvproduct = N'',
  @provider   = N'$(Escape-SqlString $LinkedProvider)',
  @datasrc    = @CentralHost;

EXEC sp_addlinkedsrvlogin
  @rmtsrvname  = @LsName,
  @useself     = N'False',
  @locallogin  = NULL,
  @rmtuser     = @RemoteUser,
  @rmtpassword = @RemotePwd;

EXEC sp_serveroption @server = @LsName, @optname = N'rpc out', @optvalue = N'true';
EXEC sp_serveroption @server = @LsName, @optname = N'data access', @optvalue = N'true';

PRINT N'Test Dim_Customer via linked server...';
BEGIN TRY
  SELECT TOP 5 CustomerCode, DisplayName, Active
  FROM [$LinkedServerName].[$CentralDatabase].dbo.Dim_Customer
  ORDER BY CustomerCode;
  PRINT N'Linked server OK';
END TRY
BEGIN CATCH
  PRINT CONCAT(N'Linked server TEST FAIL: ', ERROR_MESSAGE());
  PRINT N'If MSOLEDBSQL missing, re-run with -LinkedProvider SQLNCLI11';
END CATCH
GO
"@
[IO.File]::WriteAllText((Join-Path $out "303_${CustomerCode}_LinkedServer_Central.sql"), $sql303)
Write-Host ('OK 303_' + $CustomerCode + '_LinkedServer_Central.sql')

# --- verify ---
$sql304 = @"
/*
  CENTRAL verify after first collect
  sqlcmd -S "$CentralDataSource" -d "$CentralDatabase" -U "$CentralSqlUser" -P "***" -C -Q ...
*/
SET NOCOUNT ON;
SELECT CustomerCode, DisplayName, Active, SqlInstanceName, UpdatedAt
FROM dbo.Dim_Customer WHERE CustomerCode = N'$cc';

SELECT N'Operators' AS Src, COUNT(*) AS Cnt, MAX(ImportedAt) AS LastAt
FROM dbo.Syspro_Operators WHERE InstanceName = N'$inst'
UNION ALL
SELECT N'Jobs', COUNT(*), MAX(ImportedAt) FROM dbo.Syspro_JobLogging WHERE InstanceName = N'$inst'
UNION ALL
SELECT N'License', COUNT(*), MAX(ImportedAt) FROM dbo.Syspro_SystemLicense WHERE InstanceName = N'$inst'
UNION ALL
SELECT N'Tasks', COUNT(*), MAX(ImportedAt) FROM dbo.Syspro_TaskGroup WHERE InstanceName = N'$inst'
UNION ALL
SELECT N'HealthLog', COUNT(*), MAX(ImportedAt) FROM dbo.Syspro_HealthLog WHERE InstanceName = N'$inst';
GO
"@
[IO.File]::WriteAllText((Join-Path $out "304_Verify_${CustomerCode}_Central.sql"), $sql304)

# --- discover DBs helper ---
$sqlScan = @"
SET NOCOUNT ON;
SELECT name AS DbName, state_desc
FROM sys.databases
WHERE name LIKE N'Syspro%' OR name LIKE N'%Company%' OR name = N'Sysprodb'
ORDER BY name;
GO
"@
[IO.File]::WriteAllText((Join-Path $out "300_List_Syspro_Databases.sql"), $sqlScan)

# Core script list for runner
$coreNames = $generated | Where-Object {
  $_ -match '212_|214_|215_|216_|217_|218_|221_|222_|223_|224_|225_' -and $_ -notmatch '226_'
}
$jobName = ($generated | Where-Object { $_ -match '213_Collect' -and $_ -notmatch '213b' } | Select-Object -First 1)
$extraNight = $generated | Where-Object { $_ -match '227_|226_' }

# Config local (credentials) - keep separate
$configPs1 = @"
# Auto-generated credentials for $CustomerCode — protect this file
`$CustomerCode = '$CustomerCode'
`$DisplayName = '$DisplayName'
`$InstanceName = '$InstanceName'
`$LocalSqlUser = '$LocalSqlUser'
`$LocalSqlPassword = '$LocalSqlPassword'
`$CentralSqlUser = '$CentralSqlUser'
`$CentralDataSource = '$CentralDataSource'
`$CentralDatabase = '$CentralDatabase'
`$CollectDir = '$out'
`$LogDir = '$out\logs'
"@
[IO.File]::WriteAllText((Join-Path $out 'Customer.Config.ps1'), $configPs1)

# Runner
$coreQuoted = ($coreNames | ForEach-Object { "  '$_'" }) -join ",`r`n"
$runner = @"
# Collect runner for $CustomerCode — generated by New-CustomerOnboardPack.ps1
param([switch]`$IncludeJobs, [switch]`$JobsOnly, [switch]`$ExtrasOnly)
`$ErrorActionPreference = 'Stop'
. (Join-Path `$PSScriptRoot 'Customer.Config.ps1')
New-Item -ItemType Directory -Force -Path `$LogDir | Out-Null
`$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
`$log = Join-Path `$LogDir ('sched_' + `$stamp + '.log')
function Write-Log([string]`$msg) {
  `$line = '{0:u} {1}' -f (Get-Date).ToUniversalTime(), `$msg
  Add-Content -Path `$log -Value `$line -Encoding ASCII
  Write-Output `$line
}
function Find-Sqlcmd {
  `$cmd = Get-Command sqlcmd -ErrorAction SilentlyContinue
  if (`$cmd) { return `$cmd.Source }
  foreach (`$c in @(
    'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\sqlcmd.exe',
    'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\180\Tools\Binn\sqlcmd.exe',
    'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\130\Tools\Binn\sqlcmd.exe'
  )) { if (Test-Path `$c) { return `$c } }
  throw 'sqlcmd not found'
}
`$CoreScripts = @(
$coreQuoted
)
`$JobScript = '$jobName'
`$ExtraScripts = @(
$(($extraNight | ForEach-Object { "  '$_'" }) -join ",`r`n")
)
`$scripts = New-Object System.Collections.Generic.List[string]
if (`$JobsOnly) {
  if (`$JobScript) { [void]`$scripts.Add((Join-Path `$CollectDir `$JobScript)) }
} elseif (`$ExtrasOnly) {
  foreach (`$n in `$ExtraScripts) {
    `$p = Join-Path `$CollectDir `$n
    if (Test-Path `$p) { [void]`$scripts.Add(`$p) }
  }
} else {
  foreach (`$n in `$CoreScripts) {
    `$p = Join-Path `$CollectDir `$n
    if (Test-Path `$p) { [void]`$scripts.Add(`$p) }
  }
  if (`$IncludeJobs -and `$JobScript) {
    `$p = Join-Path `$CollectDir `$JobScript
    if (Test-Path `$p) { [void]`$scripts.Add(`$p) }
  }
}
Write-Log ('START $CustomerCode host=' + `$env:COMPUTERNAME + ' scripts=' + `$scripts.Count)
`$sqlcmd = Find-Sqlcmd
Write-Log ('sqlcmd=' + `$sqlcmd)
`$failed = `$false
foreach (`$SqlFile in `$scripts) {
  Write-Log ('RUN ' + `$SqlFile)
  `$base = [IO.Path]::GetFileNameWithoutExtension(`$SqlFile)
  `$outFile = Join-Path `$LogDir ('out_' + `$stamp + '_' + `$base + '.txt')
  `$errFile = Join-Path `$LogDir ('err_' + `$stamp + '_' + `$base + '.txt')
  `$p = Start-Process -FilePath `$sqlcmd -ArgumentList @(
    '-S', '.', '-U', `$LocalSqlUser, '-P', `$LocalSqlPassword, '-C', '-b', '-i', `$SqlFile
  ) -Wait -PassThru -NoNewWindow -RedirectStandardOutput `$outFile -RedirectStandardError `$errFile
  if (Test-Path `$outFile) { Get-Content `$outFile | ForEach-Object { Write-Log `$_ } }
  if (Test-Path `$errFile) {
    `$err = Get-Content `$errFile -Raw
    if (`$err) { Write-Log `$err }
  }
  Write-Log ('EXITCODE=' + `$p.ExitCode + ' file=' + `$SqlFile)
  if (`$p.ExitCode -ne 0) { `$failed = `$true; Write-Log ('FAIL continuing: ' + `$SqlFile) }
}
if (`$failed) { Write-Log 'DONE_WITH_ERRORS'; exit 1 }
Write-Log 'SUCCESS'
exit 0
"@
$runnerPath = Join-Path $out ("Run-${CustomerCode}-Collect-Scheduled.ps1")
[IO.File]::WriteAllText($runnerPath, $runner)

$cmdPath = Join-Path $out ("Run-${CustomerCode}-Collect.cmd")
$cmdBody = @"
@echo off
cd /d "$out"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$runnerPath" %*
exit /b %ERRORLEVEL%
"@
[IO.File]::WriteAllText($cmdPath, $cmdBody)

# Install schedule - cmd only for schtasks
$install = @"
# Install schedules for $CustomerCode — run as Administrator
param(
  [int]`$CoreIntervalMinutes = $CoreIntervalMinutes,
  [string]`$JobsDailyTime = '$JobsDailyTime'
)
`$ErrorActionPreference = 'Stop'
`$core = 'RPMAssure-$CustomerCode-SysproCollect'
`$jobs = 'RPMAssure-$CustomerCode-SysproJobs'
`$cmdPath = '$cmdPath'
`$ps1 = '$runnerPath'
if (-not (Test-Path -LiteralPath `$cmdPath)) { throw ('Missing ' + `$cmdPath) }
if (-not (Test-Path -LiteralPath `$ps1)) { throw ('Missing ' + `$ps1) }

cmd.exe /c "schtasks /Delete /TN ``"`$core``" /F >nul 2>&1" | Out-Null
cmd.exe /c "schtasks /Create /F /TN ``"`$core``" /TR ``"`$cmdPath``" /SC MINUTE /MO `$CoreIntervalMinutes /RU SYSTEM /RL HIGHEST"
if (`$LASTEXITCODE -ne 0) { throw 'Failed creating core collect task' }

`$trJobs = 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "' + `$ps1 + '" -JobsOnly'
cmd.exe /c "schtasks /Delete /TN ``"`$jobs``" /F >nul 2>&1" | Out-Null
cmd.exe /c "schtasks /Create /F /TN ``"`$jobs``" /TR ``"`$trJobs``" /SC DAILY /ST `$JobsDailyTime /RU SYSTEM /RL HIGHEST"
if (`$LASTEXITCODE -ne 0) { throw 'Failed creating jobs task' }

Write-Host ('OK ' + `$core + ' every ' + `$CoreIntervalMinutes + ' min') -ForegroundColor Green
Write-Host ('OK ' + `$jobs + ' daily ' + `$JobsDailyTime) -ForegroundColor Green
"@
# Fix backticks for install - write more carefully without double escaping mess
$install = @"
# Install schedules for $CustomerCode — run as Administrator. Pure ASCII.
param(
  [int]`$CoreIntervalMinutes = $CoreIntervalMinutes,
  [string]`$JobsDailyTime = '$JobsDailyTime'
)
`$ErrorActionPreference = 'Stop'
`$coreName = 'RPMAssure-$CustomerCode-SysproCollect'
`$jobsName = 'RPMAssure-$CustomerCode-SysproJobs'
`$cmdPath = '$cmdPath'
`$ps1 = '$runnerPath'
if (-not (Test-Path -LiteralPath `$cmdPath)) { throw ('Missing ' + `$cmdPath) }

`$delCore = 'schtasks /Delete /TN "' + `$coreName + '" /F >nul 2>&1'
cmd.exe /c `$delCore | Out-Null
`$createCore = 'schtasks /Create /F /TN "' + `$coreName + '" /TR "' + `$cmdPath + '" /SC MINUTE /MO ' + `$CoreIntervalMinutes + ' /RU SYSTEM /RL HIGHEST'
cmd.exe /c `$createCore
if (`$LASTEXITCODE -ne 0) { throw 'Failed creating core collect task' }

`$delJobs = 'schtasks /Delete /TN "' + `$jobsName + '" /F >nul 2>&1'
cmd.exe /c `$delJobs | Out-Null
`$trJobs = 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "' + `$ps1 + '" -JobsOnly'
`$createJobs = 'schtasks /Create /F /TN "' + `$jobsName + '" /TR "' + `$trJobs + '" /SC DAILY /ST ' + `$JobsDailyTime + ' /RU SYSTEM /RL HIGHEST'
cmd.exe /c `$createJobs
if (`$LASTEXITCODE -ne 0) { throw 'Failed creating jobs task' }

Write-Host ('OK ' + `$coreName + ' every ' + `$CoreIntervalMinutes + ' min') -ForegroundColor Green
Write-Host ('OK ' + `$jobsName + ' daily ' + `$JobsDailyTime) -ForegroundColor Green
"@
[IO.File]::WriteAllText((Join-Path $out "Install-${CustomerCode}-Schedule.ps1"), $install)

# Finish orchestrator on customer
$finish = @"
# One-shot setup on CUSTOMER SQL host after files are copied.
# Run as Administrator with sa (or equivalent) for 302/303, then collect as LocalSqlUser.
param(
  [string]`$SaUser = 'sa',
  [string]`$SaPassword = '',
  [switch]`$SkipLoginCreate,
  [switch]`$SkipLinkedServer,
  [switch]`$SkipCollect,
  [switch]`$InstallSchedule
)
`$ErrorActionPreference = 'Stop'
. (Join-Path `$PSScriptRoot 'Customer.Config.ps1')
function Find-Sqlcmd {
  `$cmd = Get-Command sqlcmd -ErrorAction SilentlyContinue
  if (`$cmd) { return `$cmd.Source }
  throw 'sqlcmd not found'
}
`$sqlcmd = Find-Sqlcmd
function Run-SqlFile([string]`$file, [string]`$user, [string]`$pass) {
  Write-Host ('RUN ' + `$file) -ForegroundColor Cyan
  & `$sqlcmd -S '.' -U `$user -P `$pass -C -b -i `$file
  if (`$LASTEXITCODE -ne 0) { throw ('sqlcmd failed ' + `$LASTEXITCODE + ' ' + `$file) }
}
if (-not `$SkipLoginCreate) {
  if (-not `$SaPassword) { throw 'Provide -SaPassword for 302/303 (or -SkipLoginCreate if already done).' }
  Run-SqlFile (Join-Path `$PSScriptRoot '302_${CustomerCode}_Create_Collect_Login.sql') `$SaUser `$SaPassword
}
if (-not `$SkipLinkedServer) {
  if (-not `$SaPassword) { throw 'Provide -SaPassword for linked server.' }
  Run-SqlFile (Join-Path `$PSScriptRoot '303_${CustomerCode}_LinkedServer_Central.sql') `$SaUser `$SaPassword
}
if (-not `$SkipCollect) {
  & (Join-Path `$PSScriptRoot 'Run-${CustomerCode}-Collect-Scheduled.ps1')
}
if (`$InstallSchedule) {
  & (Join-Path `$PSScriptRoot 'Install-${CustomerCode}-Schedule.ps1')
}
Write-Host 'Finish script complete.' -ForegroundColor Green
"@
[IO.File]::WriteAllText((Join-Path $out "Finish-${CustomerCode}-OnCustomer.ps1"), $finish)

# README
$readme = @"
RPM Assure — customer pack: $CustomerCode
=========================================
DisplayName : $DisplayName
Instance    : $InstanceName
Local SQL   : $LocalSqlUser (password in Customer.Config.ps1)
Central     : $CentralDataSource / $CentralDatabase as $CentralSqlUser
DBs granted : $($CompanyDatabases -join ', ')
Out folder  : $out

ORDER
-----
1) CENTRAL (app SQL host)
   sqlcmd -S "$CentralDataSource" -d "$CentralDatabase" -E -C -i 301_Central_Register_$CustomerCode.sql
   (or -U $CentralSqlUser -P ***)

2) CUSTOMER SQL (as sa)
   Optional: sqlcmd -S "." -U sa -P *** -C -i 300_List_Syspro_Databases.sql
   sqlcmd -S "." -U sa -P *** -C -b -i 302_${CustomerCode}_Create_Collect_Login.sql
   sqlcmd -S "." -U sa -P *** -C -b -i 303_${CustomerCode}_LinkedServer_Central.sql

   Or one shot:
   powershell -File Finish-${CustomerCode}-OnCustomer.ps1 -SaPassword '***' -InstallSchedule

3) SMOKE COLLECT (as collect login — Finish does this unless -SkipCollect)
   powershell -File Run-${CustomerCode}-Collect-Scheduled.ps1

4) VERIFY on central
   sqlcmd -S "$CentralDataSource" -d "$CentralDatabase" -U $CentralSqlUser -P *** -C -i 304_Verify_${CustomerCode}_Central.sql

5) SCHEDULE (Administrator)
   powershell -File Install-${CustomerCode}-Schedule.ps1

6) UI — refresh Global Overview; customer appears when Active.

NOTES
-----
- Collect scripts write via linked server [$LinkedServerName].
- Password for local collect and linked-server remote user can differ (Local vs Central params).
- If linked server fails with provider error, regenerate with -LinkedProvider SQLNCLI11
- DTR rows only if Dtr*Balances exist on company DBs.
- Protect Customer.Config.ps1 (contains passwords).

Scripts generated ($($generated.Count)):
$($generated -join "`n")
"@
[IO.File]::WriteAllText((Join-Path $out 'README.txt'), $readme)

$meta = @"
CustomerCode=$CustomerCode
DisplayName=$DisplayName
InstanceName=$InstanceName
LocalSqlUser=$LocalSqlUser
CentralSqlUser=$CentralSqlUser
CentralDataSource=$CentralDataSource
GeneratedUtc=$((Get-Date).ToUniversalTime().ToString('u'))
ScriptCount=$($generated.Count)
"@
[IO.File]::WriteAllText((Join-Path $out 'CUSTOMER.txt'), $meta)

Write-Host ''
Write-Host ('Pack ready: ' + $out) -ForegroundColor Green
Write-Host 'Next: register on central (301), then Finish-*-OnCustomer.ps1 on customer SQL.'
