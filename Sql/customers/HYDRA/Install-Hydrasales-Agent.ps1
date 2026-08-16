# =============================================================================
# RPM Assure Edge Agent - Hydrasales (HYDRA) one-click install
# Run as Administrator on HydraSRV (or any HYDRA host).
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\Install-Hydrasales-Agent.ps1
#
# Or double-click: Install-Hydrasales-Agent.cmd
#
# Behaviour (agent 2.5.7+):
# - Heartbeat = online (cover never gates online)
# - Detects SQL / SYSPRO / Pulseway / Bitdefender / Cove on this host
# - Enables matching cover on central (never clears)
# - No local SQL => no SYSPRO config required; install still succeeds
# =============================================================================
param(
  [string]$AdminPassword = '',          # Agent settings password (min 8). Prompted if blank.
  [string]$LocalSqlPassword = '@ssuR3me!',
  [string]$CentralSqlPassword = '@ssuR3me!',
  [switch]$SkipGit,
  [switch]$NoTray,
  [switch]$NoStart,
  [switch]$LockFiles
)

$ErrorActionPreference = 'Stop'
$IsAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $IsAdmin) {
  Write-Host 'Elevating to Administrator...'
  $arg = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $MyInvocation.MyCommand.Path)
  if ($AdminPassword) { $arg += @('-AdminPassword', $AdminPassword) }
  if ($LocalSqlPassword) { $arg += @('-LocalSqlPassword', $LocalSqlPassword) }
  if ($CentralSqlPassword) { $arg += @('-CentralSqlPassword', $CentralSqlPassword) }
  if ($SkipGit) { $arg += '-SkipGit' }
  if ($NoTray) { $arg += '-NoTray' }
  if ($NoStart) { $arg += '-NoStart' }
  if ($LockFiles) { $arg += '-LockFiles' }
  Start-Process powershell.exe -Verb RunAs -ArgumentList $arg -Wait
  exit $LASTEXITCODE
}

# ---- Hydrasales identity ----
$CustomerCode      = 'HYDRA'
$DisplayName       = 'Hydrasales'
$SqlHost           = 'HydraSRV'
$InstanceName      = 'HydraSRV'
$LocalAuth         = 'Sql'
$LocalSqlUser      = 'rpmassure'
$CentralDataSource = '102.222.21.220,14333'
$CentralDatabase   = 'RPMAssure_App'
$CentralSqlUser    = 'rpmassure'
$Root              = 'C:\RPM-Assure'
$RepoUrl           = 'https://github.com/KirkSweet1980/rpm-assure-ui-pack.git'

if ([string]::IsNullOrWhiteSpace($AdminPassword) -or $AdminPassword.Length -lt 8) {
  Write-Host ''
  Write-Host 'Agent admin password (locks Set-AgentSettings later, min 8 chars):' -ForegroundColor Cyan
  $sec = Read-Host -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
  $AdminPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  if ([string]::IsNullOrWhiteSpace($AdminPassword) -or $AdminPassword.Length -lt 8) {
    throw 'Agent admin password must be at least 8 characters.'
  }
}

Write-Host '========================================'
Write-Host ' RPM Assure Edge Agent  |  HYDRA / Hydrasales'
Write-Host (' Host: ' + $env:COMPUTERNAME)
Write-Host '========================================'

# Prefer already-pulled pack; otherwise clone/pull
$Pack = Join-Path $Root 'deploy\ui-pack'
$engine = Join-Path $Pack 'Sql\agent\installer\Install-Assure-Agent.ps1'

if (-not $SkipGit) {
  try {
    $git = $null
    $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
    if (Get-Command git -EA SilentlyContinue) { $git = (Get-Command git).Source }
    if (-not $git -and (Test-Path 'C:\Program Files\Git\cmd\git.exe')) { $git = 'C:\Program Files\Git\cmd\git.exe' }
    if ($git) {
      New-Item -ItemType Directory -Force -Path (Join-Path $Root 'deploy') | Out-Null
      if (Test-Path (Join-Path $Pack '.git')) {
        Write-Host 'git pull ui-pack...'
        & $git -C $Pack fetch --all --prune 2>$null
        & $git -C $Pack reset --hard origin/main 2>$null
      } else {
        if (Test-Path $Pack) { Remove-Item $Pack -Recurse -Force -EA SilentlyContinue }
        Write-Host 'git clone ui-pack...'
        & $git clone --depth 1 --branch main $RepoUrl $Pack
      }
    } else {
      Write-Host 'Git not found - using files already under C:\RPM-Assure (if present)' -ForegroundColor Yellow
    }
  } catch {
    Write-Host ('WARN git step failed (continuing if pack exists): ' + $_.Exception.Message) -ForegroundColor Yellow
  }
}

if (-not (Test-Path -LiteralPath $engine)) {
  $here = Split-Path -Parent $MyInvocation.MyCommand.Path
  $alt = Join-Path $here '..\..\agent\installer\Install-Assure-Agent.ps1'
  if (Test-Path $alt) { $engine = (Resolve-Path $alt).Path }
}
if (-not (Test-Path -LiteralPath $engine)) {
  throw @"
Missing Install-Assure-Agent.ps1.
Expected: $Pack\Sql\agent\installer\Install-Assure-Agent.ps1
Run Bootstrap-Customer-Agent.ps1 or copy the full ui-pack under C:\RPM-Assure\deploy\ui-pack.
"@
}

# Pass HYDRA defaults. Engine decides if local SQL/SYSPRO config is required
# based on what is actually installed on this host.
$argsList = @(
  '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $engine,
  '-CustomerCode', $CustomerCode,
  '-DisplayName', $DisplayName,
  '-SqlHost', $SqlHost,
  '-InstanceName', $InstanceName,
  '-LocalAuth', $LocalAuth,
  '-LocalSqlUser', $LocalSqlUser,
  '-LocalSqlPassword', $LocalSqlPassword,
  '-CentralDataSource', $CentralDataSource,
  '-CentralDatabase', $CentralDatabase,
  '-CentralSqlUser', $CentralSqlUser,
  '-CentralSqlPassword', $CentralSqlPassword,
  '-AdminPassword', $AdminPassword,
  '-CollectIntervalMin', '2',
  '-JobsIntervalMin', '1440',
  '-SkipGit'
)
if (-not $NoTray) { $argsList += '-InstallTray' }
if (-not $NoStart) { $argsList += '-StartService' }
if ($LockFiles) { $argsList += '-LockFiles' }

Write-Host 'Launching install engine (detects SQL/SYSPRO/Pulseway/Bitdefender/Cove)...'
& powershell.exe @argsList
$code = $LASTEXITCODE

Write-Host ''
Get-Service RPMAssure-Edge -EA SilentlyContinue | Format-Table Name, Status, StartType -AutoSize
Write-Host 'Tray: RPM Assure (green = heartbeat connected)'
Write-Host 'Hard-refresh Assure > Configuration after first heartbeat.'
Write-Host 'Log: C:\RPM-Assure\Agent\logs\wizard-install.log'
Write-Host '========================================'
exit $code
