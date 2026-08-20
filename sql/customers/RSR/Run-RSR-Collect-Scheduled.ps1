$ErrorActionPreference = 'Continue'
. (Join-Path $PSScriptRoot 'Customer.Config.ps1')
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$log = Join-Path $LogDir ("sched_{0}.log" -f $stamp)
function Log([string]$m) {
  $line = '{0:yyyy-MM-dd HH:mm:ss}Z {1}' -f (Get-Date).ToUniversalTime(), $m
  Add-Content -LiteralPath $log -Value $line
  Write-Host $line
}
Log ("START host=$env:COMPUTERNAME user=$LocalSqlUser log=$log")

$JobsOnly = $false; $IncludeJobs = $false
foreach ($a in $args) {
  if ($a -eq '-JobsOnly') { $JobsOnly = $true }
  if ($a -eq '-IncludeJobs') { $IncludeJobs = $true }
}
if ($JobsOnly) { $scripts = @('213_Collect_RSR_JobLogging.sql') }
else {
  $scripts = @(
    'Diagnose_Collect.sql',
    '212_Collect_RSR_Operators_LastLogin.sql',
    '214_Collect_RSR_SystemLicense.sql',
    '215_Collect_RSR_Tasks.sql',
    '216_Collect_RSR_HealthLog.sql',
    '217_Collect_RSR_DtrLevel1.sql',
    '218_Collect_RSR_OperatorSecurity.sql'
  )
  if ($IncludeJobs) { $scripts += '213_Collect_RSR_JobLogging.sql' }
}

$fail = 0
foreach ($s in $scripts) {
  $f = Join-Path $PSScriptRoot $s
  if (-not (Test-Path $f)) { Log "MISS $s"; $fail++; continue }
  $len = (Get-Item $f).Length
  Log "RUN $s size=$len"
  $out = Join-Path $LogDir ("run_{0}_{1}_out.txt" -f $stamp, ($s -replace '\W','_'))
  $err = Join-Path $LogDir ("run_{0}_{1}_err.txt" -f $stamp, ($s -replace '\W','_'))
  $p = Start-Process -FilePath 'sqlcmd' -ArgumentList @(
    '-S','.','-U',$LocalSqlUser,'-P',$LocalSqlPassword,'-C','-b','-j','-x','-i',$f,'-o',$out
  ) -Wait -PassThru -NoNewWindow -RedirectStandardError $err
  if (Test-Path $out) { Get-Content $out | ForEach-Object { Log ('  ' + $_) } }
  if (Test-Path $err) {
    $e = @(Get-Content $err)
    foreach ($line in $e) { if ($line.Trim()) { Log ('  ERR: ' + $line) } }
  }
  if ($p.ExitCode -ne 0) { Log "FAIL $s exit=$($p.ExitCode)"; $fail++ } else { Log "OK $s" }
}
if ($fail -gt 0) { Log "DONE_WITH_ERRORS fail=$fail"; exit 1 }
Log 'DONE'
exit 0
