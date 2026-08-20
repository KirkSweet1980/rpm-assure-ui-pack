# Onboard Interbrand SYSPRO. Administrator on the IB SYSPRO SQL host.
# No Git. No GitHub. Pack comes from Assure HTTPS.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\Onboard-IB-Syspro.ps1 `
#     -BootstrapPassword 'P@ssw0rdF0rP0$'

param(
  [string]$BootstrapUser = 'SysproLoginForPos',
  [string]$BootstrapPassword = 'P@ssw0rdF0rP0$',
  [string]$CollectUser = 'rpmassure',
  [string]$CollectPassword = '',
  [string]$SqlInstance = '.',
  [string]$AgentSecret = 'xc9pDuhf7ldzcmkwsE+joSdgpuD5RJaz',
  [string]$AppHttpsUrl = 'https://assure.rpmresources.co.za',
  [string]$Root = 'C:\RPM-Assure'
)

$ErrorActionPreference = 'Stop'
$IsAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $IsAdmin) { throw 'Run as Administrator on the Interbrand SYSPRO server.' }
if (-not $BootstrapPassword) { throw 'BootstrapPassword for SysproLoginForPos is required.' }

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$base = $AppHttpsUrl.TrimEnd('/')

function Get-AssureFile([string]$Name, [string]$Dest) {
  $urls = @(
    ($base + '/downloads/' + $Name),
    ($base + '/api/agent/pack?name=' + [uri]::EscapeDataString($Name))
  )
  $last = $null
  foreach ($u in $urls) {
    try {
      Write-Host ('GET ' + $u)
      Invoke-WebRequest -UseBasicParsing -TimeoutSec 180 -Uri $u -OutFile $Dest `
        -Headers @{ 'X-Assure-Secret' = $AgentSecret }
      if ((Test-Path -LiteralPath $Dest) -and (Get-Item -LiteralPath $Dest).Length -gt 200) {
        Write-Host ('OK ' + $Name + ' ' + (Get-Item -LiteralPath $Dest).Length + ' bytes')
        return $true
      }
    } catch {
      $last = $_.Exception.Message
      Write-Host ('MISS ' + $u + ' ' + $last)
    }
  }
  return $false
}

Write-Host '========================================'
Write-Host ' Interbrand SYSPRO onboard'
Write-Host '========================================'
Write-Host ('Host     ' + $env:COMPUTERNAME)
Write-Host ('SQL      ' + $SqlInstance + ' as ' + $BootstrapUser)
Write-Host ('HTTPS    ' + $base)

$Pack = Join-Path $Root 'deploy\ui-pack'
New-Item -ItemType Directory -Force -Path (Join-Path $Root 'deploy'), (Join-Path $Root 'Agent\logs') | Out-Null

$zip = Join-Path $env:TEMP 'rpm-assure-agent.zip'
$gotZip = Get-AssureFile 'rpm-assure-agent.zip' $zip
if ($gotZip) {
  if (Test-Path $Pack) { Remove-Item $Pack -Recurse -Force }
  New-Item -ItemType Directory -Force -Path $Pack | Out-Null
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  [IO.Compression.ZipFile]::ExtractToDirectory($zip, $Pack)
  Write-Host ('Unpacked ' + $Pack)
} else {
  Write-Host 'WARN agent zip not on Assure yet. SQL grant + config will still run.'
  Write-Host '     On the app server: Publish-Agent-Pack.ps1 then re-run this script.'
}

$src = Join-Path $Pack 'Sql\agent'
if (-not (Test-Path (Join-Path $src 'RpmAssure-Agent.ps1'))) { $src = Join-Path $Pack 'sql\agent' }
$AgentRoot = Join-Path $Root 'Agent'
$SqlRoot = Join-Path $Root 'Sql'
if (Test-Path (Join-Path $src 'RpmAssure-Agent.ps1')) {
  New-Item -ItemType Directory -Force -Path $AgentRoot, (Join-Path $SqlRoot 'agent') | Out-Null
  robocopy $src (Join-Path $SqlRoot 'agent') /E /XO /R:1 /W:1 /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
  robocopy $src $AgentRoot /E /XO /R:1 /W:1 /XF Agent.Config.ps1 Agent.Settings.json Agent.Secrets.bin status.json request-sync.flag /XD logs /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
  $baseSrc = Join-Path $Pack 'Sql\base\syspro-direct'
  if (-not (Test-Path $baseSrc)) { $baseSrc = Join-Path $Pack 'sql\base\syspro-direct' }
  if (Test-Path $baseSrc) {
    $baseDest = Join-Path $SqlRoot 'base\syspro-direct'
    New-Item -ItemType Directory -Force -Path $baseDest | Out-Null
    robocopy $baseSrc $baseDest /E /XO /R:1 /W:1 /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
  }
  $cfgPath = Join-Path $AgentRoot 'Agent.Config.ps1'
  if (-not (Test-Path $cfgPath)) {
    @(
      '# Interbrand agent. Passwords are not stored here.',
      "`$CustomerCode = 'IB'",
      "`$DisplayName = 'Interbrand'",
      ("`$InstanceName = '" + $env:COMPUTERNAME + "'"),
      "`$RoleTags = 'syspro,sql'",
      "`$CentralDataSource = '102.222.21.220,14333'",
      "`$CentralDatabase = 'RPMAssure_App'",
      "`$CentralSqlUser = 'rpmassure'",
      ("`$SqlRoot = '" + $SqlRoot + "'"),
      ("`$AgentRoot = '" + $AgentRoot + "'"),
      ("`$LogDir = '" + (Join-Path $AgentRoot 'logs') + "'")
    ) | Set-Content -LiteralPath $cfgPath -Encoding ASCII
  }
  $setPath = Join-Path $AgentRoot 'Agent.Settings.json'
  [ordered]@{
    collectIntervalMin = 2
    jobsIntervalMin    = 1440
    tickSeconds        = 120
    centralDataSource  = '102.222.21.220,14333'
    centralDatabase    = 'RPMAssure_App'
    centralSqlUser     = 'rpmassure'
    encryptSql         = $true
    trustSqlCert       = $true
    appHttpsUrl        = $AppHttpsUrl
    agentSecret        = $AgentSecret
  } | ConvertTo-Json | Set-Content -LiteralPath $setPath -Encoding UTF8

  $lib = Join-Path $AgentRoot 'Lib-SecureConfig.ps1'
  if (Test-Path $lib) {
    . $lib
    $script:RpmaAgentRoot = $AgentRoot
    if (-not (Test-Path (Get-RpmaSecretsPath))) {
      $bytes = New-Object byte[] 18
      [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
      $adminPw = [Convert]::ToBase64String($bytes)
      Initialize-RpmaSecureStore -AdminPassword $adminPw -CentralSqlPassword $CollectPassword `
        -LocalSqlPassword $CollectPassword -CentralDataSource '102.222.21.220,14333' `
        -CentralDatabase 'RPMAssure_App' -CentralSqlUser 'rpmassure'
    }
    Protect-RpmaFolder
  }

  $install = Join-Path $AgentRoot 'Install-Agent-Service.ps1'
  if (Test-Path $install) {
    Write-Host 'Installing RPMAssure-Edge...'
    & $install -AgentRoot $AgentRoot -SqlRoot $SqlRoot
  }
} else {
  Write-Host 'Agent files not in pack - skip service install this pass.'
}

$sqlcmd = 'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE'
if (-not (Test-Path $sqlcmd)) {
  $gc = Get-Command sqlcmd -ErrorAction SilentlyContinue
  if ($gc) { $sqlcmd = $gc.Source } else { throw 'sqlcmd not found on this host.' }
}

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
Write-Host ("Creating $CollectUser on $SqlInstance using $BootstrapUser ...")
& $sqlcmd -S $SqlInstance -U $BootstrapUser -P $BootstrapPassword -C -b -i $grantFile
if ($LASTEXITCODE -ne 0) {
  throw "sqlcmd grant failed $LASTEXITCODE. SysproLoginForPos needs CREATE LOGIN / user on this instance."
}

$custDir = Join-Path $Root 'Sql\customers\IB'
New-Item -ItemType Directory -Force -Path $custDir, (Join-Path $custDir 'logs') | Out-Null
foreach ($rel in @('Sql\customers\IB', 'sql\customers\IB')) {
  $packCust = Join-Path $Pack $rel
  if (Test-Path $packCust) { Copy-Item -Force (Join-Path $packCust '*') $custDir -Exclude 'logs' }
}

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
`$CentralSqlPassword = '$CollectPassword'
`$CentralDataSource = '102.222.21.220,14333'
`$CentralDatabase = 'RPMAssure_App'
`$CollectDir = '$custDir'
`$LogDir = '$(Join-Path $custDir 'logs')'
`$CompanyDatabases = @($cosLit)
"@
[IO.File]::WriteAllText((Join-Path $custDir 'Customer.Config.ps1'), $cfg)
Write-Host ('Wrote Customer.Config company DBs: ' + ($(if ($cos.Count) { $cos -join ', ' } else { '(none)' })))

$collect = Join-Path $Root 'Sql\base\syspro-direct\Run-Syspro-Collect-Direct.ps1'
$native = Join-Path $Root 'Sql\base\syspro-direct\Collect-Dtr-Native-Fallback.ps1'
$config = Join-Path $custDir 'Customer.Config.ps1'
if (Test-Path $collect) {
  Write-Host 'First SYSPRO direct collect...'
  & $collect -ConfigPath $config
} elseif (Test-Path $native) {
  Write-Host 'First SYSPRO native collect...'
  & $native -ConfigPath $config
} else {
  Write-Host 'WARN collect scripts not on disk yet. Re-run after the zip is published.'
}

if (Test-Path (Join-Path $AgentRoot 'RpmAssure-Agent.ps1')) {
  Write-Host 'First HTTPS heartbeat...'
  $env:RPM_ASSURE_IOPS_SECRET = $AgentSecret
  $env:RPM_ASSURE_AGENT_SECRET = $AgentSecret
  & (Join-Path $AgentRoot 'RpmAssure-Agent.ps1') -AgentRoot $AgentRoot -HeartbeatOnly
}

Write-Host '========================================'
Write-Host ' IB SYSPRO ONBOARD COMPLETE'
Write-Host (' Host     ' + $env:COMPUTERNAME)
Write-Host (' Collect  ' + $CollectUser)
Write-Host (' DBs      ' + ($(if ($cos.Count) { $cos -join ', ' } else { '(none yet)' })))
Write-Host ' Next     Hard-refresh Assure > Interbrand > SYSPRO'
Write-Host '========================================'
Get-Service RPMAssure-Edge -ErrorAction SilentlyContinue | Format-Table Name, Status -AutoSize
