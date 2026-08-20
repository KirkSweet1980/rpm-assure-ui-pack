# Install RPM Assure Edge Agent as a Windows SERVICE on this SQL host.
# Run as Administrator. Does not use Task Scheduler.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\Install-Agent-Service.ps1
#
param(
  [string]$AgentRoot = "C:\RPM-Assure\Agent",
  [string]$SqlRoot = "C:\RPM-Assure\Sql",
  [string]$ServiceName = "RPMAssure-Edge",
  [switch]$RunOnce
)

$ErrorActionPreference = "Stop"
$Here = Split-Path -Parent $MyInvocation.MyCommand.Path
$IsAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $IsAdmin) { throw "Run this as Administrator (elevated PowerShell)." }

Write-Host "========================================"
Write-Host " RPM Assure - Edge Agent (Windows service)"
Write-Host "========================================"

New-Item -ItemType Directory -Force -Path $AgentRoot, (Join-Path $AgentRoot "logs"), (Join-Path $AgentRoot "tools") | Out-Null

function Copy-RpmaFile([string]$From, [string]$To) {
  if (-not (Test-Path -LiteralPath $From)) { return }
  $destDir = Split-Path -Parent $To
  if ($destDir -and -not (Test-Path $destDir)) { New-Item -ItemType Directory -Force -Path $destDir | Out-Null }
  $same = $false
  try {
    if (Test-Path -LiteralPath $To) {
      $same = ((Resolve-Path $From).Path -eq (Resolve-Path $To).Path)
    }
  } catch {}
  if ($same) { return }
  Copy-Item -LiteralPath $From -Destination $To -Force
}

