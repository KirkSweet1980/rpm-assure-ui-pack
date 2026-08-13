# Prove Pulseway collect + SQL after schedule or manual run. ASCII only.
$ErrorActionPreference = 'Continue'
$here = $PSScriptRoot
Write-Host '=== Pulseway prove ===' -ForegroundColor Cyan

$cfg = Join-Path $here 'Pulseway.Config.ps1'
Write-Host ("Config: " + $(if (Test-Path $cfg) { 'OK' } else { 'MISSING' }))

$collect = Join-Path $here 'Collect-Pulseway-To-RPMAssure.ps1'
Write-Host ("Collect: " + $(if (Test-Path $collect) { 'OK' } else { 'MISSING' }))

# Latest log
$logs = Get-ChildItem (Join-Path $here 'logs') -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($logs) {
  Write-Host ("Latest log: " + $logs.FullName)
  Select-String -Path $logs.FullName -Pattern 'Rate limit:|API stats:|uptime sample|devices count|DONE|FAIL|429' |
    Select-Object -Last 20 | ForEach-Object { $_.Line }
} else {
  Write-Host 'No logs yet - run collect first'
}

# Task
$task = Get-ScheduledTask -TaskName 'RPMAssure-Pulseway-Collect' -ErrorAction SilentlyContinue
if ($task) {
  $info = Get-ScheduledTaskInfo -TaskName 'RPMAssure-Pulseway-Collect'
  Write-Host ("Task State=" + $task.State + " LastResult=" + $info.LastTaskResult + " LastRun=" + $info.LastRunTime)
} else {
  Write-Host 'Task RPMAssure-Pulseway-Collect not installed'
}

# SQL prove (Windows auth or set env)
$server = if ($env:RPM_ASSURE_SQL_SERVER) { $env:RPM_ASSURE_SQL_SERVER + $(if ($env:RPM_ASSURE_SQL_PORT) { ',' + $env:RPM_ASSURE_SQL_PORT } else { '' }) } else { '102.222.21.220,14333' }
Write-Host ("SQL probe " + $server)
$sql = @'
SET NOCOUNT ON;
SELECT COUNT(*) AS Devices, MAX(SnapshotDate) AS Snap, SUM(CASE WHEN UptimeDays IS NOT NULL THEN 1 ELSE 0 END) AS WithUptime
FROM dbo.Pulseway_Devices WITH (NOLOCK);
SELECT COUNT(*) AS Disks, MAX(SnapshotDate) AS DiskSnap FROM dbo.Pulseway_Disks WITH (NOLOCK);
SELECT TOP 8 Name, UptimeDays, IsOnline, CustomerCode FROM dbo.Pulseway_Devices WITH (NOLOCK)
WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Pulseway_Devices WITH (NOLOCK))
ORDER BY CASE WHEN UptimeDays IS NULL THEN 1 ELSE 0 END, UptimeDays DESC;
'@
sqlcmd -S $server -d RPMAssure_App -E -C -Q $sql 2>&1 | Select-Object -First 40
Write-Host '=== prove done ===' -ForegroundColor Green
