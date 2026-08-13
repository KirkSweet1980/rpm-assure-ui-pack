# Install-OnThisHost.ps1
# One-shot: install SYSPRO collect schedule on THIS SQL host for a customer.
# Run as Administrator on each SYSPRO customer SQL server.
param(
  [Parameter(Mandatory=$true)]
  [ValidateSet('AHIC','RSR','UVSS','RSS','HYDRA','SIRF')]
  [string]$CustomerCode,
  [int]$IntervalMinutes = 15,
  [string]$NightlyTime = '02:30',
  [string]$RunAsUser = 'SYSTEM',
  [string]$RunAsPassword = '',
  [switch]$RunNow,
  [switch]$SkipSmoke
)
$ErrorActionPreference = 'Stop'
$Root = 'C:\RPM-Assure\Sql'
$Base = Join-Path $Root 'base\syspro-direct'
$Cfg  = Join-Path $Root ("customers\{0}\Customer.Config.ps1" -f $CustomerCode)
$Runner = Join-Path $Base 'Run-Syspro-Collect-Direct.ps1'
$Install = Join-Path $Base 'Install-Schedule.ps1'

if (-not (Test-Path -LiteralPath $Runner)) {
  throw "Missing $Runner - deploy base pack first (Deploy-Syspro-Collect-Automation.ps1)"
}
if (-not (Test-Path -LiteralPath $Cfg)) {
  throw "Missing $Cfg - customer config not deployed"
}
if (-not (Test-Path -LiteralPath $Install)) {
  throw "Missing $Install"
}

Write-Host "=== Install SYSPRO collect for $CustomerCode on $env:COMPUTERNAME ===" -ForegroundColor Cyan
Write-Host "Config: $Cfg"
Write-Host "Runner: $Runner"
Write-Host ''

if (-not $SkipSmoke) {
  Write-Host 'Smoke test collect (-JobsErrorsOnly)...' -ForegroundColor Yellow
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $Runner -ConfigPath $Cfg -JobsErrorsOnly
  if ($LASTEXITCODE -ne 0) {
    Write-Host "WARN: smoke test exit $LASTEXITCODE - continuing to install schedule; check logs" -ForegroundColor Yellow
  } else {
    Write-Host 'Smoke test OK' -ForegroundColor Green
  }
  Write-Host ''
}

Write-Host 'Installing scheduled tasks...' -ForegroundColor Cyan
$psi = @{
  FilePath = 'powershell.exe'
  ArgumentList = @(
    '-NoProfile', '-ExecutionPolicy', 'Bypass',
    '-File', $Install,
    '-ConfigPath', $Cfg,
    '-TaskPrefix', 'RPMAssure',
    '-IntervalMinutes', [string]$IntervalMinutes,
    '-NightlyTime', $NightlyTime,
    '-RunAsUser', $RunAsUser
  )
  Wait = $true
  PassThru = $true
  NoNewWindow = $true
}
if ($RunAsPassword) {
  $psi.ArgumentList += @('-RunAsPassword', $RunAsPassword)
}
$proc = Start-Process @psi
if ($proc.ExitCode -ne 0) {
  throw "Install-Schedule failed exit $($proc.ExitCode)"
}

if ($RunNow) {
  $tn = "RPMAssure-$CustomerCode-SysproCollect"
  Write-Host "Starting $tn ..." -ForegroundColor Cyan
  try { Start-ScheduledTask -TaskName $tn -ErrorAction SilentlyContinue } catch { }
}

Write-Host ''
Write-Host "DONE. Tasks: RPMAssure-$CustomerCode-SysproCollect (every ${IntervalMinutes}m)" -ForegroundColor Green
Write-Host "           RPMAssure-$CustomerCode-SysproJobs (daily $NightlyTime full jobs)" -ForegroundColor Green
Write-Host "Logs: C:\RPM-Assure\Sql\customers\$CustomerCode\logs\"
exit 0
