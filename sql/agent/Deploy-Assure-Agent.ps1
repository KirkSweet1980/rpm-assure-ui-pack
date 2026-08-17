# Deploy-Assure-Agent.ps1
# No wizard. Administrator PowerShell on the customer host.
# Git clone/pull, install RPMAssure-Edge, HTTPS heartbeat (Let's Encrypt).
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\Deploy-Assure-Agent.ps1
#   (prompts for customer code and ingest secret)
#
# Or pass them:
#   ...\Deploy-Assure-Agent.ps1 -CustomerCode AHIC -AgentSecret '...'
#
# Optional: -CentralSqlPassword for SYSPRO collect / SQL fallback.
# Re-run anytime to pull git and refresh the agent (keeps Agent.Config.ps1 and secrets).

param(
  [string]$CustomerCode = '',
  [string]$AgentSecret = 'xc9pDuhf7ldzcmkwsE+joSdgpuD5RJaz',
  [string]$AppHttpsUrl = 'https://assure.rpmresources.co.za',
  [string]$RepoUrl = 'https://github.com/KirkSweet1980/rpm-assure-ui-pack.git',
  [string]$Root = 'C:\RPM-Assure',
  [string]$RoleTags = 'syspro',
  [string]$CentralDataSource = '102.222.21.220,14333',
  [string]$CentralDatabase = 'RPMAssure_App',
  [string]$CentralSqlUser = 'rpmassure',
  [string]$CentralSqlPassword = '',
  [string]$AgentAdminPassword = '',
  [switch]$SkipHeartbeat
)

$ErrorActionPreference = 'Stop'
if (-not $CustomerCode) {
  Write-Host 'Customer codes: AHIC RSR RSS UVSS HYDRA ABLE SBS BHF SIRF RPMINT IB METSI YLJ MEDIPOS VAULT PCNS'
  $CustomerCode = Read-Host 'Customer code'
}
$CustomerCode = $CustomerCode.Trim().ToUpperInvariant()
if (-not $CustomerCode) { throw 'CustomerCode is required' }
if (-not $AgentSecret) { throw 'AgentSecret is required' }

$IsAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $IsAdmin) { throw 'Run as Administrator.' }

Write-Host '========================================'
Write-Host ' RPM Assure Edge - deploy (no wizard)'
Write-Host '========================================'
Write-Host ("Customer  " + $CustomerCode)
Write-Host ("HTTPS     " + $AppHttpsUrl)
Write-Host ("Git       " + $RepoUrl)

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
Write-Host ('git = ' + $git)

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

$src = Join-Path $Pack 'Sql\agent'
if (-not (Test-Path (Join-Path $src 'RpmAssure-Agent.ps1'))) { throw ('Pack missing Sql\agent: ' + $src) }

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
if (Test-Path $custSrc) {
  $custDest = Join-Path $SqlRoot ("customers\" + $CustomerCode)
  New-Item -ItemType Directory -Force -Path $custDest | Out-Null
  robocopy $custSrc $custDest /E /XO /R:1 /W:1 /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
}

$cfgPath = Join-Path $AgentRoot 'Agent.Config.ps1'
if (-not (Test-Path $cfgPath)) {
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
    ('$LogDir = ''' + (Join-Path $AgentRoot 'logs') + '''')
  )
  [IO.File]::WriteAllLines($cfgPath, $cfg)
  Write-Host ('Wrote ' + $cfgPath)
} else {
  Write-Host ('Keeping ' + $cfgPath)
}

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
  agentSecret        = $AgentSecret
}
if (Test-Path $setPath) {
  try {
    $prev = Get-Content $setPath -Raw | ConvertFrom-Json
    foreach ($k in @('collectIntervalMin','jobsIntervalMin','tickSeconds','centralDataSource','centralDatabase','centralSqlUser')) {
      if ($null -ne $prev.$k) { $set[$k] = $prev.$k }
    }
  } catch {}
}
$set.appHttpsUrl = $AppHttpsUrl
$set.agentSecret = $AgentSecret
$set.encryptSql = $true
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
  Protect-RpmaFolder
}

$install = Join-Path $AgentRoot 'Install-Agent-Service.ps1'
if (-not (Test-Path $install)) { throw 'Missing Install-Agent-Service.ps1 after copy' }
Write-Host 'Installing Windows service RPMAssure-Edge...'
& $install -AgentRoot $AgentRoot -SqlRoot $SqlRoot

if (-not $SkipHeartbeat) {
  Write-Host 'First HTTPS heartbeat...'
  $env:RPM_ASSURE_IOPS_SECRET = $AgentSecret
  & (Join-Path $AgentRoot 'RpmAssure-Agent.ps1') -AgentRoot $AgentRoot -HeartbeatOnly
}

Write-Host '========================================'
Write-Host ' DEPLOY COMPLETE'
Write-Host (' Host     ' + $env:COMPUTERNAME)
Write-Host (' Customer ' + $CustomerCode)
Write-Host (' HTTPS    ' + $AppHttpsUrl)
Write-Host ' Service  RPMAssure-Edge'
Write-Host ' Re-run this script to pull git and refresh files.'
Write-Host '========================================'
Get-Service RPMAssure-Edge -ErrorAction SilentlyContinue | Format-Table Name, Status -AutoSize
