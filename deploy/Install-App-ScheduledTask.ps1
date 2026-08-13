# ONSTART task for production node-server (NOT vite, NOT MSI)
$ErrorActionPreference = 'Stop'
$App = 'C:\RPM-Assure\App'
$Logs = 'C:\RPM-Assure\deploy\logs'
New-Item -ItemType Directory -Force -Path $Logs | Out-Null
$wrapper = Join-Path $Logs 'start-app-prod.cmd'
$serverJs = Join-Path $App '.output\server\index.mjs'
if (-not (Test-Path $serverJs)) {
  throw "Missing $serverJs — run Go-Production-NoMsi.ps1 build first"
}
if (-not (Test-Path $wrapper)) {
  throw "Missing $wrapper — run Go-Production-NoMsi.ps1 once"
}
$task = 'RPMAssure-App-OnStart'
schtasks /Create /F /TN $task /TR $wrapper /SC ONSTART /RU SYSTEM /RL HIGHEST /DELAY 0000:30
Write-Host "Task $task -> production ($wrapper)" -ForegroundColor Green
Write-Host 'Start now: schtasks /Run /TN RPMAssure-App-OnStart'
Write-Host 'Or:        powershell -File C:\RPM-Assure\deploy\Restart-Production.ps1'
