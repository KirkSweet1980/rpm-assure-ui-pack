# Onboard Interbrand SYSPRO: agent + collect login + Customer.Config
# Run as Administrator on the Interbrand SYSPRO SQL host.
# Prefers git clone / Assure download — does not require raw.githubusercontent.com.

param(
  [string]$BootstrapUser = 'SysproLoginForPos',
  [string]$BootstrapPassword = '',
  [string]$CollectUser = 'rpmassure',
  [string]$CollectPassword = '@ssuR3me!',
  [string]$SqlInstance = '.',
  [string]$AgentSecret = 'xc9pDuhf7ldzcmkwsE+joSdgpuD5RJaz',
  [string]$AppHttpsUrl = 'https://assure.rpmresources.co.za',
  [string]$RepoUrl = 'https://github.com/KirkSweet1980/rpm-assure-ui-pack.git',
  [string]$Root = 'C:\RPM-Assure'
)

$ErrorActionPreference = 'Stop'
$IsAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $IsAdmin) { throw 'Run as Administrator on the Interbrand SYSPRO server.' }
if (-not $BootstrapPassword) {
  $sec = Read-Host 'Password for SysproLoginForPos' -AsSecureString
  $BootstrapPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
}

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

function Find-Git {
  $g = Get-Command git -ErrorAction SilentlyContinue
  if ($g) { return $g.Source }
  foreach ($p in @('C:\Program Files\Git\cmd\git.exe', 'C:\Program Files (x86)\Git\cmd\git.exe')) {
    if (Test-Path $p) { return $p }
  }
  return $null
}
function Install-GitIfMissing {
  $git = Find-Git
  if ($git) { return $git }
  Write-Host 'Installing Git for Windows (silent)...'
  $tmp = Join-Path $env:TEMP 'Git-64-bit.exe'
  Invoke-WebRequest -UseBasicParsing -TimeoutSec 180 `
    -Uri 'https://github.com/git-for-windows/git/releases/download/v2.47.1.windows.1/Git-2.47.1-64-bit.exe' `
    -OutFile $tmp
  $p = Start-Process -FilePath $tmp -ArgumentList '/VERYSILENT','/NORESTART','/NOCANCEL','/SP-' -Wait -PassThru
  if ($p.ExitCode -ne 0) { throw ('Git installer exit ' + $p.ExitCode) }
  $git = Find-Git
  if (-not $git) { throw 'Git installed but git.exe not found' }
  return $git
}

$git = Install-GitIfMissing
$Pack = Join-Path $Root 'deploy\ui-pack'
New-Item -ItemType Directory -Force -Path (Join-Path $Root 'deploy') | Out-Null
if (Test-Path (Join-Path $Pack '.git')) {
  Write-Host ('git pull ' + $Pack)
  & $git -C $Pack -c core.longpaths=true fetch --all --prune
  if ($LASTEXITCODE -ne 0) { throw 'git fetch failed' }
  & $git -C $Pack -c core.longpaths=true reset --hard origin/main
  if ($LASTEXITCODE -ne 0) { throw 'git reset failed' }
} else {
  if (Test-Path $Pack) { Remove-Item $Pack -Recurse -Force }
  Write-Host ('git clone ' + $RepoUrl)
  & $git -c core.longpaths=true clone --depth 1 --branch main $RepoUrl $Pack
  if ($LASTEXITCODE -ne 0) { throw 'git clone failed' }
}

$deploy = Join-Path $Pack 'Sql\agent\Deploy-Assure-Agent.ps1'
if (-not (Test-Path $deploy)) { $deploy = Join-Path $Pack 'sql\agent\Deploy-Assure-Agent.ps1' }
if (-not (Test-Path $deploy)) { throw 'Pack missing Deploy-Assure-Agent.ps1 after git clone' }
& $deploy -CustomerCode 'IB' -RoleTags 'syspro,sql' -AgentSecret $AgentSecret -AppHttpsUrl $AppHttpsUrl -Root $Root

$sqlcmd = 'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE'
if (-not (Test-Path $sqlcmd)) { $sqlcmd = 'sqlcmd' }

$grantSql = @"
SET NOCOUNT ON;
USE master;
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'$CollectUser')
  CREATE LOGIN [$CollectUser] WITH PASSWORD = N'$CollectPassword', CHECK_POLICY = ON;
ELSE
  ALTER LOGIN [$CollectUser] WITH PASSWORD = N'$CollectPassword';
