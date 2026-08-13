# Install-RpmAssure-WindowsService.ps1
# One-shot: RPM Assure as a real Windows service (NSSM).
# Stops the start/stop scheduled-task fight. Auto-starts on boot.
#
# Run elevated (Run as administrator):
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\Install-RpmAssure-WindowsService.ps1
$ErrorActionPreference = 'Stop'

$App     = 'C:\RPM-Assure\App'
$Logs    = 'C:\RPM-Assure\deploy\logs'
$Port    = 8081
$Svc     = 'RPMAssure-App'
$Task    = 'RPMAssure-App-OnStart'
$Tools   = 'C:\RPM-Assure\Tools'
$Here    = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $Here) { $Here = (Get-Location).Path }

New-Item -ItemType Directory -Force -Path $Logs | Out-Null
New-Item -ItemType Directory -Force -Path $Tools | Out-Null

function Write-Ok([string]$m) { Write-Host $m -ForegroundColor Green }
function Write-Step([string]$m) { Write-Host ''; Write-Host $m -ForegroundColor Cyan }

Write-Host '========================================' -ForegroundColor Cyan
Write-Host ' RPM Assure - install Windows service'
Write-Host '========================================' -ForegroundColor Cyan

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).
  IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  throw 'Run this in an Administrator PowerShell (right-click -> Run as administrator).'
}

if (-not (Test-Path $App)) { throw "Missing $App" }

# --- NSSM ---
Write-Step '--- NSSM (service wrapper) ---'
$nssm = $null
foreach ($p in @(
    (Join-Path $Here 'nssm.exe'),
    (Join-Path $Here 'win64\nssm.exe'),
    (Join-Path $Tools 'nssm.exe'),
    'C:\Tools\nssm\win64\nssm.exe',
    'C:\Tools\nssm\nssm.exe'
  )) {
  if (Test-Path $p) { $nssm = $p; break }
}
if (-not $nssm) {
  $cmd = Get-Command nssm.exe -ErrorAction SilentlyContinue
  if ($cmd) { $nssm = $cmd.Source }
}
if (-not $nssm) { throw 'nssm.exe not found. Extract the full zip (nssm.exe must sit next to this script).' }
Copy-Item $nssm (Join-Path $Tools 'nssm.exe') -Force
$nssm = Join-Path $Tools 'nssm.exe'
Write-Ok ("nssm = " + $nssm)

# --- node + vite ---
$node = $null
$cmd = Get-Command node.exe -ErrorAction SilentlyContinue
if ($cmd) { $node = $cmd.Source }
if (-not $node) {
  foreach ($p in @('C:\Program Files\nodejs\node.exe', 'C:\nodejs\node.exe')) {
    if (Test-Path $p) { $node = $p; break }
  }
}
if (-not $node) { throw 'node.exe not found. Install Node.js first.' }
$viteJs = Join-Path $App 'node_modules\vite\bin\vite.js'
if (-not (Test-Path $viteJs)) { throw "Missing $viteJs - run npm.cmd install in $App" }
Write-Ok ("node = " + $node)
Write-Ok ("vite = " + $viteJs)

# --- stop the old start/stop fight ---
Write-Step '--- Stop scheduled task + stray listeners ---'
try { schtasks /End /TN $Task 2>$null | Out-Null } catch {}
try { schtasks /Change /TN $Task /DISABLE 2>$null | Out-Null } catch {}
try { schtasks /Delete /TN $Task /F 2>$null | Out-Null } catch {}
try { schtasks /Delete /TN 'RPMAssure-App' /F 2>$null | Out-Null } catch {}
Write-Ok "Disabled/removed task $Task (it will no longer restart the old app)"

try {
  $conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  foreach ($c in @($conns)) {
    if ($c.OwningProcess -gt 0) {
      Write-Host ("Stopping PID {0} on port {1}" -f $c.OwningProcess, $Port)
      Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
    }
  }
} catch {}
Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue | ForEach-Object {
  $cl = [string]$_.CommandLine
  if ($cl -match 'RPM-Assure|8081|vite|\.output') {
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
  }
}
Start-Sleep -Seconds 2

