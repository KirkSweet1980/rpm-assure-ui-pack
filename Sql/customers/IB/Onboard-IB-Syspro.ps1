# Onboard Interbrand SYSPRO: agent + collect login + Customer.Config
# Run as Administrator on the Interbrand SYSPRO SQL host.
# Bootstrap login creates rpmassure. Do not commit the bootstrap password.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\Onboard-IB-Syspro.ps1 `
#     -BootstrapUser 'SysproLoginForPos' -BootstrapPassword '<from Kirk>' `
#     -AgentSecret 'xc9pDuhf7ldzcmkwsE+joSdgpuD5RJaz'

param(
  [string]$BootstrapUser = 'SysproLoginForPos',
  [string]$BootstrapPassword = '',
  [string]$CollectUser = 'rpmassure',
  [string]$CollectPassword = '@ssuR3me!',
  [string]$SqlInstance = '.',
  [string]$AgentSecret = 'xc9pDuhf7ldzcmkwsE+joSdgpuD5RJaz',
  [string]$AppHttpsUrl = 'https://assure.rpmresources.co.za',
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
$deploy = Join-Path $env:TEMP 'Deploy-Assure-Agent.ps1'
Invoke-WebRequest -UseBasicParsing -TimeoutSec 90 `
  -Uri 'https://raw.githubusercontent.com/KirkSweet1980/rpm-assure-ui-pack/main/Sql/agent/Deploy-Assure-Agent.ps1' `
  -OutFile $deploy
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
$packCust = Join-Path $Root 'deploy\ui-pack\Sql\customers\IB'
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