DECLARE @db sysname, @q nvarchar(max);
DECLARE c CURSOR LOCAL FAST_FORWARD FOR
  SELECT name FROM sys.databases
  WHERE state = 0 AND (name LIKE N'Syspro%' OR name IN (N'SYSPRODeployment', N'msdb'));
OPEN c; FETCH NEXT FROM c INTO @db;
WHILE @@FETCH_STATUS = 0
BEGIN
  SET @q = N'USE ' + QUOTENAME(@db) + N';
    IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N''$CollectUser'')
      CREATE USER [$CollectUser] FOR LOGIN [$CollectUser];
    ALTER ROLE db_datareader ADD MEMBER [$CollectUser];';
  BEGIN TRY EXEC(@q); PRINT 'reader ' + @db; END TRY
  BEGIN CATCH PRINT 'skip ' + @db + ' ' + ERROR_MESSAGE(); END CATCH
  FETCH NEXT FROM c INTO @db;
END
CLOSE c; DEALLOCATE c;
SELECT @@SERVERNAME AS ServerName;
SELECT name FROM sys.databases WHERE state = 0 AND name LIKE N'SysproCompany%' ORDER BY name;
"@
$grantFile = Join-Path $env:TEMP 'ib-grant-rpmassure.sql'
[IO.File]::WriteAllText($grantFile, $grantSql)
Write-Host "Creating $CollectUser on $SqlInstance using $BootstrapUser ..."
& $sqlcmd -S $SqlInstance -U $BootstrapUser -P $BootstrapPassword -C -b -i $grantFile
if ($LASTEXITCODE -ne 0) { throw "sqlcmd grant failed $LASTEXITCODE - check instance and SysproLoginForPos rights (needs CREATE LOGIN / user)." }

$custDir = Join-Path $Root 'Sql\customers\IB'
New-Item -ItemType Directory -Force -Path $custDir, (Join-Path $custDir 'logs') | Out-Null
$packCust = Join-Path $Pack 'Sql\customers\IB'
if (-not (Test-Path $packCust)) { $packCust = Join-Path $Pack 'sql\customers\IB' }
if (Test-Path $packCust) { Copy-Item -Force (Join-Path $packCust '*') $custDir -Exclude 'logs' }

$dbsTxt = & $sqlcmd -S $SqlInstance -U $CollectUser -P $CollectPassword -C -h -1 -W -Q "SET NOCOUNT ON; SELECT name FROM sys.databases WHERE state=0 AND name LIKE 'SysproCompany%' ORDER BY 1;"
$cos = @()
foreach ($line in @($dbsTxt)) {
  $n = ([string]$line).Trim()
  if ($n -and $n -notmatch 'Changed database|^name$|^-+$') { $cos += $n }
}
$cosLit = if ($cos.Count) { "'" + ($cos -join "','") + "'" } else { '' }
$cfg = @"
# Interbrand SYSPRO - written by Onboard-IB-Syspro.ps1
`$CustomerCode = 'IB'
`$DisplayName = 'Interbrand'
`$InstanceName = '$env:COMPUTERNAME'
`$SqlInstanceName = '$SqlInstance'
`$LocalSqlUser = '$CollectUser'
`$LocalSqlPassword = '$CollectPassword'
`$CentralSqlUser = 'rpmassure'
`$CentralSqlPassword = '@ssuR3me!'
`$CentralDataSource = '102.222.21.220,14333'
`$CentralDatabase = 'RPMAssure_App'
`$CollectDir = '$custDir'
`$LogDir = '$(Join-Path $custDir 'logs')'
`$CompanyDatabases = @($cosLit)
"@
[IO.File]::WriteAllText((Join-Path $custDir 'Customer.Config.ps1'), $cfg)
Write-Host ("Wrote Customer.Config company DBs: " + ($cos -join ', '))

$native = Join-Path $Root 'Sql\base\syspro-direct\Collect-Dtr-Native-Fallback.ps1'
if (Test-Path $native) {
  Write-Host 'First SYSPRO native collect...'
  & $native -ConfigPath (Join-Path $custDir 'Customer.Config.ps1')
}

Write-Host '========================================'
Write-Host ' IB SYSPRO ONBOARD COMPLETE'
Write-Host (" Host     " + $env:COMPUTERNAME)
Write-Host (" Collect  " + $CollectUser)
Write-Host (" DBs      " + ($(if ($cos.Count) { $cos -join ', ' } else { '(none yet)' })))
Write-Host ' On central: run 519_Enable_IB_Syspro_Cover.sql'
Write-Host '========================================'
Get-Service RPMAssure-Edge -ErrorAction SilentlyContinue | Format-Table Name, Status -AutoSize
