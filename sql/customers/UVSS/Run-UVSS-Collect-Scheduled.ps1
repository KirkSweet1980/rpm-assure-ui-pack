param(
  [switch]$JobsOnly,
  [switch]$IncludeJobs
)
$ErrorActionPreference = 'Continue'
$SqlUser = 'Rpm_collect'
$SqlPassword = 'RpmCollect#AHIC2026'
$CollectDir = 'C:\RPM-Assure\Sql\customers\UVSS'
$LogDir = Join-Path $CollectDir 'logs'
$CoreScripts = @(
  '212_Collect_UVSS_Operators_LastLogin.sql',
  '214_Collect_UVSS_SystemLicense.sql',
  '215_Collect_UVSS_Tasks.sql',
  '216_Collect_UVSS_HealthLog.sql',
  '217_Collect_UVSS_DtrLevel1.sql',
  '218_Collect_UVSS_OperatorSecurity.sql',
  '221_Collect_UVSS_SystemAuditLog.sql',
  '222_Collect_UVSS_DiagSummary.sql',
  '223_Collect_UVSS_SqlHealthBal.sql',
  '224_Collect_UVSS_SqlBackups.sql',
  '225_Collect_UVSS_VersionHotfix.sql',
  '227_Collect_UVSS_DeploymentHotfixes.sql'
)
$JobScript = '213_Collect_UVSS_JobLogging.sql'

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$log = Join-Path $LogDir ("sched_{0}.log" -f $stamp)
function Log([string]$m) {
  $line = ('{0}Z {1}' -f (Get-Date).ToUniversalTime().ToString('yyyy-MM-dd HH:mm:ss'), $m)
  Add-Content -LiteralPath $log -Value $line
  Write-Host $line
}

$sqlcmd = 'sqlcmd'
foreach ($c in @(
  'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE',
  'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\130\Tools\Binn\SQLCMD.EXE'
)) {
  if (Test-Path -LiteralPath $c) { $sqlcmd = $c; break }
}

Log ('START host=' + $env:COMPUTERNAME + ' IncludeJobs=' + $IncludeJobs + ' JobsOnly=' + $JobsOnly)
Log ('log=' + $log)
Log ('sqlcmd=' + $sqlcmd)

$scripts = New-Object System.Collections.Generic.List[string]
if ($JobsOnly) {
  [void]$scripts.Add((Join-Path $CollectDir $JobScript))
} else {
  foreach ($n in $CoreScripts) {
    $p = Join-Path $CollectDir $n
    if (Test-Path -LiteralPath $p) { [void]$scripts.Add($p) }
    else { Log ('MISSING ' + $p) }
  }
  if ($IncludeJobs) {
    $p = Join-Path $CollectDir $JobScript
    if (Test-Path -LiteralPath $p) { [void]$scripts.Add($p) }
  }
}

$failed = 0
foreach ($f in $scripts) {
  Log ('RUN ' + $f)
  & $sqlcmd -S '.' -U $SqlUser -P $SqlPassword -C -b -i $f *>&1 | ForEach-Object { Log ("$_") }
  if ($LASTEXITCODE -ne 0) {
    Log ('FAIL exit=' + $LASTEXITCODE + ' file=' + $f)
    $failed++
  } else {
    Log ('EXITCODE=0 file=' + $f)
  }
}

if ($failed -gt 0) {
  Log 'DONE_WITH_ERRORS'
  exit 1
}
Log 'DONE_OK'
exit 0
