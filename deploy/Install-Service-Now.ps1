# Install-Service-Now.ps1
# First-install safe. No "Can't open service" abort.
# Administrator PowerShell on the APP server.
$ErrorActionPreference = 'Continue'
$App   = 'C:\RPM-Assure\App'
$Logs  = 'C:\RPM-Assure\deploy\logs'
$Nssm  = 'C:\RPM-Assure\Tools\nssm.exe'
$Node  = 'C:\Program Files\nodejs\node.exe'
$Vite  = 'C:\RPM-Assure\App\node_modules\vite\bin\vite.js'
$Svc   = 'RPMAssure-App'
$Port  = 8081

New-Item -ItemType Directory -Force -Path $Logs | Out-Null

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).
  IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) { throw 'Run as Administrator.' }
if (-not (Test-Path $Nssm)) { throw "Missing $Nssm" }
if (-not (Test-Path $Node)) { throw "Missing $Node" }
if (-not (Test-Path $Vite)) { throw "Missing $Vite" }

Write-Host '=== Install RPMAssure-App Windows service ===' -ForegroundColor Cyan

cmd /c "schtasks /End /TN RPMAssure-App-OnStart >nul 2>&1"
cmd /c "schtasks /Change /TN RPMAssure-App-OnStart /DISABLE >nul 2>&1"
cmd /c "schtasks /Delete /TN RPMAssure-App-OnStart /F >nul 2>&1"

Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | ForEach-Object {
  if ($_.OwningProcess -gt 0) { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
}

$exists = Get-Service -Name $Svc -ErrorAction SilentlyContinue
if ($exists) {
  Write-Host 'Removing existing service...'
  cmd /c "`"$Nssm`" stop $Svc >nul 2>&1"
  Start-Sleep -Seconds 2
  cmd /c "`"$Nssm`" remove $Svc confirm >nul 2>&1"
} else {
  Write-Host 'First install - no service to stop'
}

$viteArgs = '"' + $Vite + '" dev --host 127.0.0.1 --port ' + $Port
Write-Host 'nssm install...'
cmd /c "`"$Nssm`" install $Svc `"$Node`" $viteArgs"
if ($LASTEXITCODE -ne 0) { throw 'nssm install failed' }

cmd /c "`"$Nssm`" set $Svc AppDirectory $App"
cmd /c "`"$Nssm`" set $Svc DisplayName `"RPM Assure App`""
cmd /c "`"$Nssm`" set $Svc Description `"RPM Assure web app`""
cmd /c "`"$Nssm`" set $Svc Start SERVICE_AUTO_START"
cmd /c "`"$Nssm`" set $Svc AppStdout `"$Logs\app-stdout.log`""
cmd /c "`"$Nssm`" set $Svc AppStderr `"$Logs\app-stderr.log`""
cmd /c "`"$Nssm`" set $Svc AppRotateFiles 1"
cmd /c "`"$Nssm`" set $Svc AppRotateBytes 5000000"
cmd /c "`"$Nssm`" set $Svc AppExit Default Restart"
cmd /c "`"$Nssm`" set $Svc AppRestartDelay 4000"
cmd /c "`"$Nssm`" set $Svc AppEnvironmentExtra `"RPM_ASSURE_DATA_MODE=auto`""

Write-Host 'Starting service...'
cmd /c "`"$Nssm`" start $Svc"
Start-Sleep -Seconds 6

Get-Service $Svc | Format-Table Name, Status, StartType -AutoSize
netstat -ano | findstr ':8081'

$ok = $false
try {
  $r = Invoke-WebRequest 'http://127.0.0.1:8081/login' -UseBasicParsing -TimeoutSec 20
  Write-Host ("PROOF OK: /login HTTP " + $r.StatusCode) -ForegroundColor Green
  $ok = $true
} catch {
  Write-Host ("login probe: " + $_.Exception.Message) -ForegroundColor Yellow
}

if ($ok) {
  Write-Host '========================================' -ForegroundColor Green
  Write-Host ' SERVICE INSTALLED'
  Write-Host '  Restart-Service RPMAssure-App'
  Write-Host '========================================' -ForegroundColor Green
}
Write-Host '=== Done ==='
