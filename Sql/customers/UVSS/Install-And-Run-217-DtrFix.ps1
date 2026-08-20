$ErrorActionPreference = 'Stop'
$dir = 'C:\RPM-Assure\Sql\customers\UVSS'
New-Item -ItemType Directory -Force -Path $dir | Out-Null

$src = Join-Path $env:USERPROFILE 'Downloads\217_Collect_UVSS_DtrLevel1.sql'
if (-not (Test-Path $src)) {
  $cand = Get-ChildItem (Join-Path $env:USERPROFILE 'Downloads') -Filter '*217*UVSS*Dtr*.sql' -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if ($cand) { $src = $cand.FullName }
}
if (-not (Test-Path $src)) { throw "Put 217_Collect_UVSS_DtrLevel1.sql in Downloads first" }

Copy-Item $src (Join-Path $dir '217_Collect_UVSS_DtrLevel1.sql') -Force
Write-Host "Copied 217 to $dir" -ForegroundColor Green

$disc = Join-Path $env:USERPROFILE 'Downloads\217a_Discover_UVSS_Dtr.sql'
if (Test-Path $disc) {
  Copy-Item $disc (Join-Path $dir '217a_Discover_UVSS_Dtr.sql') -Force
  Write-Host "=== Discover ===" -ForegroundColor Cyan
  & sqlcmd -S "." -U "Rpm_collect" -P "" -C -b -i (Join-Path $dir '217a_Discover_UVSS_Dtr.sql')
}

Write-Host "=== Collect DTR ===" -ForegroundColor Cyan
& sqlcmd -S "." -U "Rpm_collect" -P "" -C -b -i (Join-Path $dir '217_Collect_UVSS_DtrLevel1.sql')
if ($LASTEXITCODE -ne 0) { throw "sqlcmd exit $LASTEXITCODE" }

Write-Host "=== Verify central ===" -ForegroundColor Cyan
& sqlcmd -S "102.222.21.220,14333" -d "RPMAssure_App" -U "Rpm_collect" -P "" -C -Q "SET NOCOUNT ON; SELECT 'INV' S, COUNT(*) C, MAX(ImportedAt) L FROM dbo.Syspro_DtrInvBalances WHERE InstanceName='UVSS-SYSPRO' UNION ALL SELECT 'AP', COUNT(*), MAX(ImportedAt) FROM dbo.Syspro_DtrApBalances WHERE InstanceName='UVSS-SYSPRO' UNION ALL SELECT 'AR', COUNT(*), MAX(ImportedAt) FROM dbo.Syspro_DtrArBalances WHERE InstanceName='UVSS-SYSPRO' UNION ALL SELECT 'CB', COUNT(*), MAX(ImportedAt) FROM dbo.Syspro_DtrCbBalances WHERE InstanceName='UVSS-SYSPRO';"
Write-Host "Hard-refresh UVSS customer page in the app." -ForegroundColor Green
