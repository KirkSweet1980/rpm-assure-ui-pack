# Collect runner RSS-PROD - login rpmassure
param([switch]$IncludeJobs, [switch]$JobsOnly)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'Customer.Config.ps1')
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$log = Join-Path $LogDir ("sched_$stamp.log")
function Write-Log([string]$msg) {
  $line = '{0:u} {1}' -f (Get-Date).ToUniversalTime(), $msg
  Add-Content -Path $log -Value $line -Encoding ASCII
  Write-Output $line
}
function Find-Sqlcmd {
  $cmd = Get-Command sqlcmd -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  foreach ($c in @(
    'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\sqlcmd.exe',
    'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\180\Tools\Binn\sqlcmd.exe'
  )) { if (Test-Path $c) { return $c } }
  throw 'sqlcmd not found'
}
$CoreScripts = @(
  '212_Collect_RSS_Operators_LastLogin.sql',
  '214_Collect_RSS_SystemLicense.sql',
  '215_Collect_RSS_Tasks.sql',
  '216_Collect_RSS_HealthLog.sql',
  '217_Collect_RSS_DtrLevel1.sql',
  '218_Collect_RSS_OperatorSecurity.sql',
  '221_Collect_RSS_SystemAuditLog.sql',
  '222_Collect_RSS_DiagSummary.sql',
  '223_Collect_RSS_SqlHealthBal.sql',
  '224_Collect_RSS_SqlBackups.sql',
  '225_Collect_RSS_VersionHotfix.sql'
)
$JobScript = '213_Collect_RSS_JobLogging.sql'
$scripts = New-Object System.Collections.Generic.List[string]
if ($JobsOnly) {
  if ($JobScript) { [void]$scripts.Add((Join-Path $CollectDir $JobScript)) }
} else {
  foreach ($n in $CoreScripts) {
    $p = Join-Path $CollectDir $n
    if (Test-Path $p) { [void]$scripts.Add($p) }
  }
  if ($IncludeJobs -and $JobScript) {
    $p = Join-Path $CollectDir $JobScript
    if (Test-Path $p) { [void]$scripts.Add($p) }
  }
}
Write-Log ("START RSS host=$env:COMPUTERNAME instance=$InstanceName scripts=" + $scripts.Count)
$sqlcmd = Find-Sqlcmd
$failed = $false
foreach ($SqlFile in $scripts) {
  Write-Log ("RUN $SqlFile")
  $base = [IO.Path]::GetFileNameWithoutExtension($SqlFile)
  $outFile = Join-Path $LogDir ("out_" + $stamp + "_" + $base + ".txt")
  $errFile = Join-Path $LogDir ("err_" + $stamp + "_" + $base + ".txt")
  $p = Start-Process -FilePath $sqlcmd -ArgumentList @(
    '-S', '.', '-U', $LocalSqlUser, '-P', $LocalSqlPassword, '-C', '-b', '-i', $SqlFile
  ) -Wait -PassThru -NoNewWindow -RedirectStandardOutput $outFile -RedirectStandardError $errFile
  if (Test-Path $outFile) { Get-Content $outFile | ForEach-Object { Write-Log $_ } }
  Write-Log ("EXITCODE=$($p.ExitCode) file=$SqlFile")
  if ($p.ExitCode -ne 0) { $failed = $true }
}
if ($failed) { Write-Log 'DONE_WITH_ERRORS'; exit 1 }
Write-Log 'SUCCESS'
exit 0
