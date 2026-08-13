# Install Task Scheduler jobs on AHIC-SSQL-SRV (run as Administrator)
# powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\Sql\collect\Install-AHIC-Schedule.ps1

$ErrorActionPreference = 'Continue'

$Collect = 'C:\RPM-Assure\Sql\collect'
$Cmd = Join-Path $Collect 'Run-AHIC-Collect.cmd'
$Ps1 = Join-Path $Collect 'Run-AHIC-Collect-Scheduled.ps1'

if (-not (Test-Path $Ps1)) { throw "Missing $Ps1" }
if (-not (Test-Path $Cmd)) { throw "Missing $Cmd" }

function Remove-TaskIfExists([string]$Name) {
  $null = schtasks /Query /TN $Name 2>&1
  if ($LASTEXITCODE -eq 0) {
    schtasks /Delete /TN $Name /F | Out-Null
    Write-Host "Deleted existing task $Name"
  }
}

$coreName = 'RPMAssure-AHIC-SysproCollect'
$jobsName = 'RPMAssure-AHIC-SysproJobs'

Remove-TaskIfExists $coreName
Remove-TaskIfExists $jobsName

# Core every 15 minutes
$r1 = schtasks /Create /F /TN $coreName `
  /TR "C:\RPM-Assure\Sql\collect\Run-AHIC-Collect.cmd" `
  /SC MINUTE /MO 15 `
  /RU SYSTEM `
  /RL HIGHEST
if ($LASTEXITCODE -ne 0) { throw "Failed to create $coreName (exit $LASTEXITCODE)" }
Write-Host $r1

# Jobs once daily at 02:30
$jobsTr = 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\Sql\collect\Run-AHIC-Collect-Scheduled.ps1 -JobsOnly'
$r2 = schtasks /Create /F /TN $jobsName `
  /TR $jobsTr `
  /SC DAILY /ST 02:30 `
  /RU SYSTEM `
  /RL HIGHEST
if ($LASTEXITCODE -ne 0) { throw "Failed to create $jobsName (exit $LASTEXITCODE)" }
Write-Host $r2

Write-Host ""
Write-Host "Installed:" -ForegroundColor Green
Write-Host "  $coreName  every 15 min  (212,214,215,216,217)"
Write-Host "  $jobsName  daily 02:30   (213 jobs only)"
Write-Host ""
Write-Host "Test:"
Write-Host "  Start-ScheduledTask -TaskName '$coreName'"
Write-Host "  Get-ScheduledTaskInfo -TaskName '$coreName' | Format-List LastRunTime,LastTaskResult,NextRunTime"
