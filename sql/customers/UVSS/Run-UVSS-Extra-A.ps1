# Run Audit + Diag + SqlHealth collectors - show full sqlcmd output
$ErrorActionPreference = 'Stop'
$Dir = 'C:\RPM-Assure\Sql\customers\UVSS'
$SqlUser = 'Rpm_collect'
$SqlPassword = 'RpmCollect#AHIC2026'
$LogDir = Join-Path $Dir 'logs'
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$log = Join-Path $LogDir ('extra_a_' + (Get-Date -Format 'yyyyMMdd_HHmmss') + '.log')

$sqlcmd = (Get-Command sqlcmd -ErrorAction SilentlyContinue).Source
if (-not $sqlcmd) {
  foreach ($p in @(
    'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\sqlcmd.exe',
    'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\180\Tools\Binn\sqlcmd.exe'
  )) { if (Test-Path $p) { $sqlcmd = $p; break } }
}
if (-not $sqlcmd) { throw 'sqlcmd not found' }

$files = @(
  '221_Collect_UVSS_SystemAuditLog.sql',
  '222_Collect_UVSS_DiagSummary.sql',
  '223_Collect_UVSS_SqlHealthBal.sql'
)

$failed = 0
foreach ($f in $files) {
  $path = Join-Path $Dir $f
  Write-Host ('RUN ' + $f) -ForegroundColor Cyan
  if (-not (Test-Path -LiteralPath $path)) {
    Write-Host ('MISSING ' + $path) -ForegroundColor Red
    $failed++
    continue
  }
  $out = & $sqlcmd -S '.' -U $SqlUser -P $SqlPassword -C -b -i $path 2>&1
  $out | Tee-Object -FilePath $log -Append
  if ($LASTEXITCODE -ne 0) {
    Write-Host ('FAIL exit=' + $LASTEXITCODE) -ForegroundColor Red
    $failed++
  } else {
    Write-Host ('OK exit=0') -ForegroundColor Green
  }
  Write-Host ''
}

Write-Host ('Log: ' + $log)
if ($failed -gt 0) {
  Write-Host ('DONE_WITH_ERRORS fails=' + $failed) -ForegroundColor Yellow
  exit 1
}
Write-Host 'DONE_ALL_OK' -ForegroundColor Green
exit 0
