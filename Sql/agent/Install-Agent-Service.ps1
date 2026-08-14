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

foreach ($f in @("RpmAssure-Agent.ps1", "RpmAssure-Agent-Loop.ps1", "Agent.Config.example.ps1", "470_Ensure_Agent_Tables.sql", "README.md")) {
  $src = Join-Path $Here $f
  if (Test-Path $src) { Copy-Item $src (Join-Path $AgentRoot $f) -Force }
}
Copy-Item (Join-Path $Here "Install-Agent-Service.ps1") (Join-Path $AgentRoot "Install-Agent-Service.ps1") -Force -EA SilentlyContinue

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
if (-not (Test-Path $cfgPath)) {
  $centralDs = "102.222.21.220,14333"
  $centralDb = "RPMAssure_App"
  $centralUser = "rpmassure"
  $centralPw = ""
  $firstCode = "HOST"
  $instance = $env:COMPUTERNAME
  if ($configs.Count -gt 0) {
    . $configs[0].FullName
    if ($CustomerCode) { $firstCode = $CustomerCode }
    if ($CentralDataSource) { $centralDs = $CentralDataSource }
    if ($CentralDatabase) { $centralDb = $CentralDatabase }
    if ($CentralSqlUser) { $centralUser = $CentralSqlUser }
    if ($CentralSqlPassword) { $centralPw = $CentralSqlPassword }
    if ($InstanceName) { $instance = $InstanceName }
  }
  $body = @"
# Auto-built by Install-Agent-Service.ps1
`$CustomerCode = '$firstCode'
`$DisplayName = '$firstCode'
`$InstanceName = '$instance'
`$RoleTags = 'syspro'
`$CentralDataSource = '$centralDs'
`$CentralDatabase = '$centralDb'
`$CentralSqlUser = '$centralUser'
`$CentralSqlPassword = '$centralPw'
`$SqlRoot = '$SqlRoot'
`$AgentRoot = '$AgentRoot'
`$LogDir = '$AgentRoot\logs'
"@
  [IO.File]::WriteAllText($cfgPath, $body, [Text.UTF8Encoding]::new($false))
  Write-Host "Wrote $cfgPath"
} else {
  Write-Host "Keeping existing $cfgPath"
}

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

$existing = Get-Service -Name $ServiceName -EA SilentlyContinue
if ($existing) {
  Write-Host "Stopping existing $ServiceName"
  & $nssm stop $ServiceName confirm 2>$null | Out-Null
  Start-Sleep 2
  & $nssm remove $ServiceName confirm 2>$null | Out-Null
  Start-Sleep 1
}

& $nssm install $ServiceName $ps
& $nssm set $ServiceName AppParameters "-NoProfile -ExecutionPolicy Bypass -File `"$loop`" -AgentRoot `"$AgentRoot`""
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

Start-Service $ServiceName
Start-Sleep 2
Get-Service $ServiceName | Format-Table Name, Status, StartType -AutoSize

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
Write-Host "  Central  : after first cycle, Configuration > Agents"
Write-Host "========================================"
Write-Host "=== Done ==="
