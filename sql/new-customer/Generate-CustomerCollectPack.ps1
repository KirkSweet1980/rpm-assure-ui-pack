# Generate-CustomerCollectPack.ps1
# Creates C:\RPM-Assure\Sql\customers\<CODE>\ with collect scripts for one customer.
#
# Example:
#   .\Generate-CustomerCollectPack.ps1 `
#     -CustomerCode 'SFRUIT' `
#     -DisplayName 'Sir Fruit' `
#     -InstanceName 'SFRUIT-SSQL-SRV' `
#     -SqlPassword 'YourLocalPassword' `
#     -SourceAhicDir 'C:\RPM-Assure\Sql\collect'
#
param(
  [Parameter(Mandatory = $true)][string]$CustomerCode,
  [Parameter(Mandatory = $true)][string]$DisplayName,
  [Parameter(Mandatory = $true)][string]$InstanceName,
  [string]$SqlUser = 'Rpm_collect',
  [string]$SqlPassword = 'CHANGE_ME',
  [string]$SourceAhicDir = 'C:\RPM-Assure\Sql\collect',
  [string]$OutRoot = 'C:\RPM-Assure\Sql\customers'
)

$ErrorActionPreference = 'Stop'
$CustomerCode = $CustomerCode.Trim().ToUpperInvariant()
$out = Join-Path $OutRoot $CustomerCode
New-Item -ItemType Directory -Force -Path $out | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $out 'logs') | Out-Null

$scripts = @(
  '212_Collect_AHIC_Operators_LastLogin.sql',
  '213_Collect_AHIC_JobLogging.sql',
  '213b_Collect_AHIC_JobErrorsOnly.sql',
  '214_Collect_AHIC_SystemLicense.sql',
  '215_Collect_AHIC_Tasks.sql',
  '216_Collect_AHIC_HealthLog.sql',
  '217_Collect_AHIC_DtrLevel1.sql',
  '218_Collect_AHIC_OperatorSecurity.sql'
)

function Convert-AhicContent([string]$text) {
  $t = $text
  $t = $t -replace "N'AHIC'", "N'$CustomerCode'"
  $t = $t -replace "N'AHIC-SSQL-SRV'", "N'$InstanceName'"
  $t = $t -replace 'AHIC-SSQL-SRV', $InstanceName
  $t = $t -replace 'AHIC collect', "$CustomerCode collect"
  $t = $t -replace '=== AHIC', "=== $CustomerCode"
  $t = $t -replace 'Done AHIC', "Done $CustomerCode"
  $t = $t -replace 'AHIC not', "$CustomerCode not"
  return $t
}

$generated = @()
foreach ($name in $scripts) {
  $src = Join-Path $SourceAhicDir $name
  if (-not (Test-Path $src)) {
    Write-Warning "Skip missing $src"
    continue
  }
  $newName = $name -replace '_AHIC_', "_${CustomerCode}_"
  $dest = Join-Path $out $newName
  $raw = Get-Content -Path $src -Raw -Encoding UTF8
  $conv = Convert-AhicContent $raw
  # Prefer UTF8 no BOM if possible
  [IO.File]::WriteAllText($dest, $conv)
  $generated += $newName
  Write-Host "OK $newName"
}

# Runner
$coreList = $generated | Where-Object { $_ -match '212_|214_|215_|216_|217_|218_' } | ForEach-Object { "  '$_'" }
$jobList = $generated | Where-Object { $_ -match '213' } | Select-Object -First 1