# --- (re)install service ---
Write-Step ("--- Install service $Svc ---")
$existing = Get-Service -Name $Svc -ErrorAction SilentlyContinue
if ($existing) {
  Write-Host ("Service already exists (Status=" + $existing.Status + ") - replacing")
  $prev = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  & $nssm stop $Svc | Out-Null
  Start-Sleep -Seconds 2
  & $nssm remove $Svc confirm | Out-Null
  $ErrorActionPreference = $prev
} else {
  Write-Host 'No existing service - first install'
}

$viteArgs = '"' + $viteJs + '" dev --host 127.0.0.1 --port ' + $Port
$prev = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
& $nssm install $Svc $node $viteArgs
$instCode = $LASTEXITCODE
$ErrorActionPreference = $prev
if ($instCode -ne 0) { throw 'nssm install failed' }

& $nssm set $Svc AppDirectory $App
& $nssm set $Svc DisplayName 'RPM Assure App'
& $nssm set $Svc Description 'RPM Assure web app (Vite on 8081). Restart-Service RPMAssure-App'
& $nssm set $Svc Start SERVICE_AUTO_START
& $nssm set $Svc AppStdout (Join-Path $Logs 'app-stdout.log')
& $nssm set $Svc AppStderr (Join-Path $Logs 'app-stderr.log')
& $nssm set $Svc AppRotateFiles 1
& $nssm set $Svc AppRotateOnline 1
& $nssm set $Svc AppRotateBytes 5000000
& $nssm set $Svc AppEnvironmentExtra "RPM_ASSURE_DATA_MODE=auto`nNODE_ENV=development"
& $nssm set $Svc AppExit Default Restart
& $nssm set $Svc AppRestartDelay 4000
& $nssm set $Svc AppStopMethodConsole 8000
& $nssm set $Svc AppStopMethodWindow 2000
& $nssm set $Svc AppStopMethodThreads 2000

Write-Host 'Starting service...'
$prev = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
& $nssm start $Svc
$ErrorActionPreference = $prev
Start-Sleep -Seconds 4

$svcObj = Get-Service -Name $Svc -ErrorAction SilentlyContinue
if (-not $svcObj) { throw "Service $Svc was not created" }
Write-Ok ("Service {0}  Status={1}  StartType={2}" -f $svcObj.Name, $svcObj.Status, $svcObj.StartType)

$up = $false
for ($i = 1; $i -le 40; $i++) {
  Start-Sleep -Seconds 1
  $l = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  if ($l) {
    Write-Ok ("LISTENING port {0} PID {1}" -f $Port, $l[0].OwningProcess)
    $up = $true
    break
  }
}
if (-not $up) {
  Write-Host 'Port not up yet - last stderr:' -ForegroundColor Yellow
  if (Test-Path (Join-Path $Logs 'app-stderr.log')) {
    Get-Content (Join-Path $Logs 'app-stderr.log') -Tail 25
  }
  throw "Service installed but port $Port is not listening. Check $Logs\app-stderr.log"
}

try {
  $r = Invoke-WebRequest -Uri ("http://127.0.0.1:{0}/login" -f $Port) -UseBasicParsing -TimeoutSec 20
  Write-Ok ("PROOF OK: /login HTTP " + $r.StatusCode)
} catch {
  Write-Host ("login probe: " + $_.Exception.Message) -ForegroundColor Yellow
}

Write-Host ''
Write-Host '========================================' -ForegroundColor Green
Write-Host ' SERVICE INSTALLED'
Write-Host "  Name     : $Svc"
Write-Host '  Starts   : automatically on boot'
Write-Host '  Restart  : Restart-Service RPMAssure-App'
Write-Host '  Stop     : Stop-Service RPMAssure-App'
Write-Host '  Start    : Start-Service RPMAssure-App'
Write-Host '  Status   : Get-Service RPMAssure-App'
Write-Host "  Logs     : $Logs"
Write-Host '  Do NOT run the old start/stop deploy scripts anymore.'
Write-Host '========================================' -ForegroundColor Green
Write-Host '=== Done ==='
