# Deploy-Assure-Agent.ps1
# No wizard. Administrator PowerShell on the customer host.
# Pulls the agent pack from Assure HTTPS only. No Git. No GitHub.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\Deploy-Assure-Agent.ps1
#   (prompts for customer code)
#
# If the customer does not exist on Assure, you are asked which services to enable.

param(
  [string]$CustomerCode = '',
  [string]$AgentSecret = '',
  [string]$AppHttpsUrl = 'https://assure.rpmresources.co.za',
  [string]$Root = 'C:\RPM-Assure',
  [string]$RoleTags = 'edge',
  [string]$CentralDataSource = '',
  [string]$CentralDatabase = 'RPMAssure_App',
  [string]$CentralSqlUser = '',
  [string]$CentralSqlPassword = '',
  [string]$AgentAdminPassword = '',
  [switch]$SkipHeartbeat,
  [switch]$Unattended
)

$ErrorActionPreference = 'Stop'
if (-not $CustomerCode) {
  Write-Host 'Customer codes: AHIC RSR RSS UVSS HYDRA ABLE SBS BHF SIRF RPMINT IB METSI YLJ MEDIPOS VAULT PCNS'
  $CustomerCode = Read-Host 'Customer code'
}
$CustomerCode = $CustomerCode.Trim().ToUpperInvariant()
if (-not $CustomerCode) { throw 'CustomerCode is required' }
if (-not $AgentSecret) { $AgentSecret = [string]$env:RPM_ASSURE_AGENT_SECRET }
if (-not $AgentSecret) { $AgentSecret = [string]$env:RPM_ASSURE_IOPS_SECRET }
if (-not $AgentSecret) { throw 'AgentSecret is required' }

$IsAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $IsAdmin) { throw 'Run as Administrator.' }

Write-Host '========================================'
Write-Host ' RPM Assure Edge - deploy (Assure HTTPS)'
Write-Host '========================================'
Write-Host ("Customer  " + $CustomerCode)
Write-Host ("HTTPS     " + $AppHttpsUrl)

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Pack = Join-Path $Root 'deploy\ui-pack'
New-Item -ItemType Directory -Force -Path (Join-Path $Root 'deploy') | Out-Null
$zip = Join-Path $env:TEMP 'rpm-assure-agent.zip'
$base = $AppHttpsUrl.TrimEnd('/')
Write-Host ('GET ' + $base + '/downloads/rpm-assure-agent.zip')
Invoke-WebRequest -UseBasicParsing -TimeoutSec 180 -Uri ($base + '/downloads/rpm-assure-agent.zip') -OutFile $zip
if (-not (Test-Path $zip) -or (Get-Item $zip).Length -lt 1000) { throw 'Agent pack download failed or empty. Publish the pack on Assure first.' }
if (Test-Path $Pack) { Remove-Item $Pack -Recurse -Force }
New-Item -ItemType Directory -Force -Path $Pack | Out-Null
Add-Type -AssemblyName System.IO.Compression.FileSystem
[IO.Compression.ZipFile]::ExtractToDirectory($zip, $Pack)
Write-Host ('Unpacked pack to ' + $Pack)

$src = Join-Path $Pack 'Sql\agent'
if (-not (Test-Path (Join-Path $src 'RpmAssure-Agent.ps1'))) { $src = Join-Path $Pack 'sql\agent' }
if (-not (Test-Path (Join-Path $src 'RpmAssure-Agent.ps1'))) { throw ('Pack missing Sql\agent after unzip: ' + $Pack) }

$AgentRoot = Join-Path $Root 'Agent'
$SqlRoot = Join-Path $Root 'Sql'
$AgentSrc = Join-Path $SqlRoot 'agent'
New-Item -ItemType Directory -Force -Path $AgentRoot, (Join-Path $AgentRoot 'logs'), $AgentSrc | Out-Null
robocopy $src $AgentSrc /E /XO /R:1 /W:1 /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
robocopy $src $AgentRoot /E /XO /R:1 /W:1 /XF Agent.Config.ps1 Agent.Settings.json Agent.Secrets.bin status.json request-sync.flag /XD logs /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null

$baseSrc = Join-Path $Pack 'Sql\base\syspro-direct'
if (Test-Path $baseSrc) {
  $baseDest = Join-Path $SqlRoot 'base\syspro-direct'
  New-Item -ItemType Directory -Force -Path $baseDest | Out-Null
  robocopy $baseSrc $baseDest /E /XO /R:1 /W:1 /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
}