$runner = @"
# Auto-generated collect runner for $CustomerCode
param([switch]`$IncludeJobs, [switch]`$JobsOnly)
`$ErrorActionPreference = 'Stop'
`$SqlUser = '$SqlUser'
`$SqlPassword = '$SqlPassword'
`$LogDir = '$out\logs'
`$CollectDir = '$out'
`$CoreScripts = @(
$($coreList -join ",`n")
)
`$JobScript = '$jobList'
New-Item -ItemType Directory -Force -Path `$LogDir | Out-Null
`$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
`$log = Join-Path `$LogDir ("sched_`$stamp.log")
function Write-Log([string]`$msg) {
  `$line = '{0:u} {1}' -f (Get-Date).ToUniversalTime(), `$msg
  Add-Content -Path `$log -Value `$line
  Write-Output `$line
}
function Find-Sqlcmd {
  `$cmd = Get-Command sqlcmd -ErrorAction SilentlyContinue
  if (`$cmd) { return `$cmd.Source }
  foreach (`$c in @(
    'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\sqlcmd.exe',
    'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\180\Tools\Binn\sqlcmd.exe'
  )) { if (Test-Path `$c) { return `$c } }
  throw 'sqlcmd not found'
}
`$scripts = New-Object System.Collections.Generic.List[string]
if (`$JobsOnly) {
  if (`$JobScript) { [void]`$scripts.Add((Join-Path `$CollectDir `$JobScript)) }
} else {
  foreach (`$n in `$CoreScripts) {
    `$p = Join-Path `$CollectDir `$n
    if (Test-Path `$p) { [void]`$scripts.Add(`$p) }
  }
  if (`$IncludeJobs -and `$JobScript) {
    `$p = Join-Path `$CollectDir `$JobScript
    if (Test-Path `$p) { [void]`$scripts.Add(`$p) }
  }
}
Write-Log "START $CustomerCode host=`$env:COMPUTERNAME"
`$sqlcmd = Find-Sqlcmd
`$failed = `$false
foreach (`$SqlFile in `$scripts) {
  Write-Log "RUN `$SqlFile"
  `$base = [IO.Path]::GetFileNameWithoutExtension(`$SqlFile)
  `$outFile = Join-Path `$LogDir ("out_`${stamp}_`${base}.txt")
  `$errFile = Join-Path `$LogDir ("err_`${stamp}_`${base}.txt")
  `$p = Start-Process -FilePath `$sqlcmd -ArgumentList @(
    '-S', '.', '-U', `$SqlUser, '-P', `$SqlPassword, '-C', '-b', '-i', `$SqlFile
  ) -Wait -PassThru -NoNewWindow -RedirectStandardOutput `$outFile -RedirectStandardError `$errFile
  if (Test-Path `$outFile) { Get-Content `$outFile | ForEach-Object { Write-Log `$_ } }
  Write-Log "EXITCODE=`$(`$p.ExitCode) file=`$SqlFile"
  if (`$p.ExitCode -ne 0) { `$failed = `$true }
}
if (`$failed) { Write-Log 'DONE_WITH_ERRORS'; exit 1 }
Write-Log 'SUCCESS'; exit 0
"@
$runnerPath = Join-Path $out "Run-${CustomerCode}-Collect-Scheduled.ps1"
[IO.File]::WriteAllText($runnerPath, $runner)

$cmd = @"
@echo off
cd /d "$out"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$runnerPath" %*
exit /b %ERRORLEVEL%
"@
[IO.File]::WriteAllText((Join-Path $out "Run-${CustomerCode}-Collect.cmd"), $cmd)

$install = @"
# Install schedule for $CustomerCode — run as Administrator
`$ErrorActionPreference = 'Continue'
`$core = 'RPMAssure-$CustomerCode-SysproCollect'
`$jobs = 'RPMAssure-$CustomerCode-SysproJobs'
`$cmdPath = '$out\Run-$CustomerCode-Collect.cmd'
`$ps1 = '$runnerPath'
schtasks /Delete /TN `$core /F 2>`$null | Out-Null
schtasks /Create /F /TN `$core /TR "`$cmdPath" /SC MINUTE /MO 15 /RU SYSTEM /RL HIGHEST
schtasks /Delete /TN `$jobs /F 2>`$null | Out-Null
schtasks /Create /F /TN `$jobs /TR "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `$ps1 -JobsOnly" /SC DAILY /ST 02:45 /RU SYSTEM /RL HIGHEST
Write-Host "Installed `$core (15 min) and `$jobs (daily 02:45)"
"@
[IO.File]::WriteAllText((Join-Path $out "Install-${CustomerCode}-Schedule.ps1"), $install)

$meta = @"
CustomerCode=$CustomerCode
DisplayName=$DisplayName
InstanceName=$InstanceName
GeneratedUtc=$((Get-Date).ToUniversalTime().ToString('u'))
Scripts=$($generated -join ', ')
"@
[IO.File]::WriteAllText((Join-Path $out 'CUSTOMER.txt'), $meta)

Write-Host ""
Write-Host "Pack ready: $out" -ForegroundColor Green
Write-Host "1) Central: edit 301 and register $CustomerCode"
Write-Host "2) Customer: 302 + 303 (login + linked server)"
Write-Host "3) Test: powershell -File $runnerPath"
Write-Host "4) Schedule: Install-$CustomerCode-Schedule.ps1 as Admin"
