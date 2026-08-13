# C:\RPM-Assure\Sql\collect\Run-AHIC-Collect-Scheduled.ps1
# AHIC scheduled collect ? central RPMAssure_App via linked server RPM_CENTRAL
#
# Default (every 15 min): 212 operators+login, 214 license, 215 tasks, 216 health, 217 DTR L1
# Jobs (213) are SLOW (~full AdmJobLogging) - off by default; enable with -IncludeJobs
#   or separate task: Run-AHIC-Collect-Scheduled.ps1 -IncludeJobs -JobsOnly
#
# Task Scheduler / cmd:
#   powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\RPM-Assure\Sql\collect\Run-AHIC-Collect-Scheduled.ps1"

param(
  [switch]$IncludeJobs,
  [switch]$JobsOnly
)

$ErrorActionPreference = 'Stop'

$SqlUser     = 'Rpm_collect'
$SqlPassword = 'RpmCollect#AHIC2026'
$LogDir      = 'C:\RPM-Assure\Sql\collect\logs'
$CollectDir  = 'C:\RPM-Assure\Sql\collect'

$CoreScripts = @(
  '212_Collect_AHIC_Operators_LastLogin.sql',
  '218_Collect_AHIC_OperatorSecurity.sql',
  '214_Collect_AHIC_SystemLicense.sql',
  '215_Collect_AHIC_Tasks.sql',
  '216_Collect_AHIC_HealthLog.sql',
  '217_Collect_AHIC_DtrLevel1.sql',
  '224_Collect_AHIC_SqlBackups.sql',
  '225_Collect_AHIC_VersionHotfix.sql',
  '221_Collect_AHIC_SystemAuditLog.sql',
  '222_Collect_AHIC_DiagSummary.sql',
  '223_Collect_AHIC_SqlHealthBal.sql',
  '227_Collect_AHIC_DeploymentHotfixes.sql'
)
$JobScript = '213_Collect_AHIC_JobLogging.sql'
$JobScriptFast = '213b_Collect_AHIC_JobErrorsOnly.sql'
# fallbacks
$CoreFallbackOps = '210_Collect_AHIC_To_RPMAssure_App.sql'

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$log   = Join-Path $LogDir "sched_$stamp.log"

function Write-Log([string]$msg) {
  $line = '{0:u} {1}' -f (Get-Date).ToUniversalTime(), $msg
  Add-Content -Path $log -Value $line
  Write-Output $line
}

function Find-Sqlcmd {
  foreach ($c in @(
    'sqlcmd',
    'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\sqlcmd.exe',
    'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\180\Tools\Binn\sqlcmd.exe',
    'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\130\Tools\Binn\sqlcmd.exe'
  )) {
    if ($c -eq 'sqlcmd') {
      $cmd = Get-Command sqlcmd -ErrorAction SilentlyContinue
      if ($cmd) { return $cmd.Source }
    } elseif (Test-Path $c) { return $c }
  }
  throw 'sqlcmd.exe not found'
}

function Resolve-Script([string]$name) {
  foreach ($dir in @($CollectDir, 'C:\RPM-Assure\Sql\customers\AHI', 'C:\RPM-Assure\Sql\customers\AHIC')) {
    $p = Join-Path $dir $name
    if (Test-Path -LiteralPath $p) { return $p }
  }
  # AHI alias names
  $alt = $name -replace 'AHIC','AHI'
  foreach ($dir in @($CollectDir, 'C:\RPM-Assure\Sql\customers\AHI', 'C:\RPM-Assure\Sql\customers\AHIC')) {
    $p = Join-Path $dir $alt
    if (Test-Path -LiteralPath $p) { return $p }
  }
  return $null
}

$scripts = New-Object System.Collections.Generic.List[string]

if ($JobsOnly) {
  $j = Resolve-Script $JobScriptFast
  if (-not $j) { $j = Resolve-Script $JobScript }
  if (-not $j) { throw "Missing job collect script (213b or 213)" }
  [void]$scripts.Add($j)
  Write-Log "Jobs script: $j"
} else {
  foreach ($n in $CoreScripts) {
    $p = Resolve-Script $n
    if (-not $p -and $n -like '212*') {
      $p = Resolve-Script $CoreFallbackOps
    }
    if ($p) { [void]$scripts.Add($p) }
    else { Write-Log "WARN missing $n (skipped)" }
  }
  if ($IncludeJobs) {
    $j = Resolve-Script $JobScriptFast
    if (-not $j) { $j = Resolve-Script $JobScript }
    if ($j) { [void]$scripts.Add($j); Write-Log "Jobs script: $j" }
    else { Write-Log "WARN missing job scripts (skipped)" }
  }
}

if ($scripts.Count -eq 0) { throw 'No collect scripts found under C:\RPM-Assure\Sql\collect' }

Write-Log "START host=$env:COMPUTERNAME IncludeJobs=$IncludeJobs JobsOnly=$JobsOnly"
Write-Log "log=$log"
$sqlcmd = Find-Sqlcmd
Write-Log "sqlcmd=$sqlcmd"

$failed = $false
foreach ($SqlFile in $scripts) {
  Write-Log "RUN $SqlFile"
  $base = [IO.Path]::GetFileNameWithoutExtension($SqlFile)
  $outFile = Join-Path $LogDir ("out_{0}_{1}.txt" -f $stamp, $base)
  $errFile = Join-Path $LogDir ("err_{0}_{1}.txt" -f $stamp, $base)
  $p = Start-Process -FilePath $sqlcmd -ArgumentList @(
    '-S', '.', '-U', $SqlUser, '-P', $SqlPassword, '-C', '-b', '-i', $SqlFile
  ) -Wait -PassThru -NoNewWindow -RedirectStandardOutput $outFile -RedirectStandardError $errFile
  if (Test-Path $outFile) { Get-Content $outFile | ForEach-Object { Write-Log $_ } }
  if (Test-Path $errFile) {
    Get-Content $errFile | ForEach-Object {
      if ($_ -and $_.Trim().Length -gt 0) { Write-Log "ERR $_" }
    }
  }
  Write-Log "EXITCODE=$($p.ExitCode) file=$SqlFile"
  if ($p.ExitCode -ne 0) {
    $failed = $true
    Write-Log "FAIL $SqlFile - continuing remaining scripts"
  }
}

if ($failed) {
  Write-Log 'DONE_WITH_ERRORS'
  exit 1
}
Write-Log 'SUCCESS'
exit 0
