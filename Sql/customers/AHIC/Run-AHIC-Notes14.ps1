$ErrorActionPreference = 'Continue'
$Dir = 'C:\RPM-Assure\Sql\customers\AHIC'
$Collect = 'C:\RPM-Assure\Sql\collect'
$U = 'Rpm_collect'
$P = ''
$failed = 0
foreach ($f in @(
  '224_Collect_AHIC_SqlBackups.sql',
  '225_Collect_AHIC_VersionHotfix.sql',
  '227_Collect_AHIC_DeploymentHotfixes.sql'
)) {
  $path = Join-Path $Dir $f
  if (-not (Test-Path -LiteralPath $path)) { $path = Join-Path $Collect $f }
  if (-not (Test-Path -LiteralPath $path)) {
    Write-Host ('MISSING ' + $f) -ForegroundColor Red
    $failed++
    continue
  }
  Write-Host ('RUN ' + $f) -ForegroundColor Cyan
  & sqlcmd -S '.' -U $U -P $P -C -b -i $path
  if ($LASTEXITCODE -ne 0) { Write-Host ('exit=' + $LASTEXITCODE); $failed++ }
  else { Write-Host 'exit=0' }
}
Write-Host ('Done. failedCount=' + $failed)
if ($failed -gt 0) { exit 1 } else { exit 0 }
