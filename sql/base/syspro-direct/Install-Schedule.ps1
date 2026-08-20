# Install 15-min + nightly jobs schedule for a customer
# Run as Administrator on customer SQL host
#
# Default: SYSTEM (simple). Prefer a dedicated service account:
#   .\Install-Schedule.ps1 -ConfigPath .\Customer.Config.ps1 `
#     -RunAsUser 'DOMAIN\rpm-collect-svc' -RunAsPassword '***'
#
# Service account needs:
#   - Log on as a batch job
#   - Read C:\RPM-Assure\Sql
#   - Local SQL login for collect
#   - Network path to central SQL (102.222.21.220,14333)
param(
  [Parameter(Mandatory=$true)][string]$ConfigPath,
  [string]$TaskPrefix = 'RPMAssure',
  [string]$RunAsUser = 'SYSTEM',
  [string]$RunAsPassword = '',
  [int]$IntervalMinutes = 15,
  [string]$NightlyTime = '02:30'
)
$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $ConfigPath)) { throw "Missing $ConfigPath" }
. $ConfigPath
$baseDir = 'C:\RPM-Assure\Sql\base\syspro-direct'
$runner = Join-Path $baseDir 'Run-Syspro-Collect-Direct.ps1'
if (-not (Test-Path $runner)) { throw "Missing base runner $runner - expand base pack first" }

$cfg = (Resolve-Path -LiteralPath $ConfigPath).Path
$tn15 = "$TaskPrefix-$CustomerCode-SysproCollect"
$tnNight = "$TaskPrefix-$CustomerCode-SysproJobs"

$tr15 = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$runner`" -ConfigPath `"$cfg`" -JobsErrorsOnly"
$trNight = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$runner`" -ConfigPath `"$cfg`" -IncludeJobs"

function Remove-RpmaTaskQuiet {
  param([string]$Name)
  # Task may not exist yet - never treat as fatal under $ErrorActionPreference Stop
  $prev = $ErrorActionPreference
  $ErrorActionPreference = 'SilentlyContinue'
  try {
    # cmd swallows "not found"; /F required
    cmd.exe /c "schtasks.exe /Delete /TN `"$Name`" /F >nul 2>&1" | Out-Null
  } catch {
    # ignore
  } finally {
    $ErrorActionPreference = $prev
  }
}

function New-RpmaTask {
  param([string]$Name, [string]$Tr, [string]$ScheduleType, [string]$Mo, [string]$St)

  Remove-RpmaTaskQuiet -Name $Name

  # /F on create overwrites if still present
  $argList = @(
    '/Create', '/F',
    '/TN', $Name,
    '/TR', $Tr,
    '/RL', 'HIGHEST'
  )
  if ($ScheduleType -eq 'MINUTE') {
    $argList += @('/SC', 'MINUTE', '/MO', $Mo)
  } else {
    $argList += @('/SC', 'DAILY', '/ST', $St)
  }

  $ru = $RunAsUser
  if ([string]::IsNullOrWhiteSpace($ru) -or $ru -eq 'SYSTEM' -or $ru -eq 'NT AUTHORITY\SYSTEM') {
    $argList += @('/RU', 'SYSTEM')
  } else {
    $argList += @('/RU', $ru)
    if ($RunAsPassword) { $argList += @('/RP', $RunAsPassword) }
  }

  $prev = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  $out = & schtasks.exe @argList 2>&1
  $code = $LASTEXITCODE
  $ErrorActionPreference = $prev
  $out | ForEach-Object { Write-Host $_ }
  if ($code -ne 0) {
    throw "schtasks /Create failed for $Name exit=$code"
  }
  Write-Host "Created task: $Name" -ForegroundColor Green
}

Write-Host "Creating $tn15 (every $IntervalMinutes min)..." -ForegroundColor Cyan
New-RpmaTask -Name $tn15 -Tr $tr15 -ScheduleType 'MINUTE' -Mo ([string]$IntervalMinutes) -St $NightlyTime

Write-Host "Creating $tnNight (daily $NightlyTime)..." -ForegroundColor Cyan
New-RpmaTask -Name $tnNight -Tr $trNight -ScheduleType 'DAILY' -Mo '1' -St $NightlyTime

Write-Host "Installed: $tn15 (every ${IntervalMinutes} min, errors-only jobs)" -ForegroundColor Green
Write-Host "Installed: $tnNight (daily $NightlyTime, full jobs cap)" -ForegroundColor Green
Write-Host "RunAs: $RunAsUser" -ForegroundColor Cyan
Write-Host "Logs: under customer logs\ folder" -ForegroundColor Cyan

try {
  Start-ScheduledTask -TaskName $tn15 -ErrorAction SilentlyContinue
} catch { }

try {
  Get-ScheduledTask -TaskName $tn15, $tnNight -ErrorAction SilentlyContinue |
    Format-Table TaskName, State -AutoSize
} catch {
  # fallback list
  schtasks.exe /Query /TN $tn15 2>$null
  schtasks.exe /Query /TN $tnNight 2>$null
}

# Native FinSight L1-3 every interval (INV/AP/AR/WIP)
$native = Join-Path $baseDir 'Collect-Dtr-Native-Fallback.ps1'
$tnNative = "$TaskPrefix-$CustomerCode-SysproNative"
if (Test-Path -LiteralPath $native) {
  $trNative = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$native`" -ConfigPath `"$cfg`""
  Write-Host "Creating $tnNative (every $IntervalMinutes min)..." -ForegroundColor Cyan
  try {
    New-RpmaTask -Name $tnNative -Tr $trNative -ScheduleType 'MINUTE' -Mo ([string]$IntervalMinutes) -St $NightlyTime
    Write-Host "Installed: $tnNative" -ForegroundColor Green
  } catch {
    Write-Host "WARN native task: $_" -ForegroundColor Yellow
  }
}

exit 0