$custSrc = Join-Path $Pack ("Sql\customers\" + $CustomerCode)
$custDest = Join-Path $SqlRoot ("customers\" + $CustomerCode)
New-Item -ItemType Directory -Force -Path $custDest | Out-Null
if (Test-Path $custSrc) {
  robocopy $custSrc $custDest /E /XO /R:1 /W:1 /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
}
$custCfg = Join-Path $custDest 'Customer.Config.ps1'
@(
  ('$CustomerCode = ''' + $CustomerCode + ''''),
  ('$InstanceName = ''' + $env:COMPUTERNAME + ''''),
  ('$SqlRoot = ''' + $SqlRoot + '''')
) | Set-Content -LiteralPath $custCfg -Encoding ASCII
Write-Host ('Wrote ' + $custCfg)

$cfgPath = Join-Path $AgentRoot 'Agent.Config.ps1'
$cfg = @(
  '# Written by Deploy-Assure-Agent.ps1. Passwords are not stored here.',
  ('$CustomerCode = ''' + $CustomerCode + ''''),
  ('$DisplayName = ''' + $CustomerCode + ''''),
  ('$InstanceName = ''' + $env:COMPUTERNAME + ''''),
  ('$RoleTags = ''' + $RoleTags + ''''),
  ('$CentralDataSource = ''' + $CentralDataSource + ''''),
  ('$CentralDatabase = ''' + $CentralDatabase + ''''),
  ('$CentralSqlUser = ''' + $CentralSqlUser + ''''),
  ('$SqlRoot = ''' + $SqlRoot + ''''),
  ('$AgentRoot = ''' + $AgentRoot + ''''),
  ('$LogDir = ''' + (Join-Path $AgentRoot 'logs') + ''''),
  '$PreferHttps = $true'
)
[IO.File]::WriteAllLines($cfgPath, $cfg)
Write-Host ('Wrote ' + $cfgPath + ' customer=' + $CustomerCode)

$setPath = Join-Path $AgentRoot 'Agent.Settings.json'
$set = [ordered]@{
  collectIntervalMin = 2
  jobsIntervalMin    = 1440
  tickSeconds        = 120
  centralDataSource  = $CentralDataSource
  centralDatabase    = $CentralDatabase
  centralSqlUser     = $CentralSqlUser
  encryptSql         = $true
  trustSqlCert       = $true
  appHttpsUrl        = $AppHttpsUrl
  agentSecret        = ''
  agentId            = ''
  secretMigrationStatus = 'NOT_STARTED'
}
if (Test-Path $setPath) {
  try {
    $prev = Get-Content $setPath -Raw | ConvertFrom-Json
    foreach ($k in @('collectIntervalMin','jobsIntervalMin','tickSeconds','centralDataSource','centralDatabase','centralSqlUser','agentId','secretMigrationStatus')) {
      if ($null -ne $prev.$k) { $set[$k] = $prev.$k }
    }
    if (-not $AgentSecret -and $prev.agentSecret) { $set.agentSecret = $prev.agentSecret }
  } catch {}
}
$set.appHttpsUrl = $AppHttpsUrl
$set.encryptSql = $true
if ($AgentSecret) { $set.agentSecret = '' }
($set | ConvertTo-Json) | Set-Content -LiteralPath $setPath -Encoding UTF8
Write-Host ('Wrote HTTPS settings ' + $setPath)

$lib = Join-Path $AgentRoot 'Lib-SecureConfig.ps1'
if (Test-Path $lib) {
  . $lib
  $script:RpmaAgentRoot = $AgentRoot
  if (-not (Test-Path (Get-RpmaSecretsPath))) {
    if (-not $AgentAdminPassword) {
      $bytes = New-Object byte[] 18
      [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
      $AgentAdminPassword = [Convert]::ToBase64String($bytes)
    }
    if (-not $CentralSqlPassword) { $CentralSqlPassword = 'unused-https-only' }
    Initialize-RpmaSecureStore -AdminPassword $AgentAdminPassword -CentralSqlPassword $CentralSqlPassword `
      -LocalSqlPassword '' -CentralDataSource $CentralDataSource -CentralDatabase $CentralDatabase -CentralSqlUser $CentralSqlUser
    Write-Host 'Created Agent.Secrets.bin (DPAPI). SQL fallback uses CentralSqlPassword if you passed it.'
  } else {
    Write-Host 'Keeping Agent.Secrets.bin'
  }
  if ($AgentSecret -and (Get-Command Save-RpmaIngestSecret -ErrorAction SilentlyContinue)) {
    try { Save-RpmaIngestSecret $AgentSecret } catch { Write-Host 'WARN ingest secret DPAPI persist failed; machine env still used for this session' }
  }
  Protect-RpmaFolder
}

$install = Join-Path $AgentRoot 'Install-Agent-Service.ps1'
if (-not (Test-Path $install)) { throw 'Missing Install-Agent-Service.ps1 after copy' }
Write-Host 'Installing Windows service RPMAssure-Edge...'
& $install -AgentRoot $AgentRoot -SqlRoot $SqlRoot

if (-not $SkipHeartbeat) {
  Write-Host 'First HTTPS heartbeat...'
  $env:RPM_ASSURE_IOPS_SECRET = $AgentSecret
  $env:RPM_ASSURE_AGENT_SECRET = $AgentSecret
  & (Join-Path $AgentRoot 'RpmAssure-Agent.ps1') -AgentRoot $AgentRoot -HeartbeatOnly

  $libHttps = Join-Path $AgentRoot 'Lib-RpmaHttps.ps1'
  if (Test-Path $libHttps) { . $libHttps }
  $detectedSyspro = $false
  try {
    $sqlcmd = 'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE'
    if (-not (Test-Path $sqlcmd)) { $sqlcmd = (Get-Command sqlcmd -ErrorAction SilentlyContinue).Source }
    if ($sqlcmd) {
      $dbs = & $sqlcmd -S '.' -E -C -h -1 -W -Q "SET NOCOUNT ON; SELECT name FROM sys.databases WHERE state=0 AND name LIKE 'Syspro%';" 2>$null
      foreach ($line in @($dbs)) {
        if (([string]$line).Trim() -match '^Syspro') { $detectedSyspro = $true; break }
      }
    }
  } catch {}
  Write-Host ('Detected on this host: SYSPRO databases=' + $(if ($detectedSyspro) { 'yes' } else { 'no' }))

  $exists = $true
  try {
    $look = Send-RpmaHttpsOnboard -Method GET -CustomerCode $CustomerCode
    if ($look.Json -and $look.Json.ok) { $exists = [bool]$look.Json.exists }
  } catch {
    Write-Host ('WARN onboard lookup: ' + $_.Exception.Message)
  }

  if (-not $exists) {
    Write-Host '========================================'
    Write-Host (' Customer ' + $CustomerCode + ' is not on Assure. Creating it.')
    Write-Host ' Tickets is always on. Other services: Y/N (Enter = suggested).'
    Write-Host ' Cover still lights only when live data arrives (except Tickets).'
    Write-Host '========================================'
    $display = $CustomerCode
    $sys = $detectedSyspro
    $rmm = $false; $cove = $false; $epp = $false; $csp = $false
    if (-not $Unattended) {
      $dn = Read-Host ('Display name [' + $CustomerCode + ']')
      if ($dn) { $display = $dn.Trim() }
      function Ask-Yn([string]$label, [bool]$def) {
        $hint = $(if ($def) { 'Y' } else { 'N' })
        $a = Read-Host ($label + ' [' + $hint + ']')
        if (-not $a) { return $def }
        return ($a -match '^(y|yes|1)$')
      }
      $sys = Ask-Yn 'Enable SYSPRO' $detectedSyspro
      $rmm = Ask-Yn 'Enable RPM Remote Management' $false
      $cove = Ask-Yn 'Enable RPM Cloud Backup' $false
      $epp = Ask-Yn 'Enable RPM EndPoint Protection' $false
      $csp = Ask-Yn 'Enable Microsoft 365 CSP' $false
    }
    try {
      $cr = Send-RpmaHttpsOnboard -Method POST -CustomerCode $CustomerCode -DisplayName $display `
        -HostName $env:COMPUTERNAME -Syspro $sys -Rmm $rmm -Cove $cove -Epp $epp -Csp $csp
      Write-Host ('Onboard Assure: created=' + $cr.Json.created + ' ' + $cr.Text)
    } catch {
      Write-Host ('WARN onboard create: ' + $_.Exception.Message)
    }
  } else {
    Write-Host ('Customer ' + $CustomerCode + ' already on Assure. Cover stays live-data (no invent).')
  }
}

Write-Host '========================================'
Write-Host ' DEPLOY COMPLETE'
Write-Host (' Host     ' + $env:COMPUTERNAME)
Write-Host (' Customer ' + $CustomerCode)
Write-Host (' HTTPS    ' + $AppHttpsUrl)
Write-Host ' Service  RPMAssure-Edge'
Write-Host ' Re-run this script to refresh from Assure HTTPS.'
Write-Host '========================================'
Get-Service RPMAssure-Edge -ErrorAction SilentlyContinue | Format-Table Name, Status -AutoSize
