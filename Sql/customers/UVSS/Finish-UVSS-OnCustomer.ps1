# Finish UVSS collect - run ON UVSS-SYSPRO
$ErrorActionPreference = 'Stop'
$Dir = 'C:\RPM-Assure\Sql\customers\UVSS'
$SqlUser = 'Rpm_collect'
$SqlPassword = ''

function Find-Sqlcmd {
  $c = Get-Command sqlcmd -ErrorAction SilentlyContinue
  if ($c) { return $c.Source }
  foreach ($p in @(
    'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\sqlcmd.exe',
    'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\180\Tools\Binn\sqlcmd.exe'
  )) {
    if (Test-Path -LiteralPath $p) { return $p }
  }
  throw 'sqlcmd not found'
}

# Returns only an int 0/1 (sqlcmd output discarded from pipeline)
function Run-Sql {
  param([string]$File)
  $path = Join-Path $Dir $File
  if (-not (Test-Path -LiteralPath $path)) {
    Write-Host ('SKIP missing ' + $File) -ForegroundColor Yellow
    return 0
  }
  Write-Host ('RUN ' + $File) -ForegroundColor Cyan
  # Discard all success-stream output so function return is only the int
  $null = & $script:Sqlcmd -S '.' -U $SqlUser -P $SqlPassword -C -b -i $path 2>&1 | ForEach-Object {
    Write-Host $_
  }
  $code = 0
  if ($null -ne $LASTEXITCODE) { $code = [int]$LASTEXITCODE }
  if ($code -ne 0) {
    Write-Host ('FAIL exit=' + $code + ' file=' + $File) -ForegroundColor Red
    return 1
  }
  Write-Host ('OK ' + $File) -ForegroundColor Green
  return 0
}

Write-Host '=== UVSS finish collect ===' -ForegroundColor Cyan
Write-Host ('Host: ' + $env:COMPUTERNAME)
Write-Host ('Dir:  ' + $Dir)
if (-not (Test-Path -LiteralPath $Dir)) {
  throw ('Missing ' + $Dir)
}
$script:Sqlcmd = Find-Sqlcmd
Write-Host ('sqlcmd: ' + $script:Sqlcmd)

$failed = 0
$core = @(
  '212_Collect_UVSS_Operators_LastLogin.sql',
  '214_Collect_UVSS_SystemLicense.sql',
  '215_Collect_UVSS_Tasks.sql',
  '216_Collect_UVSS_HealthLog.sql',
  '217_Collect_UVSS_DtrLevel1.sql',
  '218_Collect_UVSS_OperatorSecurity.sql',
  '221_Collect_UVSS_SystemAuditLog.sql',
  '222_Collect_UVSS_DiagSummary.sql',
  '223_Collect_UVSS_SqlHealthBal.sql',
  '213_Collect_UVSS_JobLogging.sql'
)
foreach ($f in $core) {
  $rc = Run-Sql -File $f
  if ($null -eq $rc) { $rc = 0 }
  # If multiple objects leaked, take last int-like
  if ($rc -is [System.Array]) {
    $rc = $rc | Select-Object -Last 1
  }
  $failed = [int]$failed + [int]$rc
}

Write-Host ''
if ($failed -gt 0) {
  Write-Host ('DONE_WITH_ERRORS fails=' + $failed) -ForegroundColor Yellow
  exit 1
}
Write-Host 'DONE_ALL_OK' -ForegroundColor Green
exit 0