foreach ($f in @("Deploy-Assure-Agent.ps1", "RpmAssure-Agent.ps1", "RpmAssure-Agent-Loop.ps1", "Lib-SecureConfig.ps1", "Lib-RpmaHttps.ps1", "Set-AgentSettings.ps1", "Start-Agent-Tray.ps1", "Install-Agent-Tray.ps1", "start-edge.cmd", "Update-Agent-From-Central.ps1", "Update-From-Https.ps1", "Apply-Staged-Pack.ps1", "VERSION", "Agent.Config.example.ps1", "470_Ensure_Agent_Tables.sql", "443_Agent_Https.sql", "README.md", "Collect-Host-Iops.ps1", "Collect-Host-Patches.ps1", "Collect-Host-Firewall.ps1", "Collect-Windows-EventLog.ps1", "Probe-Assure-Link.ps1", "SECURE-LINK.txt")) {
  Copy-RpmaFile (Join-Path $Here $f) (Join-Path $AgentRoot $f)
}
if (Test-Path (Join-Path $Here 'tray')) {
  New-Item -ItemType Directory -Force -Path (Join-Path $AgentRoot 'tray') | Out-Null
  Get-ChildItem (Join-Path $Here 'tray') -File | ForEach-Object {
    Copy-RpmaFile $_.FullName (Join-Path $AgentRoot ('tray\' + $_.Name))
  }
}
Copy-RpmaFile (Join-Path $Here "Install-Agent-Service.ps1") (Join-Path $AgentRoot "Install-Agent-Service.ps1")

$configs = @()
if (Test-Path (Join-Path $SqlRoot "customers")) {
  $configs = @(Get-ChildItem (Join-Path $SqlRoot "customers") -Filter "Customer.Config.ps1" -Recurse -EA SilentlyContinue)
}
if ($configs.Count -eq 0) {
  Write-Host "WARN: no Customer.Config.ps1 under $SqlRoot\customers" -ForegroundColor Yellow
  Write-Host "Onboard the customer first, then re-run this installer."
} else {
  Write-Host ("Found " + $configs.Count + " customer config(s): " + (($configs | ForEach-Object { $_.Directory.Name }) -join ", "))
}

$cfgPath = Join-Path $AgentRoot "Agent.Config.ps1"
$centralDs = "102.222.21.220,14333"
$centralDb = "RPMAssure_App"
$centralUser = "rpmassure"
$centralPw = ""
$localPw = ""
$firstCode = "HOST"
$instance = $env:COMPUTERNAME
if ($configs.Count -gt 0) {
  . $configs[0].FullName
  if ($CustomerCode) { $firstCode = $CustomerCode }
  if ($CentralDataSource) { $centralDs = $CentralDataSource }
  if ($CentralDatabase) { $centralDb = $CentralDatabase }
  if ($CentralSqlUser) { $centralUser = $CentralSqlUser }
  if ($CentralSqlPassword) { $centralPw = $CentralSqlPassword }
  if ($LocalSqlPassword) { $localPw = $LocalSqlPassword }
  if ($InstanceName) { $instance = $InstanceName }
}

if (-not (Test-Path $cfgPath)) {
  $body = @"
# Non-secret agent settings. Passwords are in Agent.Secrets.bin (DPAPI).
`$CustomerCode = '$firstCode'
`$DisplayName = '$firstCode'
`$InstanceName = '$instance'
`$RoleTags = 'syspro'
`$CentralDataSource = '$centralDs'
`$CentralDatabase = '$centralDb'
`$CentralSqlUser = '$centralUser'
`$SqlRoot = '$SqlRoot'
`$AgentRoot = '$AgentRoot'
`$LogDir = '$AgentRoot\logs'
"@
  [IO.File]::WriteAllText($cfgPath, $body, [Text.UTF8Encoding]::new($false))
  Write-Host "Wrote $cfgPath (no passwords)"
} else {
  Write-Host "Keeping existing $cfgPath"
}

. (Join-Path $AgentRoot "Lib-SecureConfig.ps1")
$script:RpmaAgentRoot = $AgentRoot
$secretsExist = Test-Path (Get-RpmaSecretsPath)
if (-not $secretsExist) {
  Write-Host ""
  Write-Host "Set the AGENT ADMIN password (required to open settings later)."
  $a1 = Read-Host "Agent admin password" -AsSecureString
  $a2 = Read-Host "Confirm" -AsSecureString
  $p1 = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($a1))
  $p2 = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($a2))
  if ($p1 -ne $p2 -or [string]::IsNullOrWhiteSpace($p1)) { throw "Admin passwords did not match." }
  if (-not $centralPw) {
    $cp = Read-Host "Central SQL password for $centralUser" -AsSecureString
    $centralPw = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($cp))
  }
  Initialize-RpmaSecureStore -AdminPassword $p1 -CentralSqlPassword $centralPw -LocalSqlPassword $localPw -CentralDataSource $centralDs -CentralDatabase $centralDb -CentralSqlUser $centralUser
  $p1 = $null; $p2 = $null; $centralPw = $null
  Write-Host "Secrets encrypted with Windows DPAPI (this machine only)."
} else {
  Write-Host "Keeping existing Agent.Secrets.bin"
}
Protect-RpmaFolder
Write-Host "NTFS: SYSTEM + Administrators only on $AgentRoot"

# NSSM
$nssm = $null
foreach ($c in @(
  (Join-Path $AgentRoot "tools\nssm.exe"),
  "C:\RPM-Assure\Tools\nssm.exe",
  (Join-Path $Here "nssm.exe")
)) { if (Test-Path $c) { $nssm = $c; break } }

if (-not $nssm) {
  Write-Host "Fetching NSSM..."
  $zip = Join-Path $env:TEMP "nssm-2.24.zip"
  $dest = Join-Path $AgentRoot "tools"
  try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -UseBasicParsing -Uri "https://nssm.cc/release/nssm-2.24.zip" -OutFile $zip -TimeoutSec 60
    Expand-Archive -LiteralPath $zip -DestinationPath $dest -Force
    $found = Get-ChildItem $dest -Recurse -Filter nssm.exe | Where-Object { $_.FullName -match "win64" } | Select-Object -First 1
    if (-not $found) { $found = Get-ChildItem $dest -Recurse -Filter nssm.exe | Select-Object -First 1 }
    if ($found) {
      Copy-Item $found.FullName (Join-Path $dest "nssm.exe") -Force
      $nssm = Join-Path $dest "nssm.exe"
    }
  } catch {
    Write-Host ("NSSM download failed: " + $_.Exception.Message) -ForegroundColor Yellow
  }
}
if (-not $nssm) { throw "nssm.exe not found. Copy nssm.exe to $AgentRoot\tools and re-run." }
Write-Host "nssm = $nssm"

