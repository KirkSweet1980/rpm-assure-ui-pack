# Diagnose-Rmm-Patch-Status.ps1
# Prints estate agent patch status from latest Pulseway snapshot
param(
  [string]$SqlServer = '102.222.21.220,14333',
  [string]$SqlDatabase = 'RPMAssure_App',
  [string]$SqlUser = 'Rpm_collect',
  [string]$SqlPassword = 'RpmCollect#AHIC2026',
  [string]$CustomerCode = ''
)
$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$sqlFile = Join-Path $here 'Diagnose-Rmm-Patch-Status.sql'
if (-not (Test-Path $sqlFile)) { throw "Missing $sqlFile" }

function Find-Sqlcmd {
  $cmd = Get-Command sqlcmd -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  foreach ($p in @(
    'D:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE',
    'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE'
  )) { if (Test-Path $p) { return $p } }
  throw 'sqlcmd not found'
}

$sqlcmd = Find-Sqlcmd
Write-Host '=== RPM Assure - Agent patch status ===' -ForegroundColor Cyan
Write-Host ("SQL $SqlServer / $SqlDatabase") -ForegroundColor DarkGray
Write-Host ''

# Full report
& $sqlcmd -S $SqlServer -d $SqlDatabase -U $SqlUser -P $SqlPassword -C -W -s '|' -i $sqlFile
if ($LASTEXITCODE -ne 0) {
  Write-Host 'Retry Windows auth...' -ForegroundColor Yellow
  & $sqlcmd -S $SqlServer -d $SqlDatabase -E -C -W -s '|' -i $sqlFile
}

if ($CustomerCode) {
  Write-Host ''
  Write-Host "=== Customer filter: $CustomerCode ===" -ForegroundColor Cyan
  $q = @"
SET NOCOUNT ON;
SELECT Name, DeviceType,
  CASE WHEN IsOnline=1 THEN 'Online' WHEN IsOnline=0 THEN 'Offline' ELSE '?' END AS OnlineStatus,
  PatchMissingCount AS Outstanding,
  PatchPendingCount AS Pending,
  CpuUsagePct, MemoryUsagePct, UptimeDays, LastSeenOnline
FROM dbo.Pulseway_Devices WITH (NOLOCK)
WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Pulseway_Devices WITH (NOLOCK))
  AND CustomerCode = N'$($CustomerCode.Replace("'","''"))'
ORDER BY ISNULL(PatchMissingCount,-1) DESC, Name;
"@
  & $sqlcmd -S $SqlServer -d $SqlDatabase -U $SqlUser -P $SqlPassword -C -W -s '|' -Q $q
}

Write-Host ''
Write-Host 'Notes:' -ForegroundColor Yellow
Write-Host '  Outstanding = Pulseway Updates.Critical + Important + Unspecified'
Write-Host '  Installed count is usually blank (API does not send it)'
Write-Host '  UI: Customer -> RMM -> Patch management'
Write-Host '  Example one customer:  .\Diagnose-Rmm-Patch-Status.ps1 -CustomerCode AHIC'
