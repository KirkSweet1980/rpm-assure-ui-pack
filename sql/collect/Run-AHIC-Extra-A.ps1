$ErrorActionPreference = 'Stop'
$dirs = @(
  'C:\RPM-Assure\Sql\collect',
  'C:\RPM-Assure\Sql\customers\AHI',
  'C:\RPM-Assure\Sql\customers\AHIC'
)
$U = 'Rpm_collect'; $P = 'RpmCollect#AHIC2026'
$sqlcmd = (Get-Command sqlcmd -EA SilentlyContinue).Source
if (-not $sqlcmd) { $sqlcmd = 'sqlcmd' }
foreach ($f in @(
  '221_Collect_AHIC_SystemAuditLog.sql',
  '222_Collect_AHIC_DiagSummary.sql',
  '223_Collect_AHIC_SqlHealthBal.sql'
)) {
  $path = $null
  foreach ($d in $dirs) {
    $c = Join-Path $d $f
    if (Test-Path -LiteralPath $c) { $path = $c; break }
    $alt = Join-Path $d ($f -replace 'AHIC','AHI')
    if (Test-Path -LiteralPath $alt) { $path = $alt; break }
  }
  if (-not $path) { Write-Host ('MISS ' + $f); continue }
  Write-Host ('RUN ' + $path) -ForegroundColor Cyan
  & $sqlcmd -S '.' -U $U -P $P -C -b -i $path
  Write-Host ('exit=' + $LASTEXITCODE)
}
Write-Host 'AHIC Extra-A done.' -ForegroundColor Green