$ps = (Get-Command powershell.exe).Source
$loop = Join-Path $AgentRoot "RpmAssure-Agent-Loop.ps1"
if (-not (Test-Path $loop)) { throw "Missing $loop" }
$cmd = Join-Path $AgentRoot "start-edge.cmd"
@(
  '@echo off',
  'cd /d C:\RPM-Assure\Agent',
  'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\RPM-Assure\Agent\RpmAssure-Agent-Loop.ps1" -AgentRoot "C:\RPM-Assure\Agent"'
) | Set-Content -LiteralPath $cmd -Encoding ASCII

$existing = Get-Service -Name $ServiceName -EA SilentlyContinue
if ($existing) {
  Write-Host "Removing existing $ServiceName"
  $old = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  & $nssm stop $ServiceName confirm 2>$null | Out-Null
  Start-Sleep 2
  & $nssm remove $ServiceName confirm 2>$null | Out-Null
  Start-Sleep 1
  $ErrorActionPreference = $old
}

& $nssm install $ServiceName $cmd
& $nssm set $ServiceName AppDirectory $AgentRoot
& $nssm set $ServiceName DisplayName "RPM Assure Edge Agent"
& $nssm set $ServiceName Description "Collects SYSPRO on a schedule and writes heartbeats back to central Assure."
& $nssm set $ServiceName Start SERVICE_AUTO_START
& $nssm set $ServiceName AppStdout (Join-Path $AgentRoot "logs\service-stdout.log")
& $nssm set $ServiceName AppStderr (Join-Path $AgentRoot "logs\service-stderr.log")
& $nssm set $ServiceName AppRotateFiles 1
& $nssm set $ServiceName AppRotateBytes 2000000
& $nssm set $ServiceName AppExit Default Restart
& $nssm set $ServiceName AppRestartDelay 8000
& $nssm set $ServiceName AppStopMethodSkip 6
& $nssm set $ServiceName AppThrottle 1500

$oldE = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
& $nssm start $ServiceName
Start-Sleep 4
$ErrorActionPreference = $oldE
Get-Service $ServiceName | Format-Table Name, Status, StartType -AutoSize
$st = (Get-Service $ServiceName -EA SilentlyContinue).Status
if ($st -ne 'Running') {
  Write-Host 'WARN: service not running yet. Showing logs:'
  Get-Content (Join-Path $AgentRoot 'logs\service-stderr.log') -Tail 20 -EA SilentlyContinue
}

# Tray icon at user logon
$tray = Join-Path $AgentRoot 'Start-Agent-Tray.ps1'
$trayTask = 'RPMAssure-Edge-Tray'
$tr = 'powershell.exe -WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File "' + $tray + '" -AgentRoot "' + $AgentRoot + '"'
cmd.exe /c ('schtasks /Delete /TN "' + $trayTask + '" /F >nul 2>&1') | Out-Null
cmd.exe /c ('schtasks /Create /F /TN "' + $trayTask + '" /TR "' + $tr + '" /SC ONLOGON /RL LIMITED') | Out-Null
if ($LASTEXITCODE -eq 0) {
  Write-Host "Tray task $trayTask (starts at logon)"
  Start-Process powershell.exe -ArgumentList @('-WindowStyle','Hidden','-NoProfile','-ExecutionPolicy','Bypass','-File',$tray,'-AgentRoot',$AgentRoot)
} else {
  Write-Host 'WARN: could not register tray logon task (not fatal)'
}

if ($RunOnce) {
  Write-Host "Running first collect cycle now..."
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $AgentRoot "RpmAssure-Agent.ps1") -AgentRoot $AgentRoot
}

Write-Host ""
Write-Host "========================================"
Write-Host " SERVICE INSTALLED"
Write-Host "  Name     : $ServiceName"
Write-Host "  Path     : $AgentRoot"
Write-Host "  Interval : heartbeat every cycle, SYSPRO every 30 min, full jobs nightly"
Write-Host "  Restart-Service $ServiceName"
Write-Host "  Logs     : $AgentRoot\logs"
Write-Host "  Settings : powershell -File $AgentRoot\Set-AgentSettings.ps1"
Write-Host "========================================"
Write-Host "=== Done ==="
