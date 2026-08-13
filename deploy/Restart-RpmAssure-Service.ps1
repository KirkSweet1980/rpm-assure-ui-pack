# Restart-RpmAssure-Service.ps1
# Only way to bounce the app after it is a Windows service.
# Run elevated:  powershell -NoProfile -ExecutionPolicy Bypass -File .\Restart-RpmAssure-Service.ps1
$ErrorActionPreference = 'Stop'
$Svc  = 'RPMAssure-App'
$Port = 8081

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).
  IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) { throw 'Run as Administrator.' }

$s = Get-Service -Name $Svc -ErrorAction SilentlyContinue
if (-not $s) { throw "Service $Svc not installed. Run Install-RpmAssure-WindowsService.ps1 first." }

Write-Host "Restarting $Svc ..." -ForegroundColor Cyan
Restart-Service -Name $Svc -Force
$up = $false
for ($i = 1; $i -le 40; $i++) {
  Start-Sleep -Seconds 1
  $l = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  if ($l) { Write-Host ("LISTENING PID {0}" -f $l[0].OwningProcess) -ForegroundColor Green; $up = $true; break }
}
if (-not $up) { throw "Service restarted but port $Port not listening." }
Get-Service $Svc | Format-Table Name, Status, StartType -AutoSize
Write-Host '=== Done ==='
