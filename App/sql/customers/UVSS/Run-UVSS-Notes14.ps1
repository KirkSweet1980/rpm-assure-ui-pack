$ErrorActionPreference = 'Continue'
$Dir = 'C:\RPM-Assure\Sql\customers\UVSS'
$U = 'Rpm_collect'
$P = ''
$files = @(
  '224_Collect_UVSS_SqlBackups.sql',
  '225_Collect_UVSS_VersionHotfix.sql',
  '227_Collect_UVSS_DeploymentHotfixes.sql'
)
New-Item -ItemType Directory -Force -Path (Join-Path $Dir 'logs') | Out-Null
foreach ($f in $files) {
  $path = Join-Path $Dir $f
  if (-not (Test-Path -LiteralPath $path)) {
    Write-Host ('MISSING ' + $path)
    continue
  }
  Write-Host ('RUN ' + $f)
  & sqlcmd -S '.' -U $U -P $P -C -b -i $path
  Write-Host ('exit=' + $LASTEXITCODE)
}
Write-Host 'Notes14+227 done.'
